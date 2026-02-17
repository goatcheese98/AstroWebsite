/**
 * UI Slice
 * 
 * Manages UI state:
 * - Panel visibility (chat, assets, modals)
 * - Toast notifications
 * - Theme preferences (could be added)
 */

import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import type { UISlice, Toast } from '../types';

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set, get) => ({
  // === State ===
  isChatOpen: false,
  isChatMinimized: false,
  isAssetsOpen: false,
  isShareModalOpen: false,
  isImageGenModalOpen: false,
  isSaveModalOpen: false,
  toasts: [],

  // === Panel Actions ===
  setChatOpen: (open: boolean) => {
    set({ isChatOpen: open });
    if (!open) {
      set({ isChatMinimized: false });
    }
  },

  setChatMinimized: (minimized: boolean) => {
    set({ isChatMinimized: minimized });
  },

  toggleChat: () => {
    set((state) => {
      if (state.isChatOpen && !state.isChatMinimized) {
        // Open -> Minimized
        return { isChatMinimized: true };
      } else if (state.isChatOpen && state.isChatMinimized) {
        // Minimized -> Open
        return { isChatMinimized: false };
      } else {
        // Closed -> Open
        return { isChatOpen: true, isChatMinimized: false };
      }
    });
  },

  setAssetsOpen: (open: boolean) => {
    set({ isAssetsOpen: open });
  },

  toggleAssets: () => {
    set((state) => ({ isAssetsOpen: !state.isAssetsOpen }));
  },

  setShareModalOpen: (open: boolean) => {
    set({ isShareModalOpen: open });
  },

  setImageGenModalOpen: (open: boolean) => {
    set({ isImageGenModalOpen: open });
  },

  setSaveModalOpen: (open: boolean) => {
    set({ isSaveModalOpen: open });
  },

  // === Toast Actions ===
  addToast: (message: string, type: Toast['type'], duration = 3000): string => {
    const id = nanoid();
    const toast: Toast = { id, message, type, duration };
    
    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove non-loading toasts
    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  // === Selectors ===
  isAnyModalOpen: () => {
    const state = get();
    return (
      state.isShareModalOpen ||
      state.isImageGenModalOpen ||
      state.isSaveModalOpen
    );
  },
});
