/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔵 useExcalidrawSelection.ts   "The Bridge"                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I sync markdown note selection with Excalidraw's native selection.      ║
 * ║     When you click a note, I mark the Excalidraw element as selected.       ║
 * ║     When you click elsewhere, I clear the selection.                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │   useDrag   │─────▶│      ME      │─────▶│  Excalidraw │   │
 *      │   │  onClick    │      │   (HOOK)     │      │     API     │   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                  selectedElementIds in appState                │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Notes don't sync with Excalidraw selection
 * - **User Impact:** AI chat doesn't see selected notes, copy/paste doesn't work
 * - **Quick Fix:** Check Excalidraw API availability
 * - **Debug:** Log appState.selectedElementIds
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isSelected          │ Mirrors Excalidraw's native selection state          │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - select(): Select this element in Excalidraw
 * - deselect(): Deselect this element
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

export function useExcalidrawSelection({
    elementId,
}: UseExcalidrawSelectionOptions): UseExcalidrawSelectionReturn {
    const [isSelected, setIsSelected] = useState(false);

    /**
     * Select this element in Excalidraw
     */
    const select = useCallback(() => {
        const api = (window as any).excalidrawAPI;
        if (!api) return;

        const appState = api.getAppState();
        api.updateScene({
            appState: {
                ...appState,
                selectedElementIds: {
                    ...appState.selectedElementIds,
                    [elementId]: true,
                },
            },
        });
    }, [elementId]);

    /**
     * Deselect this element
     */
    const deselect = useCallback(() => {
        const api = (window as any).excalidrawAPI;
        if (!api) return;

        const appState = api.getAppState();
        const newSelectedIds = { ...appState.selectedElementIds };
        delete newSelectedIds[elementId];

        api.updateScene({
            appState: {
                ...appState,
                selectedElementIds: newSelectedIds,
            },
        });
    }, [elementId]);

    /**
     * Sync with Excalidraw's selection state
     */
    useEffect(() => {
        const handleStateUpdate = (event: any) => {
            const detail = event.detail;
            if (detail?.appState?.selectedElementIds) {
                const selected = detail.appState.selectedElementIds[elementId] || false;
                setIsSelected(selected);
            }
        };

        window.addEventListener('excalidraw:state-update', handleStateUpdate);
        return () => window.removeEventListener('excalidraw:state-update', handleStateUpdate);
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
