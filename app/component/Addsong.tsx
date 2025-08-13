"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import PixelImage from "./PixelImage";
import Image from "next/image";

interface Song {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

export default function Addsong() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const isAutoPlayingRef = useRef(false); // ป้องกันการเรียกซ้ำ
  const [showAddsong, setShowAddsong] = useState(false);

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
      console.log('Saved songs to localStorage:', songs.length);
    }
  }, [songs]);

  // Save to localStorage whenever current changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CURRENT, JSON.stringify(current));
      console.log('Saved current index to localStorage:', current);
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
      // Load songs
      const savedSongs = localStorage.getItem(STORAGE_KEYS.SONGS);
      if (savedSongs) {
        const parsedSongs = JSON.parse(savedSongs);
        if (Array.isArray(parsedSongs)) {
          setSongs(parsedSongs);
          console.log('Loaded songs from localStorage:', parsedSongs.length);
        }
      }

      // Load current index
      const savedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT);
      if (savedCurrent) {
        const parsedCurrent = JSON.parse(savedCurrent);
        if (typeof parsedCurrent === 'number' && parsedCurrent >= 0) {
          setCurrent(parsedCurrent);
          console.log('Loaded current index from localStorage:', parsedCurrent);
        }
      }

      // Load showAddsong state
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

  // Get current song and songs from localStorage
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

  // Function สำหรับเล่นเพลงถัดไป (ใช้ localStorage แทน ref)
  const playNextSong = useCallback(() => {
    const { currentSongs, currentIndex } = getCurrentFromStorage();

    if (isAutoPlayingRef.current) {
      return;
    }

    if (currentSongs.length <= 1) {
      return;
    }

    isAutoPlayingRef.current = true;

    try {
      const nextIndex = (currentIndex + 1) % currentSongs.length;
      const nextSong = currentSongs[nextIndex];

      console.log(`🎵 Auto-playing next song: ${nextIndex} - ${nextSong.title}`);

      // Update current index
      setCurrent(nextIndex);

      // Load and play next video
      if (playerRef.current && nextSong) {
        playerRef.current.loadVideoById(nextSong.id);
      }

      // Reset flag after a delay
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
      // API already loaded
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
          console.log("✅ YouTube Player is ready");
          setIsPlayerReady(true);

          // หลังจาก player พร้อมแล้ว ถ้ามีเพลงใน localStorage ให้โหลดเพลงปัจจุบัน
          const { currentSongs, currentIndex } = getCurrentFromStorage();
          if (currentSongs.length > 0 && currentSongs[currentIndex]) {
            setTimeout(() => {
              console.log("🎯 Loading current song from localStorage");
              playerRef.current.cueVideoById(currentSongs[currentIndex].id);
            }, 500);
          }
        },
        onStateChange: (event: any) => {
          console.log("🎮 Player state changed:", event.data);

          if (event.data === 1) {
            // Playing
            setIsPlaying(true);
            setDuration(playerRef.current.getDuration());
            intervalRef.current = setInterval(() => {
              setProgress(playerRef.current.getCurrentTime());
            }, 1000);
          } else if (event.data === 2) {
            // Paused
            setIsPlaying(false);
            clearInterval(intervalRef.current);
          } else if (event.data === 0) {
            // Ended
            setIsPlaying(false);
            clearInterval(intervalRef.current);
            setProgress(0);

            // Auto-play next song after a short delay
            setTimeout(() => {
              playNextSong();
            }, 1000);
          } else if (event.data === 3) {
            // Buffering
            console.log('⏳ Buffering...');
          } else if (event.data === 5) {
            // Video cued
            console.log('📼 Video cued');
          }
        },
        onError: (event: any) => {
          console.error('❌ YouTube Player Error:', event.data);
          isAutoPlayingRef.current = false;
          // Try next song if there's an error
          setTimeout(() => {
            playNextSong();
          }, 2000);
        },
      },
    });
  };

  // Add song with oEmbed to get title and thumbnail
  const addSong = async (url: string) => {
    const id = extractVideoId(url);
    if (!id) return alert("Invalid YouTube URL");

    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
      );
      const data = await res.json();
      console.log(data);
      
      const newSong: Song = {
        id,
        title: data.title,
        thumbnail: data.thumbnail_url,
        url,
      };

      setSongs((prevSongs) => {
        const newSongs = [...prevSongs, newSong];
        console.log("➕ Added song:", newSong.title);

        // ถ้าเป็นเพลงแรกและ player พร้อมแล้ว ให้เล่นทันที
        if (prevSongs.length === 0 && isPlayerReady && playerRef.current) {
          setTimeout(() => {
            console.log("🎯 Playing first song automatically");
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

  const playSong = (index: number) => {
    if (!playerRef.current || !isPlayerReady || songs.length === 0) return;

    console.log(`🎯 Manual play song: ${index} - ${songs[index].title}`);
    isAutoPlayingRef.current = false; // Reset auto-play flag
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

    // ถ้ายังไม่มีเพลงที่โหลดอยู่ ให้โหลดเพลงปัจจุบัน
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

    // หยุดเล่นเพลงเฉพาะเมื่อลบเพลงที่กำลังเล่นอยู่
    if (index === current && playerRef.current && isPlayerReady) {
      playerRef.current.stopVideo();
      setIsPlaying(false);
      setProgress(0);
      clearInterval(intervalRef.current);
    }

    setSongs((prevSongs) => {
      const newSongs = prevSongs.filter((_, idx) => idx !== index);
      console.log(`🗑️ Deleted song: ${prevSongs[index].title}`);

      // ปรับ current index หลังจากลบ
      if (newSongs.length === 0) {
        setCurrent(0);
      } else if (index < current) {
        // ถ้าลบเพลงที่อยู่ก่อนหน้าเพลงปัจจุบัน ให้ลด current index ลง 1
        setCurrent(current - 1);
      } else if (index === current) {
        // ถ้าลบเพลงปัจจุบัน ให้ไปเพลงที่มี index เดิม (หรือเพลงสุดท้ายถ้า index เกิน)
        const newCurrent = current >= newSongs.length ? 0 : current;
        setCurrent(newCurrent);
      }
      // ถ้าลบเพลงที่อยู่หลังเพลงปัจจุบัน ไม่ต้องเปลี่ยน current index

      return newSongs;
    });
  };

  // Clear localStorage function (สำหรับ debug หรือ reset)
  const clearStorage = () => {
    // หยุดเล่นเพลงเมื่อ clear all
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
      console.log('🗑️ Cleared all songs and stopped playback');
    }
  };

  const albumArt =
    songs[current]?.thumbnail ||
    "https://static.standard.co.uk/s3fs-public/thumbnails/image/2019/03/05/11/sei26139543-1-0.jpg?quality=75&auto=webp&width=960";

  return (
    <div className="p-4 grid gap-6 bg-gray-100 dark:bg-gray-900 shadow-md grid-cols-3 h-full">
      <section>
        <div className="col-span-1 flex items-center justify-center">
          <PixelImage src={albumArt} />
        </div>

        <div className="mt-4 text-center">
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

          <div className="flex gap-3 mt-4 justify-center">
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

      <section className="col-span-2 relative">
        {/* Add Song */}
        <button
          onClick={() => {
            setShowAddsong(!showAddsong);
          }}
          className="py-1 px-2 bg-emerald-500 rounded-sm hover:bg-emerald-600 absolute top-1 right-1"
        >
          Addsong +
        </button>


        <div className={showAddsong ? "block flex gap-2 mb-4" : "hidden"}>
          <input
            type="text"
            id="urlInput"
            placeholder="Paste YouTube URL..."
            className="p-2 rounded w-96 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-600"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const input = e.target as HTMLInputElement;
                addSong(input.value);
                input.value = "";
              }
            }}
          />
          <button
            className="px-4 py-2 transition-colors bg-blue-800 hover:bg-blue-900 text-white rounded dark:bg-yellow-400 dark:hover:bg-yellow-500"
            onClick={() => {
              const input = document.getElementById("urlInput") as HTMLInputElement;
              addSong(input.value);
              input.value = "";
            }}
          >
            Add Song
          </button>
        </div>

        {/* Player Status */}
        <div className="mb-4 text-sm">
          Player: {isPlayerReady ? "✅ Ready" : "⏳ Loading..."}
          {songs.length > 0 && (
            <span>
              {" "}
              | Songs: {songs.length} | Playing: {current + 1}/{songs.length} -{" "}
              {songs[current]?.title || "None"}
            </span>
          )}
        </div>

        {/* Playlist */}
        <div className="pt-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold mb-2">Playlist</h2>
            {/* Clear Storage Button (สำหรับ debug) */}
            <button
              onClick={clearStorage}
              className="py-1 px-2 bg-red-500 rounded-sm hover:bg-red-600  text-white text-sm"
            >
              Clear All
            </button>
          </div>
          <ul
            className={
              showAddsong
                ? "space-y-1 h-[320px] overflow-y-auto overflow-x-hidden"
                : "space-y-1 h-[375px] overflow-y-auto overflow-x-hidden"
            }
          >
            {songs.map((song, idx) => (
              <li
                key={idx}
                className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                  idx === current
                    ? "bg-green-700 border-l-4 border-green-400"
                    : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-800"
                }`}
                onClick={() => playSong(idx)}
              >
                <div className="flex-1">
                  <div className="font-medium">{song.title}</div>
                  <div className="text-xs">Click to play</div>
                </div>
                
                <div className="flex items-center gap-2">
                  {idx === current && (
                    <span className="text-green-400 text-xl">♪</span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // ป้องกันการ trigger playSong
                      deleteSong(idx);
                    }}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                    title="Delete song"
                  >
                    ❌
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        {/* Hidden Player */}
        <div id="player" style={{ display: "none" }}></div>
      </section>
    </div>
  );
}