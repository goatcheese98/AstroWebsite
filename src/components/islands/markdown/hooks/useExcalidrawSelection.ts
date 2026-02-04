/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔵 useExcalidrawSelection.ts   "The Bridge"                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I manage selection state for markdown notes WITHOUT using Excalidraw's  ║
 * ║     native selection (to avoid the boxy selection border). Instead, I use   ║
 * ║     a custom selection system that shows our beautiful rounded border.      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │   useDrag   │─────▶│      ME      │─────▶│  Custom     │   │
 *      │   │  onClick    │      │   (HOOK)     │      │  Selection  │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │              markdown-note:select custom event                 │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Notes don't show selection, or boxy border appears
 * - **User Impact:** Selection visual broken, or native border ruins the UI
 * - **Quick Fix:** Check that we're NOT setting selectedElementIds
 * - **Debug:** Log markdown-note:select events
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isSelected          │ Whether this note is selected (custom state)         │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - select(): Select this note (custom, no Excalidraw native selection)
 * - deselect(): Deselect this note
 * 
 * 🔑 KEY CONCEPT: We deliberately AVOID using Excalidraw's selectedElementIds
 *    because it shows a boxy border that conflicts with our custom rounded border.
 *    Instead, we use a custom event system (markdown-note:select).
 * 
 * @module markdown/hooks/useExcalidrawSelection
 */

import { useState, useCallback, useEffect } from 'react';

interface UseExcalidrawSelectionOptions {
    elementId: string;
}

interface UseExcalidrawSelectionReturn {
    isSelected: boolean;
    select: () => void;
    deselect: () => void;
}

// Global state to track which note is currently selected
// This ensures only one note can be selected at a time
let globalSelectedNoteId: string | null = null;
const listeners = new Set<(id: string | null) => void>();

function setGlobalSelectedNoteId(id: string | null) {
    globalSelectedNoteId = id;
    listeners.forEach(listener => listener(id));
}

export function useExcalidrawSelection({
    elementId,
}: UseExcalidrawSelectionOptions): UseExcalidrawSelectionReturn {
    const [isSelected, setIsSelected] = useState(globalSelectedNoteId === elementId);

    // Subscribe to global selection changes
    useEffect(() => {
        const listener = (selectedId: string | null) => {
            setIsSelected(selectedId === elementId);
        };
        listeners.add(listener);
        return () => listeners.delete(listener);
    }, [elementId]);

    /**
     * Select this note (custom selection, NOT Excalidraw native)
     * We deliberately avoid updating selectedElementIds to prevent
     * Excalidraw from showing its boxy selection border.
     */
    const select = useCallback(() => {
        // Clear any Excalidraw native selection first (to hide boxy borders on other elements)
        const api = (window as any).excalidrawAPI;
        if (api) {
            const appState = api.getAppState();
            // Only clear if there are actually selected elements
            if (Object.keys(appState.selectedElementIds || {}).length > 0) {
                api.updateScene({
                    appState: {
                        ...appState,
                        selectedElementIds: {},
                    },
                });
            }
        }

        // Set our custom selection state
        setGlobalSelectedNoteId(elementId);

        // Dispatch custom event for other components (AI chat, etc.)
        window.dispatchEvent(new CustomEvent('markdown-note:select', {
            detail: { elementId },
        }));
    }, [elementId]);

    /**
     * Deselect this note
     */
    const deselect = useCallback(() => {
        if (globalSelectedNoteId === elementId) {
            setGlobalSelectedNoteId(null);
            window.dispatchEvent(new CustomEvent('markdown-note:deselect', {
                detail: { elementId },
            }));
        }
    }, [elementId]);

    /**
     * Handle click outside to deselect
     */
    useEffect(() => {
        if (!isSelected) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if click is outside this note
            if (!target.closest(`[data-note-id="${elementId}"]`)) {
                deselect();
            }
        };

        // Use capture phase to ensure we catch clicks before other handlers
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isSelected, elementId, deselect]);

    return {
        isSelected,
        select,
        deselect,
    };
}
