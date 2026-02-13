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

import React, { useCallback, useEffect, useState } from 'react';
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

import { getLexicalTheme, getLexicalEditorStyles } from './themes/lexicalTheme';
import { EDITOR_NAMESPACE } from './types';

// Toolbar
import { Toolbar } from './components/Toolbar';

interface RichTextEditorProps {
    /** Initial editor state as JSON string */
    initialState?: string;
    /** Callback when editor state changes */
    onChange: (state: string) => void;
    /** Whether dark mode is active */
    isDark: boolean;
    /** Whether the editor is in scroll mode */
    isScrollMode: boolean;
}

/**
 * Editor initial state plugin - loads content after editor is ready
 */
function InitialStatePlugin({ initialState }: { initialState?: string }): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!initialState) return;

        // Wait for editor to be ready
        const unregister = editor.registerUpdateListener(() => {
            // Only run once on initial mount
            unregister();
        });

        // Set initial state
        try {
            const parsed = JSON.parse(initialState);
            const editorState = editor.parseEditorState(parsed);
            editor.setEditorState(editorState);
        } catch (err) {
            console.error('Failed to parse initial state:', err);
        }

        return () => unregister();
    }, [editor, initialState]);

    return null;
}

/**
 * Focus plugin - auto-focus when editor mounts
 */
function FocusPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
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
    onChange: (state: string) => void;
    delay?: number;
}): null {
    const [editor] = useLexicalComposerContext();
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const onChangeHandler = useCallback(
        (editorState: EditorState) => {
            // Clear existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Set new timeout
            const newTimeoutId = setTimeout(() => {
                editorState.read(() => {
                    const json = JSON.stringify(editorState.toJSON());
                    onChange(json);
                });
            }, delay);

            setTimeoutId(newTimeoutId);
        },
        [onChange, delay, timeoutId]
    );

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            onChangeHandler(editorState);
        });
    }, [editor, onChangeHandler]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

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
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    initialState,
    onChange,
    isDark,
    isScrollMode,
}) => {
    const theme = getLexicalTheme(isDark);

    const initialConfig = {
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
        ],
        // Start with empty editor, load state via plugin
        editorState: null,
    };

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: isDark ? 'rgba(23, 23, 23, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                borderRadius: '0',
                overflow: 'hidden',
            }}
        >
            <LexicalComposer initialConfig={initialConfig}>
                <Toolbar isDark={isDark} />
                <div
                    style={{
                        flex: 1,
                        overflow: isScrollMode ? 'auto' : 'hidden',
                        position: 'relative',
                    }}
                >
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className="lexical-editor-input"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    padding: '16px 20px',
                                    outline: 'none',
                                    minHeight: '200px',
                                }}
                            />
                        }
                        placeholder={
                            <div className="lexical-placeholder">
                                Start typing...
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
                <InitialStatePlugin initialState={initialState} />
                <FocusPlugin />
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
