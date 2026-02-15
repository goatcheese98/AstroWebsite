import { useState, useCallback, useEffect, useRef } from 'react';

interface UseSelectionOptions {
    /** Element ID for identifying this note */
    elementId: string;
    /** Whether editing mode is active (blocks delete) */
    isEditing: boolean;
    /** Callback to delete element from Excalidraw */
    deleteElement: () => void;
}

interface UseSelectionReturn {
    /** Whether this note is currently selected */
    isSelected: boolean;
    /** Select this note */
    select: () => void;
    /** Deselect this note */
    deselect: () => void;
}

/**
 * Hook for managing selection state and keyboard shortcuts
 */
export function useSelection({
    elementId,
    isEditing,
    deleteElement,
}: UseSelectionOptions): UseSelectionReturn {
    const [isSelected, setIsSelected] = useState(false);
    const isEditingRef = useRef(isEditing);

    // Keep ref in sync for event handlers
    useEffect(() => {
        isEditingRef.current = isEditing;
    }, [isEditing]);

    /**
     * Select this note
     */
    const select = useCallback(() => {
        setIsSelected(true);
    }, []);

    /**
     * Deselect this note
     */
    const deselect = useCallback(() => {
        setIsSelected(false);
    }, []);

    /**
     * Handle keyboard shortcuts
     */
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // ESC deselects
        if (e.key === 'Escape' && isSelected) {
            e.preventDefault();
            setIsSelected(false);
            return;
        }

        // Delete removes note (only when not editing)
        if ((e.key === 'Delete' || e.key === 'Backspace') && isSelected && !isEditingRef.current) {
            e.preventDefault();
            deleteElement();
        }
    }, [isSelected, deleteElement]);

    /**
     * Handle click outside to deselect
     */
    const handleClickOutside = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Check if click is outside this note
        if (!target.closest(`[data-note-id="${elementId}"]`)) {
            setIsSelected(false);
        }
    }, [elementId]);

    // Set up event listeners when selected
    useEffect(() => {
        if (isSelected) {
            document.addEventListener('keydown', handleKeyDown);
            // Use capture phase to ensure we catch clicks before other handlers
            document.addEventListener('mousedown', handleClickOutside, true);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [isSelected, handleKeyDown, handleClickOutside]);

    return {
        isSelected,
        select,
        deselect,
    };
}
