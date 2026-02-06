/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                     🤖 AIChatContainer.tsx                                   ║
 * ║                    "The Chat Orchestra Conductor"                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 🎯 Orchestrator | 🏗️ Architecture Root        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the conductor of the AI chat orchestra. I don't play any instruments myself
 * - instead, I coordinate all the specialized musicians (hooks and components) to
 * create a harmonious user experience. I'm thin by design - all the heavy lifting
 * is done by my delegates.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * I bring together all the pieces of the AI chat feature into a cohesive whole.
 * Users get a complete chat experience with:
 * - Message sending and receiving
 * - Canvas context awareness (elements, selected area)
 * - Mobile-responsive layout (full-width panel on small screens)
 * - Resizable sidebar (on desktop)
 * - Keyboard shortcuts (Cmd+Enter to send)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                     MY ORCHESTRA SECTIONS                        │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   🧠 BRAIN (Hooks)                                               │
 *      │   ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐         │
 *      │   │useAIChatState│ │useImageGen   │ │usePanelResize   │         │
 *      │   └─────────────┘ └──────────────┘ └─────────────────┘         │
 *      │   ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐         │
 *      │   │useMobileDet │ │useCanvasCmds │ │useKeyboardShorts│         │
 *      │   └─────────────┘ └──────────────┘ └─────────────────┘         │
 *      │                                                                  │
 *      │   🎨 UI (Components)                                             │
 *      │   ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐         │
 *      │   │ ChatPanel   │ │ ChatHeader   │ │CanvasContextPanel│         │
 *      │   └─────────────┘ └──────────────┘ └─────────────────┘         │
 *      │   ┌─────────────┐ ┌──────────────┐                             │
 *      │   │ MessageList │ │  ChatInput   │                             │
 *      │   └─────────────┘ └──────────────┘                             │
 *      │                                                                  │
 *      │   🎭 MODALS                                                      │
 *      │   ┌─────────────────┐                                            │
 *      │   │ TemplateModal   │                                            │
 *      │   └─────────────────┘                                            │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Chat doesn't open, components not rendering, hooks failing
 * - User Impact: Complete chat feature failure
 * - Quick Fix: Check all imports are correct, verify props passing
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isOpen              │ Whether chat panel should be visible                 │
 * │ onClose             │ Callback when user closes the panel                  │
 * │ initialWidth        │ Starting width of the panel (default: 400)           │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted all business logic to custom hooks
 * 2026-02-05: Integrated useMobileDetection for responsive resizing.
 * 2026-02-05: Moved ImageGenerationModal logic to CanvasApp.
 * 2026-02-05: Cleaned up redundant resize state (now using specialized hook).
 * 
 * @module AIChatContainer
 */

import React, { useRef, useCallback, useEffect, useState } from "react";

// Hooks
import { useAIChatState } from "./hooks/useAIChatState";
import { useImageGeneration, type ImageHistoryItem } from "./hooks/useImageGeneration";
import type { Message } from "./types";
import { useCanvasCommands } from "./hooks/useCanvasCommands";

import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useElementSelection } from "./useElementSelection";
import { useMobileDetection } from "./hooks/useMobileDetection";

// Components
import { ChatPanel } from "./components/ChatPanel";
import { ChatHeader } from "./components/ChatHeader";
import { CanvasContextPanel } from "./components/CanvasContextPanel";

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
    /** Callback to update parent with current state (for save functionality) */
    onStateUpdate?: (state: {
        messages: Message[];
        aiProvider: "kimi" | "claude";
        contextMode: "all" | "selected";
        imageHistory: ImageHistoryItem[];
    }) => void;
    /** Pending state to load (from file) */
    pendingLoadState?: any;
    /** External image history (from parent useImageGeneration hook) */
    imageHistory?: ImageHistoryItem[];
    /** External setter for image history */
    setImageHistory?: (history: ImageHistoryItem[]) => void;
}

/**
 * AI Chat Container - Orchestrates all chat functionality
 */
