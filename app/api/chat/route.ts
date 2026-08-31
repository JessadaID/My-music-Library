import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Initialize Groq client lazily to avoid build errors if env var is missing
const getGroqClient = () => {
    return new Groq({
        apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build', // Fallback for build time
    });
};

const tools = [
    {
        type: "function",
        function: {
            name: "play_music",
            description: "Play a specific song from the current library",
            parameters: {
                type: "object",
                properties: {
                    song_name: {
                        type: "string",
                        description: "The name of the song to play",
                    },
                    artist: {
                        type: "string",
                        description: "The artist of the song",
                    },
                    target_playlist_name: {
                        type: "string",
                        description: "Optional. The name of the playlist to play the song from. If the user doesn't specify, leave empty to use the current one.",
                    }
                },
                required: ["song_name"],
            },
        }
    },
    {
        type: "function",
        function: {
            name: "search_and_add_youtube_song",
            description: "Search YouTube and add a new song to the library when the user asks for a song that IS NOT currently present. Do not use this if the song is already in the library.",
            parameters: {
                type: "object",
                properties: {
                    song_name: {
                        type: "string",
                        description: "The name of the song to search for",
                    },
                    artist: {
                        type: "string",
                        description: "The artist of the song",
                    },
                    target_playlist_name: {
                        type: "string",
                        description: "Optional. The name of the playlist to add the new song into. If it doesn't exist, it will be automatically created.",
                    }
                },
                required: ["song_name"],
            },
        }
    },
    {
        type: "function",
        function: {
            name: "create_playlist",
            description: "Create a new playlist",
            parameters: {
                type: "object",
                properties: {
                    playlist_name: {
                        type: "string",
                        description: "The name of the new playlist",
                    }
                },
                required: ["playlist_name"],
            },
        }
    },
    {
        type: "function",
        function: {
            name: "switch_playlist",
            description: "Switch the active visible playlist to another one",
            parameters: {
                type: "object",
                properties: {
                    playlist_name: {
                        type: "string",
                        description: "The name of the playlist to switch to",
                    }
                },
                required: ["playlist_name"],
            },
        }
    }
];

