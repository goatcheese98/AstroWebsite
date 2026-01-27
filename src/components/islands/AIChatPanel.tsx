import { useState, useRef, useEffect } from "react";
import { analyzeCanvasLayout, formatSpatialDescription } from "../../lib/canvas-spatial-analysis";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    drawingCommand?: any;
}

type ModelType = "claude-sonnet-4-20250514" | "claude-haiku-4-20250514";
type ChatMode = "text" | "image";

interface AIChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [model] = useState<ModelType>("claude-sonnet-4-20250514"); // Always use Sonnet
    const [chatMode, setChatMode] = useState<ChatMode>("text");
    const [error, setError] = useState<string | null>(null);
    const [canvasState, setCanvasState] = useState<any>(null);
    const [panelWidth, setPanelWidth] = useState(420);
    const [isResizing, setIsResizing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handleCanvasUpdate = (event: any) => {
            setCanvasState(event.detail);
        };

        window.addEventListener("excalidraw:state-update", handleCanvasUpdate);
        window.dispatchEvent(new CustomEvent("excalidraw:get-state"));

        return () => {
            window.removeEventListener("excalidraw:state-update", handleCanvasUpdate);
        };
    }, []);

    // Resize functionality
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const newWidth = window.innerWidth - e.clientX;
            const minWidth = 320;
            const maxWidth = window.innerWidth * 0.8;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                setPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isResizing) {
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const executeDrawingCommand = (elementsArray: any[]) => {
        try {
            if (!Array.isArray(elementsArray)) return false;
            const event = new CustomEvent("excalidraw:draw", {
                detail: { elements: elementsArray },
            });
            window.dispatchEvent(event);
            return true;
        } catch (err) {
            console.error("Failed to execute drawing command:", err);
            return false;
        }
    };

    const getCanvasDescription = () => {
        if (!canvasState || !canvasState.elements || canvasState.elements.length === 0) {
            return "The canvas is currently empty.";
        }

        const elementCounts: Record<string, number> = {};
        const textContents: string[] = [];
        const labels: string[] = [];

        canvasState.elements.forEach((el: any) => {
            elementCounts[el.type] = (elementCounts[el.type] || 0) + 1;
            if (el.type === 'text' && el.text) {
                textContents.push(`"${el.text}"`);
            }
            if (el.label && el.label.text) {
                labels.push(`"${el.label.text}"`);
            }
        });

        const descriptions = Object.entries(elementCounts).map(
            ([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`
        );

        let description = `Current canvas contains: ${descriptions.join(', ')} (${canvasState.elements.length} total elements)`;

        if (textContents.length > 0) {
            description += `\n\nText elements on canvas: ${textContents.join(', ')}`;
        }

        if (labels.length > 0) {
            description += `\n\nLabels on shapes: ${labels.join(', ')}`;
        }

        if (canvasState.appState) {
            const spatialData = analyzeCanvasLayout(canvasState.elements, canvasState.appState);
            const spatialDescription = formatSpatialDescription(spatialData);
            description += `\n\n📍 Spatial Layout:\n${spatialDescription}`;
        }

        return description;
    };

    const handleGenerateImage = async (prompt: string) => {
        const loadingMsg: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: "🎨 Generating image with Nano Banana...",
        };
        setMessages((prev) => [...prev, loadingMsg]);

        try {
            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, model: "gemini-2.5-flash-image" }),
            });

            const data = await response.json();

            setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));

            if (!response.ok) {
                throw new Error(data.details || data.error || "Image generation failed");
            }

            const successMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `✅ Image generated: "${prompt}"\n\nNote: Image insertion requires API response format verification.`,
            };
            setMessages((prev) => [...prev, successMsg]);

        } catch (err) {
            setMessages((prev) => prev.filter((m) => m.id === loadingMsg.id));
            setError(err instanceof Error ? err.message : "Image generation failed");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const userInput = input.trim();
        setInput("");
        setIsLoading(true);
        setError(null);

        // If in image mode, route to Nano Banana
        if (chatMode === "image") {
            await handleGenerateImage(userInput);
            setIsLoading(false);
            return;
        }

        try {
            const canvasDescription = getCanvasDescription();

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    model,
                    canvasState: {
                        description: canvasDescription,
                        elementCount: canvasState?.elements?.length || 0,
                        elements: canvasState?.elements || [],
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to get response");
            }

            let drawingCommand = null;
            let displayMessage = data.message;

            let jsonMatch = data.message.match(/```json\s*\n([\s\S]*?)\n```/);
            if (!jsonMatch) {
                jsonMatch = data.message.match(/```\s*\n([\s\S]*?)\n```/);
            }
            if (!jsonMatch) {
                const rawJsonMatch = data.message.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                if (rawJsonMatch) {
                    jsonMatch = [rawJsonMatch[0], rawJsonMatch[0]];
                }
            }

            if (jsonMatch) {
                try {
                    const jsonString = jsonMatch[1].trim();
                    const parsedData = JSON.parse(jsonString);

                    if (Array.isArray(parsedData)) {
                        drawingCommand = parsedData;
                        const success = executeDrawingCommand(parsedData);

                        if (success) {
                            displayMessage = data.message.replace(
                                jsonMatch[0],
                                "\n\n✅ **Drawing added to canvas!**\n"
                            );
                        } else {
                            displayMessage = data.message.replace(
                                jsonMatch[0],
                                "\n\n⚠️ **Failed to add drawing**\n"
                            );
                        }
                    }
                } catch (err) {
                    console.error("Failed to parse drawing command:", err);
                }
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: displayMessage,
                drawingCommand,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="panel-backdrop" onClick={onClose} />
            <div className="ai-chat-panel" ref={panelRef} style={{ width: `${panelWidth}px` }}>
                <div className="resize-handle" onMouseDown={handleResizeStart} />
                <div className="panel-header">
                    <h3 className="panel-title">AI Chat</h3>
                    <button onClick={onClose} className="close-btn">
                        ✕
                    </button>
                </div>

                {canvasState && canvasState.elements && canvasState.elements.length > 0 && (
                    <div className="canvas-indicator">
                        📊 Canvas: {canvasState.elements.length} element{canvasState.elements.length !== 1 ? 's' : ''}
                    </div>
                )}

                <div className="messages">
                    {messages.length === 0 && (
                        <div className="empty-state">
                            <p style={{ fontSize: "32px", marginBottom: "12px" }}>🎨</p>
                            <p>Ask me to draw on your canvas!</p>
                            <p style={{ fontSize: "12px", marginTop: "8px" }}>
                                I can see what's on the canvas and help you modify it
                            </p>
                        </div>
                    )}
                    {messages.map((message) => (
                        <div key={message.id} className={`message ${message.role}`}>
                            {message.content}
                        </div>
                    ))}
                    {isLoading && <div className="message assistant">Thinking...</div>}
                    {error && <div className="error-msg">⚠️ {error}</div>}
                    <div ref={messagesEndRef} />
                </div>

                {/* Floating mode toggle buttons */}
                <div className="mode-toggle">
                    <button
                        onClick={() => setChatMode("text")}
                        className={`mode-btn ${chatMode === "text" ? "active" : ""}`}
                        title="Text mode - Draw with AI"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                    <button
                        onClick={() => setChatMode("image")}
                        className={`mode-btn ${chatMode === "image" ? "active" : ""}`}
                        title="Image mode - Generate with Nano Banana"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="input-form">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={chatMode === "image" ? "Describe the image you want to generate..." : "Ask me to draw on the canvas..."}
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()}>
                        Send
                    </button>
                </form>

                <style>{`
                    .panel-backdrop {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.3);
                        z-index: 998;
                        backdrop-filter: blur(2px);
                    }

                    .ai-chat-panel {
                        position: fixed;
                        right: 0;
                        top: 0;
                        bottom: 0;
                        background: var(--color-surface, white);
                        border-left: 2px solid var(--color-stroke, #333);
                        display: flex;
                        flex-direction: column;
                        z-index: 999;
                        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
                    }

                    .resize-handle {
                        position: absolute;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        width: 6px;
                        cursor: ew-resize;
                        background: transparent;
                        z-index: 1000;
                    }

                    .resize-handle:hover {
                        background: var(--color-stroke-muted, #ddd);
                    }

                    .resize-handle:active {
                        background: var(--color-stroke, #333);
                    }

                    .panel-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 1rem 1.25rem;
                        border-bottom: 2px solid var(--color-stroke, #333);
                        background: var(--color-bg, #fafafa);
                    }

                    .panel-title {
                        margin: 0;
                        font-family: var(--font-hand, sans-serif);
                        font-size: 1.125rem;
                        font-weight: 600;
                        color: var(--color-text, #333);
                    }

                    .close-btn {
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 1.25rem;
                        color: var(--color-text-muted, #666);
                        padding: 0.25rem;
                        transition: color 0.2s;
                    }

                    .close-btn:hover {
                        color: var(--color-text, #333);
                    }

                    .canvas-indicator {
                        padding: 0.625rem 1.25rem;
                        background: var(--color-fill-2, #f1f3f5);
                        border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                        font-size: 0.75rem;
                        color: var(--color-text, #333);
                        font-family: var(--font-body, sans-serif);
                    }


                    .messages {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1.25rem;
                        display: flex;
                        flex-direction: column;
                        gap: 0.875rem;
                    }

                    .empty-state {
                        text-align: center;
                        color: var(--color-text-muted, #666);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                        margin-top: 3rem;
                    }

                    .message {
                        padding: 0.875rem 1.125rem;
                        border-radius: 12px;
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                        line-height: 1.5;
                        white-space: pre-wrap;
                        max-width: 85%;
                    }

                    .message.user {
                        align-self: flex-end;
                        background: var(--color-fill-1, #e9ecef);
                        color: var(--color-text, #333);
                    }

                    .message.assistant {
                        align-self: flex-start;
                        background: var(--color-bg, #fafafa);
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        color: var(--color-text, #333);
                    }

                    .error-msg {
                        align-self: center;
                        padding: 0.75rem 1rem;
                        border-radius: 8px;
                        background: var(--color-fill-4, #ffe3e3);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.75rem;
                        color: var(--color-text, #333);
                    }

                    .mode-toggle {
                        position: absolute;
                        right: 1.25rem;
                        bottom: 6rem;
                        display: flex;
                        flex-direction: column;
                        gap: 0.625rem;
                        z-index: 10;
                    }

                    .mode-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 3rem;
                        height: 3rem;
                        background: var(--color-surface, white);
                        border: 2px solid var(--color-stroke, #333);
                        border-radius: 10px;
                        cursor: pointer;
                        color: var(--color-text, #333);
                        box-shadow: 3px 3px 0 var(--color-stroke, #333);
                        transition: all 0.15s ease;
                    }

                    .mode-btn:hover {
                        transform: translate(-1px, -1px);
                        box-shadow: 4px 4px 0 var(--color-stroke, #333);
                        background: var(--color-fill-1, #f8f9fa);
                    }

                    .mode-btn:active {
                        transform: translate(1px, 1px);
                        box-shadow: 2px 2px 0 var(--color-stroke, #333);
                    }

                    .mode-btn.active {
                        background: #e3f2ff;
                        border-color: #1971c2;
                        box-shadow: 3px 3px 0 #1971c2;
                    }

                    .mode-btn.active:hover {
                        box-shadow: 4px 4px 0 #1971c2;
                    }

                    .input-form {
                        display: flex;
                        gap: 0.625rem;
                        padding: 1.25rem;
                        background: var(--color-bg, #fafafa);
                    }

                    .input-form input {
                        flex: 1;
                        padding: 0.875rem 1.125rem;
                        border: 2px solid var(--color-stroke, #333);
                        border-radius: 8px;
                        background: var(--color-surface, white);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                        color: var(--color-text, #333);
                        outline: none;
                    }

                    .input-form button {
                        padding: 0.875rem 1.5rem;
                        background: var(--color-fill-1, #e9ecef);
                        border: 2px solid var(--color-stroke, #333);
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: var(--font-hand, sans-serif);
                        font-size: 0.875rem;
                        font-weight: 600;
                        color: var(--color-text, #333);
                        transition: all 0.2s;
                        box-shadow: 2px 2px 0 var(--color-stroke, #333);
                    }

                    .input-form button:hover:not(:disabled) {
                        transform: translate(-1px, -1px);
                        box-shadow: 3px 3px 0 var(--color-stroke, #333);
                    }

                    .input-form button:active:not(:disabled) {
                        transform: translate(1px, 1px);
                        box-shadow: 1px 1px 0 var(--color-stroke, #333);
                    }

                    .input-form button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    @media (max-width: 768px) {
                        .ai-chat-panel {
                            width: 100%;
                        }
                    }
                `}</style>
            </div>
        </>
    );
}
