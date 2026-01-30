import { useState, useRef, useEffect } from "react";
import { analyzeCanvasLayout, formatSpatialDescription } from "../../lib/canvas-spatial-analysis";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrl?: string;
    drawingCommand?: any;
}

type ModelType = "claude-sonnet-4-20250514" | "claude-haiku-4-20250514";

export default function AIChatSidebar() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [model, setModel] = useState<ModelType>("claude-sonnet-4-20250514");
    const [error, setError] = useState<string | null>(null);
    const [canvasState, setCanvasState] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Listen for canvas state updates
    useEffect(() => {
        const handleCanvasUpdate = (event: any) => {
            console.log("📊 Canvas state updated:", event.detail);
            setCanvasState(event.detail);
        };

        window.addEventListener("excalidraw:state-update", handleCanvasUpdate);

        // Request initial canvas state
        window.dispatchEvent(new CustomEvent("excalidraw:get-state"));

        return () => {
            window.removeEventListener("excalidraw:state-update", handleCanvasUpdate);
        };
    }, []);

    const executeDrawingCommand = (elementsArray: any[]) => {
        try {
            console.log("🎨 Executing drawing command with elements:", elementsArray);

            if (!Array.isArray(elementsArray)) {
                console.error("❌ Invalid drawing data: not an array");
                return false;
            }

            console.log(`✨ Dispatching ${elementsArray.length} elements to canvas`);

            // Dispatch custom event to the Excalidraw canvas
            // The canvas expects { elements: [...] }
            const event = new CustomEvent("excalidraw:draw", {
                detail: { elements: elementsArray },
            });
            window.dispatchEvent(event);

            console.log("✅ Drawing command dispatched successfully");
            return true;
        } catch (err) {
            console.error("❌ Failed to execute drawing command:", err);
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

            // Extract text content from text elements
            if (el.type === 'text' && el.text) {
                textContents.push(`"${el.text}"`);
            }

            // Extract labels from shapes
            if (el.label && el.label.text) {
                labels.push(`"${el.label.text}"`);
            }
        });

        const descriptions = Object.entries(elementCounts).map(
            ([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`
        );

        let description = `Current canvas contains: ${descriptions.join(', ')} (${canvasState.elements.length} total elements)`;

        // Add text content if any
        if (textContents.length > 0) {
            description += `\n\nText elements on canvas: ${textContents.join(', ')}`;
        }

        // Add labels if any
        if (labels.length > 0) {
            description += `\n\nLabels on shapes: ${labels.join(', ')}`;
        }

        // Add spatial analysis
        if (canvasState.appState) {
            const spatialData = analyzeCanvasLayout(canvasState.elements, canvasState.appState);
            const spatialDescription = formatSpatialDescription(spatialData);
            description += `\n\n📍 Spatial Layout:\n${spatialDescription}`;
        }

        return description;
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

        // Check for /generate-image command
        const imageCommandMatch = userMessage.content.match(/^\/generate-image\s+(.+)$/i);
        if (imageCommandMatch) {
            const prompt = imageCommandMatch[1];

            try {
                // Show loading message
                const loadingMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "🎨 Generating image...",
                };
                setMessages((prev) => [...prev, loadingMsg]);

                // Call image generation API
                const response = await fetch("/api/generate-image", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        prompt,
                        model: "gemini-2.5-flash-image",
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.details || data.error || "Image generation failed");
                }

                // Remove loading message
                setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));

                // Create data URL from base64 image
                const imageUrl = `data:${data.mimeType || 'image/png'};base64,${data.imageData}`;

                // Add success message with image
                const successMsg: Message = {
                    id: (Date.now() + 2).toString(),
                    role: "assistant",
                    content: `✅ Image generated: "${prompt}"`,
                    imageUrl: imageUrl,
                };
                setMessages((prev) => [...prev, successMsg]);

                // Insert the image into the canvas
                window.dispatchEvent(new CustomEvent("excalidraw:insert-image", {
                    detail: { imageData: imageUrl, type: "generated" },
                }));

            } catch (err) {
                setMessages((prev) => prev.filter((m) => m.content === "🎨 Generating image..."));
                setError(err instanceof Error ? err.message : "Image generation failed");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        try {
            // Include canvas state in the request
            const canvasDescription = getCanvasDescription();

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
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

            // Check if the response contains a drawing command
            let drawingCommand = null;
            let displayMessage = data.message;

            // Try multiple patterns to find JSON
            let jsonMatch = null;

            // Pattern 1: ```json ... ```
            jsonMatch = data.message.match(/```json\s*\n([\s\S]*?)\n```/);

            // Pattern 2: ``` ... ``` (without language specifier)
            if (!jsonMatch) {
                jsonMatch = data.message.match(/```\s*\n([\s\S]*?)\n```/);
            }

            // Pattern 3: Look for raw JSON array starting with [
            if (!jsonMatch) {
                const rawJsonMatch = data.message.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                if (rawJsonMatch) {
                    jsonMatch = [rawJsonMatch[0], rawJsonMatch[0]];
                }
            }

            if (jsonMatch) {
                try {
                    const jsonString = jsonMatch[1].trim();
                    console.log("📄 Attempting to parse JSON:", jsonString);

                    // Parse the JSON to get the array
                    const parsedData = JSON.parse(jsonString);
                    console.log("✅ Parsed JSON successfully:", parsedData);

                    // Check if it's an array (skeleton elements)
                    if (Array.isArray(parsedData)) {
                        drawingCommand = parsedData;

                        // Execute the drawing command with the array
                        const success = executeDrawingCommand(parsedData);

                        if (success) {
                            // Replace the JSON block with a success message
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
                    } else {
                        console.error("❌ Parsed JSON is not an array:", parsedData);
                    }
                } catch (err) {
                    console.error("Failed to parse drawing command:", err);
                    console.log("Attempted to parse:", jsonMatch[1]);
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

            {/* Canvas State Indicator */}
            {canvasState && canvasState.elements && canvasState.elements.length > 0 && (
                <div
                    style={{
                        padding: "8px 16px",
                        background: "var(--color-fill-2)",
                        borderBottom: "1px solid var(--color-stroke-muted)",
                        fontSize: "12px",
                        color: "var(--color-text)",
                        fontFamily: "var(--font-body)",
                    }}
                >
                    📊 Canvas: {canvasState.elements.length} element{canvasState.elements.length !== 1 ? 's' : ''}
                </div>
            )}

            {/* Model Selector */}
            <div
                style={{
                    padding: "8px 16px",
                    borderBottom: "1px solid var(--color-stroke-muted)",
                    background: "var(--color-bg)",
                }}
            >
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as ModelType)}
                    style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid var(--color-stroke-muted)",
                        borderRadius: "6px",
                        background: "var(--color-surface)",
                        fontFamily: "var(--font-body)",
                        fontSize: "12px",
                        color: "var(--color-text)",
                        cursor: "pointer",
                    }}
                >
                    <option value="claude-sonnet-4-20250514">Claude Sonnet (Balanced)</option>
                    <option value="claude-haiku-4-20250514">Claude Haiku (Fast)</option>
                </select>
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
                        <p>Ask me to draw on your canvas!</p>
                        <p style={{ fontSize: "12px", marginTop: "8px" }}>
                            I can see what's on the canvas and help you modify it
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
                            whiteSpace: "pre-wrap",
                        }}
                    >
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
                {error && (
                    <div
                        style={{
                            alignSelf: "center",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            background: "var(--color-fill-4)",
                            fontFamily: "var(--font-body)",
                            fontSize: "12px",
                            color: "var(--color-text)",
                        }}
                    >
                        ⚠️ {error}
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
                    placeholder="Ask me to draw... or try /generate-image"
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
