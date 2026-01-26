import { useState, useRef, useEffect } from "react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export default function AIChatSidebar() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Placeholder response - replace with actual AI API call
        setTimeout(() => {
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content:
                    "I'm your AI canvas assistant! I can help you brainstorm ideas, analyze your drawings, or suggest improvements. (API integration coming soon)",
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsLoading(false);
        }, 1000);
    };

    if (isCollapsed) {
        return (
            <button
                onClick={() => setIsCollapsed(false)}
                style={{
                    position: "fixed",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 1000,
                    background: "var(--color-surface)",
                    border: "2px solid var(--color-stroke)",
                    borderRadius: "8px",
                    padding: "12px 8px",
                    cursor: "pointer",
                    fontFamily: "var(--font-hand)",
                    fontSize: "14px",
                    color: "var(--color-text)",
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                }}
            >
                💬 AI Chat
            </button>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: "100%",
                background: "var(--color-surface)",
                borderLeft: "2px solid var(--color-stroke)",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: "2px solid var(--color-stroke)",
                    background: "var(--color-bg)",
                }}
            >
                <h2
                    style={{
                        fontFamily: "var(--font-hand)",
                        fontSize: "18px",
                        margin: 0,
                        color: "var(--color-text)",
                    }}
                >
                    💬 AI Assistant
                </h2>
                <button
                    onClick={() => setIsCollapsed(true)}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "18px",
                        color: "var(--color-text-muted)",
                        padding: "4px",
                    }}
                    title="Collapse sidebar"
                >
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                }}
            >
                {messages.length === 0 && (
                    <div
                        style={{
                            textAlign: "center",
                            color: "var(--color-text-muted)",
                            fontFamily: "var(--font-body)",
                            fontSize: "14px",
                            marginTop: "48px",
                        }}
                    >
                        <p style={{ fontSize: "32px", marginBottom: "12px" }}>🎨</p>
                        <p>Start a conversation about your canvas!</p>
                        <p style={{ fontSize: "12px", marginTop: "8px" }}>
                            Ask for ideas, feedback, or assistance
                        </p>
                    </div>
                )}
                {messages.map((message) => (
                    <div
                        key={message.id}
                        style={{
                            alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                            maxWidth: "85%",
                            padding: "10px 14px",
                            borderRadius: "12px",
                            background:
                                message.role === "user"
                                    ? "var(--color-fill-1)"
                                    : "var(--color-bg)",
                            border:
                                message.role === "user"
                                    ? "none"
                                    : "1px solid var(--color-stroke-muted)",
                            fontFamily: "var(--font-body)",
                            fontSize: "14px",
                            lineHeight: "1.5",
                            color: "var(--color-text)",
                        }}
                    >
                        {message.content}
                    </div>
                ))}
                {isLoading && (
                    <div
                        style={{
                            alignSelf: "flex-start",
                            padding: "10px 14px",
                            borderRadius: "12px",
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-stroke-muted)",
                            fontFamily: "var(--font-body)",
                            fontSize: "14px",
                            color: "var(--color-text-muted)",
                        }}
                    >
                        Thinking...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={handleSubmit}
                style={{
                    display: "flex",
                    gap: "8px",
                    padding: "12px 16px",
                    borderTop: "2px solid var(--color-stroke)",
                    background: "var(--color-bg)",
                }}
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your canvas..."
                    style={{
                        flex: 1,
                        padding: "10px 14px",
                        border: "2px solid var(--color-stroke)",
                        borderRadius: "8px",
                        background: "var(--color-surface)",
                        fontFamily: "var(--font-body)",
                        fontSize: "14px",
                        color: "var(--color-text)",
                        outline: "none",
                    }}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{
                        padding: "10px 16px",
                        background: "var(--color-fill-1)",
                        border: "2px solid var(--color-stroke)",
                        borderRadius: "8px",
                        cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                        fontFamily: "var(--font-hand)",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        opacity: isLoading || !input.trim() ? 0.6 : 1,
                    }}
                >
                    Send
                </button>
            </form>
        </div>
    );
}
