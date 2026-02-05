/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        🧠 useAIChatState.ts                                  ║
 * ║                    "The Conversation Memory Keeper"                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔵 Custom Hook | 🟢 State Manager | 🔴 API Handler               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the brain of the AI Chat system. I remember every message, track when the AI
 * is thinking, and know which AI provider (Kimi or Claude) we're talking to. I'm
 * the single source of truth for everything conversation-related.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users want to have fluid conversations with AI about their canvas drawings. I ensure:
 * - Their messages persist during the session (they can scroll back)
 * - They see clear loading states ("Kimi is thinking...")
 * - Errors are captured and displayed humanely
 * - They can switch between AI providers if one is overloaded
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  ChatInput  │─────▶│      ME      │─────▶│ MessageList │   │
 *      │   │  (sends)    │      │ (useAIChat   │      │  (displays) │   │
 *      │   └─────────────┘      │   State)     │      └─────────────┘   │
 *      │                        └──────┬───────┘                          │
 *      │                               │                                  │
 *      │           ┌───────────────────┼───────────────────┐             │
 *      │           ▼                   ▼                   ▼             │
 *      │    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐      │
 *      │    │ Window Event│    │useCanvasCmds │    │useImageGen  │      │
 *      │    │  (Capture)  │    │              │    │             │      │
 *      │    └─────────────┘    └──────────────┘    └─────────────┘      │
 *      │                                                                  │
 *      │   I TALK TO: /api/chat-kimi, /api/chat (Claude)                 │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Messages don't appear, infinite loading spinners, "undefined" errors
 * - User Impact: Chat becomes completely unusable - messages vanish into void
 * - Quick Fix: Check browser console for API errors, verify network connectivity
 * - Debug: Look at the 'messages' array in React DevTools, check API response format
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────┬─────────────────────────────────────────────────────────┐
 * │ messages        │ Array of all conversation messages (user + assistant)   │
 * │ input           │ Current text in the input box                           │
 * │ isLoading       │ Whether AI is currently generating a response           │
 * │ error           │ Any error message to display to user                    │
 * │ panelWidth      │ Width of chat panel in pixels (user can resize)         │
 * │ isResizing      │ Whether user is currently dragging the resize handle    │
 * │ contextMode     │ "all" canvas or "selected" elements only                │
 * │ aiProvider      │ "kimi" | "claude" - which AI backend to use              │
 * │ canvasState     │ Snapshot of Excalidraw elements for context             │
 * │ showTemplates   │ Whether template modal is open                          │
 * │ showImageModal  │ Whether image generation modal is open                  │
 * └─────────────────┴─────────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - handleSend(): Send message to AI with canvas context
 * - toggleProvider(): Switch between Kimi and Claude
 * - setContextMode(): Toggle between "all" and "selected" context
 * - clearError(): Dismiss error messages
 * - appendMessage(): Add assistant response to history
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was 300+ lines of state logic)
 * 2026-02-02: Separated message handling from UI rendering concerns
 * 2026-02-02: Centralized AI provider switching logic
 * 
 * @module useAIChatState
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, CanvasContext } from "../types";
import { nanoid } from "nanoid";

type AIProvider = "kimi" | "claude";

export interface UseAIChatStateOptions {
    /** Whether the chat panel is currently visible */
    isOpen: boolean;
    /** Initial width of the panel in pixels */
    initialWidth?: number;
    /** Callback when user closes the panel */
    onClose: () => void;
}

export interface SendMessageOptions {
    /** Screenshot data URL to include with message */
    screenshotData?: string | null;
    /** Selected element IDs to include as context */
    selectedElements?: string[];
    /** Function to get selection context string */
    getSelectionContext?: () => string;
}

export interface UseAIChatStateReturn {
    // === 📨 Message State ===
    messages: Message[];
    setMessages: (messages: Message[]) => void;
    input: string;
    setInput: (value: string) => void;
    isLoading: boolean;
    error: string | null;
    clearError: () => void;

