/**
 * Unified Canvas Store
 * Single source of truth for all canvas-related state
 * 
 * Absorbs functionality from:
 * - canvasStore.ts (base Zustand store)
 * - eventBus.ts (event system)
 * - ExcalidrawContext.tsx (API reference)
 * 
 * Migration guide:
 * - useCanvasStore() → useUnifiedCanvasStore() (same API, more features)
 * - eventBus.emit('x', data) → useUnifiedCanvasStore.getState().dispatch('x', data)
 * - eventBus.on('x', cb) → useUnifiedCanvasStore.subscribe(selector, cb) or useEffect + selector
 * - useExcalidrawAPI() → useUnifiedCanvasStore(state => state.excalidrawAPI)
 * - useSetExcalidrawAPI() → useUnifiedCanvasStore.getState().setExcalidrawAPI()
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Message } from '@/components/ai-chat/types';
import type { ImageHistoryItem } from '@/components/ai-chat/hooks/useImageGeneration';
import type { CanvasState } from '@/lib/canvas-state-manager';

// === Types ===

export type AIProvider = 'kimi' | 'claude';
export type ContextMode = 'all' | 'selected';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'loading';
  duration?: number;
}

export interface CanvasData {
  elements: any[];
  appState: Record<string, any>;
  files: Record<string, any> | null;
}

// Excalidraw types (moved from ExcalidrawContext)
export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  version?: number;
  versionNonce?: number;
  isDeleted?: boolean;
  customData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ExcalidrawAppState {
  scrollX: number;
  scrollY: number;
  zoom: { value: number };
  viewBackgroundColor?: string;
  currentItemStrokeColor?: string;
  currentItemBackgroundColor?: string;
  gridSize?: number | null;
  editingElement?: ExcalidrawElement | null;
  selectedElementIds?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface ExcalidrawAPI {
  getSceneElements: () => ExcalidrawElement[];
  getAppState: () => ExcalidrawAppState;
  getFiles: () => Record<string, { mimeType: string; id: string; dataURL?: string }>;
  updateScene: (scene: {
    elements?: ExcalidrawElement[];
    appState?: Partial<ExcalidrawAppState>;
    collaborators?: unknown[];
  }) => void;
  scrollToContent: () => void;
  exportToBlob: (opts: {
    mimeType?: string;
    quality?: number;
    maxWidthOrHeight?: number;
    elements?: ExcalidrawElement[];
  }) => Promise<Blob | null>;
  addFiles: (files: Array<{ id: string; mimeType: string; dataURL: string }>) => void;
}

// Command types (converted from eventBus events)
export interface CanvasCommand {
  type: 'insertImage' | 'insertSvg' | 'drawElements' | 'updateElements' | 'captureScreenshot' | 'loadMarkdownFiles';
  payload: any;
  id: string;
}

// === Store Interface ===

export interface UnifiedCanvasStore {
  // === Chat State ===
  messages: Message[];
  aiProvider: AIProvider;
  contextMode: ContextMode;
  isChatLoading: boolean;
  chatError: string | null;

  // === Image Generation State ===
  imageHistory: ImageHistoryItem[];
  isGeneratingImage: boolean;

  // === Canvas State ===
  canvasData: CanvasData | null;
  canvasTitle: string;
  canvasId: string | null;
  isDirty: boolean;
  lastSaved: Date | null;

  // === UI State ===
  toasts: Toast[];
  isChatOpen: boolean;
  isChatMinimized: boolean;
  isAssetsOpen: boolean;
  isShareModalOpen: boolean;
  isTemplateGalleryOpen: boolean;
  isImageGenModalOpen: boolean;
  isLocalPopoverOpen: boolean;

  // === Excalidraw Integration (from ExcalidrawContext) ===
  excalidrawAPI: ExcalidrawAPI | null;
  isExcalidrawReady: boolean;
  selectedElementIds: Record<string, boolean>;

  // === Command Queue (replaces eventBus for imperative operations) ===
  pendingCommand: CanvasCommand | null;
  lastCommandId: string | null;

  // === Actions ===
  // Chat
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setAIProvider: (provider: AIProvider) => void;
  toggleAIProvider: () => void;
  setContextMode: (mode: ContextMode) => void;
  setChatLoading: (loading: boolean) => void;
  setChatError: (error: string | null) => void;
  clearChatError: () => void;

  // Image
  setImageHistory: (history: ImageHistoryItem[]) => void;
  addImageToHistory: (image: ImageHistoryItem) => void;
  removeImageFromHistory: (id: string) => void;
  setGeneratingImage: (generating: boolean) => void;

  // Canvas
  setCanvasData: (data: CanvasData | null) => void;
  setCanvasTitle: (title: string) => void;
  setCanvasId: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setLastSaved: (date: Date | null) => void;
  loadCanvasState: (state: CanvasState) => void;

  // UI
  addToast: (message: string, type?: Toast['type'], duration?: number) => string;
  removeToast: (id: string) => void;
  setChatOpen: (open: boolean) => void;
  setChatMinimized: (minimized: boolean) => void;
  toggleChat: () => void;
  setAssetsOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean) => void;
  setTemplateGalleryOpen: (open: boolean) => void;
  setLocalPopoverOpen: (open: boolean) => void;
  setImageGenModalOpen: (open: boolean) => void;
  openImageGen: () => void;
  openShareModal: () => void;

  // Excalidraw API (from ExcalidrawContext)
  setExcalidrawAPI: (api: ExcalidrawAPI | null) => void;
  setSelectedElementIds: (ids: Record<string, boolean>) => void;

  // Safe getters for Excalidraw API
  getExcalidrawAPI: () => ExcalidrawAPI | null;
  isReady: () => boolean;

  // Commands (replaces eventBus.emit)
  dispatchCommand: (type: CanvasCommand['type'], payload?: any) => string;
  clearCommand: () => void;

  // Legacy compatibility with eventBus patterns
  emit: (event: string, data?: any) => void;
}

// === Storage Configuration ===
const STORAGE_VERSION = 2;

// === Store Implementation ===

export const useUnifiedCanvasStore = create<UnifiedCanvasStore>()(
  devtools(
    persist(
      (set, get) => ({
        // === Initial State ===
        messages: [],
        aiProvider: 'claude',
        contextMode: 'selected',
        isChatLoading: false,
        chatError: null,

        imageHistory: [],
        isGeneratingImage: false,

        canvasData: null,
        canvasTitle: 'Untitled Canvas',
        canvasId: null,
        isDirty: false,
        lastSaved: null,

        toasts: [],
        isChatOpen: false,
        isChatMinimized: false,
        isAssetsOpen: false,
        isShareModalOpen: false,
        isTemplateGalleryOpen: false,
        isImageGenModalOpen: false,
        isLocalPopoverOpen: false,

        excalidrawAPI: null,
        isExcalidrawReady: false,
        selectedElementIds: {},

        pendingCommand: null,
        lastCommandId: null,

        // === Chat Actions ===
        setMessages: (messages) => set({ messages }),

        addMessage: (message) => set((state) => ({
          messages: [...state.messages, message],
        })),

        clearMessages: () => set({ messages: [] }),

        setAIProvider: (aiProvider) => set({ aiProvider }),

        toggleAIProvider: () => set((state) => ({
          aiProvider: state.aiProvider === 'kimi' ? 'claude' : 'kimi',
        })),

        setContextMode: (contextMode) => set({ contextMode }),

        setChatLoading: (isChatLoading) => set({ isChatLoading }),

        setChatError: (chatError) => set({ chatError }),

        clearChatError: () => set({ chatError: null }),

        // === Image Actions ===
        setImageHistory: (imageHistory) => set({ imageHistory }),

        addImageToHistory: (image) => set((state) => ({
          imageHistory: [image, ...state.imageHistory],
        })),

        removeImageFromHistory: (id) => set((state) => ({
          imageHistory: state.imageHistory.filter((img) => img.id !== id),
        })),

        setGeneratingImage: (isGeneratingImage) => set({ isGeneratingImage }),

        // === Canvas Actions ===
        setCanvasData: (canvasData) => set({ canvasData }),

        setCanvasTitle: (canvasTitle) => set({ canvasTitle }),

        setCanvasId: (canvasId) => set({ canvasId }),

        setDirty: (isDirty) => set({ isDirty }),

        setLastSaved: (lastSaved) => set({ lastSaved }),

        loadCanvasState: (state: any) => {
          set({
            messages: state.chat?.messages?.map((msg: any) => ({
              ...msg,
              metadata: {
                ...msg.metadata,
                timestamp: msg.metadata?.timestamp instanceof Date
                  ? msg.metadata.timestamp
                  : new Date(msg.metadata?.timestamp || Date.now()),
              },
            })) || [],
            aiProvider: state.chat?.aiProvider || 'claude',
            contextMode: state.chat?.contextMode || 'selected',
            imageHistory: state.images?.history?.map((img: any) => ({
              ...img,
              timestamp: img.timestamp instanceof Date
                ? img.timestamp
                : new Date(img.timestamp || Date.now()),
            })) || [],
            canvasData: state.canvas || null,
          });
        },

        // === UI Actions ===
        addToast: (message, type = 'info', duration = 3000) => {
          const id = nanoid();
          const toast: Toast = { id, message, type, duration };
          set((state) => ({ toasts: [...state.toasts, toast] }));

          if (duration > 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, duration);
          }

          return id;
        },

        removeToast: (id) => set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

        setChatOpen: (isChatOpen) => set({ isChatOpen }),

        setChatMinimized: (isChatMinimized) => set({ isChatMinimized }),

        toggleChat: () => set((state) => ({
          isChatOpen: !state.isChatOpen,
          isChatMinimized: false,
        })),

        setAssetsOpen: (isAssetsOpen) => set({ isAssetsOpen }),

        setShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),

        setTemplateGalleryOpen: (isTemplateGalleryOpen) => set({ isTemplateGalleryOpen }),
        setLocalPopoverOpen: (isLocalPopoverOpen) => set({ isLocalPopoverOpen }),

        setImageGenModalOpen: (isImageGenModalOpen) => set({ isImageGenModalOpen }),

        openImageGen: () => set({ isImageGenModalOpen: true }),

        openShareModal: () => set({ isShareModalOpen: true }),

        // === Excalidraw API Actions ===
        setExcalidrawAPI: (api) => set({
          excalidrawAPI: api,
          isExcalidrawReady: api !== null
        }),

        setSelectedElementIds: (selectedElementIds) => set({ selectedElementIds }),

        getExcalidrawAPI: () => get().excalidrawAPI,

        isReady: () => get().excalidrawAPI !== null,

        // === Command System (replaces eventBus) ===
        dispatchCommand: (type, payload = {}) => {
          const id = nanoid();
          const command: CanvasCommand = { type, payload, id };
          set({
            pendingCommand: command,
            lastCommandId: id
          });
          return id;
        },

        clearCommand: () => set({ pendingCommand: null }),

        // === Legacy eventBus compatibility ===
        emit: (event, data) => {
          // Map legacy eventBus events to store actions or commands
          const mapping: Record<string, () => void> = {
            'canvas:show-toast': () => {
              if (data?.message) {
                get().addToast(data.message, data.type || 'info');
              }
            },
            'imagegen:open': () => get().openImageGen(),
            'share:open': () => get().openShareModal(),
            'canvas:data-change': () => get().setDirty(true),
          };

          if (mapping[event]) {
            mapping[event]();
          } else {
            // For unmapped events, log a deprecation warning
            console.warn(`[UnifiedStore] Legacy event "${event}" not mapped. Consider migrating to direct store calls.`);
          }
        },
      }),
      {
        name: 'unified-canvas-store',
        version: STORAGE_VERSION,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          aiProvider: state.aiProvider,
          contextMode: state.contextMode,
          canvasTitle: state.canvasTitle,
        }),
      }
    ),
    { name: 'UnifiedCanvasStore' }
  )
);

// === React Hooks for convenience ===

export function useExcalidrawAPI(): ExcalidrawAPI {
  const api = useUnifiedCanvasStore((state) => state.excalidrawAPI);
  if (!api) {
    throw new Error('Excalidraw API not initialized yet');
  }
  return api;
}

export function useExcalidrawAPISafe(): ExcalidrawAPI | null {
  return useUnifiedCanvasStore((state) => state.excalidrawAPI);
}

export function useExcalidrawReady(): boolean {
  return useUnifiedCanvasStore((state) => state.isExcalidrawReady);
}

export function useSetExcalidrawAPI(): (api: ExcalidrawAPI | null) => void {
  return useUnifiedCanvasStore((state) => state.setExcalidrawAPI);
}

// === Command hook for components that need to listen to commands ===
export function useCanvasCommand(
  callback: (command: CanvasCommand) => void
) {
  const { pendingCommand, clearCommand } = useUnifiedCanvasStore();

  // Use useEffect to respond to command changes
  useEffect(() => {
    if (pendingCommand) {
      callback(pendingCommand);
      clearCommand();
    }
  }, [pendingCommand, clearCommand, callback]);
}

// === Re-export types for backward compatibility ===
export type { CanvasStore as LegacyCanvasStore } from './canvasStore';