export async function POST(req: Request) {
    try {
        const { message, songs = [], playlists = [], chatHistory = [] } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        let playlistContext = "The library is currently empty.";
        if (playlists && playlists.length > 0) {
            playlistContext = "AVAILABLE PLAYLISTS:\n";
            for (const pl of playlists) {
                playlistContext += `- Playlist "${pl.name}": Contains ${pl.songs.length > 0 ? pl.songs.map((s: any) => s.title).join(", ") : "no songs"}\n`;
            }
        }

        const pastMessages = chatHistory.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
        }));

        const messages = [
            {
                role: "system",
                content: `You are a helpful AI music assistant. Your job is to help users manage playlists, play music from their library, or add new songs from YouTube. 
                
${playlistContext}

Use the provided tools to perform actions based on the user's request:
1. Playlist Management: You can create new playlists (create_playlist) or switch to different playlists (switch_playlist) if the user asks.
2. If the user wants to play a song, FIRST check if it exists in ANY of the "AVAILABLE PLAYLISTS". If it does, use the \`play_music\` tool ONLY, optionally specifying the \`target_playlist_name\` if they asked for a specific one or if it's only in one place.
3. If the user wants to play a song that IS NOT in any playlist, you MUST use the \`search_and_add_youtube_song\` tool to add it and play it. You can optionally pass \`target_playlist_name\` to put it in a specific playlist. If they ask to add physical to a playlist that doesn't exist yet, it'll create it for them automatically if you give the \`target_playlist_name\`.
4. If a user asks to add a song to a specific playlist (like "add song X to playlist Y"), use \`search_and_add_youtube_song\` passing "Y" as the \`target_playlist_name\`.

IMPORTANT: Do not wrap tool calls in xml or markdown. Only return the tool call.`,
            },
            ...pastMessages,
            {
                role: "user",
                content: message,
            },
        ];

        try {
            const chatCompletion = await getGroqClient().chat.completions.create({
                messages: messages as any,
                model: "llama-3.3-70b-versatile",
                tools: tools as any,
                tool_choice: "auto",
                max_tokens: 1024,
            });

            const responseMessage = chatCompletion.choices[0]?.message;

            // Check if the AI wants to call a tool
            if (responseMessage?.tool_calls?.length) {
                const processedToolCalls = await Promise.all(responseMessage.tool_calls.map(async (tool: any) => {
                    const name = tool.function.name;
                    const args = JSON.parse(tool.function.arguments);

                    if (name === "search_and_add_youtube_song") {
                        try {
                            const ytSearch = (await import('yt-search')).default;
                            const query = `${args.song_name} ${args.artist || ''} audio`;
                            const searchResult = await ytSearch(query);

                            if (searchResult && searchResult.videos.length > 0) {
                                const bestVideo = searchResult.videos[0];
                                return {
                                    name: "search_and_add_youtube_song",
                                    arguments: {
                                        ...args,
                                        youtube_url: bestVideo.url,
                                        youtube_title: bestVideo.title,
                                        youtube_id: bestVideo.videoId,
                                    }
                                };
                            }
                        } catch (e) {
                            console.error("ytSearch error:", e);
                        }
                    }

                    return {
                        name,
                        arguments: args,
                    };
                }));

                return NextResponse.json({
                    type: "tool_call",
                    tool_calls: processedToolCalls,
                    content: responseMessage.content
                });
            }

            // Normal text response
            return NextResponse.json({
                type: "text",
                content: responseMessage?.content || "I couldn't understand that request.",
            });

        } catch (groqError: any) {
            // Handle specific tool_use_failed error from Groq
            if (groqError.error?.code === 'tool_use_failed' && groqError.error?.failed_generation) {
                console.warn("Groq tool_use_failed caught, attempting manual parse");
                const failedGen = groqError.error.failed_generation;

                const match = failedGen.match(/<function=(\w+)[^\{]*(\{[\s\S]*?\})[^<]*<\/function>/i) ||
                    failedGen.match(/<tool_call>\n*{"name":\s*"([^"]+)",\s*"arguments":\s*({[^}]+})}\n*<\/tool_call>/i) ||
                    failedGen.match(/<function=(\w+)(?:.*?|)>([\s\S]*?)<\/function>/i) ||
                    failedGen.match(/<function=(\w+)\((\{[\s\S]*?\})\)<\/function>/i);

                if (match) {
                    const toolName = match[1];
                    try {
                        let toolArgs = match[2];
                        // Sometimes it's just raw JSON after the =, sometimes it's well formed
                        if (toolArgs.startsWith('=')) toolArgs = toolArgs.substring(1);

                        const parsedArgs = JSON.parse(toolArgs);

                        // If it's the search tool, we must still run yt-search manually here
                        if (toolName === "search_and_add_youtube_song") {
                            try {
                                const ytSearch = (await import('yt-search')).default;
                                const query = `${parsedArgs.song_name} ${parsedArgs.artist || ''} audio`;
                                const searchResult = await ytSearch(query);

                                if (searchResult && searchResult.videos.length > 0) {
                                    const bestVideo = searchResult.videos[0];
                                    parsedArgs.youtube_url = bestVideo.url;
                                    parsedArgs.youtube_title = bestVideo.title;
                                    parsedArgs.youtube_id = bestVideo.videoId;
                                }
                            } catch (e) {
                                console.error("fallback ytSearch error:", e);
                            }
                        }

                        return NextResponse.json({
                            type: "tool_call",
                            tool_calls: [{
                                name: toolName,
                                arguments: parsedArgs
                            }],
                            content: ""
                        });
                    } catch (parseErr) {
                        console.error("Failed to parse fallback tool args", parseErr);
                    }
                }
            }
            throw groqError; // Re-throw if not handled
        }

    } catch (error: any) {
        console.error("Groq API Error:", error);
        return NextResponse.json({ error: error.message || "An error occurred during AI processing" }, { status: 500 });
    }
}
