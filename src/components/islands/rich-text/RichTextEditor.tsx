/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    📝 RichTextEditor.tsx                                     ║
 * ║                    "The Full-Featured Lexical Editor"                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I am a complete rich text editor powered by Meta's Lexical framework.   ║
 * ║     I provide the full editing experience with formatting toolbar.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * @module rich-text/RichTextEditor
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $insertNodes, type EditorState } from 'lexical';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { registerCodeHighlighting } from '@lexical/code';

// Nodes
import {
    HeadingNode,
    QuoteNode,
} from '@lexical/rich-text';
import {
    ListNode,
    ListItemNode,
} from '@lexical/list';
import {
    LinkNode,
    AutoLinkNode,
} from '@lexical/link';
import {
    CodeNode,
    CodeHighlightNode,
} from '@lexical/code';
import {
    TableNode,
    TableCellNode,
    TableRowNode,
} from '@lexical/table';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { EquationNode } from './nodes/EquationNode';
import {
    CollapsibleContainerNode,
    CollapsibleContentNode,
    CollapsibleTitleNode,
} from './nodes/CollapsibleNodes';

import { getLexicalTheme, getLexicalEditorStyles } from './themes/lexicalTheme';
import { EDITOR_NAMESPACE } from './types';

// Toolbar
import { Toolbar } from './components/Toolbar';

// Plugins
import EquationPlugin from './plugins/EquationPlugin';
import CollapsiblePlugin from './plugins/CollapsiblePlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';

interface RichTextEditorProps {
    /** Initial editor state as JSON string */
    initialState?: string;
    /** Callback when editor state changes */
    onChange: (updates: { lexicalState?: string; backgroundOpacity?: number; blurAmount?: number }) => void;
    /** Whether dark mode is active */
    isDark: boolean;
    /** Whether the editor is in scroll mode */
    isScrollMode: boolean;
    /** Whether to show the formatting toolbar */
    showToolbar?: boolean;
    /** Whether to focus automatically on mount */
    autoFocus?: boolean;
    /** Whether to hide container styling (border, background, shadow) */
    transparent?: boolean;
    /** Callback when escape is pressed */
    onEscape?: () => void;
    /** Current background opacity */
    backgroundOpacity?: number;
    /** Callback when background opacity changes */
    onBackgroundOpacityChange?: (opacity: number) => void;
    /** Current blur amount in pixels */
    blurAmount?: number;
    /** Callback when blur amount changes */
    onBlurAmountChange?: (blur: number) => void;
    /** The background color of the Excalidraw element */
    backgroundColor?: string;
    /** The fill style of the Excalidraw element */
    fillStyle?: 'hachure' | 'cross-hatch' | 'solid';
    /** Global opacity of the Excalidraw element (0-100) */
    elementOpacity?: number;
    /** The stroke color of the Excalidraw element */
    strokeColor?: string;
    /** The stroke width of the Excalidraw element */
    strokeWidth?: number;
    /** The stroke style of the Excalidraw element */
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Editor initial state plugin - loads content after editor is ready
 */
function InitialStatePlugin({ initialState }: { initialState?: string }): null {
    const [editor] = useLexicalComposerContext();
    const isInitializedRef = useRef(false);

    useEffect(() => {
        if (!initialState || isInitializedRef.current) return;
        isInitializedRef.current = true;

        try {
            const parsed = JSON.parse(initialState);
            const editorState = editor.parseEditorState(parsed);
            // Use microtask to avoid flushSync warning during lifecycle
            Promise.resolve().then(() => {
                editor.setEditorState(editorState);
            });
        } catch (err) {
            console.error('Failed to parse initial state:', err);
        }
    }, [editor, initialState]);

    return null;
}

/**
 * Focus plugin - auto-focus when editor mounts
 */
function FocusPlugin({ disabled }: { disabled?: boolean }): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (disabled) return;
        // Small delay to ensure editor is mounted
        const timer = setTimeout(() => {
            editor.focus();
        }, 50);

        return () => clearTimeout(timer);
    }, [editor]);

    return null;
}

/**
 * Debounced change plugin - prevents excessive updates
 */
function DebouncedOnChangePlugin({
    onChange,
    delay = 500,
}: {
    onChange: (updates: { lexicalState?: string; backgroundOpacity?: number; blurAmount?: number }) => void;
    delay?: number;
}): null {
    const [editor] = useLexicalComposerContext();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                editorState.read(() => {
                    const json = JSON.stringify(editorState.toJSON());
                    onChange({ lexicalState: json });
                });
            }, delay);
        });
    }, [editor, onChange, delay]);

    return null;
}

/**
 * Escape key handler plugin
 */
function EscapeHandlerPlugin({ onEscape }: { onEscape?: () => void }): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!onEscape) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onEscape();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onEscape]);

    return null;
}

/**
 * Code highlighting plugin
 */
function CodeHighlightPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return registerCodeHighlighting(editor);
    }, [editor]);

    return null;
}

/**
 * Focus the editor when the container is clicked
 */
function ClickToFocusPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const rootElement = editor.getRootElement();
        if (!rootElement) return;

        const container = rootElement.closest('.editor-content-wrapper');
        if (!container) return;

        const handleContainerClick = (e: MouseEvent) => {
            if (e.target === container) {
                editor.focus();
            }
        };

        (container as HTMLElement).addEventListener('click', handleContainerClick);
        return () => (container as HTMLElement).removeEventListener('click', handleContainerClick);
    }, [editor]);

    return null;
}

