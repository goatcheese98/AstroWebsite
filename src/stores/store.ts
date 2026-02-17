/**
 * Main Store
 * 
 * Composes all slices into a single Zustand store.
 * Includes middleware for devtools and persistence.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StoreState } from './types';

import {
  createCanvasSlice,
  createUISlice,
  createChatSlice,
  createCommandSlice,
  createAsyncSlice,
} from './slices';

// ============================================================================
// Store Creation
// ============================================================================

export const useStore = create<StoreState>()(
  devtools(
    (...args) => ({
      ...createCanvasSlice(...args),
      ...createUISlice(...args),
      ...createChatSlice(...args),
      ...createCommandSlice(...args),
      ...createAsyncSlice(...args),
    }),
    {
      name: 'CanvasStore',
      enabled: typeof window !== 'undefined' && process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// Selector Hooks (for better performance)
// ============================================================================

/**
 * Hook to get the Excalidraw API safely
 * Returns null if not ready
 */
export function useExcalidrawAPI() {
  return useStore((state) => state.excalidrawAPI);
}

/**
 * Hook to check if Excalidraw is ready
 */
export function useExcalidrawReady() {
  return useStore((state) => state.isExcalidrawReady);
}

/**
 * Hook to get/set the Excalidraw API
 */
export function useSetExcalidrawAPI() {
  return useStore((state) => state.setExcalidrawAPI);
}

/**
 * Hook to get the safe Excalidraw API (null if not ready)
 */
export function useExcalidrawAPISafe() {
  return useStore((state) => 
    state.isExcalidrawReady ? state.excalidrawAPI : null
  );
}

/**
 * Hook to get canvas data
 */
export function useCanvasData() {
  return useStore((state) => ({
    elements: state.elements,
    appState: state.appState,
    files: state.files,
  }));
}

/**
 * Hook to get/set canvas dirty state
 */
export function useCanvasDirty() {
  return useStore((state) => ({
    isDirty: state.isDirty,
    setDirty: state.setDirty,
    lastSaved: state.lastSaved,
  }));
}

/**
 * Hook to access pending command
 */
export function useCanvasCommand() {
  return useStore((state) => state.pendingCommand);
}

// ============================================================================
// Convenience Hooks for Common Patterns
// ============================================================================

/**
 * Hook for toast notifications
 */
export function useToasts() {
  return useStore((state) => ({
    toasts: state.toasts,
    addToast: state.addToast,
    removeToast: state.removeToast,
  }));
}

/**
 * Hook for chat operations
 */
export function useChat() {
  return useStore((state) => ({
    messages: state.messages,
    addMessage: state.addMessage,
    setMessages: state.setMessages,
    clearMessages: state.clearMessages,
    aiProvider: state.aiProvider,
    setAIProvider: state.setAIProvider,
    contextMode: state.contextMode,
    setContextMode: state.setContextMode,
    isChatLoading: state.isChatLoading,
    chatError: state.chatError,
    setChatError: state.setChatError,
    clearChatError: state.clearChatError,
  }));
}

/**
 * Hook for UI panel state
 */
export function usePanels() {
  return useStore((state) => ({
    isChatOpen: state.isChatOpen,
    setChatOpen: state.setChatOpen,
    toggleChat: state.toggleChat,
    isAssetsOpen: state.isAssetsOpen,
    setAssetsOpen: state.setAssetsOpen,
    toggleAssets: state.toggleAssets,
    isShareModalOpen: state.isShareModalOpen,
    setShareModalOpen: state.setShareModalOpen,
    isImageGenModalOpen: state.isImageGenModalOpen,
    setImageGenModalOpen: state.setImageGenModalOpen,
    isSaveModalOpen: state.isSaveModalOpen,
    setSaveModalOpen: state.setSaveModalOpen,
  }));
}

/**
 * Hook for async operations
 */
export function useAsyncOperation(operationId?: string) {
  return useStore((state) => {
    const operation = operationId ? state.operations.get(operationId) : undefined;
    return {
      operation,
      isPending: operation ? state.isOperationPending(operationId!) : false,
      startOperation: state.startOperation,
      updateOperation: state.updateOperation,
      completeOperation: state.completeOperation,
      failOperation: state.failOperation,
    };
  });
}
