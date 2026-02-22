import { useLocalStorage } from "./useLocalStorage";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: number;
}

export function useChatHistory() {
    const [messages, setMessages] = useLocalStorage<ChatMessage[]>("music_player_chat_history", []);

    const addMessage = (role: ChatRole, content: string) => {
        const newMessage: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            role,
            content,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, newMessage]);
    };

    const clearHistory = () => {
        setMessages([]);
    };

    return {
        messages,
        addMessage,
        clearHistory,
    };
}
