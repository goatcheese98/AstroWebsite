/**
 * Async Slice
 * 
 * Tracks long-running async operations:
 * - Image generation
 * - File uploads
 * - Screenshot capture
 * - API calls
 * 
 * Provides progress tracking and cancellation support.
 */

import type { StateCreator } from 'zustand';
import type { AsyncSlice, AsyncOperation, AsyncOperationStatus } from '../types';

export const createAsyncSlice: StateCreator<
  AsyncSlice,
  [],
  [],
  AsyncSlice
> = (set, get) => ({
  // === State ===
  operations: new Map(),

  // === Actions ===
  startOperation: (id: string, type: string) => {
    set((state) => {
      const operations = new Map(state.operations);
      operations.set(id, {
        id,
        type,
        status: 'pending',
        startedAt: Date.now(),
      });
      return { operations };
    });
  },

  updateOperation: (id: string, progress: number) => {
    set((state) => {
      const operation = state.operations.get(id);
      if (!operation) return state;

      const operations = new Map(state.operations);
      operations.set(id, {
        ...operation,
        status: 'progress',
        progress: Math.min(100, Math.max(0, progress)),
      });
      return { operations };
    });
  },

  completeOperation: (id: string, result?: any) => {
    set((state) => {
      const operation = state.operations.get(id);
      if (!operation) return state;

      const operations = new Map(state.operations);
      operations.set(id, {
        ...operation,
        status: 'completed',
        result,
        progress: 100,
        completedAt: Date.now(),
      });
      return { operations };
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      get().removeOperation(id);
    }, 5000);
  },

  failOperation: (id: string, error: string) => {
    set((state) => {
      const operation = state.operations.get(id);
      if (!operation) return state;

      const operations = new Map(state.operations);
      operations.set(id, {
        ...operation,
        status: 'failed',
        error,
        completedAt: Date.now(),
      });
      return { operations };
    });

    // Auto-remove after 10 seconds (longer to show error)
    setTimeout(() => {
      get().removeOperation(id);
    }, 10000);
  },

  removeOperation: (id: string) => {
    set((state) => {
      const operations = new Map(state.operations);
      operations.delete(id);
      return { operations };
    });
  },

  // === Selectors ===
  getOperation: (id: string) => {
    return get().operations.get(id);
  },

  isOperationPending: (id: string) => {
    const op = get().operations.get(id);
    return op?.status === 'pending' || op?.status === 'progress';
  },
});
