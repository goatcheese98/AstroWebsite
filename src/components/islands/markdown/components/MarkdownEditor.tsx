/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🟣 MarkdownEditor.tsx          "The Text Editor"                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I am the editing interface. When users double-click a note, I appear    ║
 * ║     as a textarea for raw markdown editing. I'm simple, fast, and           ║
 * ║     let users write without distraction.                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  useMarkdown│─────▶│      ME      │─────▶│  onChange   │   │
 *      │   │    Note     │      │   Editor     │      │  Callback   │   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                         onBlur (save)                          │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Can't type, textarea doesn't appear, content not saved
 * - **User Impact:** Users can't edit notes
 * - **Quick Fix:** Check autoFocus prop and onBlur handler
 * - **Debug:** Log value state and onChange events
 * - **Common Issue:** pointer-events blocking input
 * 
 * 📦 PROPS I RECEIVE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ value               │ Current markdown content                             │
 * │ onChange            │ Callback when content changes                        │
 * │ onBlur              │ Callback when editor loses focus (save)              │
 * │ onKeyDown           │ Handler for keyboard shortcuts (ESC to exit)         │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - Auto-focus on mount for immediate typing
 * - ESC key to exit editing mode
 * - Transparent background (inherits from parent)
 * 
 * 🔑 KEY CONCEPTS:
 * - Uses monospace font for code-like editing
 * - No border/outline for clean look
 * - pointer-events: auto to receive input during canvas interactions
 * 
 * @module markdown/components/MarkdownEditor
 */

import React from 'react';

interface MarkdownEditorProps {
    /** Current content value */
    value: string;
    /** Called when content changes */
    onChange: (value: string) => void;
    /** Called when editor loses focus */
    onBlur: () => void;
    /** Called on keydown (for ESC handling) */
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * Textarea editor for markdown content
 */
export const MarkdownEditor = React.memo(function MarkdownEditor({
    value,
    onChange,
    onBlur,
    onKeyDown,
}: MarkdownEditorProps) {
    return (
        <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'monospace',
                fontSize: '14px',
                backgroundColor: 'transparent',
                color: 'inherit',
                padding: 0,
                cursor: 'text',
            }}
            onPointerDown={(e) => e.stopPropagation()}
        />
    );
});
