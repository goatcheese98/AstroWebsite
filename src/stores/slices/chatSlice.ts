/**
 * Chat Slice
 * 
 * Manages AI chat state:
 * - Message history
 * - AI provider selection
 * - Context mode (all vs selected)
 * - Loading and error states
 */

import type { StateCreator } from 'zustand';
import type { ChatSlice, Message, AIProvider, ContextMode, GeneratedImage } from '../types';

export const createChatSlice: StateCreator<
  ChatSlice,
  [],
  [],
  ChatSlice
> = (set, get) => ({
  // === State ===
  messages: [],
  aiProvider: 'kimi',
  contextMode: 'all',
  isChatLoading: false,
  chatError: null,
  imageHistory: [],

  // === Actions ===
  setMessages: (messages) => {
    if (typeof messages === 'function') {
      set((state) => ({ messages: messages(state.messages) }));
    } else {
      set({ messages });
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage: (id: string, updates: Partial<Message>) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  deleteMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setAIProvider: (provider) => {
    if (typeof provider === 'function') {
      set((state) => ({ aiProvider: provider(state.aiProvider) }));
    } else {
      set({ aiProvider: provider });
    }
  },

  setContextMode: (mode: ContextMode) => {
    set({ contextMode: mode });
  },

  setChatLoading: (loading: boolean) => {
    set({ isChatLoading: loading });
  },

  setChatError: (error: string | null) => {
    set({ chatError: error });
  },

  clearChatError: () => {
    set({ chatError: null });
  },

  // === Image History Actions ===
  addGeneratedImage: (image: GeneratedImage) => {
    set((state) => ({
      imageHistory: [image, ...state.imageHistory],
    }));
  },

  removeGeneratedImage: (id: string) => {
    set((state) => ({
      imageHistory: state.imageHistory.filter((img) => img.id !== id),
    }));
  },

  clearImageHistory: () => {
    set({ imageHistory: [] });
  },
});
