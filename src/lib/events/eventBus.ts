/**
 * Typed Event Bus
 * Replaces window.addEventListener/dispatchEvent with type-safe events
 * 
 * Usage:
 *   eventBus.emit('canvas:load-state', { state })
 *   eventBus.on('canvas:load-state', (data) => { ... })
 */

export interface CanvasEvents {
  // Canvas state events
  'canvas:load-state': { state: any };
  'canvas:data-change': void;
  'canvas:show-toast': { message: string; type?: 'info' | 'success' | 'error' };
  'canvas:load-markdown-files': { files: File[]; dropPosition?: { x: number; y: number } };

  // Excalidraw events
  'excalidraw:capture-screenshot': {
    elementIds?: string[];
    quality?: 'low' | 'medium' | 'high' | 'preview';
    backgroundColor?: string;
    requestId: string;
  };
  'excalidraw:screenshot-captured': {
    requestId: string;
    dataURL?: string;
    error?: string;
    elementCount?: number;
    elementIds?: string[];
  };
  'excalidraw:image-inserted': void;
  'excalidraw:draw': {
    elements: unknown[];
    isModification?: boolean;
  };
  'excalidraw:update-elements': {
    elements: unknown[];
  };
  'excalidraw:elements-added': {
    elementIds: string[];
  };
  'excalidraw:insert-svg': {
    svgPath: string;
    svgId?: string;
  };
  'excalidraw:selection-change': {
    selectedElementIds: Record<string, boolean>;
  };
  'excalidraw:insert-image': {
    imageData: string;
    type?: string;
    width?: number;
    height?: number;
  };
  'excalidraw:get-state': void;
  'excalidraw:state-update': {
    elements: unknown[];
    appState: unknown;
  };

  // Image generation events
  'imagegen:open': void;
  'imagegen:load-history': {
    images: unknown[];
  };

  // Asset events
  'asset:image-generated': { imageUrl: string; prompt?: string; timestamp?: Date };

  // Share events
  'share:open': void;

  // AI chat events
  'ai-chat:close-request': void;
  'chat:load-messages': { messages: unknown[] };
  'chat:set-provider': { provider: 'kimi' | 'claude' };

  // Web embed events
  'webembed:selected': { elementId: string; url: string; title: string };
  'canvas:create-web-embed': { url: string };

  // Debug events
  'canvas:debug-save': void;

  // Legacy compatibility events (for gradual migration)
  'ai-draw-command': {  // Legacy name for excalidraw:draw
    elements: unknown[];
    isModification?: boolean;
  };
  'markdown:edit': {
    elementId: string;
    content?: string;
  };
}

type EventCallback<T> = (data: T) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  on<K extends keyof CanvasEvents>(
    event: K,
    callback: EventCallback<CanvasEvents[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  off<K extends keyof CanvasEvents>(
    event: K,
    callback: EventCallback<CanvasEvents[K]>
  ): void {
    this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
  }

  emit<K extends keyof CanvasEvents>(
    event: K,
    data?: CanvasEvents[K]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data as unknown));
    }
  }

  // One-time listener
  once<K extends keyof CanvasEvents>(
    event: K,
    callback: EventCallback<CanvasEvents[K]>
  ): void {
    const unsubscribe = this.on(event, ((data: CanvasEvents[K]) => {
      callback(data);
      unsubscribe();
    }) as EventCallback<CanvasEvents[K]>);
  }
}

export const eventBus = new EventBus();

// React hook for using the event bus
import { useEffect } from 'react';

export function useEvent<K extends keyof CanvasEvents>(
  event: K,
  callback: EventCallback<CanvasEvents[K]>,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    return eventBus.on(event, callback);
  }, [event, ...deps]);
}
