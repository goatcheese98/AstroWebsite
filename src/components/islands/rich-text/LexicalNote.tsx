/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        🔷 LexicalNote.tsx                                    ║
 * ║                    "The Spatial Rich Text Overlay"                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔷 UI Component | 📐 Spatial Sync | ✨ Rich Text Layer          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am an interactive overlay that lives on top of the Excalidraw canvas. I sync 
 * my position and rotation with a "ghost" rectangle element in Excalidraw, giving
 * the illusion that Rich Text notes are part of the drawing.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Excalidraw's native text is limited to plain string labels. I bring:
 * - Full rich text editing with Lexical (Meta's editor framework)
 * - Formatting toolbar with bold, italic, headings, lists
 * - Tables, code blocks, and checklists
 * - A beautiful glassmorphism aesthetic (blur + translucency)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ Excalidraw  │◀─────│      ME      │─────▶│  RichText   │   │
 *      │   │ (Canvas)    │      │(LexicalNote) │      │  Editor     │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                       [RichTextEditor]                         │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Note is offset from its rectangle; double-click doesn't work; scroll
 *   affects the canvas instead of the note content; toolbar not appearing.
 * - User Impact: Users can't read or edit their rich text notes.
 * - Quick Fix: Verify appState.scrollX/Y and appState.zoom are being used correctly.
 * - Debug: Check the pointer-events logic (auto in center, none at edges).
 * 
 * @module rich-text/LexicalNote
 */

import React, { memo, forwardRef, useImperativeHandle, useCallback, useEffect, useState, useRef } from 'react';
import type { LexicalNoteProps, LexicalNoteRef } from './types';
import { RichTextEditor } from './RichTextEditor';
import { getLexicalEditorStyles } from './themes/lexicalTheme';
import html2canvas from 'html2canvas';

const LexicalNoteInner = memo(forwardRef<LexicalNoteRef, LexicalNoteProps>(
    ({ element, appState, onChange }, ref) => {
        const [isEditing, setIsEditing] = useState(false);
        const [lexicalState, setLexicalState] = useState(element.customData?.lexicalState || '');
        const [isHovered, setIsHovered] = useState(false);
        const [isNearEdge, setIsNearEdge] = useState(false);
        const [isDragging, setIsDragging] = useState(false);
        const [isScrollMode, setIsScrollMode] = useState(false);
        const contentRef = useRef<HTMLDivElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        // Update content when element changes
        useEffect(() => {
            setLexicalState(element.customData?.lexicalState || '');
        }, [element.customData?.lexicalState]);

        // Determine theme
        const isDark = typeof document !== 'undefined' &&
            document.documentElement.getAttribute('data-theme') === 'dark';

        // Check if element is selected in Excalidraw
        const isSelected = appState.selectedElementIds?.[element.id] === true;

        // Calculate screen center position
        const zoom = appState.zoom.value;
        const screenCenterX = (element.x + element.width / 2 + appState.scrollX) * zoom;
        const screenCenterY = (element.y + element.height / 2 + appState.scrollY) * zoom;

        // Container style - position so center matches screenCenterX/Y
        const containerStyle: React.CSSProperties = {
            position: 'absolute',
            top: `${screenCenterY - element.height / 2}px`,
            left: `${screenCenterX - element.width / 2}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            pointerEvents: 'none',
            zIndex: isEditing ? 10 : (isSelected ? 3 : 2),
        };

        // Content card style - visual layer
        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: isDark ? 'rgba(23, 23, 23, 0.25)' : 'rgba(255, 255, 255, 0.25)',
            color: isDark ? '#e5e5e5' : '#1a1a1a',
            borderRadius: '8px',
            padding: 0,
            overflow: isScrollMode || isEditing ? 'auto' : 'hidden',
            overscrollBehavior: 'contain',
            boxShadow: isSelected
                ? '0 0 0 2px #6366f1, 0 10px 20px -3px rgba(99, 102, 241, 0.4)'
                : isDark
                    ? '0 4px 12px -1px rgba(0, 0, 0, 0.5)'
                    : '0 4px 8px -1px rgba(0, 0, 0, 0.1)',
            pointerEvents: 'auto',
            userSelect: (isEditing || isScrollMode) ? 'auto' : 'none',
            WebkitUserSelect: (isEditing || isScrollMode) ? 'auto' : 'none',
            cursor: isEditing ? 'text' : 'default',
            outline: 'none',
            backdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
            WebkitBackdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        };

        // Manual dragging support
        const handleMouseDown = useCallback((e: React.MouseEvent) => {
            if (isEditing) return;
            if (isNearEdge) return;

            setIsDragging(true);

            const handleMouseUp = () => {
                setIsDragging(false);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            document.addEventListener('mouseup', handleMouseUp);
        }, [isEditing, isNearEdge]);

        // Enter edit mode
        const enterEditMode = useCallback(() => {
            setIsEditing(true);
        }, []);

        // Exit edit mode and save
        const exitEditMode = useCallback(() => {
            setIsEditing(false);
            if (lexicalState !== element.customData?.lexicalState) {
                onChange(element.id, lexicalState);
            }
        }, [lexicalState, element.id, element.customData?.lexicalState, onChange]);

        // Handle content update
        const updateContent = useCallback((newState: string) => {
            setLexicalState(newState);
        }, []);

        // Handle keyboard shortcuts
        const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                exitEditMode();
            }
        }, [exitEditMode]);

        // Listen for edit command from ExcalidrawCanvas
        useEffect(() => {
            if (isEditing) return;

            const handleEditCommand = (e: CustomEvent<{ elementId: string }>) => {
                if (e.detail.elementId === element.id) {
                    enterEditMode();
                }
            };

            window.addEventListener('lexical:edit', handleEditCommand as EventListener);
            return () => window.removeEventListener('lexical:edit', handleEditCommand as EventListener);
        }, [isEditing, enterEditMode, element.id]);

        // Hit test helper
        const isPointInNote = useCallback((clientX: number, clientY: number) => {
            if (!containerRef.current) return { inNote: false, isNearEdge: false };

            const screenX = (element.x + appState.scrollX) * zoom;
            const screenY = (element.y + appState.scrollY) * zoom;
            const screenWidth = element.width * zoom;
            const screenHeight = element.height * zoom;
            const centerX = screenX + screenWidth / 2;
            const centerY = screenY + screenHeight / 2;

            let dx = clientX - centerX;
            let dy = clientY - centerY;

            if (element.angle) {
                const cos = Math.cos(-element.angle);
                const sin = Math.sin(-element.angle);
                const rx = dx * cos - dy * sin;
                const ry = dx * sin + dy * cos;
                dx = rx;
                dy = ry;
            }

            const halfWidth = screenWidth / 2;
            const halfHeight = screenHeight / 2;
            const inNote = dx >= -halfWidth && dx <= halfWidth && dy >= -halfHeight && dy <= halfHeight;

            const handleMargin = 12 * zoom;
            const isNearEdge = inNote && (
                dx < -halfWidth + handleMargin ||
                dx > halfWidth - handleMargin ||
                dy < -halfHeight + handleMargin ||
                dy > halfHeight - handleMargin
            );

            return { inNote, isNearEdge };
        }, [element.x, element.y, element.width, element.height, element.angle, appState.scrollX, appState.scrollY, zoom]);

        // Global capture-phase event handlers
        useEffect(() => {
            if (isEditing) return;

            const handleGlobalDblClick = (e: MouseEvent) => {
                const { inNote } = isPointInNote(e.clientX, e.clientY);
                if (inNote) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    enterEditMode();
                }
            };

            const handleGlobalMouseMove = (e: MouseEvent) => {
                const { inNote, isNearEdge: edge } = isPointInNote(e.clientX, e.clientY);
                if (inNote !== isHovered) {
                    setIsHovered(inNote);
                }
                if (edge !== isNearEdge) {
                    setIsNearEdge(edge);
                }
            };

            document.addEventListener('dblclick', handleGlobalDblClick, true);
            document.addEventListener('mousemove', handleGlobalMouseMove, true);

            return () => {
                document.removeEventListener('dblclick', handleGlobalDblClick, true);
                document.removeEventListener('mousemove', handleGlobalMouseMove, true);
            };
        }, [isEditing, isHovered, isNearEdge, enterEditMode, isPointInNote]);

        // Click outside handler
        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (contentRef.current && contentRef.current.contains(e.target as Node)) {
                    return;
                }

                const { inNote } = isPointInNote(e.clientX, e.clientY);

                if (!inNote) {
                    if (isEditing) {
                        exitEditMode();
                    }
                    if (isScrollMode) {
                        setIsScrollMode(false);
                    }
                }
            };

            document.addEventListener('click', handleClickOutside, true);

            return () => {
                document.removeEventListener('click', handleClickOutside, true);
            };
        }, [isEditing, isScrollMode, isPointInNote, exitEditMode]);

        // Touch handlers for pinch zoom pass-through
        const handleTouchStart = useCallback((e: React.TouchEvent) => {
            if (isEditing) return;
            if (e.touches.length > 1) {
                return;
            }
        }, [isEditing]);

        // Export as image
        const exportAsImage = useCallback(async () => {
            const contentDiv = document.querySelector(`[data-lexical-id="${element.id}"]`);
            if (!contentDiv) throw new Error('Content not found');

            const canvas = await html2canvas(contentDiv as HTMLElement, {
                backgroundColor: isDark ? '#171717' : '#ffffff',
                scale: 2,
            });

            return {
                imageData: canvas.toDataURL('image/png'),
                position: {
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                    angle: element.angle || 0,
                },
            };
        }, [element, isDark]);

        // Update transform directly on DOM (bypasses React for silky-smooth 60fps sync)
        const updateTransform = useCallback((x: number, y: number, width: number, height: number, angle: number, zoomVal: number, scrollX: number, scrollY: number) => {
            if (!containerRef.current) return;

            const screenCenterX = (x + width / 2 + scrollX) * zoomVal;
            const screenCenterY = (y + height / 2 + scrollY) * zoomVal;

            const container = containerRef.current;
            container.style.top = `${screenCenterY - height / 2}px`;
            container.style.left = `${screenCenterX - width / 2}px`;
            container.style.width = `${width}px`;
            container.style.height = `${height}px`;
            container.style.transform = `scale(${zoomVal}) rotate(${angle}rad)`;
        }, []);

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            exportAsImage,
            updateTransform
        }), [exportAsImage, updateTransform]);

        return (
            <div
                ref={containerRef}
                style={containerStyle}
                className="lexical-note-container"
                data-lexical-id={element.id}
                onTouchStart={handleTouchStart}
            >
                {/* Scroll Mode Toggle Button */}
                {!isEditing && isHovered && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsScrollMode(!isScrollMode);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10,
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isScrollMode
                                ? (isDark ? 'rgba(99, 102, 241, 0.9)' : 'rgba(99, 102, 241, 0.85)')
                                : (isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)'),
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            pointerEvents: 'auto',
                            boxShadow: isScrollMode
                                ? '0 4px 12px rgba(99, 102, 241, 0.4), 0 0 0 2px rgba(99, 102, 241, 0.3)'
                                : (isDark ? '0 4px 12px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.15)'),
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                        title={isScrollMode ? 'Disable scrolling (affects canvas)' : 'Enable scrolling (within note)'}
                        onMouseEnter={(e) => {
                            if (!isScrollMode) {
                                e.currentTarget.style.background = isDark
                                    ? 'rgba(40, 40, 40, 0.9)'
                                    : 'rgba(245, 245, 245, 1)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isScrollMode) {
                                e.currentTarget.style.background = isDark
                                    ? 'rgba(30, 30, 30, 0.85)'
                                    : 'rgba(255, 255, 255, 0.9)';
                            }
                        }}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={isScrollMode ? '#fff' : (isDark ? '#e5e5e5' : '#1a1a1a')}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 5v14M19 12l-7 7-7-7" />
                        </svg>
                    </button>
                )}

                {/* Content card */}
                <div
                    ref={contentRef}
                    style={contentStyle}
                    data-lexical-id={element.id}
                    onMouseDown={handleMouseDown}
                    onKeyDown={handleKeyDown}
                >
                    {isEditing ? (
                        <RichTextEditor
                            initialState={lexicalState}
                            onChange={updateContent}
                            isDark={isDark}
                            isScrollMode={true}
                        />
                    ) : (
                        <div
                            className="lexical-preview"
                            style={{
                                width: '100%',
                                height: '100%',
                                overflow: isScrollMode ? 'auto' : 'hidden',
                                pointerEvents: isScrollMode ? 'auto' : 'none',
                            }}
                        >
                            <RichTextPreview
                                lexicalState={lexicalState}
                                isDark={isDark}
                            />
                        </div>
                    )}
                </div>

                {/* Scoped styles */}
                <style>{getLexicalEditorStyles()}</style>
            </div>
        );
    }
));

LexicalNoteInner.displayName = 'LexicalNoteInner';

export const LexicalNote = memo(forwardRef<LexicalNoteRef, LexicalNoteProps>(
    (props, ref) => <LexicalNoteInner {...props} ref={ref} />
));

LexicalNote.displayName = 'LexicalNote';

/**
 * Rich Text Preview Component
 * Renders a read-only view of the Lexical content
 */
interface RichTextPreviewProps {
    lexicalState: string;
    isDark: boolean;
}

const RichTextPreview: React.FC<RichTextPreviewProps> = ({ lexicalState, isDark }) => {
    // Parse the lexical state and render simple HTML preview
    // For now, we'll use a simplified preview
    // In production, you'd want to use Lexical's export utilities

    const renderContent = () => {
        if (!lexicalState) {
            return (
                <div style={{
                    padding: '16px 20px',
                    color: isDark ? '#6b7280' : '#9ca3af',
                    fontStyle: 'italic',
                }}>
                    Double-click to edit...
                </div>
            );
        }

        try {
            const state = JSON.parse(lexicalState);
            const rootChildren = state.root?.children || [];

            return (
                <div style={{
                    padding: '16px 20px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: isDark ? '#e5e5e5' : '#1a1a1a',
                }}>
                    {rootChildren.map((node: any, index: number) => (
                        <PreviewNode key={index} node={node} isDark={isDark} />
                    ))}
                </div>
            );
        } catch (err) {
            return (
                <div style={{
                    padding: '16px 20px',
                    color: isDark ? '#ef4444' : '#dc2626',
                }}>
                    Error loading content
                </div>
            );
        }
    };

    return renderContent();
};

/**
 * Preview Node - renders individual Lexical nodes
 */
const PreviewNode: React.FC<{ node: any; isDark: boolean }> = ({ node, isDark }) => {
    const textColor = isDark ? '#e5e5e5' : '#1a1a1a';

    switch (node.type) {
        case 'heading': {
            const tag = node.tag || 'h1';
            const sizeMap: Record<string, number> = {
                h1: 28, h2: 24, h3: 20, h4: 17, h5: 15, h6: 15,
            };
            const size = sizeMap[tag] || 15;
            return (
                <div style={{
                    fontSize: `${size}px`,
                    fontWeight: 700,
                    margin: '16px 0 12px 0',
                    lineHeight: 1.3,
                    color: textColor,
                }}>
                    {renderChildren(node.children)}
                </div>
            );
        }

        case 'quote':
            return (
                <blockquote style={{
                    borderLeft: `3px solid ${isDark ? '#818cf8' : '#6366f1'}`,
                    paddingLeft: '16px',
                    margin: '16px 0',
                    fontStyle: 'italic',
                    opacity: 0.85,
                    color: textColor,
                }}>
                    {renderChildren(node.children)}
                </blockquote>
            );

        case 'code':
            return (
                <pre style={{
                    background: isDark ? '#1f2937' : '#f8f9fa',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    margin: '16px 0',
                    fontFamily: 'SF Mono, Monaco, monospace',
                    fontSize: '13px',
                    overflow: 'auto',
                    color: textColor,
                }}>
                    {renderChildren(node.children)}
                </pre>
            );

        case 'list': {
            const isOrdered = node.listType === 'number';
            const ListTag = isOrdered ? 'ol' : 'ul';
            return (
                <ListTag style={{
                    margin: '12px 0',
                    paddingLeft: '24px',
                    color: textColor,
                }}>
                    {(node.children || []).map((child: any, i: number) => (
                        <li key={i} style={{ margin: '4px 0' }}>
                            {renderChildren(child.children)}
                        </li>
                    ))}
                </ListTag>
            );
        }

        case 'paragraph':
        default:
            return (
                <p style={{
                    margin: '0 0 12px 0',
                    color: textColor,
                }}>
                    {renderChildren(node.children)}
                </p>
            );
    }
};

/**
 * Render children nodes (text with formatting)
 */
const renderChildren = (children: any[]): React.ReactNode => {
    if (!children || !Array.isArray(children)) return null;

    return children.map((child, index) => {
        if (child.type === 'text') {
            let content: React.ReactNode = child.text;

            // Apply formatting
            if (child.format & 1) content = <strong key={index}>{content}</strong>; // bold
            if (child.format & 2) content = <em key={index}>{content}</em>; // italic
            if (child.format & 4) content = <u key={index}>{content}</u>; // underline
            if (child.format & 8) content = <s key={index}>{content}</s>; // strikethrough
            if (child.format & 16) content = <code key={index} style={{
                fontFamily: 'monospace',
                padding: '2px 4px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '4px',
            }}>{content}</code>; // code

            return <span key={index}>{content}</span>;
        }

        if (child.type === 'link') {
            return (
                <a
                    key={index}
                    href={child.url}
                    style={{ color: '#6366f1', textDecoration: 'none' }}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {renderChildren(child.children)}
                </a>
            );
        }

        return null;
    });
};
