/**
 * useAIChatState.ts - Thin React wrapper around ChatCoordinator
 * 
 * All business logic has been moved to lib/ai-chat/ChatCoordinator.ts
 * This hook just bridges React state with the coordinator.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Message } from "../types";
import { useUnifiedCanvasStore } from "@/stores";
import { canvasEvents } from "@/lib/events/eventEmitter";
import { ChatCoordinator } from "@/lib/ai-chat";
import type { AIProvider, ContextMode } from "@/lib/ai-chat";

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

/**
 * React hook for AI chat state management
 * Thin wrapper around ChatCoordinator - business logic is in the coordinator
 */
export function useAIChatState(options: UseAIChatStateOptions): UseAIChatStateReturn {
  const { isOpen, onClose } = options;

  // === STORE INTEGRATION ===
  const store = useUnifiedCanvasStore();
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
  const coordinatorRef = useRef<ChatCoordinator | null>(null);
  const selectedWebEmbedRef = useRef<{ url: string; title: string; elementId: string } | null>(null);

  // Initialize ChatCoordinator
  useMemo(() => {
    coordinatorRef.current = new ChatCoordinator({
      provider: aiProvider,
      onMessage: (msg) => {
        // Convert ChatMessage to Message format and add to store
        addMessageToStore(msg as Message);
      },
      onError: (err) => {
        setStoreError(err.message);
      },
      onLoadingChange: (loading) => {
        setIsLoading(loading);
      },
    });
  }, [addMessageToStore, setStoreError, setIsLoading]);

  // Update coordinator when provider changes
  useEffect(() => {
    if (coordinatorRef.current) {
      coordinatorRef.current.setProvider(aiProvider);
    }
  }, [aiProvider]);

  // Listen for web embed selections via store
  useEffect(() => {
    let lastCommandId: string | null = null;
    const unsubscribe = useUnifiedCanvasStore.subscribe(
      (state) => state.pendingCommand,
      (command) => {
        if (command?.type === 'webembed:selected' && command?.timestamp !== lastCommandId) {
          lastCommandId = command?.timestamp;
          selectedWebEmbedRef.current = command.payload;
          console.log("🌐 Web embed selected for AI context:", command.payload?.url);
        }
      }
    );
    return unsubscribe;
  }, []);

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

  const handleSend = useCallback(async (
    sendOptions?: { screenshotData?: string | null; selectedElements?: string[]; getSelectionContext?: () => string }
  ): Promise<void> => {
    const userContent = input.trim();
    if (!userContent || isLoading) return;

    const { screenshotData = null, selectedElements = [], getSelectionContext } = sendOptions || {};

    // Clear input immediately for better UX
    setInput("");

    // Use the coordinator to send the message
    await coordinatorRef.current?.sendMessage({
      content: userContent,
      screenshotData,
      selectedElements,
      getSelectionContext,
      canvasState,
      contextMode: contextMode as ContextMode,
      provider: aiProvider,
      history: messages,
    });
  }, [input, isLoading, messages, aiProvider, contextMode, canvasState]);

  // Listen for load events from file via event bus
  useEffect(() => {
    const unsubscribeMessages = canvasEvents.on('chat:load-messages', (data) => {
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

    const unsubscribeProvider = canvasEvents.on('chat:set-provider', (data) => {
      setAIProvider(data.provider);
      console.log(`📂 Set AI provider to ${data.provider}`);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeProvider();
    };
  }, [setMessages, setAIProvider]);

  // Cleanup coordinator on unmount
  useEffect(() => {
    return () => {
      coordinatorRef.current?.destroy();
    };
  }, []);

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
