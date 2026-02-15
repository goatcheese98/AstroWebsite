/**
 * Event Emitter - Replacement for deprecated eventBus
 * 
 * This provides a simple pub/sub mechanism for cross-component communication
 * that doesn't fit well into the Zustand store model.
 * 
 * Note: This should be used sparingly. Most state should go through the 
 * unifiedCanvasStore. This is for events that need immediate broadcast
 * without state persistence.
 */

export type EventCallback = (data?: any) => void;

export interface CanvasEventMap {
  // Canvas state events
  'excalidraw:state-update': { elements: any[]; appState: any; files?: Record<string, any> };
  'excalidraw:elements-added': { elementIds: string[] };
  'excalidraw:screenshot-captured': { requestId: string; dataUrl: string; elements?: any[] };
  
  // Asset events
  'asset:image-generated': { imageUrl: string; prompt?: string };
  
  // Chat events
  'chat:load-messages': { messages: any[] };
  'chat:set-provider': { provider: 'kimi' | 'claude' };
  
  // Markdown events
  'markdown:edit': { elementId: string };
  
  // Command events (legacy bridge)
  'excalidraw:draw': { elements: any[]; isModification?: boolean };
  'excalidraw:update-elements': { elements: any[] };
  'excalidraw:insert-image': { imageData: string; type: string; width?: number; height?: number };
  'excalidraw:insert-svg': { svgPath: string; svgId: string };
  'excalidraw:get-state': void;
  'excalidraw:capture-screenshot': { elementIds?: string[]; quality?: string; requestId?: string };
  'excalidraw:image-inserted': void;
  'canvas:load-state': { state: any };
  'canvas:data-change': void;
  'canvas:create-web-embed': { url: string };
  'imagegen:generate': { screenshotData?: string; options?: any };
}

export type CanvasEventType = keyof CanvasEventMap;

class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<T extends CanvasEventType>(
    event: T,
    callback: (data: CanvasEventMap[T]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  off<T extends CanvasEventType>(
    event: T,
    callback: (data: CanvasEventMap[T]) => void
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  once<T extends CanvasEventType>(
    event: T,
    callback: (data: CanvasEventMap[T]) => void
  ): () => void {
    const onceWrapper = (data: CanvasEventMap[T]) => {
      this.off(event, onceWrapper);
      callback(data);
    };
    return this.on(event, onceWrapper);
  }

  emit<T extends CanvasEventType>(
    event: T,
    data?: CanvasEventMap[T]
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      });
    }
  }

  // Get count of listeners for debugging
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  // Remove all listeners (useful for testing)
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Singleton instance
export const canvasEvents = new EventEmitter();

// Hook for React components
import { useEffect } from 'react';

export function useCanvasEvent<T extends CanvasEventType>(
  event: T,
  callback: (data: CanvasEventMap[T]) => void,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const unsubscribe = canvasEvents.on(event, callback);
    return unsubscribe;
  }, [event, ...deps]);
}
