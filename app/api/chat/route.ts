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
            description: "Play a specific song from the music library",
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
                },
                required: ["song_name"],
            },
        }
    },

    {
        type: "function",
        function: {
            name: "search_and_add_youtube_song",
            description: "Search YouTube and add a new song to the playlist when the user asks for a song that IS NOT in the current library. Do not use this if the song is already in the library.",
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
                },
                required: ["song_name"],
            },
        }
    }
];

export async function POST(req: Request) {
    try {
        const { message, songs = [] } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const songListContext = songs.length > 0
            ? `Current local library songs: ${songs.map((s: any) => s.title).join(", ")}.`
            : "The local library is currently empty.";

        const messages = [
            {
                role: "system",
                content: `You are a helpful AI music assistant. Your job is to help users play music from their library or add new songs from YouTube. 
                
${songListContext}

Use the provided tools to perform actions based on the user's request:
1. If the user wants to play a song, FIRST check if it exists in the 'Current local library songs'. Notes: The titles in the local library usually come from YouTube videos so they might include extra phrases like "Official Video" or the artist's channel name. If the requested song seems to match a title in the library, use the \`play_music\` tool ONLY.
2. If the user wants to play a song that IS NOT in the current library, you MUST use the \`search_and_add_youtube_song\` tool to add it and play it. DO NOT use the \`play_music\` tool for songs that are not in the library.

IMPORTANT: Do not wrap tool calls in xml or markdown. Only return the tool call.`,
            },
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
                            const query = `${args.song_name} ${args.artist || ''} official music video`;
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

                // Attempt to extract XML-like tool call if present (e.g. <function=play_music>{"song_name": "..."}</function>)
                const match = failedGen.match(/<function=(\w+)(?:.*?|)>([\s\S]*?)<\/function>/i) || failedGen.match(/<tool_call>\n*{"name":\s*"([^"]+)",\s*"arguments":\s*({[^}]+})}\n*<\/tool_call>/i);

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
                                const query = `${parsedArgs.song_name} ${parsedArgs.artist || ''} official music video`;
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
