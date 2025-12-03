"use client";
import { useEffect, useRef, useState, useCallback } from "react";

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

  const defaultSiteTitle = "MineTube";

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

  // Update document title only based on current song
  useEffect(() => {
    if (typeof document === "undefined") return;
    const song = songs[current];
    const titlePrefix = song ? (isPlaying ? "▶ " : "⏸ ") : "";
    document.title = song
      ? `${titlePrefix}${song.title} — ${defaultSiteTitle}`
      : defaultSiteTitle;
  }, [current, songs, isPlaying]);

  // Media Session API integration
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const anyNavigator = navigator as any;
    if (!("mediaSession" in anyNavigator)) return;

    const song = songs[current];
    if (!song) return;

    try {
      anyNavigator.mediaSession.metadata = new (window as any).MediaMetadata({
        title: song.title,
        artist: "",
        album: defaultSiteTitle,
        artwork: [
          { src: song.thumbnail, sizes: "96x96", type: "image/jpeg" },
          { src: song.thumbnail, sizes: "192x192", type: "image/jpeg" },
          { src: song.thumbnail, sizes: "512x512", type: "image/jpeg" }
        ]
      });

      anyNavigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      anyNavigator.mediaSession.setActionHandler("play", () => handlePlay());
      anyNavigator.mediaSession.setActionHandler("pause", () => handlePause());
      anyNavigator.mediaSession.setActionHandler("previoustrack", () => prevSong());
      anyNavigator.mediaSession.setActionHandler("nexttrack", () => nextSong());
    } catch (e) {
      // noop
    }
  }, [current, songs, isPlaying]);

  // Update media session position state
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const anyNavigator = navigator as any;
    if (!("mediaSession" in anyNavigator)) return;
    try {
      if (duration && !isNaN(duration)) {
        anyNavigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: progress || 0
        });
      }
    } catch (e) {
      // noop
    }
  }, [progress, duration]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 bg-white/80 dark:bg-primary h-full max-h-screen overflow-hidden">
      {/* Music Player Section */}
      <section className="flex flex-col items-center lg:w-1/3 lg:max-w-sm shrink-0">
        <div className="w-full max-w-xs">
          <img
            src={albumArt}
            alt={songs[current]?.title || "Album Art"}
            className="w-full aspect-square object-cover shadow-lg"
            width={256} height={256}
          />
        </div>

        <div className="mt-4 text-center w-full max-w-xs">
          <div className="mb-3 ">
            <span className="inline-block px-3 py-1 text-xs font-medium border bg-primary text-white hover:bg-white hover:text-primary dark:border-white dark:bg-primary dark:text-white dark:hover:bg-white dark:hover:text-primary transition-colors">Now Playing</span>
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
              className="flex-1 accent-primary dark:accent-white range"
              disabled={!isPlayerReady || songs.length === 0}
            />
            <span className="min-w-12">{formatTime(duration)}</span>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            <button
              onClick={prevSong}
              aria-label="Previous"
              className="px-3 py-2 border border-primary hover:bg-primary hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-1 cursor-pointer"
              disabled={!isPlayerReady || songs.length === 0}
            >
              <span aria-hidden>⏮</span>
            </button>

            {isPlaying ? (
              <button
                onClick={handlePause}
                aria-label="Pause"
                className="px-3 py-2 border border-primary hover:bg-primary hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-1 cursor-pointer"
                disabled={!isPlayerReady || songs.length === 0}
              >
                <span aria-hidden>⏸</span>
                <span className="hidden lg:inline">Pause</span>
              </button>
            ) : (
              <button
                onClick={handlePlay}
                aria-label="Play"
                className="px-3 py-2 border border-primary hover:bg-primary hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-1 cursor-pointer"
                disabled={!isPlayerReady || songs.length === 0}
              >
                <span aria-hidden>▶</span>
                <span className="hidden  lg:inline font-medium">Play</span>
              </button>
            )}
            
            <button
              onClick={nextSong}
              aria-label="Next"
              className="px-3 py-2 border border-primary hover:bg-primary hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-1 cursor-pointer"
              disabled={!isPlayerReady || songs.length === 0}
            >
              <span aria-hidden>⏭</span>
            </button>
          </div>
        </div>
      </section>

      {/* Playlist Management Section */}
      <section className="flex-1 flex flex-col min-h-0">
        {/* Add Song Panel */}
        <div className="mb-4 border bg-white/80 dark:bg-primary border-primary dark:border-white">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <div className="text-sm font-semibold font-medium">Add Song</div>
              <div className="text-xs opacity-70">Paste a YouTube link to add to the playlist</div>
            </div>
            <button
              onClick={() => setShowAddsong(!showAddsong)} 
              className="py-1 px-2 bg-primary text-white font-medium border border-primary hover:bg-white hover:text-primary dark:bg-white dark:text-primary dark:border-white dark:hover:bg-primary dark:hover:text-white text-sm transition-colors cursor-pointer"
            >
              {showAddsong ? "Close" : "Add"}
            </button>
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
                      addSong(input.value);
                      input.value = "";
                    }
                  }}
                />
                <button
                  className="px-4 py-2 transition-colors bg-primary medium hover:bg-white hover:text-primary border border-primary text-white dark:bg-white dark:hover:bg-primary dark:hover:text-white dark:text-primary dark:border-white cursor-pointer"
                  onClick={() => {
                    const input = document.getElementById("urlInput") as HTMLInputElement;
                    addSong(input.value);
                    input.value = "";
                  }}
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-xs opacity-70">Supports youtu.be and youtube.com/watch links</p>
            </div>
          )}
        </div>

        {/* Player Status */}
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

        {/* Playlist with Drag & Drop */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Playlist</h2>
            <button
              onClick={clearStorage} 
              className="py-1 px-2 font-medium bg-primary text-white border border-primary hover:bg-white hover:text-primary dark:bg-white dark:text-primary dark:border-white dark:hover:bg-primary dark:hover:text-white text-sm disabled:opacity-50 transition-colors cursor-pointer"
              disabled={songs.length === 0}
            >
              Clear All
            </button>
          </div>
          
          <ul
            className="space-y-2 overflow-y-auto overflow-x-hidden pr-1 flex-1 lg:max-h-[500px]"
          >
            {songs.map((song, idx) => (
              <li
                key={idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd} 
                className={`flex items-center gap-3 p-3  transition-colors flex-wrap sm:flex-nowrap cursor-pointer ${
                  idx === current
                    ? "bg-primary hover:bg-black hover:text-white text-white dark:bg-white/80 dark:text-primary dark:hover:bg-white dark:hover:text-primary"
                    : "bg-white/80 hover:bg-secondary hover:text-white dark:bg-primary dark:hover:bg-secondary dark:hover:text-white border-primary dark:border-white"
                } ${
                  draggedIndex === idx ? "opacity-50" : ""
                }`}
                onClick={() => playSong(idx)}
              >
                {/* Drag Handle */}
                <div className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0">
                  ⋮⋮
                </div>
                <img src={song.thumbnail} alt={song.title} className="w-12 h-12 object-cover shrink-0" loading="lazy" />
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate ">{song.title}</div>
                  <div className="text-xs">
                    Click to play {songs.length === 1 && " • Will repeat"}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-end shrink-0">
                  {idx === current && (
                    <span className="text-xl">
                      ♪
                    </span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSong(idx);
                    }}
                    className="px-2 py-1 bg-primary text-white font-medium border border-primary hover:bg-white/80 hover:text-primary dark:bg-white/80 dark:text-primary dark:border-white dark:hover:bg-primary dark:hover:text-white text-xs transition-colors cursor-pointer"
                    title="Delete song"
                  >
                    Delete
                  </button>
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
      </section>

      {/* Hidden YouTube Player */}
      <section>
        <div id="player" style={{ display: "none" }}></div>
      </section>
    </div>
  );
}
