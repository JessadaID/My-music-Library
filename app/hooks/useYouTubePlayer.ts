import { useRef, useState, useEffect, useCallback } from "react";

interface Song {
    id: string;
    title: string;
    thumbnail: string;
    url: string;
}

export function useYouTubePlayer(
    songs: Song[],
    current: number,
    setCurrent: (index: number) => void
) {
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const isAutoPlayingRef = useRef(false);

    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);

    const songsRef = useRef(songs);
    const currentRef = useRef(current);

    useEffect(() => {
        songsRef.current = songs;
    }, [songs]);

    useEffect(() => {
        currentRef.current = current;
    }, [current]);

    // Load YouTube API
    useEffect(() => {
        if ((window as any).YT) {
            if (!isPlayerReady) initializePlayer();
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
        const origin = typeof window !== "undefined" ? window.location.origin : undefined;
        playerRef.current = new (window as any).YT.Player("player", {
            height: "200",
            width: "200",
            host: "https://www.youtube-nocookie.com",
            playerVars: {
                controls: 0,
                autoplay: 0,
                enablejsapi: 1,
                rel: 0,
                origin: origin,
            },
            events: {
                onReady: () => {
                    setIsPlayerReady(true);
                    playerRef.current?.setVolume(volume);
                    const currentSongs = songsRef.current;
                    const currentIndex = currentRef.current;
                    if (currentSongs.length > 0 && currentSongs[currentIndex]) {
                        setTimeout(() => {
                            playerRef.current?.cueVideoById(currentSongs[currentIndex].id);
                        }, 500);
                    }
                },
                onStateChange: (event: any) => {
                    if (event.data === 1) { // Playing
                        setIsPlaying(true);
                        setDuration(playerRef.current?.getDuration() || 0);
                        intervalRef.current = setInterval(() => {
                            setProgress(playerRef.current?.getCurrentTime() || 0);
                        }, 1000);
                    } else if (event.data === 2) { // Paused
                        setIsPlaying(false);
                        clearInterval(intervalRef.current);
                    } else if (event.data === 0) { // Ended
                        setIsPlaying(false);
                        clearInterval(intervalRef.current);
                        setProgress(0);
                        setTimeout(() => {
                            playNextSong();
                        }, 1000);
                    }
                },
                onError: (event: any) => {
                    console.error("YouTube Player Error:", event.data);
                    // Error 150/101: Video owner does not allow embedded playback
                    // Error 100: Video not found or removed
                    // Error 2/5: Invalid parameter / HTML5 error
                    isAutoPlayingRef.current = false;
                    setTimeout(() => {
                        playNextSong();
                    }, 2000);
                },
            },
        });
    };

    const playNextSong = useCallback(() => {
        const currentSongs = songsRef.current;
        const currentIndex = currentRef.current;

        if (isAutoPlayingRef.current) return;
        if (currentSongs.length === 0) return;

        isAutoPlayingRef.current = true;
        try {
            let nextIndex;
            if (currentSongs.length === 1) {
                nextIndex = currentIndex;
            } else {
                nextIndex = (currentIndex + 1) % currentSongs.length;
            }

            setCurrent(nextIndex);
            const nextSong = currentSongs[nextIndex];

            if (playerRef.current && nextSong) {
                if (currentSongs.length === 1) {
                    playerRef.current.seekTo(0, true);
                    playerRef.current.playVideo();
                } else {
                    playerRef.current.loadVideoById(nextSong.id);
                }
            }

            setTimeout(() => {
                isAutoPlayingRef.current = false;
            }, 2000);
        } catch (error) {
            console.error("Error in playNextSong:", error);
            isAutoPlayingRef.current = false;
        }
    }, [setCurrent]);

    const loadVideo = (id: string) => {
        if (playerRef.current && isPlayerReady) {
            isAutoPlayingRef.current = false;
            playerRef.current.loadVideoById(id);
        }
    };

    const playVideo = () => {
        if (playerRef.current && isPlayerReady) {
            playerRef.current.playVideo();
        }
    };

    const pauseVideo = () => {
        if (playerRef.current && isPlayerReady) {
            playerRef.current.pauseVideo();
        }
    };

    const stopVideo = () => {
        if (playerRef.current && isPlayerReady) {
            playerRef.current.stopVideo();
            setIsPlaying(false);
            setProgress(0);
            clearInterval(intervalRef.current);
        }
    };

    const seekTo = (seconds: number) => {
        setProgress(seconds);
        if (playerRef.current && isPlayerReady) {
            playerRef.current.seekTo(seconds, true);
        }
    };

    const getVideoData = () => {
        if (playerRef.current && isPlayerReady) {
            return playerRef.current.getVideoData();
        }
        return null;
    }

    const changeVolume = (level: number) => {
        setVolume(level);
        if (playerRef.current && isPlayerReady) {
            playerRef.current.setVolume(level);
        }
    };

    return {
        isPlayerReady,
        isPlaying,
        setIsPlaying,
        progress,
        setProgress,
        duration,
        setDuration,
        playerRef,
        intervalRef,
        loadVideo,
        playVideo,
        pauseVideo,
        stopVideo,
        seekTo,
        getVideoData,
        volume,
        changeVolume
    };
}
