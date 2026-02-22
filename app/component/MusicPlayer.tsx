"use client";
import { useState } from "react";
import { usePlaylist, Song } from "../hooks/usePlaylist";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { useMediaSession } from "../hooks/useMediaSession";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Button } from "./ui/Button";
import Fuse from "fuse.js";

export default function MusicPlayer() {
  const {
    songs,
    current,
    setCurrent,
    draggedIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    addSong,
    deleteSong,
    clearAllSongs,
  } = usePlaylist();

  const [showAddsong, setShowAddsong] = useLocalStorage<boolean>(
    "music_player_show_add_song",
    false
  );
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [aiQuery, setAiQuery] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState("");

  const {
    isPlayerReady,
    isPlaying,
    progress,
    setProgress,
    duration,
    playerRef,
    loadVideo,
    playVideo,
    pauseVideo,
    stopVideo,
    seekTo,
    getVideoData,
  } = useYouTubePlayer(songs, current, setCurrent);

  const albumArt =
    songs[current]?.thumbnail ||
    "https://static.standard.co.uk/s3fs-public/thumbnails/image/2019/03/05/11/sei26139543-1-0.jpg?quality=75&auto=webp&width=960";

  // Playback control functions
  const playSong = (index: number) => {
    if (!isPlayerReady || songs.length === 0) return;
    loadVideo(songs[index].id);
    setCurrent(index);
  };

  const nextSong = () => {
    if (songs.length === 0) return;
    const next = (current + 1) % songs.length;
    playSong(next);
  };

  const prevSong = () => {
    if (songs.length === 0) return;
    const prev = (current - 1 + songs.length) % songs.length;
    playSong(prev);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPlayerReady) return;
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const handlePlay = () => {
    if (!isPlayerReady) return;
    if (songs.length > 0) {
      const videoData = getVideoData();
      if (!videoData || !videoData.video_id || videoData.video_id !== songs[current].id) {
        playSong(current);
      } else {
        playVideo();
      }
    }
  };

  const handlePause = () => {
    if (!isPlayerReady) return;
    pauseVideo();
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleAddSong = (url: string) => {
    addSong(url, (id, isFirstSong) => {
      if (isFirstSong && isPlayerReady && playerRef.current) {
        setTimeout(() => {
          loadVideo(id);
          setCurrent(0);
        }, 500);
      }
    });
  };

  const handleDeleteSong = (index: number) => {
    deleteSong(index, (isCurrent) => {
      if (isCurrent && isPlayerReady) {
        stopVideo();
      }
    });
  };

  const handleClearAll = () => {
    if (clearAllSongs()) {
      stopVideo();
      setShowAddsong(false);
    }
  };

  // Setup Media Session API
  useMediaSession(songs[current], isPlaying, duration, progress, {
    handlePlay,
    handlePause,
    prevSong,
    nextSong,
  });

  // AI Chat handler
  const handleAgentChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiThinking(true);
    setAiStatusMessage("กำลังคิด...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: aiQuery, songs }), // Send songs for context
      });
      const data = await res.json();

      if (data.type === "tool_call" && data.tool_calls) {
        for (const tool of data.tool_calls) {
          if (tool.name === "play_music") {
            const { song_name, artist } = tool.arguments;
            setAiStatusMessage(`กำลังค้นหาเพลง: ${song_name} ${artist || ''}...`);

            const fuse = new Fuse(songs, {
              keys: ["title"],
              threshold: 0.5,
              ignoreLocation: true,
              useExtendedSearch: true,
            });
            // Try to search with artist and song, or just song if fails
            let searchResult = fuse.search(`${song_name} ${artist || ''}`);
            if (searchResult.length === 0 && artist) {
              // fallback to song name only
              searchResult = fuse.search(song_name);
            }

            if (searchResult.length > 0) {
              const bestMatchIndex = searchResult[0].refIndex;
              const bestMatch = searchResult[0].item;
              setAiStatusMessage(`พบเพลง: ${bestMatch.title} ในคิว ดำเนินการเล่น`);
              playSong(bestMatchIndex);
            } else {
              setAiStatusMessage(`ขออภัย ไม่พบเพลง ${song_name} ในคิว (Playlist)`);
            }
          } else if (tool.name === "search_and_add_youtube_song") {
            const { song_name, artist, youtube_id, youtube_title } = tool.arguments;
            if (youtube_id) {
              setAiStatusMessage(`กำลังค้นหาและเพิ่มเพลง: ${youtube_title || song_name}...`);
              addSong(`https://youtube.com/watch?v=${youtube_id}`, (id) => {
                const newIndex = songs.length; // It will be added to the end
                setTimeout(() => {
                  setAiStatusMessage(`เพิ่มเพลง ${youtube_title || song_name} ลงคิวและกำลังเล่น`);
                  // We need to wait for state to update, or just use loadVideo and let player handle it.
                  loadVideo(id);
                  setCurrent(newIndex);
                }, 500);
              });
            } else {
              setAiStatusMessage(`ขออภัย ไม่พบข้อมูลเพลง ${song_name} บน YouTube`);
            }
          }
        }

        setTimeout(() => setAiStatusMessage(""), 4000);
      } else {
        setAiStatusMessage(data.content || "รับทราบครับ");
        setTimeout(() => setAiStatusMessage(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setAiStatusMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
      setTimeout(() => setAiStatusMessage(""), 4000);
    } finally {
      setIsAiThinking(false);
      setAiQuery("");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 bg-white/80 dark:bg-primary h-full max-h-screen overflow-hidden">
      {/* Music Player Section */}
      <section className="flex flex-col items-center lg:w-1/3 lg:max-w-sm shrink-0">
        <div className="w-full max-w-xs">
          <img
            src={albumArt}
            alt={songs[current]?.title || "Album Art"}
            className="w-full aspect-square object-cover shadow-lg"
            width={256}
            height={256}
          />
        </div>

        <div className="mt-4 text-center w-full max-w-xs">
          <div className="mb-3">
            <span className="inline-block px-3 py-1 text-xs font-medium border bg-primary text-white hover:bg-white hover:text-primary dark:border-white dark:bg-primary dark:text-white dark:hover:bg-white dark:hover:text-primary transition-colors">
              Now Playing
            </span>
            <h2 className="mt-2 text-lg font-semibold truncate max-w-full">
              {songs[current]?.title || "No song selected"}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="min-w-12">{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress || 0}
              onChange={handleSeek}
              className="flex-1 accent-primary dark:accent-white range"
              disabled={!isPlayerReady || songs.length === 0}
            />
            <span className="min-w-12">{formatTime(duration)}</span>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            <Button
              variant="icon"
              onClick={prevSong}
              disabled={!isPlayerReady || songs.length === 0}
              aria-label="Previous"
            >
              <span aria-hidden>⏮</span>
            </Button>

            {isPlaying ? (
              <Button
                variant="icon"
                onClick={handlePause}
                disabled={!isPlayerReady || songs.length === 0}
                aria-label="Pause"
              >
                <span aria-hidden>⏸</span>
                <span className="hidden lg:inline">Pause</span>
              </Button>
            ) : (
              <Button
                variant="icon"
                onClick={handlePlay}
                disabled={!isPlayerReady || songs.length === 0}
                aria-label="Play"
              >
                <span aria-hidden>▶</span>
                <span className="hidden lg:inline font-medium">Play</span>
              </Button>
            )}

            <Button
              variant="icon"
              onClick={nextSong}
              disabled={!isPlayerReady || songs.length === 0}
              aria-label="Next"
            >
              <span aria-hidden>⏭</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Playlist Management Section */}
      <section className="flex-1 flex flex-col min-h-0">
        <div className="mb-4 border bg-white/80 dark:bg-primary border-primary dark:border-white">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <div className="text-sm font-semibold font-medium">Add Song</div>
              <div className="text-xs opacity-70">
                Paste a YouTube link to add to the playlist
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowAddsong(prev => !prev)}
            >
              {showAddsong ? "Close" : "Add"}
            </Button>
          </div>

          {showAddsong && (
            <div className="px-3 pb-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  id="urlInput"
                  placeholder="e.g. https://youtu.be/xxxxxxxxxxx"
                  className="p-2 flex-1 bg-white/80 border border-primary dark:bg-primary dark:border-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      handleAddSong(input.value);
                      input.value = "";
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    const input = document.getElementById(
                      "urlInput"
                    ) as HTMLInputElement;
                    handleAddSong(input.value);
                    input.value = "";
                  }}
                >
                  Add
                </Button>
              </div>
              <p className="mt-1 text-xs opacity-70">
                Supports youtu.be and youtube.com/watch links
              </p>
            </div>
          )}
        </div>

        <div className="mb-4 text-sm font-medium">
          Player: {isPlayerReady ? "✅ Ready" : "⏳ Loading..."}
          {songs.length > 0 && (
            <span>
              {" "}
              | Songs: {songs.length} | Playing: {current + 1}/{songs.length} -{" "}
              {songs[current]?.title || "None"}
              {songs.length === 1 && " (Repeat Mode)"}
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Playlist</h2>
            <Button
              variant="ghost"
              onClick={handleClearAll}
              disabled={songs.length === 0}
            >
              Clear All
            </Button>
          </div>

          <ul className="space-y-2 overflow-y-auto overflow-x-hidden pr-1 flex-1 lg:max-h-[500px]">
            {songs.map((song, idx) => (
              <li
                key={idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 transition-colors flex-wrap sm:flex-nowrap cursor-pointer ${idx === current
                  ? "bg-primary hover:bg-black hover:text-white text-white dark:bg-white/80 dark:text-primary dark:hover:bg-white dark:hover:text-primary"
                  : "bg-white/80 hover:bg-secondary hover:text-white dark:bg-primary dark:hover:bg-secondary dark:hover:text-white border-primary dark:border-white"
                  } ${draggedIndex === idx ? "opacity-50" : ""}`}
                onClick={() => playSong(idx)}
              >
                <div className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0">
                  ⋮⋮
                </div>
                <img
                  src={song.thumbnail}
                  alt={song.title}
                  className="w-12 h-12 object-cover shrink-0"
                  loading="lazy"
                />

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate ">{song.title}</div>
                  <div className="text-xs">
                    Click to play {songs.length === 1 && " • Will repeat"}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-end shrink-0">
                  {idx === current && <span className="text-xl">♪</span>}

                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSong(idx);
                    }}
                    title="Delete song"
                    className="text-xs"
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {songs.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-primary dark:border-white">
              <p>No songs in playlist</p>
              <p className="text-sm">Add some YouTube songs to get started!</p>
            </div>
          )}
        </div>
      </section >

      <section>
        <div id="player" style={{ display: "none" }}></div>
      </section>

      {/* Floating AI Chat Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-primary text-white dark:bg-white dark:text-primary px-5 py-2 shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-3 group border border-primary/20 dark:border-white/20 hover:bg-black dark:hover:bg-gray-200"
        >
          <span className="text-2xl animate-pulse">✨</span>
          <span className="font-bold whitespace-nowrap hidden sm:inline tracking-wide uppercase text-sm">
            AI Assistant
          </span>
        </button>
      )}

      {/* AI Chat Sidebar Overlay (for mobile so it closes when clicking outside) */}
      {
        isChatOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setIsChatOpen(false)}
          />
        )
      }

      {/* AI Chat Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-[340px] sm:w-[420px] bg-white/95 dark:bg-primary/95 backdrop-blur-sm border-l-4 border-primary dark:border-white shadow-[-10px_0_20px_rgba(0,0,0,0.1)] z-50 flex flex-col transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isChatOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Sidebar Header */}
        <div className="bg-primary text-white dark:bg-white dark:text-primary px-4 py-4 text-base font-bold flex items-center justify-between border-b border-primary/20 dark:border-white/20">
          <span className="flex items-center gap-3 uppercase tracking-wider text-sm">
            <span className="text-xl">✨</span> AI Assistant
          </span>
          <button
            onClick={() => setIsChatOpen(false)}
            className="w-8 h-8 flex items-center justify-center border border-transparent hover:border-white hover:bg-white/10 dark:hover:border-primary dark:hover:bg-primary/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sidebar Chat Content / History Area */}
        <div className="flex-1 p-4 overflow-y-auto w-full flex flex-col gap-4 custom-scrollbar">
          <div className="bg-white dark:bg-primary p-4 border border-primary dark:border-white text-sm">
            <p className="font-bold mb-3 text-primary dark:text-white flex items-center gap-2 uppercase tracking-wide">
              <span>💡</span> ความสามารถของ AI
            </p>
            <ul className="list-disc pl-5 space-y-2 text-primary dark:text-white/90">
              <li>เล่นเพลงจากคิว: <span className="opacity-70 text-xs block mt-0.5">"เปิดเพลง Shape of you"</span></li>
              <li>ค้นหาเพลย์ลิสต์ใหม่: <span className="opacity-70 text-xs block mt-0.5">"หาเพลง diet pepsi ให้หน่อย"</span></li>
            </ul>
          </div>

          <div className="flex-1"></div>

          {/* Assistant Status Bubble */}
          <div className={`transition-all duration-300 transform origin-bottom ${aiStatusMessage ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4 pointer-events-none'}`}>
            <div className={`p-4 font-medium flex items-start gap-3 w-fit max-w-[95%] ml-auto border ${isAiThinking
              ? "bg-primary text-white dark:bg-white dark:text-primary border-primary dark:border-white animate-pulse"
              : "bg-white text-primary border-primary dark:bg-primary dark:text-white dark:border-white"
              }`}>
              {!isAiThinking && aiStatusMessage && <span className="mt-0.5 text-lg flex-shrink-0">✨</span>}
              <div className="flex-1 leading-relaxed text-sm">
                {aiStatusMessage || "พร้อมรับคำสั่ง..."}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Input Area */}
        <div className="p-4 border-t border-primary dark:border-white bg-white/80 dark:bg-primary/80 backdrop-blur-sm">
          <form onSubmit={handleAgentChat} className="flex flex-col gap-3 max-w-full">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAiQuery("เพิ่มเพลง ")}
                className="text-xs px-3 py-1 border border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all active:scale-95 bg-transparent uppercase tracking-wider"
              >
                เพิ่มเพลง...
              </button>
              <button
                type="button"
                onClick={() => setAiQuery("เปิดเพลง ")}
                className="text-xs px-3 py-1 border border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all active:scale-95 bg-transparent uppercase tracking-wider"
              >
                เปิดเพลง...
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="ลองสั่ง AI เช่น 'เปิดเพลง Shape of Youหน่อย'"
                className="px-4 py-3 flex-1 min-w-0 bg-white border border-primary dark:bg-primary dark:border-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-primary dark:text-white transition-all w-full placeholder:opacity-50"
                disabled={isAiThinking}
              />
              <Button
                type="submit"
                disabled={isAiThinking || !aiQuery.trim()}
                className="px-6 border border-primary dark:border-white active:scale-95 transition-all outline-none rounded-none w-full sm:w-auto mt-2 sm:mt-0"
              >
                {isAiThinking ? "กำลังคิด..." : "ส่งคำสั่ง"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div >
  );
}
