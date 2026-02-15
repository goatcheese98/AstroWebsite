/**
 * AIChatContainer - Chat Interface for AI Canvas
 * Uses unified Zustand store for state management
 * 
 * Added minimize functionality - shows compact button when minimized
 */

import React, { useRef, useCallback, useEffect, useState } from "react";

// Unified Store
import { useUnifiedCanvasStore } from "@/stores";

// Hooks
import { useAIChatState } from "./hooks/useAIChatState";
import { useCanvasCommands } from "./hooks/useCanvasCommands";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useElementSelection } from "./useElementSelection";
import { useMobileDetection } from "./hooks/useMobileDetection";

// Components
import { ChatPanel } from "./components/ChatPanel";
import { ChatHeader } from "./components/ChatHeader";
import { CanvasContextOverlay } from "./components/CanvasContextOverlay";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";

// Modals
import TemplateModal from "./TemplateModal";

export interface AIChatContainerProps {
    /** Whether the chat panel is visible */
    isOpen: boolean;
    /** Callback when user closes the panel */
    onClose: () => void;
    /** Initial width of the panel in pixels */
    initialWidth?: number;
}

/**
 * Minimized Chat Button - Compact pill button shown when chat is minimized
 * Matches the design in the screenshot: pill shape, green dot, positioned at bottom
 */
