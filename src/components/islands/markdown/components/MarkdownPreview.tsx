import React, { useMemo, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import { markdownUrlTransform, resolveMarkdownImageSrc } from '../utils/markdownMedia';
import 'katex/dist/katex.min.css';

interface MarkdownPreviewProps {
    /** Markdown content to render */
    content: string;
    /** Called when a checkbox is toggled */
    onCheckboxToggle: (lineIndex: number) => void;
    /** Whether to render in dark mode */
    isDark?: boolean;
    /** Locally stored images keyed by md-img:// id */
    images?: Record<string, string>;
}


/** Renders a single image with loading skeleton and error fallback. */
const ImageRenderer = React.memo(function ImageRenderer({
    src, alt, isDark, style,
}: { src: string; alt: string; isDark: boolean; style: React.CSSProperties }) {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    // Reset when src changes (e.g. note refreshed from collab)
    useEffect(() => { setStatus('loading'); }, [src]);

    if (status === 'error') {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 10px', borderRadius: '6px',
                background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
                border: `1px solid ${isDark ? 'rgba(239,68,68,0.35)' : '#fca5a5'}`,
                color: isDark ? '#fca5a5' : '#dc2626',
                fontSize: '0.85em', fontFamily: 'sans-serif',
            }}>
                ⚠️ Failed to load image{alt && alt !== 'Embedded image' ? `: ${alt}` : ''}
            </span>
        );
    }

    return (
        <>
            {status === 'loading' && (
                <span style={{
                    display: 'block', width: '100%', height: '120px',
                    background: isDark
                        ? 'linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 75%)'
                        : 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'md-shimmer 1.4s infinite',
                    borderRadius: '8px', margin: '0.75em 0',
                }} />
            )}
            <img
                src={src}
                alt={alt}
                style={{ ...style, display: status === 'loaded' ? 'block' : 'none' }}
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
            />
        </>
    );
});
ImageRenderer.displayName = 'ImageRenderer';

/**
 * Markdown preview component with syntax highlighting
 */
