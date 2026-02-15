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

    /**
     * Watch for native Excalidraw selection and convert to custom selection
     * This handles cases where user clicks on the underlying element directly
     */
    useEffect(() => {
        const handleStateUpdate = (event: any) => {
            const detail = event.detail;
            if (detail?.appState?.selectedElementIds?.[elementId]) {
                // This note was selected natively - convert to custom selection
                // Clear native selection and use our custom system
                const api = (window as any).excalidrawAPI;
                if (api) {
                    const appState = api.getAppState();
                    api.updateScene({
                        appState: {
                            ...appState,
                            selectedElementIds: {},
                        },
                    });
                }
                // Activate custom selection
                setGlobalSelectedNoteId(elementId);
                window.dispatchEvent(new CustomEvent('markdown-note:select', {
                    detail: { elementId },
                }));
            }
        };

        window.addEventListener('excalidraw:state-update', handleStateUpdate);
        return () => window.removeEventListener('excalidraw:state-update', handleStateUpdate);
    }, [elementId]);

    return {
        isSelected,
        select,
        deselect,
    };
}
