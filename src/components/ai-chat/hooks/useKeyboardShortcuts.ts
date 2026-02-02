/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    ⌨️ useKeyboardShortcuts.ts                                ║
 * ║                    "The Keyboard Maestro"                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔵 Custom Hook | ⌨️ Input Handler | ⚡ Event Coordinator         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the keyboard shortcut interpreter for the AI chat. I watch every keypress
 * and know when to send messages (Enter), add newlines (Shift+Enter), or close
 * the panel (Escape). I make the chat feel responsive and natural to power users.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users want to type quickly without reaching for the mouse. I provide:
 * - Enter to send (fast message submission)
 * - Shift+Enter for newlines (when they want multi-line messages)
 * - Escape to close (quick dismissal without clicking X)
 * - Escape to exit selection mode (contextual behavior)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  Keyboard   │─────▶│      ME      │─────▶│   Actions   │   │
 *      │   │  (user      │      │(useKeyboard  │      │             │   │
 *      │   │   types)    │      │  Shortcuts)  │      │             │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │           ┌───────────────────┼───────────────────┐            │
      │           ▼                   ▼                   ▼            │
      │   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
      │   │  handleSend │    │   onClose    │    │  setSelection│       │
      │   │   (Enter)   │    │   (Escape)   │    │  Mode(false) │       │
      │   └─────────────┘    └──────────────┘    └─────────────┘       │
      │                                                                  │
      │   I HANDLE KEY COMBOS:                                           │
      │   - Enter (without Shift) → Send message                         │
      │   - Shift+Enter → Newline in textarea                            │
      │   - Escape → Close panel OR exit selection mode                  │
      │                                                                  │
      │   I PREVENT:                                                     │
      │   - Default Enter behavior (form submission) when sending        │
      │                                                                  │
      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Enter doesn't send, Shift+Enter sends instead of newline, Escape does nothing
 * - User Impact: Keyboard users frustrated, workflow slowed
 * - Quick Fix: Check if event listeners are attached to textarea/document
 * - Debug: Add console.log in handleKeyDown to see key events firing
 * - Common Issue: Event defaultPrevented - check if parent stops propagation
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ (none)              │ I'm a pure event handler - no local state needed     │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - handleKeyDown(): Process keyboard events (attach to textarea onKeyDown)
 * 
 * 🔑 KEY MAPPINGS:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ Enter (no Shift)    │ Send message if input not empty                      │
 * │ Shift+Enter         │ Allow default (newline in textarea)                  │
 * │ Escape              │ Exit selection mode OR close panel                   │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~20 lines of key handling)
 * 2026-02-02: Centralized all keyboard shortcut logic
 * 2026-02-02: Added proper TypeScript types for keyboard events
 * 
 * @module useKeyboardShortcuts
 */

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