function MinimizedChatButton({
    onExpand,
    onClose,
    aiProvider,
}: {
    onExpand: () => void;
    onClose: () => void;
    aiProvider: "kimi" | "claude";
}) {
    return (
        <div
            style={{
                position: "fixed",
                bottom: "20px",
                right: "80px", // Positioned left of the help button
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 16px",
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "9999px", // Full pill shape
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
                transition: "all 0.2s ease",
                cursor: "pointer",
                zIndex: 100,
            }}
            onClick={onExpand}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
            }}
        >
            <span>AI Chat</span>
            
            {/* Green status dot */}
            <span
                style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: aiProvider === 'kimi' ? '#22c55e' : '#f97316',
                    flexShrink: 0,
                }}
            />

            {/* Close button - separate from expand click area */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                title="Close"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "20px",
                    height: "20px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    borderRadius: "50%",
                    transition: "all 0.15s",
                    marginLeft: "4px",
                    padding: 0,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f3f4f6";
                    e.currentTarget.style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#9ca3af";
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

/**
 * AI Chat Container - Chat Interface for AI Canvas
 * Uses unified Zustand store for state management
 */
export default function AIChatContainer({
    isOpen,
    onClose,
    initialWidth = 340,
}: AIChatContainerProps) {
    // === 📱 MOBILE DETECTION ===
    const { isMobile, viewportWidth } = useMobileDetection();

    // === STORE INTEGRATION ===
    const store = useUnifiedCanvasStore();
    const {
        messages,
        setMessages,
        aiProvider,
        setAIProvider,
        contextMode,
        setContextMode,
        imageHistory,
        setImageHistory,
        isChatLoading,
        setChatLoading,
        chatError,
        setChatError,
        clearChatError,
        addToast,
        isChatMinimized,
        setChatMinimized,
    } = store;

    // === 🧠 REFS ===
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [hasLoadedPendingState, setHasLoadedPendingState] = useState(false);

    // Close handler - can be extended for mobile backdrop
    const handleCloseRequest = useCallback(() => {
        onClose();
    }, [onClose]);

    // === 🧠 HOOKS ===

    // Element selection from canvas
    const {
        selectedElements,
        elementSnapshots,
        clearSelection,
        getSelectionContext,
    } = useElementSelection({
        enabled: isOpen && !isChatMinimized,
    });

    // Panel dimensions - vertical resize enabled
    const panelWidth = isMobile ? viewportWidth : 360;
    const [panelHeight, setPanelHeight] = useState(600);
    const [isResizingHeight, setIsResizingHeight] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);

    // Vertical resize handling
    const startResize = useCallback((e: React.MouseEvent) => {
        if (isMobile) return;
        e.preventDefault();
        setIsResizingHeight(true);
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";
    }, [isMobile]);

    // Handle vertical resize mouse movement
    useEffect(() => {
        if (!isResizingHeight) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newHeight = window.innerHeight - e.clientY - 20;
            const clampedHeight = Math.max(300, Math.min(newHeight, window.innerHeight - 100));
            setPanelHeight(clampedHeight);
        };

        const handleMouseUp = () => {
            setIsResizingHeight(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizingHeight]);

    // Core chat state (local UI state still in hook)
    const {
        input,
        setInput,
        canvasState,
        setCanvasState,
        handleSend: handleSendMessage,
    } = useAIChatState({
        isOpen: isOpen && !isChatMinimized,
        initialWidth,
        onClose,
    });

    // Canvas commands
    const {
        drawElements,
        updateElements,
    } = useCanvasCommands({
        isOpen: isOpen && !isChatMinimized,
        onStateUpdate: setCanvasState,
    });

    // Track selection changes for auto-switching context mode
    const previousSelectionCountRef = useRef(0);

    useEffect(() => {
        const currentCount = selectedElements.length;
        const previousCount = previousSelectionCountRef.current;

        if (contextMode === "all" && currentCount > 0 && currentCount < (canvasState?.elements?.length || 0)) {
            setContextMode("selected");
        }

        previousSelectionCountRef.current = currentCount;
    }, [selectedElements.length, contextMode, setContextMode, canvasState?.elements?.length]);

    // === 🚀 ACTIONS ===

    const handleSend = useCallback(async () => {
        const selectedImageData: string[] = [];

        if (contextMode === "selected" && selectedElements.length > 0) {
            elementSnapshots.forEach((snapshot) => {
                if (snapshot.type === 'image' && snapshot.imageDataURL) {
                    selectedImageData.push(snapshot.imageDataURL);
                }
            });
        }

        const imageForAI = selectedImageData.length > 0 ? selectedImageData[0] : null;

        await handleSendMessage({
            screenshotData: imageForAI,
            selectedElements,
            getSelectionContext,
        });
    }, [contextMode, selectedElements, elementSnapshots, handleSendMessage, getSelectionContext]);

    // Keyboard shortcuts
    const { handleKeyDown } = useKeyboardShortcuts({
        onSend: handleSend,
        onClose,
        hasInput: input.trim().length > 0,
        isLoading: isChatLoading,
    });

    // === 🎨 RENDER ===

    if (!isOpen) return null;

    // Show minimized button when minimized
    if (isChatMinimized) {
        return (
            <MinimizedChatButton
                onExpand={() => setChatMinimized(false)}
                onClose={onClose}
                aiProvider={aiProvider}
            />
        );
    }

    return (
        <>
            {/* Canvas Context Preview - Separate container to the LEFT of chat */}
            <CanvasContextOverlay
                contextMode={contextMode}
                onContextModeChange={setContextMode}
                selectedElements={selectedElements}
                elementSnapshots={elementSnapshots}
                canvasElementCount={canvasState?.elements?.length || 0}
                onClearSelection={clearSelection}
            />

            <ChatPanel
                isOpen={isOpen}
                width={panelWidth}
                height={panelHeight}
                onResizeStart={startResize}
                onClose={onClose}
                isMobile={isMobile}
            >
                {/* Header with minimize button */}
                <ChatHeader 
                    onClose={onClose}
                    onMinimize={!isMobile ? () => setChatMinimized(true) : undefined}
                />

                {/* Messages wrapper */}
                <div style={{
                    flex: 1,
                    position: "relative",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                }}>
                    {/* Messages - with empty state showing "Start creating with AI" */}
                    <MessageList
                        ref={messagesEndRef}
                        messages={messages}
                        isLoading={isChatLoading}
                        error={chatError}
                        aiProvider={aiProvider}
                        canvasState={canvasState}
                        hasPreviewPanel={false}
                    />
                </div>

                {/* Input Area - with model selector and mode toggle */}
                <ChatInput
                    ref={inputRef}
                    input={input}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onOpenTemplates={() => setShowTemplates(true)}
                    isLoading={isChatLoading}
                    selectedElementsCount={selectedElements.length}
                    contextMode={contextMode}
                    onContextModeChange={setContextMode}
                    onClearSelection={clearSelection}
                    onKeyDown={handleKeyDown}
                    isMobile={isMobile}
                    aiProvider={aiProvider}
                    onToggleProvider={() => setAIProvider(aiProvider === 'kimi' ? 'claude' : 'kimi')}
                />
            </ChatPanel>

            {/* Modals */}
            <TemplateModal
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onSelect={(template) => {
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
                }}
                selectedElementsCount={selectedElements.length}
            />
        </>
    );
}
