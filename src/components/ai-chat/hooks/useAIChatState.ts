/**
 * useAIChatState.ts - AI Chat State Management
 * 
 * Thin React wrapper around ChatCoordinator.
 * For canvas operations, use dispatchCommand from the store.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Message } from "../types";
import { useUnifiedCanvasStore } from "@/stores";
import { ChatCoordinator } from "@/lib/ai-chat";
import type { AIProvider, ContextMode } from "@/lib/ai-chat";

export interface UseAIChatStateOptions {
  isOpen: boolean;
  initialWidth?: number;
  onClose: () => void;
}

export interface SendMessageOptions {
  screenshotData?: string | null;
  selectedElements?: string[];
  getSelectionContext?: () => string;
}

export interface UseAIChatStateReturn {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  loadMessages: (messages: Message[]) => void;

  contextMode: "all" | "selected";
  setContextMode: (mode: "all" | "selected") => void;
  aiProvider: AIProvider;
  setAiProvider: (provider: AIProvider) => void;
  toggleProvider: () => void;
  showTemplates: boolean;
  setShowTemplates: (show: boolean) => void;

  canvasState: any | null;
  setCanvasState: (state: any) => void;

  handleSend: (options?: SendMessageOptions) => Promise<void>;
  appendMessage: (message: Message) => void;
  clearMessages: () => void;
}

export function useAIChatState(options: UseAIChatStateOptions): UseAIChatStateReturn {
  const { isOpen, onClose } = options;

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

  const [input, setInput] = useState("");
  const [canvasState, setCanvasState] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const coordinatorRef = useRef<ChatCoordinator | null>(null);
  const selectedWebEmbedRef = useRef<{ url: string; title: string; elementId: string } | null>(null);

  useMemo(() => {
    coordinatorRef.current = new ChatCoordinator({
      provider: aiProvider,
      onMessage: (msg) => {
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

  useEffect(() => {
    if (coordinatorRef.current) {
      coordinatorRef.current.setProvider(aiProvider);
    }
  }, [aiProvider]);

  useEffect(() => {
    let lastCommandId: string | null = null;
    const unsubscribe = useUnifiedCanvasStore.subscribe(
      (state) => state.pendingCommand,
      (command) => {
        if (command?.type === 'webembed:selected' && command?.timestamp !== lastCommandId) {
          lastCommandId = command?.timestamp;
          selectedWebEmbedRef.current = command.payload;
        }
      }
    );
    return unsubscribe;
  }, []);

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

  const loadMessages = useCallback((loadedMessages: Message[]) => {
    const processedMessages = loadedMessages.map((msg) => ({
      ...msg,
      metadata: {
        ...msg.metadata,
        timestamp: msg.metadata?.timestamp instanceof Date 
          ? msg.metadata.timestamp 
          : new Date(msg.metadata?.timestamp || Date.now()),
      },
    }));
    setMessages(processedMessages);
  }, [setMessages]);

  const handleSend = useCallback(async (
    sendOptions?: { screenshotData?: string | null; selectedElements?: string[]; getSelectionContext?: () => string }
  ): Promise<void> => {
    const userContent = input.trim();
    if (!userContent || isLoading) return;

    const { screenshotData = null, selectedElements = [], getSelectionContext } = sendOptions || {};

    setInput("");

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

  useEffect(() => {
    return () => {
      coordinatorRef.current?.destroy();
    };
  }, []);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    error: storeError,
    clearError,
    loadMessages,

    contextMode,
    setContextMode,
    aiProvider,
    setAiProvider: setAiProviderCallback,
    toggleProvider,
    showTemplates,
    setShowTemplates,

    canvasState,
    setCanvasState,

    handleSend,
    appendMessage,
    clearMessages,
  };
}

export default useAIChatState;
