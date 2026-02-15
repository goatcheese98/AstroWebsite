/**
 * Events Module
 * 
 * Provides a typed event emitter for cross-component communication
 * that doesn't fit the Zustand store model (one-time commands, notifications).
 * 
 * For persistent state, use useUnifiedCanvasStore instead.
 * 
 * @example
 *   import { canvasEvents, useCanvasEvent } from '@/lib/events';
 *   
 *   // Emit an event
 *   canvasEvents.emit('excalidraw:screenshot-captured', { dataUrl: '...' });
 *   
 *   // Listen in a component
 *   useCanvasEvent('excalidraw:screenshot-captured', (data) => {
 *     console.log(data.dataUrl);
 *   });
 */

export { canvasEvents, useCanvasEvent } from './eventEmitter';
export type { CanvasEventMap, CanvasEventType, EventCallback } from './eventEmitter';
