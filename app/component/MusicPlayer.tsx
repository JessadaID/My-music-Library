"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import PixelImage from "./PixelImage";

interface Song {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

export default function MusicPlayer() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAddsong, setShowAddsong] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const isAutoPlayingRef = useRef(false);

  // Storage keys
  const STORAGE_KEYS = {
    SONGS: 'music_player_songs',
    CURRENT: 'music_player_current',
    SHOW_ADD_SONG: 'music_player_show_add_song'
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save to localStorage whenever songs change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
    }
  }, [songs]);

  // Save to localStorage whenever current changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CURRENT, JSON.stringify(current));
    }
  }, [current]);

  // Save to localStorage whenever showAddsong changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SHOW_ADD_SONG, JSON.stringify(showAddsong));
    }
  }, [showAddsong]);

  const loadFromStorage = () => {
    if (typeof window === 'undefined') return;

    try {
      const savedSongs = localStorage.getItem(STORAGE_KEYS.SONGS);
      if (savedSongs) {
        const parsedSongs = JSON.parse(savedSongs);
        if (Array.isArray(parsedSongs)) {
          setSongs(parsedSongs);
        }
      }

      const savedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT);
      if (savedCurrent) {
        const parsedCurrent = JSON.parse(savedCurrent);
        if (typeof parsedCurrent === 'number' && parsedCurrent >= 0) {
          setCurrent(parsedCurrent);
        }
      }

      const savedShowAddsong = localStorage.getItem(STORAGE_KEYS.SHOW_ADD_SONG);
      if (savedShowAddsong) {
        const parsedShowAddsong = JSON.parse(savedShowAddsong);
        if (typeof parsedShowAddsong === 'boolean') {
          setShowAddsong(parsedShowAddsong);
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  const getCurrentFromStorage = () => {
    if (typeof window === 'undefined') {
      return { currentSongs: [], currentIndex: 0 };
    }

    try {
      const savedSongs = localStorage.getItem(STORAGE_KEYS.SONGS);
      const savedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT);
      
      const currentSongs = savedSongs ? JSON.parse(savedSongs) : [];
      const currentIndex = savedCurrent ? JSON.parse(savedCurrent) : 0;
      
      return { currentSongs, currentIndex };
    } catch (error) {
      console.error('Error getting current from localStorage:', error);
      return { currentSongs: [], currentIndex: 0 };
    }
  };

  // Drag & Drop functions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setSongs(prevSongs => {
      const newSongs = [...prevSongs];
      const draggedSong = newSongs[draggedIndex];
      
      // Remove dragged item
      newSongs.splice(draggedIndex, 1);
      
      // Insert at drop position
      newSongs.splice(dropIndex, 0, draggedSong);
      
      // Update current index if needed
      if (draggedIndex === current) {
        setCurrent(dropIndex);
      } else if (draggedIndex < current && dropIndex >= current) {
        setCurrent(current - 1);
      } else if (draggedIndex > current && dropIndex <= current) {
        setCurrent(current + 1);
      }
      
      return newSongs;
    });
    
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Auto-play next song
  const playNextSong = useCallback(() => {
    const { currentSongs, currentIndex } = getCurrentFromStorage();

    if (isAutoPlayingRef.current) {
      return;
    }

    if (currentSongs.length === 0) {
      return;
    }

    isAutoPlayingRef.current = true;

    try {
      let nextIndex, nextSong;
      
      if (currentSongs.length === 1) {
        nextIndex = 0;
        nextSong = currentSongs[0];
      } else {
        nextIndex = (currentIndex + 1) % currentSongs.length;
        nextSong = currentSongs[nextIndex];
      }

      setCurrent(nextIndex);

      if (playerRef.current && nextSong) {
        playerRef.current.loadVideoById(nextSong.id);
      }

      setTimeout(() => {
        isAutoPlayingRef.current = false;
      }, 2000);
    } catch (error) {
      console.error('Error in playNextSong:', error);
      isAutoPlayingRef.current = false;
    }
  }, []);

  // Load YouTube API
  useEffect(() => {
    if ((window as any).YT) {
      initializePlayer();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    (window as any).onYouTubeIframeAPIReady = initializePlayer;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const initializePlayer = () => {
    playerRef.current = new (window as any).YT.Player("player", {
      height: "0",
      width: "0",
      playerVars: {
        controls: 0,
        autoplay: 0,
        enablejsapi: 1,
        rel: 0,
      },
      events: {
        onReady: (event: any) => {
          setIsPlayerReady(true);

          const { currentSongs, currentIndex } = getCurrentFromStorage();
          if (currentSongs.length > 0 && currentSongs[currentIndex]) {
            setTimeout(() => {
              playerRef.current.cueVideoById(currentSongs[currentIndex].id);
            }, 500);
          }
        },
        onStateChange: (event: any) => {
          if (event.data === 1) {
            setIsPlaying(true);
            setDuration(playerRef.current.getDuration());
            intervalRef.current = setInterval(() => {
              setProgress(playerRef.current.getCurrentTime());
            }, 1000);
          } else if (event.data === 2) {
            setIsPlaying(false);
            clearInterval(intervalRef.current);
          } else if (event.data === 0) {
            setIsPlaying(false);
            clearInterval(intervalRef.current);
            setProgress(0);

            setTimeout(() => {
              playNextSong();
            }, 1000);
          }
        },
        onError: (event: any) => {
          console.error('YouTube Player Error:', event.data);
          isAutoPlayingRef.current = false;
          setTimeout(() => {
            playNextSong();
          }, 2000);
        },
      },
    });
  };

  // Add song function
  const addSong = async (url: string) => {
    const id = extractVideoId(url);
    if (!id) return alert("Invalid YouTube URL");

    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
      );
      const data = await res.json();
      
      const newSong: Song = {
        id,
        title: data.title,
        thumbnail: data.thumbnail_url,
        url,
      };

      setSongs((prevSongs) => {
        const newSongs = [...prevSongs, newSong];

        if (prevSongs.length === 0 && isPlayerReady && playerRef.current) {
          setTimeout(() => {
            playerRef.current.loadVideoById(id);
            setCurrent(0);
          }, 500);
        }

        return newSongs;
      });
    } catch (error) {
      console.error("Error adding song:", error);
      alert("Error adding song. Please try again.");
    }
  };

  const extractVideoId = (url: string) => {
    const regex = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Playback control functions
  const playSong = (index: number) => {
    if (!playerRef.current || !isPlayerReady || songs.length === 0) return;

    isAutoPlayingRef.current = false;
    playerRef.current.loadVideoById(songs[index].id);
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
    if (!playerRef.current || !isPlayerReady) return;
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    playerRef.current.seekTo(newTime, true);
  };

  const handlePlay = () => {
    if (!playerRef.current || !isPlayerReady) return;

    if (songs.length > 0) {
      const videoData = playerRef.current.getVideoData();
      if (
        !videoData ||
        !videoData.video_id ||
        videoData.video_id !== songs[current].id
      ) {
        playSong(current);
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const handlePause = () => {
    if (!playerRef.current || !isPlayerReady) return;
    playerRef.current.pauseVideo();
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Delete song function
  const deleteSong = (index: number) => {
    if (songs.length === 0) return;

    if (index === current && playerRef.current && isPlayerReady) {
      playerRef.current.stopVideo();
      setIsPlaying(false);
      setProgress(0);
      clearInterval(intervalRef.current);
    }

    setSongs((prevSongs) => {
      const newSongs = prevSongs.filter((_, idx) => idx !== index);

      if (newSongs.length === 0) {
        setCurrent(0);
      } else if (index < current) {
        setCurrent(current - 1);
      } else if (index === current) {
        const newCurrent = current >= newSongs.length ? 0 : current;
        setCurrent(newCurrent);
      }

      return newSongs;
    });
  };

  // Clear all songs
  const clearStorage = () => {
    if(confirm("ต้องการจะลบเพลงทั้งหมดใช่หรือไม่?")){
      if (playerRef.current && isPlayerReady) {
        playerRef.current.stopVideo();
        setIsPlaying(false);
        setProgress(0);
        setDuration(0);
        clearInterval(intervalRef.current);
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.SONGS);
        localStorage.removeItem(STORAGE_KEYS.CURRENT);
        localStorage.removeItem(STORAGE_KEYS.SHOW_ADD_SONG);
        setSongs([]);
        setCurrent(0);
        setShowAddsong(false);
      }
    }
  };

  const albumArt =
    songs[current]?.thumbnail ||
    "https://static.standard.co.uk/s3fs-public/thumbnails/image/2019/03/05/11/sei26139543-1-0.jpg?quality=75&auto=webp&width=960";

  return (
    <div className="p-4 grid gap-6 bg-gray-100 dark:bg-gray-900 shadow-md grid-cols-1 lg:grid-cols-3 h-full">
      {/* Music Player Section */}
      <section>
        <div className="col-span-1 flex items-center justify-center">
          <PixelImage src={albumArt} />
        </div>

        <div className="mt-4 text-center ">
          <div className="mb-3 ">
            <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Now Playing</span>
            <h2 className="mt-2 text-lg font-semibold truncate max-w-full">{songs[current]?.title || "No song selected"}</h2>
          </div>
         
          <div className="flex items-center gap-2 text-sm">
            <span className="min-w-12">{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={handleSeek}
              className="flex-1 accent-amber-400 dark:accent-blue-500 range"
              disabled={!isPlayerReady || songs.length === 0}
            />
            <span className="min-w-12">{formatTime(duration)}</span>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            <button
              onClick={prevSong}
              className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 font-medium"
              disabled={!isPlayerReady || songs.length === 0}
            >
              ⏮ Previous
            </button>

            {isPlaying ? (
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-600 font-medium"
                disabled={!isPlayerReady || songs.length === 0}
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="px-4 py-2 bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-600 font-medium"
                disabled={!isPlayerReady || songs.length === 0}
              >
                ▶ Play
              </button>
            )}
            
            <button
              onClick={nextSong}
              className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 font-medium"
              disabled={!isPlayerReady || songs.length === 0}
            >
              Next ⏭
            </button>
          </div>
        </div>
      </section>

      {/* Playlist Management Section */}
      <section className="col-span-1 lg:col-span-2">
        {/* Add Song Panel */}
        <div className="mb-4 border rounded-lg bg-white/60 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <div className="text-sm font-semibold">เพิ่มเพลง</div>
              <div className="text-xs opacity-70">วางลิงก์ YouTube เพื่อเพิ่มลงในเพลย์ลิสต์</div>
            </div>
            <button
              onClick={() => setShowAddsong(!showAddsong)}
              className="py-1 px-2 bg-emerald-500 rounded-md hover:bg-emerald-600 text-white text-sm"
            >
              {showAddsong ? "ซ่อน" : "เพิ่มเพลง"}
            </button>
          </div>

          {showAddsong && (
            <div className="px-3 pb-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  id="urlInput"
                  placeholder="เช่น https://youtu.be/xxxxxxxxxxx หรือ https://www.youtube.com/watch?v=xxxxxxxxxxx"
                  className="p-2 rounded flex-1 bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-700"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      addSong(input.value);
                      input.value = "";
                    }
                  }}
                />
                <button
                  className="px-4 py-2 transition-colors bg-blue-600 hover:bg-blue-700 text-white rounded"
                  onClick={() => {
                    const input = document.getElementById("urlInput") as HTMLInputElement;
                    addSong(input.value);
                    input.value = "";
                  }}
                >
                  เพิ่มเพลง
                </button>
              </div>
              <p className="mt-1 text-xs opacity-70">รองรับลิงก์รูปแบบ youtu.be และ youtube.com/watch?v=</p>
            </div>
          )}
        </div>

        {/* Player Status */}
        <div className="mb-4 text-sm">
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

        {/* Playlist with Drag & Drop */}
        <div className="pt-4 ">
          <div className="flex justify-between items-center mb-2 ">
            <h2 className="text-xl font-semibold mb-2">Playlist (Drag & Drop to Reorder)</h2>
            <button
              onClick={clearStorage}
              className="py-1 px-2 bg-red-500 rounded-sm hover:bg-red-600 text-white text-sm"
            >
              Clear All
            </button>
          </div>
          
          <ul
            className={
              `space-y-1 overflow-y-auto overflow-x-hidden` 
            }
          >
            {songs.map((song, idx) => (
              <li
                key={idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                  idx === current
                    ? "bg-green-700 border-l-4 border-green-400"
                    : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-800"
                } ${
                  draggedIndex === idx ? "opacity-50" : ""
                }`}
                onClick={() => playSong(idx)}
              >
                {/* Drag Handle */}
                <div className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                  ⋮⋮
                </div>
                <img src={song.thumbnail} alt={song.title} className="w-12 h-12 object-cover rounded" loading="lazy" />
                
                <div className="flex-1">
                  <div className="font-medium truncate">{song.title}</div>
                  <div className="text-xs">
                    Click to play {songs.length === 1 && " • Will repeat"}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {idx === current && (
                    <span className="text-green-400 text-xl">
                      ♪
                    </span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSong(idx);
                    }}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                    title="Delete song"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          
          {songs.length === 0 && (
            <div className="text-center pt-8 text-gray-500">
              <p>No songs in playlist</p>
              <p className="text-sm">Add some YouTube songs to get started!</p>
            </div>
          )}
        </div>
      </section>

      {/* Hidden YouTube Player */}
      <section>
        <div id="player" style={{ display: "none" }}></div>
      </section>
    </div>
  );
}
