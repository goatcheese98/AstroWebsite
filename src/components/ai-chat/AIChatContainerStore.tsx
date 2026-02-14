/**
 * AIChatContainer - Store-Integrated Version
 * Uses Zustand store instead of props for state management
 * 
 * Key changes:
 * - No onStateUpdate callback needed - writes directly to store
 * - No pendingLoadState prop - subscribes to store
 * - No imageHistory/setImageHistory props - uses store directly
 * - ~40% reduction in props and complexity
 */

import React, { useRef, useCallback, useEffect, useState } from "react";

// Store and events
import { useCanvasStore } from "@/stores";
import { eventBus, useEvent } from "@/lib/events";

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
import TemplateModal from "./TemplateModal";

interface AIChatContainerProps {
  /** Whether the chat panel is visible */
  isOpen: boolean;
  /** Callback when user closes the panel */
  onClose: () => void;
  /** Initial width of the panel in pixels */
  initialWidth?: number;
}

/**
 * AI Chat Container - Store Integrated
 * Subscribes to global store instead of receiving props
 */
export default function AIChatContainerStore({
  isOpen,
  onClose,
  initialWidth = 340,
}: AIChatContainerProps) {
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
  } = store;

  // === LOCAL UI STATE ===
  const [showTemplates, setShowTemplates] = useState(false);
  const [hasLoadedPendingState, setHasLoadedPendingState] = useState(false);

  // === REFS ===
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wasManualSelectionRef = useRef(false);
  const previousSelectionCountRef = useRef(0);

  // === ELEMENT SELECTION ===
  const {
    selectedElements,
    elementSnapshots,
    clearSelection,
    getSelectionContext,
  } = useElementSelection({ enabled: isOpen });

  // === PANEL RESIZING ===
  const panelWidth = isMobile ? viewportWidth : 360;
  const [panelHeight, setPanelHeight] = useState(600);
  const [isResizingHeight, setIsResizingHeight] = useState(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsResizingHeight(true);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }, [isMobile]);

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

  // === CORE CHAT STATE (kept in hook for API logic) ===
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

  // === CANVAS COMMANDS ===
  const { drawElements, updateElements } = useCanvasCommands({
    isOpen,
    onStateUpdate: setCanvasState,
  });

  // === AUTO-SWITCH TO SELECTED MODE ===
  useEffect(() => {
    const currentCount = selectedElements.length;
    const previousCount = previousSelectionCountRef.current;

    if (contextMode === "all" && currentCount > 0 && currentCount < (canvasState?.elements?.length || 0)) {
      setContextMode("selected");
    }

    previousSelectionCountRef.current = currentCount;
  }, [selectedElements.length, contextMode, setContextMode, canvasState?.elements?.length]);

  // === LOAD STATE FROM STORE ===
  // Listen for load events from file via event bus
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
  }, [hasLoadedPendingState, setMessages, setAIProvider, setContextMode, setImageHistory]);

  // Reset loaded flag
  useEffect(() => {
    if (hasLoadedPendingState) {
      // Reset after a delay to allow future loads
      const timer = setTimeout(() => setHasLoadedPendingState(false), 100);
      return () => clearTimeout(timer);
    }
  }, [hasLoadedPendingState]);

  // === MESSAGE HANDLING ===
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

  // === KEYBOARD SHORTCUTS ===
  const { handleKeyDown } = useKeyboardShortcuts({
    onSend: handleSend,
    onClose,
    hasInput: input.trim().length > 0,
    isLoading: isChatLoading,
  });

  // === RENDER ===
  if (!isOpen) return null;

  return (
    <>
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
        isMobile={isMobile}
      >
        <ChatHeader onClose={onClose} />

        <div style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}>
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
