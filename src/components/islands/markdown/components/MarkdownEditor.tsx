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
