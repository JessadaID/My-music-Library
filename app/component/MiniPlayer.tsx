"use client";
import {
    MdSkipPrevious,
    MdPause,
    MdPlayArrow,
    MdSkipNext,
    MdClose,
    MdVolumeOff,
    MdVolumeUp,
    MdMusicNote,
} from "react-icons/md";
import { Song } from "../hooks/usePlaylist";

interface MiniPlayerProps {
    song: Song | undefined;
    isPlaying: boolean;
    progress: number;
    duration: number;
    volume: number;
    isPlayerReady: boolean;
    hasSongs: boolean;
    onPlay: () => void;
    onPause: () => void;
    onPrev: () => void;
    onNext: () => void;
    onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onVolumeChange: (v: number) => void;
    onClose: () => void;
}

// Format seconds to mm:ss string
function formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

// PiP mini player — thumbnail fills the window, controls overlay on top
export default function MiniPlayer({
    song,
    isPlaying,
    progress,
    duration,
    volume,
    isPlayerReady,
    hasSongs,
    onPlay,
    onPause,
    onPrev,
    onNext,
    onSeek,
    onVolumeChange,
    onClose,
}: MiniPlayerProps) {
    const disabled = !isPlayerReady || !hasSongs;
    const isMuted = volume === 0;

    return (
        <div
            style={{
                position: "relative",
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                background: "#000",
                fontFamily: "sans-serif",
            }}
        >
            {/* Full-size thumbnail background */}
            {song?.thumbnail ? (
                <img
                    src={song.thumbnail}
                    alt={song?.title ?? ""}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                />
            ) : (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#111",
                    }}
                >
                    <MdMusicNote style={{ fontSize: 64, color: "rgba(255,255,255,0.2)" }} />
                </div>
            )}

            {/* Dark gradient overlay — bottom-heavy for controls readability */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.92) 100%)",
                }}
            />

            {/* Close button — top right */}
            <button
                onClick={onClose}
                title="ปิด PiP"
                style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(0,0,0,0.45)",
                    border: "none",
                    borderRadius: "50%",
                    color: "#fff",
                    cursor: "pointer",
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    padding: 0,
                    backdropFilter: "blur(4px)",
                }}
            >
                <MdClose style={{ fontSize: 15 }} />
            </button>

            {/* Bottom overlay — song info + controls */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "6px 10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    zIndex: 5,
                }}
            >
                {/* Song title */}
                <div
                    style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                        lineHeight: 1.3,
                    }}
                    title={song?.title}
                >
                    {song?.title || "No song selected"}
                </div>

                {/* Progress bar + timestamps */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", minWidth: 28, textAlign: "right" }}>
                        {formatTime(progress)}
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        value={progress || 0}
                        onChange={onSeek}
                        disabled={disabled}
                        style={{
                            flex: 1,
                            accentColor: "#fff",
                            height: 3,
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.4 : 1,
                        }}
                    />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", minWidth: 28 }}>
                        {formatTime(duration)}
                    </span>
                </div>

                {/* Controls row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden" }}>
                    {/* Playback buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <button onClick={onPrev} disabled={disabled} style={ctrlBtn(disabled)} title="ก่อนหน้า">
                            <MdSkipPrevious style={{ fontSize: 22 }} />
                        </button>

                        {isPlaying ? (
                            <button onClick={onPause} disabled={disabled} style={playBtn(disabled)} title="หยุดชั่วคราว">
                                <MdPause style={{ fontSize: 22 }} />
                            </button>
                        ) : (
                            <button onClick={onPlay} disabled={disabled} style={playBtn(disabled)} title="เล่น">
                                <MdPlayArrow style={{ fontSize: 22 }} />
                            </button>
                        )}

                        <button onClick={onNext} disabled={disabled} style={ctrlBtn(disabled)} title="ถัดไป">
                            <MdSkipNext style={{ fontSize: 22 }} />
                        </button>
                    </div>

                    {/* Volume control */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, width: 100, flexShrink: 0, marginRight: 2 }}>
                        <button
                            onClick={() => onVolumeChange(isMuted ? 80 : 0)}
                            style={ctrlBtn(!isPlayerReady)}
                            title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
                        >
                            {isMuted
                                ? <MdVolumeOff style={{ fontSize: 17 }} />
                                : <MdVolumeUp style={{ fontSize: 17 }} />
                            }
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={volume}
                            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                            disabled={!isPlayerReady}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                accentColor: "rgba(255,255,255,0.9)",
                                height: 2,
                                cursor: !isPlayerReady ? "not-allowed" : "pointer",
                                opacity: !isPlayerReady ? 0.3 : 0.8,
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper styles
function ctrlBtn(disabled: boolean): React.CSSProperties {
    return {
        background: "transparent",
        border: "none",
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 0.9,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
        borderRadius: 4,
        width: 30,
        height: 30,
    };
}

function playBtn(disabled: boolean): React.CSSProperties {
    return {
        ...ctrlBtn(disabled),
        background: "rgba(255,255,255,0.2)",
        borderRadius: "50%",
        width: 36,
        height: 36,
        backdropFilter: "blur(4px)",
    };
}
