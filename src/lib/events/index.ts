/**
 * Event Bus - REMOVED
 * 
 * This module has been removed. Use the unified canvas store instead:
 * 
 * Before:
 *   import { eventBus, useEvent } from '@/lib/events';
 *   eventBus.emit('imagegen:open');
 * 
 * After:
 *   import { useUnifiedCanvasStore } from '@/stores';
 *   const store = useUnifiedCanvasStore();
 *   store.openImageGen();
 */

// Re-export from unified store
export { useUnifiedCanvasStore, useCanvasCommand } from '@/stores/unifiedCanvasStore';

// Legacy compatibility stub - logs warning
export const eventBus = {
  emit: (event: string, data?: any) => {
    console.warn(`[DEPRECATED] eventBus.emit('${event}') is deprecated. Use useUnifiedCanvasStore instead.`);
    const { useUnifiedCanvasStore } = require('@/stores/unifiedCanvasStore');
    useUnifiedCanvasStore.getState().emit(event, data);
  },
  on: () => {
    console.warn('[DEPRECATED] eventBus.on() is deprecated. Use useUnifiedCanvasStore.subscribe() instead.');
    return () => {};
  },
  off: () => {},
  once: () => {
    console.warn('[DEPRECATED] eventBus.once() is deprecated.');
    return () => {};
  },
};

export const useEvent = () => {
  console.warn('[DEPRECATED] useEvent() is deprecated. Use useUnifiedCanvasStore.subscribe() instead.');
};

export type CanvasEvents = never;