export const MarkdownPreview = React.memo(function MarkdownPreview({
    content,
    onCheckboxToggle,
    isDark = false,
    images,
}: MarkdownPreviewProps) {

    // Custom renderers for markdown elements
    const components: Components = useMemo(() => ({
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const code = String(children).replace(/\n$/, '');

            return !inline && match ? (
                <SyntaxHighlighter
                    style={isDark ? oneDark : oneLight}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                        margin: '0 0 1em 0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            ) : (
                <code
                    style={{
                        background: isDark ? 'rgba(161, 161, 170, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                        color: isDark ? '#e4e4e7' : '#18181b',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.9em',
                        fontFamily: 'monospace',
                        border: isDark ? '1px solid rgba(161, 161, 170, 0.3)' : 'none',
                    }}
                    {...props}
                >
                    {children}
                </code>
            );
        },

        p({ children }) {
            return (
                <p style={{
                    marginBottom: '0.75em',
                    lineHeight: '1.6',
                    whiteSpace: 'break-spaces',
                    color: isDark ? '#d4d4d8' : '#3f3f46'
                }}>
                    {children}
                </p>
            );
        },

        h1({ children }) {
            return (
                <h1 style={{
                    fontSize: '1.75em',
                    fontWeight: 700,
                    marginBottom: '0.5em',
                    marginTop: '0.5em',
                    lineHeight: '1.2',
                    whiteSpace: 'break-spaces',
                    color: isDark ? '#f4f4f5' : '#18181b'
                }}>
                    {children}
                </h1>
            );
        },

        h2({ children }) {
            return (
                <h2 style={{
                    fontSize: '1.5em',
                    fontWeight: 600,
                    marginBottom: '0.5em',
                    marginTop: '0.75em',
                    lineHeight: '1.3',
                    whiteSpace: 'break-spaces',
                    color: isDark ? '#f4f4f5' : '#18181b'
                }}>
                    {children}
                </h2>
            );
        },

        h3({ children }) {
            return (
                <h3 style={{
                    fontSize: '1.25em',
                    fontWeight: 600,
                    marginBottom: '0.4em',
                    marginTop: '0.6em',
                    lineHeight: '1.4',
                    whiteSpace: 'break-spaces',
                    color: isDark ? '#e4e4e7' : '#27272a'
                }}>
                    {children}
                </h3>
            );
        },

        ul({ children }) {
            return (
                <ul style={{
                    marginBottom: '0.75em',
                    marginTop: '0.5em',
                    paddingLeft: '1.5em',
                    lineHeight: '1.6'
                }}>
                    {children}
                </ul>
            );
        },

        ol({ children }) {
            return (
                <ol style={{
                    marginBottom: '0.75em',
                    marginTop: '0.5em',
                    paddingLeft: '1.5em',
                    lineHeight: '1.6'
                }}>
                    {children}
                </ol>
            );
        },

        li({ children, className, node }: any) {
            const isTaskList = className === 'task-list-item';
            return (
                <li
                    style={{
                        marginBottom: '0.25em',
                        listStyleType: isTaskList ? 'none' : undefined,
                        whiteSpace: 'break-spaces',
                    }}
                >
                    {children}
                </li>
            );
        },

        input({ type, checked, node }: any) {
            if (type === 'checkbox') {
                // Extract line index from node position for toggle callback
                const lineIndex = node?.position?.start?.line;
                return (
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (lineIndex !== undefined) {
                                onCheckboxToggle(lineIndex - 1); // -1 for 0-indexed
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            marginRight: '0.5em',
                            cursor: 'pointer',
                            accentColor: '#6366f1',
                            width: '16px',
                            height: '16px',
                        }}
                    />
                );
            }
            return <input type={type} />;
        },

        blockquote({ children }) {
            return (
                <blockquote
                    style={{
                        borderLeft: `4px solid ${isDark ? '#818cf8' : '#6366f1'}`,
                        paddingLeft: '1em',
                        marginLeft: 0,
                        marginBottom: '0.75em',
                        fontStyle: 'italic',
                        color: isDark ? '#a1a1aa' : 'rgba(0, 0, 0, 0.7)',
                        background: isDark ? 'rgba(161, 161, 170, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                        padding: '0.5em 1em',
                        borderRadius: '4px',
                        whiteSpace: 'break-spaces',
                    }}
                >
                    {children}
                </blockquote>
            );
        },

        table({ children }) {
            return (
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginBottom: '1em',
                        border: `1px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.1)'}`,
                        borderRadius: '6px',
                        overflow: 'hidden',
                        display: 'block',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {children}
                </table>
            );
        },

        th({ children }) {
            return (
                <th
                    style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        borderBottom: `2px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.2)'}`,
                        background: isDark ? 'rgba(39, 39, 42, 0.5)' : 'rgba(0, 0, 0, 0.02)',
                        color: isDark ? '#e4e4e7' : '#18181b',
                        whiteSpace: 'break-spaces',
                    }}
                >
                    {children}
                </th>
            );
        },

        td({ children }) {
            return (
                <td
                    style={{
                        padding: '8px 12px',
                        borderBottom: `1px solid ${isDark ? 'rgba(82, 82, 91, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
                        color: isDark ? '#d4d4d8' : '#3f3f46',
                        whiteSpace: 'break-spaces',
                    }}
                >
                    {children}
                </td>
            );
        },

        hr() {
            return (
                <hr
                    style={{
                        border: 'none',
                        borderTop: `2px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.1)'}`,
                        margin: '1.5em 0',
                    }}
                />
            );
        },

        a({ children, href }) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        color: '#3b82f6',
                        textDecoration: 'none',
                        borderBottom: '1px solid #3b82f6',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {children}
                </a>
            );
        },

        img({ src, alt }) {
            const resolvedSrc = resolveMarkdownImageSrc(src, images);
            if (!resolvedSrc) {
                // Reference exists but image data is missing (e.g. stripped customData)
                if (src?.startsWith('md-img://')) {
                    return (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 10px', borderRadius: '6px',
                            background: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb',
                            border: `1px solid ${isDark ? 'rgba(245,158,11,0.35)' : '#fcd34d'}`,
                            color: isDark ? '#fcd34d' : '#92400e',
                            fontSize: '0.85em', fontFamily: 'sans-serif',
                        }}>
                            🖼 Image not found{alt && alt !== 'Embedded image' ? `: ${alt}` : ''}
                        </span>
                    );
                }
                return null;
            }
            return (
                <ImageRenderer
                    src={resolvedSrc}
                    alt={alt || 'Embedded image'}
                    isDark={isDark}
                    style={{
                        maxWidth: '100%',
                        height: 'auto',
                        margin: '0.75em 0',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.08)'}`,
                    }}
                />
            );
        },
    }), [isDark, onCheckboxToggle, images]);

    return (
        <div className="markdown-preview">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={components}
                urlTransform={markdownUrlTransform}
            >
                {content || '# Empty Note\n\nDouble-click to edit and add your content.'}
            </ReactMarkdown>
        </div>
    );
});
