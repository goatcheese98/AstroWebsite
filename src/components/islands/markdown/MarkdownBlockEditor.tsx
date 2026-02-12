import React, { useState, useRef, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { MarkdownBlock } from '../../../lib/markdown-block-parser';
import { VisualTableEditor } from './VisualTableEditor';

interface MarkdownBlockEditorProps {
    block: MarkdownBlock;
    isEditing: boolean;
    isDark: boolean;
    onEdit: (blockId: string) => void;
    onChange: (blockId: string, newContent: string) => void;
    onBlur: () => void;
    onAddBlock: (afterBlockId: string) => void; // New: Add block after this one
}

/**
 * Individual block editor component
 * Renders either as editable textarea or rendered markdown based on isEditing state
 */
export const MarkdownBlockEditor = memo(({
    block,
    isEditing,
    isDark,
    onEdit,
    onChange,
    onBlur,
    onAddBlock
}: MarkdownBlockEditorProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localContent, setLocalContent] = useState(block.rawContent);
    const [isHovered, setIsHovered] = useState(false);
    const [isShiftSelected, setIsShiftSelected] = useState(false);

    // Focus textarea when entering edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // Place cursor at end
            textareaRef.current.selectionStart = textareaRef.current.value.length;
            textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
    }, [isEditing]);

    // Sync local content with block when not editing
    useEffect(() => {
        if (!isEditing) {
            setLocalContent(block.rawContent);
        }
    }, [block.rawContent, isEditing]);

    const handleClick = (e: React.MouseEvent) => {
        if (!isEditing) {
            // Shift-click for multi-select
            if (e.shiftKey) {
                setIsShiftSelected(!isShiftSelected);
                e.stopPropagation();
            } else {
                onEdit(block.id);
            }
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(block.rawContent);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setLocalContent(newContent);
        onChange(block.id, newContent);
    };

    const handleBlur = () => {
        onBlur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Escape to exit edit mode
        if (e.key === 'Escape') {
            onBlur();
        }
        // Prevent propagation to avoid canvas shortcuts
        e.stopPropagation();
    };

    // Table manipulation helpers
    const addTableRow = () => {
        if (block.type !== 'table') return;
        const lines = localContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) return;

        // Find a data row (skip header at line 0 and separator at line 1)
        const dataRowIndex = lines.length > 2 ? 2 : 0;
        const templateRow = lines[dataRowIndex];

        // Count columns by counting pipe characters and subtracting 1
        const pipeCount = (templateRow.match(/\|/g) || []).length;
        const columnCount = Math.max(pipeCount - 1, 1);

        // Create new row with empty cells
        const cells = Array(columnCount).fill('   '); // 3 spaces for visibility
        const newRow = '| ' + cells.join(' | ') + ' |';

        const newContent = localContent.trim() + '\n' + newRow;
        setLocalContent(newContent);
        onChange(block.id, newContent);
    };

    const addTableColumn = () => {
        if (block.type !== 'table') return;
        const lines = localContent.split('\n');

        const newLines = lines.map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.includes('|')) return line;

            // Remove trailing whitespace and final pipe
            let workingLine = trimmed.slice(0, trimmed.lastIndexOf('|'));

            // Determine what to add based on row type
            if (index === 1 && trimmed.includes('---')) {
                // Separator row - add alignment dashes
                return workingLine + ' | --- |';
            } else {
                // Header or data row - add empty cell
                return workingLine + ' |   |';
            }
        });

        const newContent = newLines.join('\n');
        setLocalContent(newContent);
        onChange(block.id, newContent);
    };

    // Empty blocks render as a small space
    if (block.type === 'empty') {
        return (
            <div
                onClick={handleClick}
                style={{
                    height: '1em',
                    cursor: isEditing ? 'text' : 'pointer',
                    opacity: 0.3,
                }}
            >
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={localContent}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            height: '1.5em',
                            border: 'none',
                            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            color: isDark ? '#e5e5e5' : '#1a1a1a',
                            padding: '4px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            resize: 'none',
                            outline: 'none',
                            borderRadius: '4px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <br />
                )}
            </div>
        );
    }

    // Editing mode: Show different UI based on block type
    if (isEditing) {
        // TABLES: Use visual table editor
        if (block.type === 'table') {
            return (
                <div style={{ marginBottom: '0.5em' }}>
                    <VisualTableEditor
                        markdown={localContent}
                        onChange={(newContent) => {
                            setLocalContent(newContent);
                            onChange(block.id, newContent);
                        }}
                        isDark={isDark}
                    />
                </div>
            );
        }

        // OTHER BLOCKS: Use textarea with raw markdown
        const lineCount = localContent.split('\n').length;
        const minHeight = Math.max(lineCount * 1.5 + 1, 3); // minimum 3em

        return (
            <>
                <div
                    style={{
                        position: 'relative',
                        marginBottom: '0.5em',
                        borderRadius: '6px',
                        background: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.08)',
                        border: `2px solid ${isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`,
                        overflow: 'visible',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <textarea
                        ref={textareaRef}
                        value={localContent}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            minHeight: `${minHeight}em`,
                            border: 'none',
                            background: 'transparent',
                            color: isDark ? '#e5e5e5' : '#1a1a1a',
                            padding: '8px 12px',
                            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
                            fontSize: '0.85em', // Slightly smaller to prevent excessive zoom
                            lineHeight: '1.5',
                            resize: 'vertical',
                            outline: 'none',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </>
        );
    }

    // Preview mode: Render markdown with hover effect and copy button
    return (
        <div
            onClick={handleClick}
            style={{
                position: 'relative',
                cursor: 'pointer',
                borderRadius: '6px',
                padding: '4px 8px',
                margin: '0 -8px',
                marginBottom: block.type === 'heading' ? '0.5em' : '0',
                transition: 'background-color 0.15s ease',
                background: isShiftSelected
                    ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)')
                    : 'transparent',
                outline: isShiftSelected
                    ? `2px solid ${isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`
                    : 'none',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Copy button (appears on hover) */}
            {isHovered && !isEditing && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCopy();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        color: isDark ? '#e5e5e5' : '#1a1a1a',
                        fontSize: '11px',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                        zIndex: 10,
                        pointerEvents: 'auto',
                    }}
                    title="Copy as markdown"
                >
                    📋 Copy
                </button>
            )}

            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const isCodeBlock = className && language;

                        return isCodeBlock ? (
                            <SyntaxHighlighter
                                style={isDark ? (oneDark as any) : (oneLight as any)}
                                language={language}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code
                                className={className}
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontFamily: '"SF Mono", "Monaco", "Inconsolata", monospace',
                                    fontSize: '0.9em',
                                }}
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    table({ children, ...props }) {
                        return (
                            <div style={{ overflowX: 'auto', margin: '1em 0' }}>
                                <table
                                    style={{
                                        borderCollapse: 'collapse',
                                        width: '100%',
                                        border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                                    }}
                                    {...props}
                                >
                                    {children}
                                </table>
                            </div>
                        );
                    },
                    th({ children, ...props }) {
                        return (
                            <th
                                style={{
                                    border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                                    padding: '8px 12px',
                                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    fontWeight: 600,
                                    textAlign: 'left',
                                }}
                                {...props}
                            >
                                {children}
                            </th>
                        );
                    },
                    td({ children, ...props }) {
                        return (
                            <td
                                style={{
                                    border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                                    padding: '8px 12px',
                                }}
                                {...props}
                            >
                                {children}
                            </td>
                        );
                    },
                    blockquote({ children, ...props }) {
                        return (
                            <blockquote
                                style={{
                                    borderLeft: isDark ? '4px solid rgba(99, 102, 241, 0.5)' : '4px solid rgba(99, 102, 241, 0.4)',
                                    paddingLeft: '1em',
                                    marginLeft: 0,
                                    fontStyle: 'italic',
                                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                                }}
                                {...props}
                            >
                                {children}
                            </blockquote>
                        );
                    },
                    // Style other elements to match current aesthetic
                    h1: ({ children, ...props }) => <h1 style={{ marginTop: '0.5em', marginBottom: '0.5em', fontSize: '1.8em', fontWeight: 700 }} {...props}>{children}</h1>,
                    h2: ({ children, ...props }) => <h2 style={{ marginTop: '0.5em', marginBottom: '0.4em', fontSize: '1.5em', fontWeight: 600 }} {...props}>{children}</h2>,
                    h3: ({ children, ...props }) => <h3 style={{ marginTop: '0.4em', marginBottom: '0.3em', fontSize: '1.3em', fontWeight: 600 }} {...props}>{children}</h3>,
                    h4: ({ children, ...props }) => <h4 style={{ marginTop: '0.3em', marginBottom: '0.2em', fontSize: '1.1em', fontWeight: 600 }} {...props}>{children}</h4>,
                    p: ({ children, ...props }) => <p style={{ margin: '0.5em 0', lineHeight: '1.6' }} {...props}>{children}</p>,
                    ul: ({ children, ...props }) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props}>{children}</ul>,
                    ol: ({ children, ...props }) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props}>{children}</ol>,
                    li: ({ children, ...props }) => <li style={{ margin: '0.2em 0' }} {...props}>{children}</li>,
                    hr: ({ ...props }) => <hr style={{ border: 'none', borderTop: isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(0,0,0,0.1)', margin: '1.5em 0' }} {...props} />,
                }}
            >
                {block.rawContent}
            </ReactMarkdown>
        </div>
    );
});

MarkdownBlockEditor.displayName = 'MarkdownBlockEditor';