    // === 🖥️ UI State ===
    panelWidth: number;
    setPanelWidth: (width: number) => void;
    isResizing: boolean;
    setIsResizing: (resizing: boolean) => void;
    contextMode: "all" | "selected";
    setContextMode: (mode: "all" | "selected") => void;
    aiProvider: AIProvider;
    setAiProvider: (provider: AIProvider) => void;
    toggleProvider: () => void;
    showTemplates: boolean;
    setShowTemplates: (show: boolean) => void;

    // === 🎨 Canvas State ===
    canvasState: any | null;
    setCanvasState: (state: any) => void;

    // === 🚀 Actions ===
    handleSend: (options?: SendMessageOptions) => Promise<void>;
    appendMessage: (message: Message) => void;
    clearMessages: () => void;
}

export function useAIChatState(options: UseAIChatStateOptions): UseAIChatStateReturn {
    const { isOpen, initialWidth = 400, onClose } = options;

    // === 📨 Core Message State ===
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // === 🖥️ UI State ===
    const [panelWidth, setPanelWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const [contextMode, setContextMode] = useState<"all" | "selected">("all");
    const [aiProvider, setAiProvider] = useState<AIProvider>("claude");
    const [showTemplates, setShowTemplates] = useState(false);

    // === 🎨 Canvas State ===
    const [canvasState, setCanvasState] = useState<any>(null);

    // === 🔄 Request Tracking ===
    const chatRequestIdRef = useRef<string | null>(null);

    // Cleanup on unmount if still open
    useEffect(() => {
        return () => {
            if (isOpen) {
                console.warn("useAIChatState unmounting while open - calling onClose");
                onClose();
            }
        };
    }, [isOpen, onClose]);

    // === 🚀 Actions ===

    /**
     * Clear any error message
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Set AI provider directly
     */
    const setAiProviderCallback = useCallback((provider: AIProvider) => {
        setAiProvider(provider);
    }, []);

    /**
     * Toggle between Kimi and Claude AI providers
     */
    const toggleProvider = useCallback(() => {
        setAiProvider(prev => prev === "kimi" ? "claude" : "kimi");
    }, []);

    /**
     * Append a message to the conversation history
     */
    const appendMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, message]);
    }, []);

    /**
     * Clear all messages (reset conversation)
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    /**
     * Build canvas description from current state
     */
    const getCanvasDescription = useCallback((): string => {
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

    /**
     * Send a message to the AI with optional canvas context and screenshot
     */
    const handleSend = useCallback(async (
        sendOptions?: { screenshotData?: string | null; selectedElements?: string[]; getSelectionContext?: () => string }
    ): Promise<void> => {
        const userContent = input.trim();
        if (!userContent || isLoading) return;

        const { screenshotData = null, selectedElements = [], getSelectionContext } = sendOptions || {};

        // Build context based on mode
        let contextMessage = "";
        let elementDataForPrompt = "";
        let isModifyingElements = false;

        if (contextMode === "selected" && selectedElements.length > 0 && getSelectionContext) {
            const selectionContext = getSelectionContext();
            contextMessage = `\n\n[Working with ${selectedElements.length} selected elements:\n${selectionContext}]`;

            // Include full element data for modification capability
            if (canvasState?.elements) {
                const selectedElementData = canvasState.elements.filter((el: any) =>
                    selectedElements.includes(el.id)
                );
                if (selectedElementData.length > 0) {
                    elementDataForPrompt = `\n\nSELECTED ELEMENTS DATA (JSON - MODIFY THESE, PRESERVE IDs):\n${JSON.stringify(selectedElementData, null, 2)}`;
                    isModifyingElements = true;
                }
            }
        } else {
            contextMessage = `\n\n[Canvas has ${canvasState?.elements?.length || 0} total elements]`;
        }

        const fullContent = userContent + contextMessage + elementDataForPrompt;

        // Create user message
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

        // Update UI state
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        try {
            const canvasDescription = getCanvasDescription();
            const selectionContext = selectedElements.length > 0 && getSelectionContext
                ? `\n\nCurrently selected elements (${selectedElements.length}):\n${getSelectionContext()}`
                : "";

            const canvasStateData = {
                description: canvasDescription + selectionContext,
                elementCount: canvasState?.elements?.length || 0,
                selectedElements: selectedElements.length > 0
                    ? `User has selected ${selectedElements.length} elements${getSelectionContext ? ': ' + getSelectionContext() : ''}`
                    : "No specific elements selected",
                isModifyingElements,
            };

            // Call appropriate API based on provider
            const endpoint = aiProvider === "kimi" ? "/api/chat-kimi" : "/api/chat";
            const model = aiProvider === "kimi" ?
                "kimi-k2.5" :
                "claude-sonnet-4-20250514";

            console.log(`🤖 Sending to ${aiProvider === "kimi" ? "Kimi K2.5" : "Claude"}...`);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        ...messages.map(m => ({
                            role: m.role,
                            content: m.content.map(c => c.type === "text" ? c.text : "").join("\n"),
                        })),
                        {
                            role: "user",
                            content: fullContent,
                        }
                    ],
                    model,
                    canvasState: canvasStateData,
                    screenshot: screenshotData,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(`❌ ${aiProvider} API error:`, data);

                const errorMessage = data.details || data.error || `${aiProvider} API failed`;
                const isOverloaded = errorMessage.toLowerCase().includes('overload') ||
                    errorMessage.toLowerCase().includes('too many requests') ||
                    response.status === 429;

                if (isOverloaded) {
                    const otherProvider = aiProvider === "kimi" ? "Claude" : "Kimi";
                    throw new Error(`${aiProvider} is currently overloaded. Click the provider badge to switch to ${otherProvider} instead.`);
                }

                throw new Error(errorMessage);
            }

            console.log(`✅ ${aiProvider} response received`);

            // Parse any drawing commands from response
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
                        // Replace JSON block with success message
                        displayMessage = data.message.replace(
                            jsonMatch[0],
                            "\n\n✅ **Drawing command received**\n"
                        );
                    }
                } catch (err) {
                    console.error("Failed to parse drawing command:", err);
                }
            }

            // Create assistant message
            const assistantMessage: Message = {
                id: nanoid(),
                role: "assistant",
                content: [{ type: "text", text: displayMessage }],
                metadata: {
                    timestamp: new Date(),
                    model: data.model || model,
                    provider: aiProvider,
                },
                reactions: [],
                status: "sent",
                drawingCommand: drawingCommand || undefined,
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (err) {
            console.error("Send message error:", err);
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, aiProvider, contextMode, canvasState, getCanvasDescription]);

    // Listen for load events from file
    useEffect(() => {
        const handleLoadMessages = (e: CustomEvent<{ messages: Message[] }>) => {
            const loadedMessages = e.detail.messages.map(msg => ({
                ...msg,
                metadata: {
                    ...msg.metadata,
                    timestamp: new Date(msg.metadata.timestamp),
                },
            }));
            setMessages(loadedMessages);
            console.log(`📂 Loaded ${loadedMessages.length} messages`);
        };

        const handleSetProvider = (e: CustomEvent<{ provider: AIProvider }>) => {
            setAiProvider(e.detail.provider);
            console.log(`📂 Set AI provider to ${e.detail.provider}`);
        };

        window.addEventListener("chat:load-messages", handleLoadMessages as EventListener);
        window.addEventListener("chat:set-provider", handleSetProvider as EventListener);

        return () => {
            window.removeEventListener("chat:load-messages", handleLoadMessages as EventListener);
            window.removeEventListener("chat:set-provider", handleSetProvider as EventListener);
        };
    }, []);

    return {
        // Message state
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        error,
        clearError,

        // UI state
        panelWidth,
        setPanelWidth,
        isResizing,
        setIsResizing,
        contextMode,
        setContextMode,
        aiProvider,
        setAiProvider: setAiProviderCallback,
        toggleProvider,
        showTemplates,
        setShowTemplates,

        // Canvas state
        canvasState,
        setCanvasState,

        // Actions
        handleSend,
        appendMessage,
        clearMessages,
    };
}

export default useAIChatState;
