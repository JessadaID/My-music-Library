import { useState, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface Song {
    id: string;
    title: string;
    thumbnail: string;
    url: string;
}

export interface PlaylistItem {
    id: string;
    name: string;
    songs: Song[];
}

export function usePlaylist() {
    // We keep the old key to attempt migration if needed, but the main state is now playlists
    const [playlists, setPlaylists] = useLocalStorage<PlaylistItem[]>("music_player_playlists", []);
    const [activePlaylistId, setActivePlaylistId] = useLocalStorage<string>("music_player_active_playlist", "");
    const [playingPlaylistId, setPlayingPlaylistId] = useLocalStorage<string>("music_player_playing_playlist", "");
    const [current, setCurrent] = useLocalStorage<number>("music_player_current", 0);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Migration logic from old `music_player_songs` to new `music_player_playlists`
    useEffect(() => {
        if (typeof window !== "undefined") {
            const existingPlaylistsStr = window.localStorage.getItem("music_player_playlists");
            let hasExistingPlaylists = false;
            try {
                if (existingPlaylistsStr) {
                    const parsed = JSON.parse(existingPlaylistsStr);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        hasExistingPlaylists = true;
                    }
                }
            } catch (e) { }

            if (!hasExistingPlaylists) {
                const oldSongsData = window.localStorage.getItem("music_player_songs");
                if (oldSongsData) {
                    try {
                        const oldSongs: Song[] = JSON.parse(oldSongsData);
                        if (Array.isArray(oldSongs) && oldSongs.length > 0) {
                            const defaultPlaylist: PlaylistItem = {
                                id: "default-playlist",
                                name: "My Playlist",
                                songs: oldSongs
                            };
                            setPlaylists([defaultPlaylist]);
                            setActivePlaylistId(defaultPlaylist.id);
                            // Clean up old data to prevent re-migration
                            window.localStorage.removeItem("music_player_songs");
                            return;
                        }
                    } catch (e) {
                        console.error("Migration failed", e);
                    }
                }

                // Initialize a default playlist if completely empty
                const defaultPlaylist: PlaylistItem = {
                    id: "default-playlist",
                    name: "My Playlist",
                    songs: []
                };
                setPlaylists([defaultPlaylist]);
                setActivePlaylistId(defaultPlaylist.id);
            }
        }
    }, [setPlaylists, setActivePlaylistId]);

    // Ensure playingPlaylistId is set initially
    useEffect(() => {
        if (!playingPlaylistId && activePlaylistId) {
            setPlayingPlaylistId(activePlaylistId);
        }
    }, [playingPlaylistId, activePlaylistId, setPlayingPlaylistId]);

    // Derived state for the currently active (viewing) playlist
    const activePlaylist = playlists.find(p => p.id === activePlaylistId) || playlists[0];
    const songs = activePlaylist?.songs || [];

    // Derived state for the currently *playing* playlist
    const playingPlaylist = playlists.find(p => p.id === playingPlaylistId) || activePlaylist;
    const playingSongs = playingPlaylist?.songs || [];

    const updatePlaylistSongs = (playlistId: string | undefined, updater: (prevSongs: Song[]) => Song[]) => {
        const targetId = playlistId || activePlaylistId;
        if (!targetId) return;

        setPlaylists(prevPlaylists =>
            prevPlaylists.map(playlist => {
                if (playlist.id === targetId) {
                    return { ...playlist, songs: updater(playlist.songs) };
                }
                return playlist;
            })
        );
    };

    // --- Playlist Management Methods ---
    const createNewPlaylist = () => {
        const name = prompt("ชื่อเพลย์ลิสต์ใหม่:");
        if (!name || !name.trim()) return;
        createPlaylistWithName(name);
    };

    const createPlaylistWithName = (name: string) => {
        const cleanName = name.trim();
        if (!cleanName) return null;

        const newId = Math.random().toString(36).substring(2, 9);
        const newPlaylist: PlaylistItem = {
            id: newId,
            name: cleanName,
            songs: []
        };
        setPlaylists(prev => [...prev, newPlaylist]);
        setActivePlaylistId(newPlaylist.id);
        setCurrent(0);
        return newId;
    };

    const deletePlaylist = (id: string, onDeleted?: (wasPlaying: boolean) => void) => {
        if (playlists.length <= 1) {
            alert("คุณต้องมีอย่างน้อยหนึ่งเพลย์ลิสต์");
            return;
        }
        if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเพลย์ลิสต์นี้?")) {
            const wasPlaying = playingPlaylistId === id;
            if (onDeleted) onDeleted(wasPlaying);

            setPlaylists(prev => {
                const newPlaylists = prev.filter(p => p.id !== id);
                if (activePlaylistId === id) {
                    setActivePlaylistId(newPlaylists[0].id);
                }
                if (wasPlaying) {
                    setPlayingPlaylistId(newPlaylists[0].id);
                    setCurrent(0);
                }
                return newPlaylists;
            });
        }
    };

    // --- Song Management Methods (Operates on active playlist) ---
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

        updatePlaylistSongs(activePlaylistId, (prevSongs: Song[]) => {
            const newSongs = [...prevSongs];
            const draggedSong = newSongs[draggedIndex];

            // Remove dragged item
            newSongs.splice(draggedIndex, 1);
            // Insert at drop position
            newSongs.splice(dropIndex, 0, draggedSong);

            // Update current index if needed (ONLY if we are dragging in the playing playlist)
            if (activePlaylistId === playingPlaylistId) {
                if (draggedIndex === current) {
                    setCurrent(dropIndex);
                } else if (draggedIndex < current && dropIndex >= current) {
                    setCurrent(current - 1);
                } else if (draggedIndex > current && dropIndex <= current) {
                    setCurrent(current + 1);
                }
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
        onSuccess?: (id: string, isFirstSong: boolean) => void,
        targetPlaylistId?: string
    ) => {
        const resolvedPlaylistId = targetPlaylistId || activePlaylistId;
        if (!resolvedPlaylistId) return;

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

            let isFirstSong = false;

            updatePlaylistSongs(resolvedPlaylistId, (prevSongs: Song[]) => {
                const newSongs = [...prevSongs, newSong];
                isFirstSong = prevSongs.length === 0;
                return newSongs;
            });

            if (onSuccess) {
                onSuccess(id, isFirstSong);
            }
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
        if (!activePlaylist || activePlaylist.songs.length === 0) return;

        if (onDelete) {
            onDelete(index === current);
        }

        updatePlaylistSongs(activePlaylistId, (prevSongs: Song[]) => {
            const newSongs = prevSongs.filter((_, idx) => idx !== index);

            // Only adjust 'current' if we are deleting from the currently playing playlist
            if (activePlaylistId === playingPlaylistId) {
                if (newSongs.length === 0) {
                    setCurrent(0);
                } else if (index < current) {
                    setCurrent(current - 1);
                } else if (index === current) {
                    const newCurrent = current >= newSongs.length ? 0 : current;
                    setCurrent(newCurrent);
                }
            }
            return newSongs;
        });
    };

    const clearAllSongs = () => {
        if (confirm(`ต้องการจะลบเพลงทั้งหมดในเพลย์ลิสต์ "${activePlaylist?.name}" ใช่หรือไม่?`)) {
            updatePlaylistSongs(activePlaylistId, () => []);
            setCurrent(0);
            return true; // Indicates successfully cleared
        }
        return false;
    };

    return {
        playlists,
        activePlaylist,
        activePlaylistId,
        setActivePlaylistId,
        playingPlaylistId,
        setPlayingPlaylistId,
        createNewPlaylist,
        createPlaylistWithName,
        deletePlaylist,
        songs, // Songs of the visible tab
        playingSongs, // Songs of the playing tab
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
