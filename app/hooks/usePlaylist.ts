import { useState } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface Song {
    id: string;
    title: string;
    thumbnail: string;
    url: string;
}

export function usePlaylist() {
    const [songs, setSongs] = useLocalStorage<Song[]>("music_player_songs", []);
    const [current, setCurrent] = useLocalStorage<number>("music_player_current", 0);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        setSongs((prevSongs: Song[]) => {
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

    const addSong = async (
        url: string,
        onSuccess?: (id: string, isFirstSong: boolean) => void
    ) => {
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

            setSongs((prevSongs: Song[]) => {
                const newSongs = [...prevSongs, newSong];
                if (onSuccess) {
                    onSuccess(id, prevSongs.length === 0);
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

    const deleteSong = (
        index: number,
        onDelete?: (isCurrent: boolean) => void
    ) => {
        if (songs.length === 0) return;

        if (onDelete) {
            onDelete(index === current);
        }

        setSongs((prevSongs: Song[]) => {
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

    const clearAllSongs = () => {
        if (confirm("ต้องการจะลบเพลงทั้งหมดใช่หรือไม่?")) {
            setSongs([]);
            setCurrent(0);
            return true; // Indicates successfully cleared
        }
        return false;
    };

    return {
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
    };
}
