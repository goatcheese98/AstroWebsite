import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { MarkdownBlock } from '../../../lib/markdown-block-parser';
import type { MarkdownNoteSettings } from './types';
import { VisualTableEditor } from './VisualTableEditor';
import { handleImagePasteAsMarkdown, markdownUrlTransform, resolveMarkdownImageSrc } from './utils/markdownMedia';

interface MarkdownBlockEditorProps {
    block: MarkdownBlock;
    isEditing: boolean;
    isSelectionActive: boolean;
    isDark: boolean;
    images?: Record<string, string>;
    settings?: MarkdownNoteSettings;
    onEdit: (blockId: string, isShift?: boolean) => void;
    onChange: (blockId: string, newContent: string) => void;
    onBlur: () => void;
    onAddBlock: (afterBlockId: string) => void;
}

/**
 * Individual block editor component
 * Renders either as editable textarea or rendered markdown based on isEditing state
 */
export const MarkdownBlockEditor = memo(({
    block,
    isEditing,
    isSelectionActive,
    isDark,
    images,
    settings,
    onEdit,
    onChange,
    onBlur,
    onAddBlock
}: MarkdownBlockEditorProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localContent, setLocalContent] = useState(block.rawContent);
    const [isHovered, setIsHovered] = useState(false);

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

    const syntaxTheme = useMemo(() => {
        const base = (isDark ? oneDark : oneLight) as Record<string, React.CSSProperties>;
        return {
            ...base,
            'pre[class*="language-"]': {
                ...(base['pre[class*="language-"]'] || {}),
                fontFamily: 'inherit',
                fontSize: '1em',
                lineHeight: 'inherit',
            },
            'code[class*="language-"]': {
                ...(base['code[class*="language-"]'] || {}),
                fontFamily: 'inherit',
                fontSize: '1em',
                lineHeight: 'inherit',
            },
        };
    }, [isDark]);

    const handleClick = (e: React.MouseEvent) => {
        if (!isEditing) {
            onEdit(block.id, e.shiftKey);
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

    const handleMarkdownPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        void handleImagePasteAsMarkdown({
            event,
            value: localContent,
            onChange: (nextValue) => {
                setLocalContent(nextValue);
                onChange(block.id, nextValue);
            },
            onImageAdd: () => {}, // HybridMarkdownEditor doesn't support image storage
        });
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
                        onPaste={handleMarkdownPaste}
                        style={{
                            width: '100%',
                            height: '1.5em',
                            border: 'none',
                            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            color: isDark ? '#e5e5e5' : '#1a1a1a',
                            padding: '4px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
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
                        onPaste={handleMarkdownPaste}
                        style={{
                            width: '100%',
                            minHeight: `${minHeight}em`,
                            border: 'none',
                            background: 'transparent',
                            color: isDark ? '#e5e5e5' : '#1a1a1a',
                            padding: '8px 12px',
                            fontFamily: settings?.font !== 'inherit' ? settings?.font : 'inherit',
                            fontSize: '0.95em',
                            lineHeight: settings?.lineHeight ?? 'inherit',
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
                marginLeft: '-8px',
                marginRight: '-8px',
                marginTop: '0px',
                marginBottom: block.type === 'heading' ? '0.5em' : '0',
                transition: 'background-color 0.15s ease',
                fontFamily: settings?.font !== 'inherit' ? settings?.font : undefined,
                fontSize: settings?.fontSize,
                lineHeight: settings?.lineHeight,
                background: isSelectionActive
                    ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)')
                    : 'transparent',
                outline: isSelectionActive
                    ? `2px solid ${isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`
                    : 'none',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Copy button (appears on hover) */}
            {isHovered && !isEditing && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Copy as markdown"
                    style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '26px',
                        height: '26px',
                        padding: 0,
                        borderRadius: '6px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
                        background: isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.96)',
                        color: isDark ? '#a1a1aa' : '#71717a',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                        zIndex: 10,
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#6366f1';
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = isDark ? '#a1a1aa' : '#71717a';
                        e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
                    }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
            )}

            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                urlTransform={markdownUrlTransform}
                components={{
                    code({ node, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const isCodeBlock = className && language;

                        return isCodeBlock ? (
                            <SyntaxHighlighter
                                style={syntaxTheme as any}
                                language={language}
                                PreTag="div"
                                customStyle={{
                                    margin: '0 0 1em 0',
                                    borderRadius: '6px',
                                    fontFamily: 'inherit',
                                    fontSize: '0.92em',
                                    lineHeight: 'inherit',
                                }}
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
                                    fontFamily: 'inherit',
                                    fontSize: '0.9em',
                                    lineHeight: 'inherit',
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
                                    lineHeight: 'inherit',
                                    whiteSpace: 'break-spaces',
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
                                    lineHeight: 'inherit',
                                    whiteSpace: 'break-spaces',
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
                                    lineHeight: 'inherit',
                                    whiteSpace: 'break-spaces',
                                }}
                                {...props}
                            >
                                {children}
                            </blockquote>
                        );
                    },
                    img({ src, alt, ...props }) {
                        const resolvedSrc = resolveMarkdownImageSrc(src, images);
                        if (!resolvedSrc) return null;
                        return (
                            <img
                                src={resolvedSrc}
                                alt={alt || 'Embedded image'}
                                loading="lazy"
                                style={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: '8px',
                                    margin: '0.75em 0',
                                    border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                                }}
                                {...props}
                            />
                        );
                    },
                    // Style other elements to match current aesthetic
                    h1: ({ children, ...props }) => <h1 style={{ marginTop: '0.5em', marginBottom: '0.5em', fontSize: '1.8em', fontWeight: 700, fontFamily: 'inherit', lineHeight: 'inherit', whiteSpace: 'break-spaces' }} {...props}>{children}</h1>,
                    h2: ({ children, ...props }) => <h2 style={{ marginTop: '0.5em', marginBottom: '0.4em', fontSize: '1.5em', fontWeight: 600, fontFamily: 'inherit', lineHeight: 'inherit', whiteSpace: 'break-spaces' }} {...props}>{children}</h2>,
                    h3: ({ children, ...props }) => <h3 style={{ marginTop: '0.4em', marginBottom: '0.3em', fontSize: '1.3em', fontWeight: 600, fontFamily: 'inherit', lineHeight: 'inherit', whiteSpace: 'break-spaces' }} {...props}>{children}</h3>,
                    h4: ({ children, ...props }) => <h4 style={{ marginTop: '0.3em', marginBottom: '0.2em', fontSize: '1.1em', fontWeight: 600, fontFamily: 'inherit', lineHeight: 'inherit', whiteSpace: 'break-spaces' }} {...props}>{children}</h4>,
                    p: ({ children, ...props }) => <p style={{ margin: '0.5em 0', lineHeight: 'inherit', whiteSpace: 'break-spaces' }} {...props}>{children}</p>,
                    ul: ({ children, ...props }) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em', lineHeight: 'inherit' }} {...props}>{children}</ul>,
                    ol: ({ children, ...props }) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em', lineHeight: 'inherit' }} {...props}>{children}</ol>,
                    li: ({ children, ...props }) => <li style={{ margin: '0.2em 0', lineHeight: 'inherit', whiteSpace: 'break-spaces' }} {...props}>{children}</li>,
                    hr: ({ ...props }) => <hr style={{ border: 'none', borderTop: isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(0,0,0,0.1)', margin: '1.5em 0' }} {...props} />,
                }}
            >
                {block.rawContent}
            </ReactMarkdown>
        </div>
    );
});

MarkdownBlockEditor.displayName = 'MarkdownBlockEditor';