export default function AIChatContainer({
    isOpen,
    onClose,
    initialWidth = 340,
    onStateUpdate,
    pendingLoadState,
    imageHistory: externalImageHistory,
    setImageHistory: externalSetImageHistory,
}: AIChatContainerProps) {
    // === 📱 MOBILE DETECTION ===
    const { isMobile, viewportWidth } = useMobileDetection();

    // === 🧠 REFS ===
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Listen for mobile backdrop close request
    useEffect(() => {
        if (!isOpen) return;

        const handleCloseRequest = () => {
            onClose();
        };

        window.addEventListener("ai-chat:close-request", handleCloseRequest);
        return () => {
            window.removeEventListener("ai-chat:close-request", handleCloseRequest);
        };
    }, [isOpen, onClose]);

    // Track if we've loaded the pending state
    const [hasLoadedPendingState, setHasLoadedPendingState] = useState(false);

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

    // Fixed panel size - floating chat widget (no resize)
    const panelWidth = isMobile ? viewportWidth : 360;
    const startResize = () => {}; // No-op since we're not using resize

    // Core chat state
    const {
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        error,
        clearError,
        aiProvider,
        setAiProvider,
        toggleProvider,
        contextMode,
        setContextMode,
        canvasState,
        setCanvasState,
        showTemplates,
        setShowTemplates,
        handleSend: handleSendMessage,
    } = useAIChatState({
        isOpen,
        initialWidth,
        onClose,
    });

    // Image generation - use external props if provided, otherwise use internal hook
    const internalImageGen = useImageGeneration();
    const imageHistory = externalImageHistory ?? internalImageGen.imageHistory;
    const setImageHistory = externalSetImageHistory ?? internalImageGen.setImageHistory;

    // Canvas commands
    const {
        drawElements,
        updateElements,
    } = useCanvasCommands({
        isOpen,
        onStateUpdate: setCanvasState,
    });

    // === 🚀 ACTIONS ===

    /**
     * Handle sending a message
     */
    const handleSend = useCallback(async () => {
        // Skip screenshot for Kimi (doesn't support images)
        const isKimi = aiProvider === "kimi";

        // For now, simplified send without screenshot coordination
        // Currently processing message directly
        // Future: Add screenshot capture for vision-capable models (e.g. Claude)
        await handleSendMessage({
            screenshotData: null,
            selectedElements,
            getSelectionContext,
        });
    }, [
        aiProvider,
        selectedElements,
        handleSendMessage,
        getSelectionContext,
    ]);

    // Keyboard shortcuts (must be after handleSend definition)
    const { handleKeyDown } = useKeyboardShortcuts({
        onSend: handleSend,
        onClose,
        hasInput: input.trim().length > 0,
        isLoading: isLoading,
    });

    // Report state changes to parent for save functionality
    useEffect(() => {
        onStateUpdate?.({
            messages,
            aiProvider,
            contextMode,
            imageHistory,
        });
    }, [messages, aiProvider, contextMode, imageHistory, onStateUpdate]);

    // Handle loading state from file
    useEffect(() => {
        if (pendingLoadState && !hasLoadedPendingState) {
            console.log("📂 AIChatContainer loading state from file...");

            // Load chat state
            if (pendingLoadState.chat) {
                if (pendingLoadState.chat.messages) {
                    // Replace messages with loaded ones
                    const loadedMessages = pendingLoadState.chat.messages.map((msg: any) => ({
                        ...msg,
                        metadata: {
                            ...msg.metadata,
                            timestamp: new Date(msg.metadata.timestamp),
                        },
                    }));
                    setMessages(loadedMessages);
                }
                if (pendingLoadState.chat.aiProvider) {
                    setAiProvider(pendingLoadState.chat.aiProvider);
                }
                if (pendingLoadState.chat.contextMode) {
                    setContextMode(pendingLoadState.chat.contextMode);
                }
            }

            // Load image history
            if (pendingLoadState.images?.history) {
                const loadedHistory = pendingLoadState.images.history.map((img: any) => ({
                    ...img,
                    timestamp: new Date(img.timestamp),
                }));
                setImageHistory(loadedHistory);
            }

            setHasLoadedPendingState(true);
            console.log("✅ AIChatContainer state loaded");
        }
    }, [pendingLoadState, hasLoadedPendingState, setContextMode, setImageHistory, setMessages, setAiProvider]);

    // Reset loaded flag when pending state is cleared
    useEffect(() => {
        if (!pendingLoadState && hasLoadedPendingState) {
            setHasLoadedPendingState(false);
        }
    }, [pendingLoadState, hasLoadedPendingState]);

    // === 🎨 RENDER ===

    if (!isOpen) return null;

    return (
        <>
            <ChatPanel
                isOpen={isOpen}
                width={panelWidth}
                onResizeStart={startResize}
                isMobile={isMobile}
            >
                {/* Header - just close button */}
                <ChatHeader onClose={onClose} />

                {/* Messages - with empty state showing "Start creating with AI" */}
                <MessageList
                    ref={messagesEndRef}
                    messages={messages}
                    isLoading={isLoading}
                    error={error}
                    aiProvider={aiProvider}
                    canvasState={canvasState}
                />

                {/* Canvas Context - above templates */}
                <CanvasContextPanel
                    contextMode={contextMode}
                    onContextModeChange={setContextMode}
                    selectedElements={selectedElements}
                    elementSnapshots={elementSnapshots}
                    canvasElementCount={canvasState?.elements?.length || 0}
                    onClearSelection={clearSelection}
                />

                {/* Input Area - with model selector */}
                <ChatInput
                    ref={inputRef}
                    input={input}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onOpenTemplates={() => setShowTemplates(true)}
                    isLoading={isLoading}
                    selectedElementsCount={selectedElements.length}
                    contextMode={contextMode}
                    onKeyDown={handleKeyDown}
                    isMobile={isMobile}
                    aiProvider={aiProvider}
                    onToggleProvider={toggleProvider}
                />
            </ChatPanel>

            {/* Modals */}
            <TemplateModal
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onSelect={(template) => {
                    // Handle template selection
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
