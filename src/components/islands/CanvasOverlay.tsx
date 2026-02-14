import { useState, useRef, useEffect } from "react";
import { analyzeCanvasLayout, formatSpatialDescription } from "../../lib/canvas-spatial-analysis";
import { svgLibrary, categories, type SVGMetadata } from "../../lib/svg-library-config";
import { eventBus } from "../../lib/events";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrl?: string;
    drawingCommand?: any;
}

type ModelType = "claude-sonnet-4-20250514" | "claude-haiku-4-20250514";
type TabType = "chat" | "assets";

export default function CanvasOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("chat");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState<ModelType>("claude-sonnet-4-20250514");
    const [error, setError] = useState<string | null>(null);
    const [canvasState, setCanvasState] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Assets tab state
    const [selectedCategory, setSelectedCategory] = useState<string>("icons");
    const [searchQuery, setSearchQuery] = useState("");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Listen for canvas state updates
    useEffect(() => {
        const unsubscribe = eventBus.on("excalidraw:state-update", (data) => {
            setCanvasState(data);
        });

        eventBus.emit("excalidraw:get-state");

        return unsubscribe;
    }, []);

    const executeDrawingCommand = (elementsArray: any[]) => {
        try {
            if (!Array.isArray(elementsArray)) {
                return false;
            }
            eventBus.emit("excalidraw:draw", { elements: elementsArray });
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

    const handleGenerateImage = async () => {
        const prompt = window.prompt("Enter image description:");
        if (!prompt) return;

        const loadingMsg: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: "🎨 Generating image with Nano Banana...",
        };
        setMessages((prev) => [...prev, loadingMsg]);
        setIsLoading(true);

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

            // Create data URL from base64 image
            const imageUrl = `data:${data.mimeType || 'image/png'};base64,${data.imageData}`;

            const successMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `✅ Image generated: "${prompt}"`,
                imageUrl: imageUrl,
            };
            setMessages((prev) => [...prev, successMsg]);

            // Insert the image into the canvas
            eventBus.emit("excalidraw:insert-image", { imageData: imageUrl, type: "generated" });

        } catch (err) {
            setMessages((prev) => prev.filter((m) => m.id === loadingMsg.id));
            setError(err instanceof Error ? err.message : "Image generation failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyImage = async (imageUrl: string) => {
        try {
            // Convert data URL to blob
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            // Copy to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);

            // Show feedback (you could add a toast notification here)
            console.log("✅ Image copied to clipboard");
        } catch (err) {
            console.error("❌ Failed to copy image:", err);
            setError("Failed to copy image to clipboard");
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
        setInput("");
        setIsLoading(true);
        setError(null);

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

    const handleSvgClick = (svg: SVGMetadata) => {
        eventBus.emit("excalidraw:insert-svg", { svgPath: svg.path, svgId: svg.id });
    };

    const filteredSvgs = svgLibrary.filter((svg) => {
        const matchesCategory = selectedCategory === "all" || svg.category === selectedCategory;
        const matchesSearch = searchQuery === "" ||
            svg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            svg.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="overlay-toggle">
                <span className="icon">💬</span>
                <span className="label">AI & Assets</span>
                <style>{`
                    .overlay-toggle {
                        position: fixed;
                        left: 1rem;
                        top: 1rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.625rem 0.875rem;
                        background: var(--color-surface, white);
                        border: 2px solid var(--color-stroke, #333);
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: var(--font-hand, sans-serif);
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: var(--color-text, #333);
                        box-shadow: 2px 2px 0 var(--color-stroke, #333);
                        z-index: 1000;
                        transition: all 0.2s ease;
                    }
                    .overlay-toggle:hover {
                        transform: translate(-1px, -1px);
                        box-shadow: 3px 3px 0 var(--color-stroke, #333);
                    }
                    .overlay-toggle:active {
                        transform: translate(1px, 1px);
                        box-shadow: 1px 1px 0 var(--color-stroke, #333);
                    }
                    .overlay-toggle .icon {
                        font-size: 1.125rem;
                    }
                `}</style>
            </button>
        );
    }

    return (
        <>
            <div className="overlay-backdrop" onClick={() => setIsOpen(false)} />
            <div className="canvas-overlay">
                <div className="overlay-header">
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === "chat" ? "active" : ""}`}
                            onClick={() => setActiveTab("chat")}
                        >
                            💬 AI Chat
                        </button>
                        <button
                            className={`tab ${activeTab === "assets" ? "active" : ""}`}
                            onClick={() => setActiveTab("assets")}
                        >
                            📦 My Assets
                        </button>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="close-btn">
                        ✕
                    </button>
                </div>

                {activeTab === "chat" ? (
                    <div className="chat-view">
                        {canvasState && canvasState.elements && canvasState.elements.length > 0 && (
                            <div className="canvas-indicator">
                                📊 Canvas: {canvasState.elements.length} element{canvasState.elements.length !== 1 ? 's' : ''}
                            </div>
                        )}

                        <div className="model-selector">
                            <select value={model} onChange={(e) => setModel(e.target.value as ModelType)}>
                                <option value="claude-sonnet-4-20250514">Claude Sonnet (Balanced)</option>
                                <option value="claude-haiku-4-20250514">Claude Haiku (Fast)</option>
                            </select>
                        </div>

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
                                    {message.imageUrl && (
                                        <div style={{ position: "relative", marginTop: "10px", display: "inline-block" }}>
                                            <img
                                                src={message.imageUrl}
                                                alt="Generated image"
                                                style={{
                                                    maxWidth: "100%",
                                                    borderRadius: "8px",
                                                    border: "1px solid #e0e0e0",
                                                    display: "block"
                                                }}
                                            />
                                            <button
                                                onClick={() => handleCopyImage(message.imageUrl!)}
                                                style={{
                                                    position: "absolute",
                                                    top: "8px",
                                                    right: "8px",
                                                    background: "rgba(255, 255, 255, 0.9)",
                                                    border: "1px solid #ddd",
                                                    borderRadius: "6px",
                                                    padding: "6px 10px",
                                                    cursor: "pointer",
                                                    fontSize: "12px",
                                                    fontWeight: "500",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                                    transition: "all 0.2s ease"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "rgba(255, 255, 255, 1)";
                                                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                                                }}
                                            >
                                                📋 Copy
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && <div className="message assistant">Thinking...</div>}
                            {error && <div className="error-msg">⚠️ {error}</div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="action-buttons">
                            <button onClick={handleGenerateImage} className="gen-image-btn" disabled={isLoading}>
                                🎨 Generate Image
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="input-form">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me to draw on the canvas..."
                                disabled={isLoading}
                            />
                            <button type="submit" disabled={isLoading || !input.trim()}>
                                Send
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="assets-view">
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search assets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="category-tabs">
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className={`category-tab ${selectedCategory === "all" ? "active" : ""}`}
                            >
                                All
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`category-tab ${selectedCategory === cat.id ? "active" : ""}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        <div className="svg-grid">
                            {filteredSvgs.length === 0 ? (
                                <div className="empty-state">No assets found</div>
                            ) : (
                                filteredSvgs.map((svg) => (
                                    <button
                                        key={svg.id}
                                        onClick={() => handleSvgClick(svg)}
                                        className="svg-item"
                                        title={svg.description}
                                    >
                                        <img src={svg.path} alt={svg.name} className="svg-preview" />
                                        <span className="svg-name">{svg.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <style>{`
                    .overlay-backdrop {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.3);
                        z-index: 998;
                        backdrop-filter: blur(2px);
                    }

                    .canvas-overlay {
                        position: fixed;
                        right: 0;
                        top: 0;
                        bottom: 0;
                        width: 400px;
                        background: var(--color-surface, white);
                        border-left: 2px solid var(--color-stroke, #333);
                        display: flex;
                        flex-direction: column;
                        z-index: 999;
                        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
                    }

                    .overlay-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0.75rem 1rem;
                        border-bottom: 2px solid var(--color-stroke, #333);
                        background: var(--color-bg, #fafafa);
                    }

                    .tabs {
                        display: flex;
                        gap: 0.5rem;
                    }

                    .tab {
                        padding: 0.5rem 0.875rem;
                        background: transparent;
                        border: 1px solid transparent;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: var(--font-hand, sans-serif);
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: var(--color-text-muted, #666);
                        transition: all 0.2s;
                    }

                    .tab:hover {
                        background: var(--color-fill-1, #e9ecef);
                    }

                    .tab.active {
                        background: var(--color-surface, white);
                        border-color: var(--color-stroke, #333);
                        color: var(--color-text, #333);
                        font-weight: 600;
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

                    /* Chat View */
                    .chat-view {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }

                    .canvas-indicator {
                        padding: 0.5rem 1rem;
                        background: var(--color-fill-2, #f1f3f5);
                        border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                        font-size: 0.75rem;
                        color: var(--color-text, #333);
                        font-family: var(--font-body, sans-serif);
                    }

                    .model-selector {
                        padding: 0.75rem 1rem;
                        border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                    }

                    .model-selector select {
                        width: 100%;
                        padding: 0.5rem 0.75rem;
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        border-radius: 6px;
                        background: var(--color-surface, white);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                        color: var(--color-text, #333);
                        cursor: pointer;
                    }

                    .messages {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1rem;
                        display: flex;
                        flex-direction: column;
                        gap: 0.75rem;
                    }

                    .empty-state {
                        text-align: center;
                        color: var(--color-text-muted, #666);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                        margin-top: 3rem;
                    }

                    .message {
                        padding: 0.75rem 1rem;
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

                    .action-buttons {
                        padding: 0.75rem 1rem;
                        border-top: 1px solid var(--color-stroke-muted, #ddd);
                        border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                    }

                    .gen-image-btn {
                        width: 100%;
                        padding: 0.625rem 1rem;
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

                    .gen-image-btn:hover:not(:disabled) {
                        transform: translate(-1px, -1px);
                        box-shadow: 3px 3px 0 var(--color-stroke, #333);
                    }

                    .gen-image-btn:active:not(:disabled) {
                        transform: translate(1px, 1px);
                        box-shadow: 1px 1px 0 var(--color-stroke, #333);
                    }

                    .gen-image-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .input-form {
                        display: flex;
                        gap: 0.5rem;
                        padding: 1rem;
                        background: var(--color-bg, #fafafa);
                    }

                    .input-form input {
                        flex: 1;
                        padding: 0.75rem 1rem;
                        border: 2px solid var(--color-stroke, #333);
                        border-radius: 8px;
                        background: var(--color-surface, white);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                        color: var(--color-text, #333);
                        outline: none;
                    }

                    .input-form button {
                        padding: 0.75rem 1.25rem;
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

                    /* Assets View */
                    .assets-view {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }

                    .search-container {
                        padding: 0.75rem 1rem;
                        border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                    }

                    .search-input {
                        width: 100%;
                        padding: 0.5rem 0.75rem;
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        border-radius: 6px;
                        background: var(--color-bg, white);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                        color: var(--color-text, #333);
                        outline: none;
                    }

                    .category-tabs {
                        display: flex;
                        gap: 0.25rem;
                        padding: 0.75rem 1rem;
                        border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                        overflow-x: auto;
                    }

                    .category-tab {
                        padding: 0.375rem 0.75rem;
                        background: var(--color-bg, white);
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.75rem;
                        font-weight: 500;
                        color: var(--color-text, #333);
                        white-space: nowrap;
                        transition: all 0.2s;
                    }

                    .category-tab:hover {
                        background: var(--color-fill-1, #e9ecef);
                    }

                    .category-tab.active {
                        background: var(--color-fill-1, #e9ecef);
                        border-color: var(--color-stroke, #333);
                        font-weight: 600;
                    }

                    .svg-grid {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1rem;
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 0.75rem;
                        align-content: start;
                    }

                    .svg-item {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.875rem 0.625rem;
                        background: var(--color-bg, white);
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .svg-item:hover {
                        background: var(--color-fill-1, #e9ecef);
                        border-color: var(--color-stroke, #333);
                        transform: translateY(-2px);
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                    }

                    .svg-preview {
                        width: 48px;
                        height: 48px;
                        object-fit: contain;
                    }

                    .svg-name {
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.625rem;
                        color: var(--color-text, #333);
                        text-align: center;
                        line-height: 1.2;
                        max-width: 100%;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    @media (max-width: 768px) {
                        .canvas-overlay {
                            width: 100%;
                            max-width: 400px;
                        }
                    }
                `}</style>
            </div>
        </>
    );
}
