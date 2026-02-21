import { useEffect } from "react";

interface Song {
    id: string;
    title: string;
    thumbnail: string;
    url: string;
}

export function useMediaSession(
    song: Song | undefined,
    isPlaying: boolean,
    duration: number,
    progress: number,
    handlers: {
        handlePlay: () => void;
        handlePause: () => void;
        prevSong: () => void;
        nextSong: () => void;
    }
) {
    const defaultSiteTitle = "MineTube";

    useEffect(() => {
        if (typeof document === "undefined") return;
        const titlePrefix = song ? (isPlaying ? "▶ " : "⏸ ") : "";
        document.title = song
            ? `${titlePrefix}${song.title} — ${defaultSiteTitle}`
            : defaultSiteTitle;
    }, [song, isPlaying]);

    useEffect(() => {
        if (typeof navigator === "undefined") return;
        const anyNavigator = navigator as any;
        if (!("mediaSession" in anyNavigator)) return;
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
            anyNavigator.mediaSession.setActionHandler("play", handlers.handlePlay);
            anyNavigator.mediaSession.setActionHandler("pause", handlers.handlePause);
            anyNavigator.mediaSession.setActionHandler("previoustrack", handlers.prevSong);
            anyNavigator.mediaSession.setActionHandler("nexttrack", handlers.nextSong);
        } catch (e) {
            console.error("MediaSession error", e);
        }
    }, [song, isPlaying, handlers]);

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
            console.error("MediaSession position error", e);
        }
    }, [progress, duration]);
}
