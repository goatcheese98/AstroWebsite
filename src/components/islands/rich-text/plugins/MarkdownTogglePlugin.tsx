import React, { useCallback, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';

// ============================================================================
// Icon Components
// ============================================================================

const MarkdownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M4 15l2-2 2 2" />
        <path d="M20 15l-2-2-2 2" />
        <line x1="12" y1="13" x2="12" y2="21" />
    </svg>
);

const RichTextIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7V4h8v3M8 4v16M12 4v16" />
        <path d="M16 20h4M18 20V4l-4 8h6" />
    </svg>
);

// ============================================================================
// Types
// ============================================================================

interface MarkdownTogglePluginProps {
    isDark: boolean;
    isMarkdownMode: boolean;
    onToggleMode: (isMarkdown: boolean) => void;
    markdownContent: string;
    onMarkdownContentChange: (content: string) => void;
}

// ============================================================================
// Toolbar Button Component
// ============================================================================

interface ToolbarButtonProps {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title?: string;
    children: React.ReactNode;
    isDark: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
    onClick, 
    active, 
    disabled, 
    title, 
    children,
    isDark 
}) => {
    const style: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        border: 'none',
        borderRadius: '4px',
        background: active
            ? isDark ? '#333' : '#f0f0f0'
            : 'transparent',
        color: active
            ? '#6366f1'
            : isDark ? '#aaa' : '#555',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.1s ease',
        fontSize: '14px',
        margin: '0 1px',
    };

    return (
        <button
            onClick={onClick}
            onMouseDown={(e) => e.preventDefault()}
            style={style}
            disabled={disabled}
            title={title}
        >
            {children}
        </button>
    );
};

// ============================================================================
// Markdown View Component
// ============================================================================

interface MarkdownViewProps {
    content: string;
    onChange: (content: string) => void;
    isDark: boolean;
}

const MarkdownView: React.FC<MarkdownViewProps> = ({ content, onChange, isDark }) => {
    const style: React.CSSProperties = {
        width: '100%',
        height: '100%',
        padding: '12px 60px 40px 60px',
        border: 'none',
        outline: 'none',
        resize: 'none',
        fontFamily: 'SF Mono, Menlo, monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        background: isDark ? '#1a1a1a' : '#ffffff',
        color: isDark ? '#e5e5e5' : '#1a1a1a',
        boxSizing: 'border-box',
    };

    return (
        <textarea
            style={style}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your markdown here..."
            spellCheck={false}
        />
    );
};

// ============================================================================
// Main Plugin Component
// ============================================================================

/**
 * MarkdownTogglePlugin - Toggle between WYSIWYG and Markdown views
 * 
 * This plugin provides:
 * - A toggle button to switch between rich text and markdown modes
 * - Export to markdown using $convertToMarkdownString
 * - Import from markdown using $convertFromMarkdownString
 * - A textarea for editing raw markdown
 */
export const MarkdownTogglePlugin: React.FC<MarkdownTogglePluginProps> = ({
    isDark,
    isMarkdownMode,
    onToggleMode,
    markdownContent,
    onMarkdownContentChange,
}) => {
    const [editor] = useLexicalComposerContext();

    const handleToggle = useCallback(() => {
        if (isMarkdownMode) {
            // Switching from markdown to rich text - convert markdown to editor state
            editor.update(() => {
                $convertFromMarkdownString(markdownContent, TRANSFORMERS);
            });
            onToggleMode(false);
        } else {
            // Switching from rich text to markdown - convert editor state to markdown
            editor.getEditorState().read(() => {
                const markdown = $convertToMarkdownString(TRANSFORMERS);
                onMarkdownContentChange(markdown);
            });
            onToggleMode(true);
        }
    }, [editor, isMarkdownMode, markdownContent, onToggleMode, onMarkdownContentChange]);

    return (
        <ToolbarButton
            onClick={handleToggle}
            active={isMarkdownMode}
            title={isMarkdownMode ? 'Switch to Rich Text' : 'Switch to Markdown'}
            isDark={isDark}
        >
            {isMarkdownMode ? <RichTextIcon /> : <MarkdownIcon />}
        </ToolbarButton>
    );
};

// ============================================================================
// Hook for managing markdown mode state
// ============================================================================

export interface UseMarkdownToggleResult {
    isMarkdownMode: boolean;
    setIsMarkdownMode: (value: boolean) => void;
    markdownContent: string;
    setMarkdownContent: (content: string) => void;
    MarkdownViewComponent: React.FC<{ isDark: boolean }>;
}

/**
 * Hook to manage markdown toggle state and provide the markdown view component
 */
export function useMarkdownToggle(): UseMarkdownToggleResult {
    const [isMarkdownMode, setIsMarkdownMode] = useState(false);
    const [markdownContent, setMarkdownContent] = useState('');

    const MarkdownViewComponent = useCallback(({ isDark }: { isDark: boolean }) => {
        return (
            <MarkdownView
                content={markdownContent}
                onChange={setMarkdownContent}
                isDark={isDark}
            />
        );
    }, [markdownContent]);

    return {
        isMarkdownMode,
        setIsMarkdownMode,
        markdownContent,
        setMarkdownContent,
        MarkdownViewComponent,
    };
}

// ============================================================================
// Standalone Markdown Toggle Button (for use in ToolbarPlugin)
// ============================================================================

interface MarkdownToggleButtonProps {
    isDark: boolean;
}

/**
 * Standalone markdown toggle button that manages its own state
 * This can be used directly in the ToolbarPlugin
 */
export const MarkdownToggleButton: React.FC<MarkdownToggleButtonProps> = ({ isDark }) => {
    const [editor] = useLexicalComposerContext();
    const [isMarkdownMode, setIsMarkdownMode] = useState(false);
    const [markdownContent, setMarkdownContent] = useState('');

    const handleToggle = useCallback(() => {
        if (isMarkdownMode) {
            // Switching from markdown to rich text
            editor.update(() => {
                $convertFromMarkdownString(markdownContent, TRANSFORMERS);
            });
            setIsMarkdownMode(false);
        } else {
            // Switching from rich text to markdown
            editor.getEditorState().read(() => {
                const markdown = $convertToMarkdownString(TRANSFORMERS);
                setMarkdownContent(markdown);
            });
            setIsMarkdownMode(true);
        }
    }, [editor, isMarkdownMode, markdownContent]);

    return (
        <ToolbarButton
            onClick={handleToggle}
            active={isMarkdownMode}
            title={isMarkdownMode ? 'Switch to Rich Text' : 'Switch to Markdown'}
            isDark={isDark}
        >
            {isMarkdownMode ? <RichTextIcon /> : <MarkdownIcon />}
        </ToolbarButton>
    );
};

export default MarkdownTogglePlugin;
