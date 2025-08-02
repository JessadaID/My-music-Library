"use client";
import { useEffect, useRef, useState } from "react";

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
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  // Load YouTube API
  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player("player", {
        height: "0",
        width: "0",
        playerVars: { controls: 0, autoplay: 1 },
        events: {
          onStateChange: onPlayerStateChange,
        },
      });
    };

    return () => clearInterval(intervalRef.current);
  }, []);

  const onPlayerStateChange = (event: any) => {
  if (event.data === 1) {
    // Playing
    setDuration(playerRef.current.getDuration());
    intervalRef.current = setInterval(() => {
      setProgress(playerRef.current.getCurrentTime());
    }, 500);
  } else {
    clearInterval(intervalRef.current);
  }
  if (event.data == 0) {
    // วิดีโอจบ → เล่นเพลงถัดไปอัตโนมัติ
        nextSong();
  }
};


  // Add song with oEmbed to get title and thumbnail
  const addSong = async (url: string) => {
    const id = extractVideoId(url);
    if (!id) return alert("Invalid YouTube URL");

    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
    );
    const data = await res.json();
    //console.log(data);
    const newSong: Song = {
      id,
      title: data.title,
      thumbnail: data.thumbnail_url,
      url,
    };
    await setSongs((prevSongs) => {
      const newSongs = [...prevSongs, newSong];
      console.log("Added song, new playlist is:", newSongs);
      return newSongs;
    });

    console.log("Added song:", songs);
  };

  const extractVideoId = (url: string) => {
    const regex = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    //console.log(match);
    return match ? match[1] : null;
  };

   const playSong = (index: number) => {
    if (!playerRef.current || songs.length === 0) return;
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
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    playerRef.current.seekTo(newTime, true);
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screenp-6">
      <h1 className="text-3xl font-bold mb-4">🎵 My Music Library</h1>

      {/* Add Song */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          id="urlInput"
          placeholder="Paste YouTube URL..."
          className="p-2 rounded text-black w-96"
          onKeyDown={(e) => {
            if (e.key === "Enter") addSong((e.target as HTMLInputElement).value);
          }}
        />
        <button
          className="px-4 py-2 bg-green-500 rounded"
          onClick={() => {
            const input = document.getElementById("urlInput") as HTMLInputElement;
            addSong(input.value);
            input.value = "";
          }}
        >
          Add
        </button>
      </div>

      {/* Playlist */}
      <ul className="mb-4">
        {songs.map((song, idx) => (
          <li
            key={idx}
            className={`flex items-center gap-3 p-2 rounded cursor-pointer ${
              idx === current ? "bg-green-700" : "bg-gray-700"
            }`}
            onClick={() => playSong(idx)}
          >
            <img src={song.thumbnail} alt={song.title} className="w-12 h-8 rounded" />
            <span>{song.title}</span>
          </li>
        ))}
      </ul>

      {/* Controls + Progress Bar */}
      <div className="flex flex-col gap-4 max-w-xl">
        <div className="flex items-center gap-2 text-sm">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="w-full"
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex gap-4">
          <button onClick={prevSong} className="px-4 py-2 bg-blue-500 rounded">
            ⏮ Prev
          </button>
          <button onClick={() => playerRef.current?.playVideo()} className="px-4 py-2 bg-green-500 rounded">
            ▶ Play
          </button>
          <button
            onClick={() => playerRef.current?.pauseVideo()}
            className="px-4 py-2 bg-yellow-500 rounded"
          >
            ⏸ Pause
          </button>
          <button onClick={nextSong} className="px-4 py-2 bg-blue-500 rounded">
            ⏭ Next
          </button>
        </div>
      </div>

      {/* Hidden Player */}
      <div id="player"></div>
    </div>
  );
}