/**
 * Rich Text Editor Component
 * 
 * Full-featured editor with:
 * - Formatting toolbar
 * - Rich text support (headings, lists, links, etc.)
 * - Markdown shortcuts
 * - Tables
 * - Code blocks
 * - Checklists
 * - Equations (KaTeX)
 * - Collapsible sections
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    initialState,
    onChange,
    isDark,
    isScrollMode,
    showToolbar = true,
    autoFocus = false,
    transparent = false,
    onEscape,
    onBackgroundOpacityChange,
    backgroundOpacity = 1,
    blurAmount = 5,
    onBlurAmountChange,
    backgroundColor,
    fillStyle = 'solid',
    elementOpacity = 100,
    strokeColor,
    strokeWidth = 1,
    strokeStyle = 'solid',
}) => {
    // Helper to convert hex to rgba
    const getRGBA = (hex: string, alpha: number) => {
        if (!hex || hex === 'transparent') return 'transparent';
        if (hex.startsWith('rgba')) return hex;

        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Helper to determine the composite background style
    const backgroundStyle = useMemo(() => {
        if (transparent) return { background: 'transparent' };

        const baseColor = backgroundColor || (isDark ? '#1a1a1a' : '#ffffff');
        // Combine our custom backgroundOpacity (0-1) with Excalidraw's elementOpacity (0-100)
        const alpha = backgroundOpacity * (elementOpacity / 100);
        const rgba = getRGBA(baseColor, alpha);

        if (rgba === 'transparent') return { background: 'transparent' };

        // Handle Excalidraw fill styles
        if (fillStyle === 'hachure') {
            return {
                backgroundImage: `repeating-linear-gradient(45deg, 
                    ${rgba}, 
                    ${rgba} 8px, 
                    ${getRGBA(baseColor, alpha * 0.5)} 8px, 
                    ${getRGBA(baseColor, alpha * 0.5)} 16px)`,
                backgroundColor: 'transparent'
            };
        } else if (fillStyle === 'cross-hatch') {
            return {
                backgroundImage: `repeating-linear-gradient(45deg, ${rgba}, ${rgba} 2px, transparent 2px, transparent 12px),
                                 repeating-linear-gradient(-45deg, ${rgba}, ${rgba} 2px, transparent 2px, transparent 12px)`,
                backgroundColor: getRGBA(baseColor, alpha * 0.2)
            };
        }

        return { background: rgba };
    }, [backgroundColor, backgroundOpacity, elementOpacity, fillStyle, isDark, transparent]);

    const theme = useMemo(() => getLexicalTheme(isDark), [isDark]);

    const initialConfig = useMemo(() => ({
        namespace: EDITOR_NAMESPACE,
        theme,
        onError: (error: Error) => {
            console.error('Lexical error:', error);
        },
        nodes: [
            HeadingNode,
            ListNode,
            ListItemNode,
            QuoteNode,
            CodeNode,
            CodeHighlightNode,
            TableNode,
            TableCellNode,
            TableRowNode,
            AutoLinkNode,
            LinkNode,
            HorizontalRuleNode,
            EquationNode,
            CollapsibleContainerNode,
            CollapsibleContentNode,
            CollapsibleTitleNode,
        ],
        // Start with empty editor, load state via plugin
        editorState: null,
    }), [theme]);

    return (
        <div
            className="rich-text-editor-workspace"
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                ...backgroundStyle,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: transparent ? 'none' : (isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.1)'),
                border: transparent ? 'none' : (strokeColor
                    ? `${strokeWidth}px ${strokeStyle} ${strokeColor}`
                    : `1px solid ${isDark ? '#333' : '#eee'}`),
            }}
        >
            <LexicalComposer initialConfig={initialConfig}>
                {showToolbar && (
                    <Toolbar
                        isDark={isDark}
                        backgroundOpacity={backgroundOpacity}
                        onBackgroundOpacityChange={onBackgroundOpacityChange}
                        blurAmount={blurAmount}
                        onBlurAmountChange={onBlurAmountChange}
                    />
                )}
                <div
                    className="editor-content-wrapper"
                    style={{
                        flex: 1,
                        overflow: isScrollMode ? 'auto' : 'hidden',
                        position: 'relative',
                        background: 'transparent',
                        cursor: 'text',
                        minHeight: '200px',
                    }}
                >
                    <RichTextPlugin
                        contentEditable={
                            <div className="lexical-scroll-container">
                                <ContentEditable
                                    className="lexical-editor-input"
                                    style={{
                                        width: '100%',
                                        minHeight: '100%',
                                        padding: '40px 60px', // More "workspace" feel
                                        outline: 'none',
                                        color: isDark ? '#e5e5e5' : '#1a1a1a',
                                        display: 'block'
                                    }}
                                />
                            </div>
                        }
                        placeholder={
                            <div className="lexical-placeholder" style={{ left: '60px', top: '40px' }}>
                                Start typing your workspace note...
                            </div>
                        }
                        ErrorBoundary={LexicalErrorBoundary as any}
                    />
                </div>
                <HistoryPlugin />
                <ListPlugin />
                <CheckListPlugin />
                <LinkPlugin />
                <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                <TabIndentationPlugin />
                <TablePlugin />
                <HorizontalRulePlugin />
                <EquationPlugin />
                <CollapsiblePlugin />
                <ClickToFocusPlugin />
                <CodeHighlightPlugin />
                <EscapeHandlerPlugin onEscape={onEscape} />
                <InitialStatePlugin initialState={initialState} />
                <FocusPlugin disabled={!autoFocus} />
                <DebouncedOnChangePlugin onChange={onChange} delay={500} />
            </LexicalComposer>
            <style>{getLexicalEditorStyles()}</style>
        </div>
    );
};


/**
 * Simple error boundary for Lexical
 */
class LexicalErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('Lexical Editor Error:', error, errorInfo);
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        padding: '20px',
                        color: '#ef4444',
                        textAlign: 'center',
                    }}
                >
                    <p>Something went wrong with the editor.</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default RichTextEditor;
