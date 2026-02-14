/**
 * Central Canvas Store (Zustand)
 * Replaces prop drilling and window-based state sharing
 * 
 * Features:
 * - Persist chat messages and image history to localStorage
 * - DevTools integration for debugging
 * - Typed actions and state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import type { Message } from '@/components/ai-chat/types';
import type { ImageHistoryItem } from '@/components/ai-chat/hooks/useImageGeneration';
import type { CanvasState } from '@/lib/canvas-state-manager';

export type AIProvider = 'kimi' | 'claude';
export type ContextMode = 'all' | 'selected';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  duration?: number;
}

export interface CanvasData {
  elements: any[];
  appState: Record<string, any>;
  files: Record<string, any> | null;
}

interface CanvasStore {
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

  // === Actions ===
  // Chat actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setAIProvider: (provider: AIProvider) => void;
  toggleAIProvider: () => void;
  setContextMode: (mode: ContextMode) => void;
  setChatLoading: (loading: boolean) => void;
  setChatError: (error: string | null) => void;
  clearChatError: () => void;

  // Image actions
  setImageHistory: (history: ImageHistoryItem[]) => void;
  addImageToHistory: (image: ImageHistoryItem) => void;
  removeImageFromHistory: (id: string) => void;
  setGeneratingImage: (generating: boolean) => void;

  // Canvas actions
  setCanvasData: (data: CanvasData | null) => void;
  setCanvasTitle: (title: string) => void;
  setCanvasId: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setLastSaved: (date: Date | null) => void;

  // UI actions
  addToast: (message: string, type?: Toast['type'], duration?: number) => string;
  removeToast: (id: string) => void;
  setChatOpen: (open: boolean) => void;
  setChatMinimized: (minimized: boolean) => void;
  setAssetsOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean) => void;
  setTemplateGalleryOpen: (open: boolean) => void;

  // Load from saved state
  loadCanvasState: (state: CanvasState) => void;
}

// Storage version for migrations
const STORAGE_VERSION = 1;

export const useCanvasStore = create<CanvasStore>()(
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

        // === Chat Actions ===
        setMessages: (messages) => set({ messages }),

        addMessage: (message) => set((state) => {
          console.log('📨 Store: Adding message to store:', message.id, message.role);
          return {
            messages: [...state.messages, message],
          };
        }),

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

        // === UI Actions ===
        addToast: (message, type = 'info', duration = 3000) => {
          const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const toast: Toast = { id, message, type, duration };
          set((state) => ({ toasts: [...state.toasts, toast] }));

          // Auto-remove after duration (if specified)
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

        setAssetsOpen: (isAssetsOpen) => set({ isAssetsOpen }),

        setShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),

        setTemplateGalleryOpen: (isTemplateGalleryOpen) => set({ isTemplateGalleryOpen }),

        // === Load from Saved State ===
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
      }),
      {
        name: 'canvas-store',
        version: STORAGE_VERSION,
        storage: createJSONStorage(() => localStorage),
        // Only persist specific fields (exclude large blobs like imageHistory)
        partialize: (state: CanvasStore) => ({
          aiProvider: state.aiProvider,
          contextMode: state.contextMode,
          canvasTitle: state.canvasTitle,
        }),
      } as any
    ),
    { name: 'CanvasStore' }
  )
);
