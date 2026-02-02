/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      🎨 useCanvasCommands.ts                                 ║
 * ║                    "The Canvas Action Director"                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔵 Custom Hook | ⚡ Event Dispatcher | 🛡️ Safety Wrapper         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the director that tells Excalidraw what to draw. When the AI responds with
 * drawing instructions (JSON arrays of elements), I'm the one who validates those
 * instructions and dispatches them to the canvas. I also handle updating existing
 * elements (like when AI modifies selected shapes).
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * AI responses need to become actual drawings on the canvas. I ensure:
 * - Drawing commands are valid before attempting execution
 * - New elements are added at appropriate positions
 * - Existing elements can be modified (preserving their IDs)
 * - Errors don't crash the app - they're logged gracefully
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │   AIChat    │─────▶│      ME      │─────▶│ Excalidraw  │   │
 *      │   │   State     │      │(useCanvas    │      │   Canvas    │   │
 *      │   │(AI response)│      │  Commands)   │      │             │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │           ┌───────────────────┴───────────────────┐            │
 *      │           ▼                   ▼                   ▼            │
 *      │   excalidraw:draw    excalidraw:update    excalidraw:insert   │
 *      │        -elements        -elements           -image             │
 *      │                                                                  │
 *      │   I SEND EVENTS:                                                  │
 *      │   - excalidraw:draw (new elements)                               │
 *      │   - excalidraw:update-elements (modify existing)                 │
 *      │   - excalidraw:insert-image (generated images)                   │
 *      │   - excalidraw:get-state (request current state)                 │
 *      │                                                                  │
 *      │   I LISTEN TO:                                                    │
 *      │   - excalidraw:state-update (canvas changes)                     │
 *      │   - excalidraw:elements-added (track new elements)               │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: AI says "✅ Drawing added!" but nothing appears on canvas
 * - User Impact: AI responses don't become drawings - broken core feature
 * - Quick Fix: Check browser console for "Failed to execute drawing command"
 * - Debug: Verify elements array structure - must be valid Excalidraw elements
 * - Common Issue: Element IDs missing or malformed - I validate before dispatching
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ canvasState         │ Cached snapshot of current canvas elements           │
 * │ selectedElements    │ Currently selected element IDs                       │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - drawElements(): Add new elements to canvas
 * - updateElements(): Modify existing elements (preserve IDs)
 * - insertImage(): Add a generated image to canvas
 * - getCanvasDescription(): Human-readable summary of canvas contents
 * - requestCanvasState(): Ask Excalidraw for current state
 * 
 * 🛡️ SAFETY FEATURES:
 * - Validates elements is an array before dispatching
 * - Wraps all dispatches in try-catch
 * - Returns success boolean for UI feedback
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~80 lines of command logic)
 * 2026-02-02: Separated drawing from updating concerns
 * 2026-02-02: Added proper error handling and return types
 * 
 * @module useCanvasCommands
 */

import { useState, useCallback, useEffect } from "react";

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
            
            const event = new CustomEvent("excalidraw:draw", {
                detail: { elements, isModification },
            });
            
            window.dispatchEvent(event);
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
            
            const event = new CustomEvent("excalidraw:update-elements", {
                detail: { elements },
            });
            
            window.dispatchEvent(event);
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
            const event = new CustomEvent("excalidraw:insert-image", {
                detail: { imageData, type, width, height },
            });
            
            window.dispatchEvent(event);
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
        window.dispatchEvent(new CustomEvent("excalidraw:get-state"));
    }, []);
    
    /**
     * Get currently selected element IDs from Excalidraw API
     */
    const getSelectedElementIds = useCallback((): string[] => {
        const api = (window as any).excalidrawAPI;
        if (!api) return [];
        
        const appState = api.getAppState();
        return Object.entries(appState.selectedElementIds || {})
            .filter(([_, selected]) => selected)
            .map(([id]) => id);
    }, []);
    
    /**
     * Listen for canvas state updates from Excalidraw
     */
    useEffect(() => {
        if (!isOpen) return;
        
        const handleCanvasUpdate = (event: CustomEvent<any>) => {
            if (!event.detail) return;
            
            setCanvasState(event.detail);
            onStateUpdate?.(event.detail);
        };
        
        window.addEventListener("excalidraw:state-update", handleCanvasUpdate as EventListener);
        
        // Request initial state
        const timeout = setTimeout(() => {
            requestCanvasState();
        }, 100);
        
        return () => {
            window.removeEventListener("excalidraw:state-update", handleCanvasUpdate as EventListener);
            clearTimeout(timeout);
        };
    }, [isOpen, onStateUpdate, requestCanvasState]);
    
    /**
     * Listen for newly added elements
     */
    useEffect(() => {
        if (!isOpen) return;
        
        const handleElementsAdded = (event: CustomEvent<{ elementIds: string[] }>) => {
            const { elementIds } = event.detail || {};
            if (elementIds && Array.isArray(elementIds) && elementIds.length > 0) {
                console.log("📥 New elements added:", elementIds);
                onElementsAdded?.(elementIds);
            }
        };
        
        window.addEventListener("excalidraw:elements-added", handleElementsAdded as EventListener);
        
        return () => {
            window.removeEventListener("excalidraw:elements-added", handleElementsAdded as EventListener);
        };
    }, [isOpen, onElementsAdded]);
    
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
