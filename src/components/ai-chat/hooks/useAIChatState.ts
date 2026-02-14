/**
 * useAIChatState.ts - Store-integrated version
 * Uses Zustand store for state management
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, CanvasContext } from "../types";
import { nanoid } from "nanoid";
import { useCanvasStore } from "../../../stores";
import { eventBus } from "../../../lib/events";

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
    const { isOpen, onClose } = options;

    // === STORE INTEGRATION ===
    const store = useCanvasStore();
    const {
        messages,
        setMessages,
        aiProvider,
        setAIProvider,
        contextMode,
        setContextMode,
        isChatLoading: isLoading,
        setChatLoading: setIsLoading,
        chatError: storeError,
        setChatError: setStoreError,
        clearChatError,
        addMessage: addMessageToStore,
    } = store;

    // === LOCAL UI STATE (not in store) ===
    const [input, setInput] = useState("");
    const [canvasState, setCanvasState] = useState<any>(null);
    const [showTemplates, setShowTemplates] = useState(false);

    // === REFS ===
    const chatRequestIdRef = useRef<string | null>(null);
    const selectedWebEmbedRef = useRef<{ url: string; title: string; elementId: string } | null>(null);

    // Listen for web embed selections via event bus
    useEffect(() => {
        const unsubscribe = eventBus.on('webembed:selected', (data) => {
            selectedWebEmbedRef.current = data;
            console.log("🌐 Web embed selected for AI context:", data.url);
        });
        return unsubscribe;
    }, []);

    // Note: We intentionally DON'T call onClose on unmount
    // The parent component (AIChatContainer) manages the open/close state
    // Calling onClose here caused issues where the chat would close
    // unexpectedly during re-renders or state updates

    // === 🚀 Actions ===

    const clearError = useCallback(() => {
        clearChatError();
    }, [clearChatError]);

    const setAiProviderCallback = useCallback((provider: AIProvider) => {
        setAIProvider(provider);
    }, [setAIProvider]);

    const toggleProvider = useCallback(() => {
        setAIProvider((prev: AIProvider) => prev === "kimi" ? "claude" : "kimi");
    }, [setAIProvider]);

    const appendMessage = useCallback((message: Message) => {
        addMessageToStore(message);
    }, [addMessageToStore]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, [setMessages]);

    const getCanvasDescription = useCallback((): string => {
        if (!canvasState?.elements?.length) {
            return "The canvas is currently empty.";
        }

        const counts: Record<string, number> = {};
        let webEmbedCount = 0;
        canvasState.elements.forEach((el: any) => {
            counts[el.type] = (counts[el.type] || 0) + 1;
            if (el.customData?.type === 'web-embed') {
                webEmbedCount++;
            }
        });

        const desc = Object.entries(counts)
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');

        let description = `Canvas has ${canvasState.elements.length} elements: ${desc}`;

        if (selectedWebEmbedRef.current) {
            description += `\n\nSelected Web Embed: ${selectedWebEmbedRef.current.url}`;
            description += `\nThe user has a web page embedded that they may want you to analyze or reference.`;
        }

        return description;
    }, [canvasState]);

    const handleSend = useCallback(async (
        sendOptions?: { screenshotData?: string | null; selectedElements?: string[]; getSelectionContext?: () => string }
    ): Promise<void> => {
        const userContent = input.trim();
        if (!userContent || isLoading) return;

        const { screenshotData = null, selectedElements = [], getSelectionContext } = sendOptions || {};

        let contextMessage = "";
        let elementDataForPrompt = "";
        let isModifyingElements = false;

        if (contextMode === "selected" && selectedElements.length > 0 && getSelectionContext) {
            const selectionContext = getSelectionContext();
            contextMessage = `\n\n[Working with ${selectedElements.length} selected elements:\n${selectionContext}]`;

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

        const messageContent: Array<{ type: string; text?: string; url?: string }> = [
            { type: "text", text: userContent }
        ];

        if (screenshotData) {
            messageContent.push({
                type: "image",
                url: screenshotData,
            });
        }

        const userMessage: Message = {
            id: nanoid(),
            role: "user",
            content: messageContent as any,
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

        // Update store state
        addMessageToStore(userMessage);
        setInput("");
        setIsLoading(true);
        setStoreError(null);

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

            const data = await response.json() as any;

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
            let isMermaidDiagram = false;
            let sourceCode: string | undefined = undefined;

            // Check for Mermaid diagrams first
            const mermaidMatch = data.message.match(/```mermaid\s*\n([\s\S]*?)\n```/);
            if (mermaidMatch) {
                try {
                    sourceCode = mermaidMatch[0];
                    const { convertMermaidToCanvas } = await import("@/lib/mermaid-converter");
                    const { elements } = await convertMermaidToCanvas(mermaidMatch[1]);
                    
                    if (elements && elements.length > 0) {
                        drawingCommand = elements;
                        isMermaidDiagram = true;
                        displayMessage = data.message.replace(
                            mermaidMatch[0],
                            "\n\n✅ **Mermaid diagram converted to editable shapes**\n"
                        );
                        console.log(`🧜‍♀️ Converted Mermaid to ${elements.length} Excalidraw elements`);
                    }
                } catch (err) {
                    console.error("Failed to convert Mermaid diagram:", err);
                    sourceCode = undefined;
                }
            }

            // If no Mermaid, check for JSON drawing commands
            if (!drawingCommand) {
                const jsonMatch = data.message.match(/```json\s*\n([\s\S]*?)\n```/)
                    || data.message.match(/```\s*\n([\s\S]*?)\n```/)
                    || data.message.match(/\[\s*\{[\s\S]*?\}\s*\]/);

                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                        if (Array.isArray(parsed)) {
                            drawingCommand = parsed;
                            sourceCode = jsonMatch[0];
                            displayMessage = data.message.replace(
                                jsonMatch[0],
                                "\n\n✅ **Drawing command received**\n"
                            );
                        }
                    } catch (err) {
                        console.error("Failed to parse drawing command:", err);
                    }
                }
            }

            // Check for web embed command
            const embedMatch = data.message.match(/EMBED:\s*(https?:\/\/\S+)/i);
            if (embedMatch) {
                const url = embedMatch[1];
                console.log("🌐 Web embed requested:", url);
                
                eventBus.emit('canvas:create-web-embed', { url });
                
                displayMessage = displayMessage.replace(
                    embedMatch[0],
                    "\n\n✅ **Web page embedded**\n"
                );
                
                sourceCode = embedMatch[0];
            }

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
                sourceCode: sourceCode,
            };

            addMessageToStore(assistantMessage);

        } catch (err) {
            console.error("Send message error:", err);
            setStoreError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, aiProvider, contextMode, canvasState, getCanvasDescription, addMessageToStore, setIsLoading, setStoreError]);

    // Listen for load events from file via event bus
    useEffect(() => {
        const unsubscribeMessages = eventBus.on('chat:load-messages', (data) => {
            const loadedMessages = data.messages.map((msg: any) => ({
                ...msg,
                metadata: {
                    ...msg.metadata,
                    timestamp: new Date(msg.metadata.timestamp),
                },
            }));
            setMessages(loadedMessages);
            console.log(`📂 Loaded ${loadedMessages.length} messages`);
        });

        const unsubscribeProvider = eventBus.on('chat:set-provider', (data) => {
            setAIProvider(data.provider);
            console.log(`📂 Set AI provider to ${data.provider}`);
        });

        return () => {
            unsubscribeMessages();
            unsubscribeProvider();
        };
    }, [setMessages, setAIProvider]);

    return {
        // Message state
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        error: storeError,
        clearError,

        // UI state
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
