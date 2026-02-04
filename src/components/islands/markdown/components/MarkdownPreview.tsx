/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🟣 MarkdownPreview.tsx         "The Renderer"                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I render markdown content beautifully. I use react-markdown with        ║
 * ║     syntax highlighting via Prism. I support GFM (tables, checkboxes,       ║
 * ║     strikethrough) and adapt to light/dark themes.                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ useMarkdown │─────▶│      ME      │─────▶│react-markdown│  │
 *      │   │    Note     │      │   Preview    │      │remark-gfm    │  │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │              SyntaxHighlighter (Prism themes)                   │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Markdown not rendering, syntax highlighting missing
 * - **User Impact:** Users see raw markdown instead of formatted content
 * - **Quick Fix:** Check remarkPlugins prop and component overrides
 * - **Debug:** Inspect rendered HTML structure
 * - **Common Issue:** react-markdown version mismatch
 * 
 * 📦 PROPS I RECEIVE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ content             │ Markdown string to render                            │
 * │ onCheckboxToggle    │ Callback when checkbox is clicked                    │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - Parse and render markdown with GFM support
 * - Syntax-highlight code blocks
 * - Render interactive checkboxes for task lists
 * - Adapt styling to current theme (light/dark)
 * 
 * 🔑 KEY CONCEPTS:
 * - Uses react-markdown with remark-gfm plugin
 * - Custom components for each markdown element type
 * - Prism for syntax highlighting (oneDark/oneLight themes)
 * - Checkboxes are functional (toggle updates content)
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-03: Extracted from monolithic MarkdownNote.tsx to separate component
 * 
 * @module markdown/components/MarkdownPreview
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface MarkdownPreviewProps {
    /** Markdown content to render */
    content: string;
    /** Called when a checkbox is toggled */
    onCheckboxToggle: (lineIndex: number) => void;
}

/**
 * Get current theme - always returns 'light' as light mode is enforced
 */
function useTheme(): 'light' | 'dark' {
    return 'light';
}

/**
 * Markdown preview component with syntax highlighting
 */
export const MarkdownPreview = React.memo(function MarkdownPreview({
    content,
    onCheckboxToggle,
}: MarkdownPreviewProps) {
    const isDark = useTheme() === 'dark';

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
    }), [isDark, onCheckboxToggle]);

    return (
        <div className="markdown-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content || '# Empty Note\n\nDouble-click to edit and add your content.'}
            </ReactMarkdown>
        </div>
    );
});
