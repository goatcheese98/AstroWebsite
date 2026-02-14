/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                     🤖 AIChatContainer.tsx                                   ║
 * ║                    "The Chat Orchestra Conductor"                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 🎯 Orchestrator | 🏗️ Architecture Root        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * AI Chat Container - Orchestrates all chat functionality
 * Now with Zustand store integration for state management
 * 
 * @module AIChatContainer
 */

import React, { useRef, useCallback, useEffect, useState } from "react";

// Store
import { useCanvasStore } from "../../stores";
import { useEvent } from "../../lib/events";

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
 * Minimized Chat Button - Compact button shown when chat is minimized
 */
function MinimizedChatButton({
    onExpand,
    onClose,
    aiProvider
}: {
    onExpand: () => void;
    onClose: () => void;
    aiProvider: "kimi" | "claude"
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "white",
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: "24px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--color-text, #374151)",
                transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
            }}
        >
            {/* Click to expand */}
            <button
                onClick={onExpand}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--color-text, #374151)",
                    padding: 0,
                }}
            >
                <span>AI Chat</span>
                <span
                    style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: aiProvider === 'kimi' ? '#22c55e' : '#22c55e',
                    }}
                />
            </button>

            {/* Close button */}
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
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-secondary, #6b7280)",
                    borderRadius: "50%",
                    transition: "all 0.15s",
                    marginLeft: "4px",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-surface-hover, #f3f4f6)";
                    e.currentTarget.style.color = "var(--color-text, #374151)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-text-secondary, #6b7280)";
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
 * AI Chat Container - Orchestrates all chat functionality
 * Uses Zustand store for state management - no prop drilling needed
 */
export default function AIChatContainer({
    isOpen,
    onClose,
    initialWidth = 340,
}: AIChatContainerProps) {
    // === 📱 MOBILE DETECTION ===
    const { isMobile, viewportWidth } = useMobileDetection();

    // === STORE INTEGRATION ===
    const store = useCanvasStore();
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

    // Listen for mobile backdrop close request
    useEvent('ai-chat:close-request', () => {
        onClose();
    });

    // === 🧠 HOOKS ===

    // Element selection from canvas
    const {
        selectedElements,
        elementSnapshots,
        clearSelection,
        getSelectionContext,
    } = useElementSelection({
        enabled: isOpen,
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
        isOpen,
        initialWidth,
        onClose,
    });

    // Canvas commands
    const {
        drawElements,
        updateElements,
    } = useCanvasCommands({
        isOpen,
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

    // Listen for load-state events from store/event bus
    useEvent('canvas:load-state', (data) => {
        if (!data.state || hasLoadedPendingState) return;

        const state = data.state as any;
        if (state.chat) {
            if (state.chat.messages) {
                const loadedMessages = state.chat.messages.map((msg: any) => ({
                    ...msg,
                    metadata: {
                        ...msg.metadata,
                        timestamp: new Date(msg.metadata.timestamp),
                    },
                }));
                setMessages(loadedMessages);
            }
            if (state.chat.aiProvider) setAIProvider(state.chat.aiProvider);
            if (state.chat.contextMode) setContextMode(state.chat.contextMode);
        }

        if (state.images?.history) {
            const loadedHistory = state.images.history.map((img: any) => ({
                ...img,
                timestamp: new Date(img.timestamp),
            }));
            setImageHistory(loadedHistory);
        }

        setHasLoadedPendingState(true);
        setTimeout(() => setHasLoadedPendingState(false), 100);
    }, [hasLoadedPendingState, setMessages, setAIProvider, setContextMode, setImageHistory]);

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

    // Handle minimize
    const handleMinimize = useCallback(() => {
        setChatMinimized(true);
    }, [setChatMinimized]);

    // Handle expand from minimized state
    const handleExpand = useCallback(() => {
        setChatMinimized(false);
    }, [setChatMinimized]);

    // Handle close - also reset minimized state
    const handleCloseWithReset = useCallback(() => {
        setChatMinimized(false);
        onClose();
    }, [setChatMinimized, onClose]);

    // === 🎨 RENDER ===

    if (!isOpen) return null;

    // Render minimized button
    if (isChatMinimized && !isMobile) {
        return (
            <ChatPanel
                isOpen={isOpen}
                isMinimized={true}
                width={panelWidth}
                height={panelHeight}
                onResizeStart={startResize}
                isMobile={isMobile}
            >
                <MinimizedChatButton
                    onExpand={handleExpand}
                    onClose={handleCloseWithReset}
                    aiProvider={aiProvider}
                />
            </ChatPanel>
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
                isMinimized={false}
                width={panelWidth}
                height={panelHeight}
                onResizeStart={startResize}
                isMobile={isMobile}
            >
                {/* Header - with minimize and close buttons */}
                <ChatHeader
                    onClose={handleCloseWithReset}
                    onMinimize={handleMinimize}
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
