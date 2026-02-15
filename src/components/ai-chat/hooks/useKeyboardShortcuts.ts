import { useCallback } from "react";

export interface UseKeyboardShortcutsOptions {
    /** Callback when user presses Enter to send */
    onSend: () => void;
    /** Callback when user presses Escape to close */
    onClose: () => void;
    /** Callback when user presses Escape in selection mode */
    onExitSelection?: () => void;
    /** Whether selection mode is active (affects Escape behavior) */
    isSelectionMode?: boolean;
    /** Whether there's text in the input (affects Enter behavior) */
    hasInput?: boolean;
    /** Whether a message is currently being sent */
    isLoading?: boolean;
}

export interface UseKeyboardShortcutsReturn {
    /** Attach this to textarea onKeyDown */
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): UseKeyboardShortcutsReturn {
    const {
        onSend,
        onClose,
        onExitSelection,
        isSelectionMode = false,
        hasInput = false,
        isLoading = false,
    } = options;
    
    /**
     * Handle keyboard events in the chat input
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter to send (but not if Shift is held - that's for newlines)
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            
            if (hasInput && !isLoading) {
                onSend();
            }
            return;
        }
        
        // Escape handling - contextual
        if (e.key === "Escape") {
            if (isSelectionMode && onExitSelection) {
                // Exit selection mode first if active
                e.preventDefault();
                onExitSelection();
            } else {
                // Otherwise close the panel
                e.preventDefault();
                onClose();
            }
            return;
        }
    }, [onSend, onClose, onExitSelection, isSelectionMode, hasInput, isLoading]);
    
    return {
        handleKeyDown,
    };
}

export default useKeyboardShortcuts;
