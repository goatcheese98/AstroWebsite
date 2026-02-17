/**
 * useCanvasCommands.ts - Thin React wrapper around CanvasCommandProcessor
 * 
 * All business logic has been moved to lib/ai-chat/CanvasCommandProcessor.ts
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useUnifiedCanvasStore, useCanvasCommand } from "@/stores";
import {
  CanvasCommandProcessor,
  getSelectedElementIds,
} from "@/lib/ai-chat";

export interface UseCanvasCommandsOptions {
  /** Whether the chat is currently open (affects event listening) */
  isOpen: boolean;
  /** Callback when canvas state updates */
  onStateUpdate?: (state: any) => void;
  /** Callback when new elements are added */
  onElementsAdded?: (elementIds: string[]) => void;
}

export interface UseCanvasCommandsReturn {
  /** Current canvas state snapshot */
  canvasState: any | null;
  /** Set canvas state directly (from external source) */
  setCanvasState: (state: any) => void;
  /** Execute a drawing command (create new elements) */
  drawElements: (elements: any[], isModification?: boolean) => boolean;
  /** Execute an update command (modify existing elements) */
  updateElements: (elements: any[]) => boolean;
  /** Insert an image into the canvas */
  insertImage: (
    imageData: string,
    width: number,
    height: number,
    type?: string
  ) => boolean;
  /** Get human-readable description of canvas contents */
  getCanvasDescription: () => string;
  /** Request current canvas state from Excalidraw */
  requestCanvasState: () => void;
  /** Get selected elements from Excalidraw API */
  getSelectedElementIds: () => string[];
}

/**
 * React hook for canvas command operations
 * Thin wrapper around CanvasCommandProcessor
 */
export function useCanvasCommands(
  options: UseCanvasCommandsOptions
): UseCanvasCommandsReturn {
  const { isOpen, onStateUpdate, onElementsAdded } = options;

  // === 🎨 Canvas State ===
  const [canvasState, setCanvasState] = useState<any>(null);

  // Processor instance
  const processorRef = useRef<CanvasCommandProcessor | null>(null);

  // Initialize processor
  useEffect(() => {
    processorRef.current = new CanvasCommandProcessor();

    // Subscribe to processor state changes
    const unsubscribe = processorRef.current.subscribe((state) => {
      setCanvasState(state);
      onStateUpdate?.(state);
    });

    return () => {
      unsubscribe();
    };
  }, [onStateUpdate]);

  /**
   * Execute a drawing command - creates new elements on the canvas
   */
  const drawElements = useCallback(
    (elements: any[], isModification = false): boolean => {
      return processorRef.current?.draw(elements, isModification) ?? false;
    },
    []
  );

  /**
   * Execute an update command - modifies existing elements
   */
  const updateElements = useCallback((elements: any[]): boolean => {
    return processorRef.current?.update(elements) ?? false;
  }, []);

  /**
   * Insert an image into the canvas
   */
  const insertImage = useCallback(
    (
      imageData: string,
      width: number,
      height: number,
      type = "png"
    ): boolean => {
      return processorRef.current?.insertImage(imageData, width, height, type) ?? false;
    },
    []
  );

  /**
   * Get a human-readable description of canvas contents
   */
  const getCanvasDescription = useCallback((): string => {
    return processorRef.current?.getDescription() ?? "Canvas not available";
  }, []);

  /**
   * Request current state from Excalidraw
   */
  const requestCanvasState = useCallback(() => {
    processorRef.current?.refreshState();
  }, []);

  /**
   * Get currently selected element IDs from Excalidraw API
   */
  const getSelectedElementIdsCallback = useCallback((): string[] => {
    return getSelectedElementIds();
  }, []);

  /**
   * Listen for canvas state updates when opened
   */
  useEffect(() => {
    if (!isOpen) return;

    // Request initial state
    const timeout = setTimeout(() => {
      requestCanvasState();
    }, 100);

    return () => {
      clearTimeout(timeout);
    };
  }, [isOpen, requestCanvasState]);

  /**
   * Use canvas command hook to listen for commands
   */
  useCanvasCommand((command) => {
    if (!isOpen) return;

    switch (command.type) {
      case "drawElements":
        // After draw elements, update the canvas state
        requestCanvasState();
        // Call the callback if provided
        const elementIds = command.payload?.elements
          ?.map((el: any) => el.id)
          .filter(Boolean);
        if (elementIds?.length > 0) {
          onElementsAdded?.(elementIds);
        }
        break;
      case "updateElements":
        requestCanvasState();
        break;
      case "insertImage":
        requestCanvasState();
        break;
    }
  });

  /**
   * Subscribe to canvas data changes from the store
   */
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = useUnifiedCanvasStore.subscribe((state) => {
      if (state.canvasData) {
        processorRef.current?.setState(state.canvasData);
      }
    });

    return unsubscribe;
  }, [isOpen]);

  return {
    canvasState,
    setCanvasState: (state) => processorRef.current?.setState(state),
    drawElements,
    updateElements,
    insertImage,
    getCanvasDescription,
    requestCanvasState,
    getSelectedElementIds: getSelectedElementIdsCallback,
  };
}

export default useCanvasCommands;
