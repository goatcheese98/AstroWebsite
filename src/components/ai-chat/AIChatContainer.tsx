import React, { useState, useRef, useEffect, useCallback } from "react";
import { useElementSelection } from "./useElementSelection";
import type { Message, PromptTemplate } from "./types";
import { nanoid } from "nanoid";
import PathfinderBotAvatar from "./PathfinderBotAvatar";

// Quick prompt templates
const PROMPT_TEMPLATES: PromptTemplate[] = [
    {
        id: "ui-mockup",
        icon: "🎨",
        title: "UI Mockup",
        description: "Create wireframe for web/mobile",
        template: "Create a {platform} wireframe for {description}",
        variables: [
            { name: "platform", label: "Platform", type: "select", options: ["web", "mobile", "tablet"] },
            { name: "description", label: "Description", type: "text" }
        ]
    },
    {
        id: "flowchart",
        icon: "🔄",
        title: "Flowchart",
        description: "Process flow diagram",
        template: "Create a flowchart for: {process}",
        variables: [{ name: "process", label: "Process", type: "text" }]
    },
    {
        id: "architecture",
        icon: "🏗️",
        title: "Architecture",
        description: "System design diagram",
        template: "Design system architecture for: {system}",
        variables: [{ name: "system", label: "System", type: "text" }]
    },
    {
        id: "explain",
        icon: "💡",
        title: "Explain",
        description: "Explain selected elements",
        template: "Explain these canvas elements and suggest improvements",
        variables: []
    }
];

interface AIChatContainerProps {
    isOpen: boolean;
    onClose: () => void;
    initialWidth?: number;
}

