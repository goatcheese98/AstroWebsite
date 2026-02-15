import { useState, useCallback, useEffect } from "react";
import { useUnifiedCanvasStore, useCanvasCommand } from '@/stores';

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
    insertImage: (imageData: string, width: number, height: number, type?: string) => boolean;
    /** Get human-readable description of canvas contents */
    getCanvasDescription: () => string;
    /** Request current canvas state from Excalidraw */
    requestCanvasState: () => void;
    /** Get selected elements from Excalidraw API */
    getSelectedElementIds: () => string[];
}

export function useCanvasCommands(options: UseCanvasCommandsOptions): UseCanvasCommandsReturn {
    const { isOpen, onStateUpdate, onElementsAdded } = options;

    // === 🎨 Canvas State ===
    const [canvasState, setCanvasState] = useState<any>(null);

    /**
     * Execute a drawing command - creates new elements on the canvas
     */
    const drawElements = useCallback((elements: any[], isModification = false): boolean => {
        try {
            if (!Array.isArray(elements)) {
                console.error("❌ Invalid drawing command: elements must be an array");
                return false;
            }

            if (elements.length === 0) {
                console.warn("⚠️ Empty drawing command - nothing to draw");
                return false;
            }

            useUnifiedCanvasStore.getState().dispatchCommand('drawElements', { elements, isModification });
            console.log(`✅ Dispatched draw command: ${elements.length} elements`);
            return true;

        } catch (err) {
            console.error("❌ Failed to execute drawing command:", err);
            return false;
        }
    }, []);

    /**
     * Execute an update command - modifies existing elements
     */
    const updateElements = useCallback((elements: any[]): boolean => {
        try {
            if (!Array.isArray(elements)) {
                console.error("❌ Invalid update command: elements must be an array");
                return false;
            }

            if (elements.length === 0) {
                console.warn("⚠️ Empty update command - nothing to update");
                return false;
            }

            useUnifiedCanvasStore.getState().dispatchCommand('updateElements', { elements });
            console.log(`✅ Dispatched update command: ${elements.length} elements`);
            return true;

        } catch (err) {
            console.error("❌ Failed to execute update command:", err);
            return false;
        }
    }, []);

    /**
     * Insert an image into the canvas
     */
    const insertImage = useCallback((
        imageData: string,
        width: number,
        height: number,
        type = "png"
    ): boolean => {
        try {
            useUnifiedCanvasStore.getState().dispatchCommand('insertImage', { imageData, type, width, height });
            console.log(`✅ Dispatched insert-image: ${width}x${height}`);
            return true;

        } catch (err) {
            console.error("❌ Failed to insert image:", err);
            return false;
        }
    }, []);

    /**
     * Get a human-readable description of canvas contents
     */
    const getCanvasDescription = useCallback((): string => {
        if (!canvasState?.elements?.length) {
            return "The canvas is currently empty.";
        }

        const counts: Record<string, number> = {};
        canvasState.elements.forEach((el: any) => {
            counts[el.type] = (counts[el.type] || 0) + 1;
        });

        const desc = Object.entries(counts)
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');

        return `Canvas has ${canvasState.elements.length} elements: ${desc}`;
    }, [canvasState]);

    /**
     * Request current state from Excalidraw
     */
    const requestCanvasState = useCallback(() => {
        // Use the store's getExcalidrawAPI to get current state directly
        const api = useUnifiedCanvasStore.getState().getExcalidrawAPI();
        if (api) {
            const elements = api.getSceneElements();
            const appState = api.getAppState();
            const state = { elements, appState };
            setCanvasState(state);
        }
    }, []);

    /**
     * Get currently selected element IDs from Excalidraw API
     */
    const getSelectedElementIds = useCallback((): string[] => {
        const api = useUnifiedCanvasStore.getState().getExcalidrawAPI();
        if (!api) return [];

        const appState = api.getAppState();
        return Object.entries(appState.selectedElementIds || {})
            .filter(([_, selected]) => selected)
            .map(([id]) => id);
    }, []);

    /**
     * Listen for canvas state updates from Excalidraw using command hook
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
            case 'drawElements':
                // After draw elements, update the canvas state
                requestCanvasState();
                // Call the callback if provided
                const elementIds = command.payload?.elements?.map((el: any) => el.id).filter(Boolean);
                if (elementIds && elementIds.length > 0) {
                    onElementsAdded?.(elementIds);
                }
                break;
            case 'updateElements':
                // After update, refresh state
                requestCanvasState();
                break;
            case 'insertImage':
                // After insert, refresh state
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
                setCanvasState(state.canvasData);
                onStateUpdate?.(state.canvasData);
            }
        });

        return unsubscribe;
    }, [isOpen, onStateUpdate]);

    return {
        canvasState,
        setCanvasState,
        drawElements,
        updateElements,
        insertImage,
        getCanvasDescription,
        requestCanvasState,
        getSelectedElementIds,
    };
}

export default useCanvasCommands;
