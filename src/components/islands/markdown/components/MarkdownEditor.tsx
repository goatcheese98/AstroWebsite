import React from 'react';
import { handleImagePasteAsMarkdown } from '../utils/markdownMedia';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onImageAdd: (id: string, dataUrl: string) => void;
}

export const MarkdownEditor = React.memo(function MarkdownEditor({
    value,
    onChange,
    onBlur,
    onKeyDown,
    onImageAdd,
}: MarkdownEditorProps) {
    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        void handleImagePasteAsMarkdown({ event, value, onChange, onImageAdd });
    };

    return (
        <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
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