export default function AIChatContainer({ isOpen, onClose, initialWidth = 400 }: AIChatContainerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [panelWidth, setPanelWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [canvasState, setCanvasState] = useState<any>(null);
    const [contextMode, setContextMode] = useState<"all" | "selected">("all");
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Element selection hook
    const {
        selectedElements,
        isSelectionMode,
        selectElements,
        clearSelection,
        setSelectionMode,
        getSelectionContext,
        elementSnapshots,
    } = useElementSelection({
        enabled: isOpen,
        onSelectionChange: (ids) => {
            // Sync with Excalidraw's actual selection
            syncWithExcalidrawSelection();
        },
    });

    // Listen for canvas state and selection changes
    useEffect(() => {
        const handleCanvasUpdate = (event: any) => {
            setCanvasState(event.detail);
            // Also sync selection from Excalidraw
            if (event.detail?.appState?.selectedElementIds) {
                const selectedIds = Object.entries(event.detail.appState.selectedElementIds)
                    .filter(([_, selected]) => selected)
                    .map(([id]) => id);
                if (selectedIds.length > 0) {
                    selectElements(selectedIds);
                }
            }
        };

        window.addEventListener("excalidraw:state-update", handleCanvasUpdate);
        window.dispatchEvent(new CustomEvent("excalidraw:get-state"));

        return () => {
            window.removeEventListener("excalidraw:state-update", handleCanvasUpdate);
        };
    }, [selectElements]);

    // Sync selection with Excalidraw
    const syncWithExcalidrawSelection = useCallback(() => {
        const api = (window as any).excalidrawAPI;
        if (!api) return;

        const appState = api.getAppState();
        const selectedIds = Object.entries(appState.selectedElementIds || {})
            .filter(([_, selected]) => selected)
            .map(([id]) => id);
        
        if (selectedIds.length > 0) {
            selectElements(selectedIds);
        }
    }, [selectElements]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Resize functionality
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 320 && newWidth <= window.innerWidth * 0.8) {
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

    // Execute drawing command
    const executeDrawingCommand = useCallback((elementsArray: any[]) => {
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
    }, []);

    // Get canvas description
    const getCanvasDescription = useCallback(() => {
        if (!canvasState?.elements?.length) {
            return "The canvas is currently empty.";
        }

        const counts: Record<string, number> = {};
        canvasState.elements.forEach((el: any) => {
            counts[el.type] = (counts[el.type] || 0) + 1;
        });

        const desc = Object.entries(counts)
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');

        return `Canvas has ${canvasState.elements.length} elements: ${desc}`;
    }, [canvasState]);

    // Send message
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userContent = input.trim();
        
        // Build context based on mode
        let contextMessage = "";
        if (contextMode === "selected" && selectedElements.length > 0) {
            const selectionContext = getSelectionContext();
            contextMessage = `\n\n[Working with ${selectedElements.length} selected elements:\n${selectionContext}]`;
        } else {
            contextMessage = `\n\n[Canvas has ${canvasState?.elements?.length || 0} total elements]`;
        }

        const fullContent = userContent + contextMessage;

        const userMessage: Message = {
            id: nanoid(),
            role: "user",
            content: [{ type: "text", text: userContent }],
            metadata: {
                timestamp: new Date(),
                canvasContext: {
                    elementCount: canvasState?.elements?.length || 0,
                    selectedElementIds: selectedElements,
                    viewport: canvasState?.appState || { scrollX: 0, scrollY: 0, zoom: 1 },
                },
            },
            reactions: [],
            status: "sent",
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        try {
            const canvasDescription = getCanvasDescription();
            const selectionContext = selectedElements.length > 0 
                ? `\n\nCurrently selected elements (${selectedElements.length}):\n${getSelectionContext()}`
                : "";
            
            // PRIMARY: Kimi API (K2.5)
            console.log('🌙 Sending to Kimi K2.5...');
            
            const response = await fetch("/api/chat-kimi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: fullContent,
                    })),
                    model: "kimi-k2-0711-preview",
                    canvasState: {
                        description: canvasDescription + selectionContext,
                        elementCount: canvasState?.elements?.length || 0,
                        selectedElements: selectedElements.length > 0 
                            ? `User has selected ${selectedElements.length} elements: ${getSelectionContext()}`
                            : "No specific elements selected",
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Log the error but don't fall back to Claude yet (for testing)
                console.error('❌ Kimi API error:', data);
                throw new Error(data.error || data.details || "Kimi API failed");
            }
            
            console.log('✅ Kimi response received');

            // Parse drawing commands
            let displayMessage = data.message;
            let drawingCommand: any[] | null = null;

            const jsonMatch = data.message.match(/```json\s*\n([\s\S]*?)\n```/) 
                || data.message.match(/```\s*\n([\s\S]*?)\n```/)
                || data.message.match(/\[\s*\{[\s\S]*?\}\s*\]/);

            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        drawingCommand = parsed;
                        const success = executeDrawingCommand(parsed);
                        displayMessage = data.message.replace(
                            jsonMatch[0],
                            success 
                                ? "\n\n✅ **Drawing added to canvas!**\n" 
                                : "\n\n⚠️ **Failed to add drawing**\n"
                        );
                    }
                } catch (err) {
                    console.error("Failed to parse drawing command:", err);
                }
            }

            const assistantMessage: Message = {
                id: nanoid(),
                role: "assistant",
                content: [{ type: "text", text: displayMessage }],
                metadata: {
                    timestamp: new Date(),
                    model: data.model || "kimi-k2-0711-preview",
                    provider: "kimi",
                },
                reactions: [],
                status: "sent",
                drawingCommand: drawingCommand || undefined,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle template selection
    const handleTemplateSelect = (template: PromptTemplate) => {
        if (template.variables.length === 0) {
            setInput(template.template);
        } else {
            let filled = template.template;
            template.variables.forEach(v => {
                const value = v.type === "select" ? v.options?.[0] || "" : `[${v.label}]`;
                filled = filled.replace(`{${v.name}}`, value);
            });
            setInput(filled);
        }
        setShowTemplates(false);
        inputRef.current?.focus();
    };

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === "Escape") {
            if (isSelectionMode) {
                setSelectionMode(false);
            } else {
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop - Reduced blur */}
            <div 
                className="ai-chat-backdrop"
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.2)",
                    zIndex: 998,
                    animation: "fadeIn 0.2s ease",
                }}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="ai-chat-container"
                style={{
                    position: "fixed",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${panelWidth}px`,
                    background: "var(--color-surface, #ffffff)",
                    borderLeft: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.08)",
                    zIndex: 999,
                    display: "flex",
                    flexDirection: "column",
                    animation: "slideIn 0.25s ease",
                }}
            >
                {/* Resize Handle */}
                <div
                    onMouseDown={handleResizeStart}
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        cursor: "ew-resize",
                        zIndex: 1000,
                        background: "transparent",
                        transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-accent, #6366f1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                />

                {/* Header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    background: "var(--color-bg, #fafafa)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>💬</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h2 style={{
                                margin: 0,
                                fontFamily: "var(--font-hand, sans-serif)",
                                fontSize: "17px",
                                fontWeight: 600,
                                color: "var(--color-text, #1f2937)",
                            }}>
                                AI Assistant
                            </h2>
                            <span style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                background: "#8b5cf6",
                                color: "white",
                                borderRadius: "4px",
                                fontWeight: 500,
                            }}>
                                Kimi K2.5
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            color: "var(--color-text-muted, #6b7280)",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--color-fill-1, #f3f4f6)";
                            e.currentTarget.style.color = "var(--color-text, #1f2937)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--color-text-muted, #6b7280)";
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Canvas Context - NEW: All vs Selected Toggle */}
                <div style={{
                    padding: "14px 18px",
                    background: "var(--color-fill-1, #f3f4f6)",
                    borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                    }}>
                        <span style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--color-text-muted, #6b7280)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}>
                            Canvas Context
                        </span>
                        {canvasState?.elements?.length > 0 && (
                            <span style={{
                                fontSize: "11px",
                                color: "var(--color-text-muted, #6b7280)",
                            }}>
                                {canvasState.elements.length} elements
                            </span>
                        )}
                    </div>

                    {/* Context Mode Toggle */}
                    <div style={{
                        display: "flex",
                        background: "var(--color-surface, #ffffff)",
                        borderRadius: "8px",
                        padding: "3px",
                        marginBottom: "10px",
                        border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    }}>
                        <button
                            onClick={() => setContextMode("all")}
                            style={{
                                flex: 1,
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                background: contextMode === "all" 
                                    ? "var(--color-accent, #6366f1)" 
                                    : "transparent",
                                color: contextMode === "all" 
                                    ? "white" 
                                    : "var(--color-text, #1f2937)",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            All Elements
                        </button>
                        <button
                            onClick={() => setContextMode("selected")}
                            style={{
                                flex: 1,
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                background: contextMode === "selected" 
                                    ? "var(--color-accent, #6366f1)" 
                                    : "transparent",
                                color: contextMode === "selected" 
                                    ? "white" 
                                    : "var(--color-text, #1f2937)",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            Selected ({selectedElements.length})
                        </button>
                    </div>

                    {/* Element Selection Bar */}
                    {contextMode === "selected" && (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                        }}>
                            <button
                                onClick={() => setSelectionMode(!isSelectionMode)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid",
                                    borderColor: isSelectionMode 
                                        ? "var(--color-accent, #6366f1)" 
                                        : "var(--color-stroke-muted, #e5e7eb)",
                                    background: isSelectionMode 
                                        ? "var(--color-accent-light, #e0e7ff)" 
                                        : "var(--color-surface, #ffffff)",
                                    color: isSelectionMode 
                                        ? "var(--color-accent, #6366f1)" 
                                        : "var(--color-text, #1f2937)",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16v16H4z" />
                                    <path d="M9 9h6v6H9z" />
                                </svg>
                                {isSelectionMode ? "Click canvas..." : "Select on canvas"}
                            </button>

                            {selectedElements.length > 0 && (
                                <button
                                    onClick={clearSelection}
                                    style={{
                                        padding: "5px 10px",
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--color-text-muted, #6b7280)",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Selected Elements Preview */}
                    {contextMode === "selected" && selectedElements.length > 0 && elementSnapshots.size > 0 && (
                        <div style={{
                            marginTop: "10px",
                            padding: "10px",
                            background: "var(--color-surface, #ffffff)",
                            borderRadius: "8px",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            maxHeight: "120px",
                            overflowY: "auto",
                        }}>
                            <div style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                            }}>
                                {Array.from(elementSnapshots.values()).map(snapshot => (
                                    <div
                                        key={snapshot.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            padding: "5px 10px",
                                            background: "var(--color-fill-2, #e5e7eb)",
                                            borderRadius: "6px",
                                            fontSize: "11px",
                                        }}
                                    >
                                        <span style={{ fontSize: "12px" }}>
                                            {snapshot.type === "rectangle" && "▭"}
                                            {snapshot.type === "diamond" && "◇"}
                                            {snapshot.type === "ellipse" && "○"}
                                            {snapshot.type === "text" && "T"}
                                            {snapshot.type === "arrow" && "→"}
                                            {snapshot.type === "line" && "/"}
                                            {!["rectangle", "diamond", "ellipse", "text", "arrow", "line"].includes(snapshot.type) && "◆"}
                                        </span>
                                        <span style={{
                                            maxWidth: "80px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {snapshot.text || snapshot.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Elements Summary */}
                    {contextMode === "all" && canvasState?.elements?.length > 0 && (
                        <div style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "var(--color-text-muted, #6b7280)",
                        }}>
                            {(() => {
                                const counts: Record<string, number> = {};
                                canvasState.elements.forEach((el: any) => {
                                    counts[el.type] = (counts[el.type] || 0) + 1;
                                });
                                return Object.entries(counts)
                                    .slice(0, 4)
                                    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                                    .join(', ');
                            })()}
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                }}>
                    {messages.length === 0 ? (
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "var(--color-text-muted, #6b7280)",
                            textAlign: "center",
                        }}>
                            {/* PathfinderBot Avatar */}
                            <div style={{ marginBottom: "16px" }}>
                                <PathfinderBotAvatar size={80} />
                            </div>
                            <h3 style={{
                                margin: "0 0 6px",
                                fontSize: "15px",
                                fontWeight: 600,
                                color: "var(--color-text, #1f2937)",
                            }}>
                                Start creating with AI
                            </h3>
                            <p style={{
                                margin: 0,
                                fontSize: "13px",
                                lineHeight: 1.5,
                                maxWidth: "240px",
                            }}>
                                Describe what to draw or switch to "Selected" mode to work with specific elements
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                            />
                        ))
                    )}
                    {isLoading && (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px 16px",
                            background: "var(--color-fill-1, #f3f4f6)",
                            borderRadius: "12px",
                            alignSelf: "flex-start",
                        }}>
                            <div style={{
                                width: "16px",
                                height: "16px",
                                border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                                borderTopColor: "var(--color-accent, #6366f1)",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                            }} />
                            <span style={{
                                fontSize: "13px",
                                color: "var(--color-text-muted, #6b7280)",
                            }}>
                                Kimi is thinking...
                            </span>
                        </div>
                    )}
                    {error && (
                        <div style={{
                            padding: "10px 14px",
                            background: "var(--color-error-bg, #fef2f2)",
                            border: "1px solid var(--color-error, #fecaca)",
                            borderRadius: "8px",
                            color: "var(--color-error-text, #dc2626)",
                            fontSize: "13px",
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Templates */}
                {showTemplates && (
                    <div style={{
                        position: "absolute",
                        bottom: "90px",
                        left: "16px",
                        right: "16px",
                        background: "var(--color-surface, #ffffff)",
                        border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                        borderRadius: "12px",
                        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
                        padding: "14px",
                        zIndex: 10,
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "10px",
                        }}>
                            <span style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "var(--color-text, #1f2937)",
                            }}>
                                Quick Templates
                            </span>
                            <button
                                onClick={() => setShowTemplates(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--color-text-muted, #6b7280)",
                                    padding: "4px",
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: "8px",
                        }}>
                            {PROMPT_TEMPLATES.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleTemplateSelect(template)}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                        gap: "3px",
                                        padding: "10px",
                                        background: "var(--color-fill-1, #f3f4f6)",
                                        border: "1px solid transparent",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                        textAlign: "left",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "var(--color-accent, #6366f1)";
                                        e.currentTarget.style.background = "var(--color-accent-light, #e0e7ff)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "transparent";
                                        e.currentTarget.style.background = "var(--color-fill-1, #f3f4f6)";
                                    }}
                                >
                                    <span style={{ fontSize: "18px" }}>{template.icon}</span>
                                    <span style={{
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        color: "var(--color-text, #1f2937)",
                                    }}>
                                        {template.title}
                                    </span>
                                    <span style={{
                                        fontSize: "10px",
                                        color: "var(--color-text-muted, #6b7280)",
                                    }}>
                                        {template.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div style={{
                    padding: "14px 18px 18px",
                    background: "var(--color-bg, #fafafa)",
                    borderTop: "1px solid var(--color-stroke-muted, #e5e7eb)",
                }}>
                    {/* Toolbar */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "10px",
                    }}>
                        <button
                            onClick={() => setShowTemplates(!showTemplates)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 10px",
                                background: "transparent",
                                border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                borderRadius: "6px",
                                fontSize: "11px",
                                color: "var(--color-text-muted, #6b7280)",
                                cursor: "pointer",
                            }}
                        >
                            <span>⚡</span>
                            Templates
                        </button>
                    </div>

                    {/* Input */}
                    <div style={{
                        position: "relative",
                        display: "flex",
                        gap: "8px",
                    }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={contextMode === "selected" && selectedElements.length > 0
                                ? `Ask about ${selectedElements.length} selected elements...`
                                : "Ask AI to draw, explain, or modify..."
                            }
                            rows={2}
                            style={{
                                flex: 1,
                                padding: "10px 14px",
                                border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                borderRadius: "10px",
                                background: "var(--color-surface, #ffffff)",
                                fontSize: "13px",
                                lineHeight: 1.5,
                                resize: "none",
                                outline: "none",
                                fontFamily: "inherit",
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            style={{
                                alignSelf: "flex-end",
                                padding: "10px 18px",
                                background: !input.trim() || isLoading
                                    ? "var(--color-fill-2, #e5e7eb)"
                                    : "var(--color-accent, #6366f1)",
                                color: !input.trim() || isLoading
                                    ? "var(--color-text-muted, #6b7280)"
                                    : "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            Send
                        </button>
                    </div>
                    <div style={{
                        marginTop: "6px",
                        fontSize: "10px",
                        color: "var(--color-text-muted, #6b7280)",
                    }}>
                        Enter to send • Shift+Enter for new line • ESC to {isSelectionMode ? "exit selection" : "close"}
                    </div>
                </div>

                {/* Animations */}
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </>
    );
}

// Message Bubble Component
function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";
    
    const textContent = message.content
        .filter(c => c.type === "text")
        .map(c => c.type === "text" ? c.text : "")
        .join("\n");

    return (
        <div style={{
            alignSelf: isUser ? "flex-end" : "flex-start",
            maxWidth: "88%",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
        }}>
            <div style={{
                padding: "12px 16px",
                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: isUser 
                    ? "var(--color-accent, #6366f1)" 
                    : "var(--color-surface, #ffffff)",
                color: isUser ? "white" : "var(--color-text, #1f2937)",
                boxShadow: isUser 
                    ? "0 1px 4px rgba(99, 102, 241, 0.2)" 
                    : "0 1px 3px rgba(0, 0, 0, 0.06)",
                fontSize: "13px",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                border: isUser ? "none" : "1px solid var(--color-stroke-muted, #e5e7eb)",
            }}>
                {textContent}
            </div>
            <span style={{
                fontSize: "10px",
                color: "var(--color-text-muted, #6b7280)",
                marginLeft: isUser ? "auto" : "10px",
                marginRight: isUser ? "10px" : "auto",
            }}>
                {message.metadata.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}
            </span>
        </div>
    );
}
