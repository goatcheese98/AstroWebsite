/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        🟣 MarkdownNote.tsx                                   ║
 * ║                    "The Spatial Note Overlay"                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 📐 Spatial Sync | ✨ Interactive Layer        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am an interactive overlay that lives on top of the Excalidraw canvas. I sync 
 * my position and rotation with a "ghost" rectangle element in Excalidraw, giving
 * the illusion that Markdown notes are part of the drawing.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Excalidraw's native text is limited to plain string labels. I bring:
 * - Full Markdown rendering (headers, bold, lists, links)
 * - Syntax highlighting for code snippets
 * - Interactive checklists
 * - A beautiful glassmorphism aesthetic (blur + translucency)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ Excalidraw  │◀─────│      ME      │─────▶│  Markdown   │   │
 *      │   │ (Canvas)    │      │(MarkdownNote)│      │  Preview    │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                        [MarkdownEditor]                        │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Note is offset from its rectangle; double-click doesn't work; scroll
 *   affects the canvas instead of the note content; "Shield layer" artifacts.
 * - User Impact: Users can't read or edit their spatial notes.
 * - Quick Fix: Verify appState.scrollX/Y and appState.zoom are being used correctly.
 * - Debug: Check the pointer-events logic (auto in center, none at edges).
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ element             │ The Excalidraw rectangle element I am tracking       │
 * │ appState            │ Global canvas state (zoom, scroll, selection)       │
 * │ onChange            │ Callback to update the element's customData         │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-05: Standardized personified header.
 * 2026-02-05: Fixed theme synchronization (passing isDark to Preview).
 * 2026-02-05: Removed outdated "Shield layer" references.
 * 
 * @module markdown/MarkdownNote
 */

import React, { memo, forwardRef, useImperativeHandle, useCallback, useEffect, useState, useRef } from 'react';
import { MarkdownEditor, MarkdownPreview } from './components';
import { HybridMarkdownEditor } from './HybridMarkdownEditor';
import { getMarkdownStyles } from './styles/markdownStyles';
import type { MarkdownNoteProps, MarkdownNoteRef } from './types';
import html2canvas from 'html2canvas';

const MarkdownNoteInner = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(
    ({ element, appState, onChange }, ref) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editMode, setEditMode] = useState<'raw' | 'hybrid'>('raw');
        const [content, setContent] = useState(element.customData?.content || '');
        const [isHovered, setIsHovered] = useState(false);
        const [isNearEdge, setIsNearEdge] = useState(false);
        const [isDragging, setIsDragging] = useState(false);
        const [isScrollMode, setIsScrollMode] = useState(false); // Click-to-interact scroll mode
        const contentRef = useRef<HTMLDivElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        // Update content when element changes
        useEffect(() => {
            setContent(element.customData?.content || '');
        }, [element.customData?.content]);

        // Calculate screen position
        const x = (element.x + appState.scrollX) * appState.zoom.value;
        const y = (element.y + appState.scrollY) * appState.zoom.value;
        const width = element.width;
        const height = element.height;
        const angle = element.angle || 0;

        // Determine theme - always light mode on canvas
        const isDark = false; // Canvas is always light mode

        // Check if element is selected in Excalidraw
        const isSelected = appState.selectedElementIds?.[element.id] === true;

        // Calculate screen center position
        const zoom = appState.zoom.value;
        const screenCenterX = (element.x + element.width / 2 + appState.scrollX) * zoom;
        const screenCenterY = (element.y + element.height / 2 + appState.scrollY) * zoom;

        // Container style - position so center matches screenCenterX/Y
        const containerStyle: React.CSSProperties = {
            position: 'absolute',
            top: `${screenCenterY - height / 2}px`,
            left: `${screenCenterX - width / 2}px`,
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${zoom}) rotate(${angle}rad)`,
            transformOrigin: 'center center',
            pointerEvents: 'none',
            zIndex: isEditing ? 5 : (isSelected ? 2 : 1),
        };

        // Content card style - visual layer
        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: isDark ? 'rgba(23, 23, 23, 0.2)' : 'rgba(255, 255, 255, 0.2)',
            color: isDark ? '#e5e5e5' : '#1a1a1a',
            borderRadius: '0px',
            padding: 0, // Remove default padding - each mode handles its own
            overflow: isScrollMode || isEditing ? 'auto' : 'hidden',
            overscrollBehavior: 'contain',
            boxShadow: isSelected
                ? '0 0 0 2px transparent, 0 10px 20px -3px rgba(129, 140, 248, 0.4)'
                : isDark
                    ? '0 4px 12px -1px rgba(0, 0, 0, 0.5)'
                    : '0 4px 8px -1px rgba(0, 0, 0, 0.1)',
            // Always enable pointer events for hover detection and button clicks
            pointerEvents: 'auto',
            // Prevent text selection and interaction when not editing/scrolling
            userSelect: (isEditing || isScrollMode) ? 'auto' : 'none',
            WebkitUserSelect: (isEditing || isScrollMode) ? 'auto' : 'none',
            cursor: isEditing ? 'text' : 'default',
            outline: 'none',
            backdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
            WebkitBackdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
        };

        // Manual dragging support for when pointer-events is auto
        const handleMouseDown = useCallback((e: React.MouseEvent) => {
            if (isEditing) return;

            // If near edge, let it bubble (it will be pointer-events: none anyway)
            if (isNearEdge) return;

            // When user clicks on selected note, assume they want to drag
            // Disable pointer-events so Excalidraw can handle it
            setIsDragging(true);

            // Re-enable after drag completes
            const handleMouseUp = () => {
                setIsDragging(false);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            document.addEventListener('mouseup', handleMouseUp);

        }, [isEditing, isNearEdge]);

        // Enter edit mode
        const enterEditMode = useCallback((mode: 'raw' | 'hybrid' = 'raw') => {
            setEditMode(mode);
            setIsEditing(true);
        }, []);

        // Exit edit mode and save
        const exitEditMode = useCallback(() => {
            setIsEditing(false);
            setEditMode('raw'); // Reset to raw for next time
            if (content !== element.customData?.content) {
                onChange(element.id, content);
            }
        }, [content, element.id, element.customData?.content, onChange]);

        // Handle content update
        const updateContent = useCallback((value: string) => {
            setContent(value);
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

            window.addEventListener('markdown:edit', handleEditCommand as EventListener);
            return () => window.removeEventListener('markdown:edit', handleEditCommand as EventListener);
        }, [isEditing, enterEditMode, element.id]);


        // Hit test helper
        const isPointInNote = useCallback((clientX: number, clientY: number) => {
            if (!containerRef.current) return { inNote: false, isNearEdge: false };

            // Screen coordinates
            const zoom = appState.zoom.value;
            const screenX = (element.x + appState.scrollX) * zoom;
            const screenY = (element.y + appState.scrollY) * zoom;
            const screenWidth = element.width * zoom;
            const screenHeight = element.height * zoom;
            const centerX = screenX + screenWidth / 2;
            const centerY = screenY + screenHeight / 2;

            // Translate point relative to center
            let dx = clientX - centerX;
            let dy = clientY - centerY;

            // Handle rotation around center
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

            // Excalidraw handles are usually ~10px. We use a 12px margin for safety.
            const handleMargin = 12 * zoom;
            const isNearEdge = inNote && (
                dx < -halfWidth + handleMargin ||
                dx > halfWidth - handleMargin ||
                dy < -halfHeight + handleMargin ||
                dy > halfHeight - handleMargin
            );

            return { inNote, isNearEdge };
        }, [element.x, element.y, element.width, element.height, element.angle, appState.scrollX, appState.scrollY, appState.zoom.value]);

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
        }, [isEditing, isHovered, isNearEdge, isSelected, enterEditMode, isPointInNote]);

        // Click outside handler - exit edit mode and disable scroll mode
        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                // Check if click is inside the content area
                if (contentRef.current && contentRef.current.contains(e.target as Node)) {
                    // Click is inside the content - don't exit
                    return;
                }

                const { inNote } = isPointInNote(e.clientX, e.clientY);

                // If click is outside the note (and not on scroll button)
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
            const contentDiv = document.querySelector(`[data-note-id="${element.id}"]`);
            if (!contentDiv) throw new Error('Content not found');

            const canvas = await html2canvas(contentDiv as HTMLElement, {
                backgroundColor: null,
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
        }, [element]);

        // Update transform directly on DOM (bypasses React for silky-smooth 60fps sync)
        const updateTransform = useCallback((x: number, y: number, width: number, height: number, angle: number, zoom: number, scrollX: number, scrollY: number) => {
            if (!containerRef.current) return;

            // Calculate screen center position using passed-in values (all from same frame)
            const screenCenterX = (x + width / 2 + scrollX) * zoom;
            const screenCenterY = (y + height / 2 + scrollY) * zoom;

            // Apply transform directly to DOM using GPU-accelerated translate3d
            const container = containerRef.current;
            container.style.top = `${screenCenterY - height / 2}px`;
            container.style.left = `${screenCenterX - width / 2}px`;
            container.style.width = `${width}px`;
            container.style.height = `${height}px`;
            container.style.transform = `scale(${zoom}) rotate(${angle}rad)`;
        }, []); // No dependencies - uses only passed parameters

        // Expose both methods via ref
        useImperativeHandle(ref, () => ({
            exportAsImage,
            updateTransform
        }), [exportAsImage, updateTransform]);

        // Toggle checkbox in preview mode
        const toggleCheckbox = useCallback((lineIndex: number) => {
            const lines = content.split('\n');
            const line = lines[lineIndex];

            if (line?.includes('- [ ]')) {
                lines[lineIndex] = line.replace('- [ ]', '- [x]');
            } else if (line?.includes('- [x]')) {
                lines[lineIndex] = line.replace('- [x]', '- [ ]');
            }

            const newContent = lines.join('\n');
            setContent(newContent);
            onChange(element.id, newContent);
        }, [content, element.id, onChange]);

        return (
            <div
                ref={containerRef}
                style={containerStyle}
                className="markdown-note-container"
                data-note-id={element.id}
                onTouchStart={handleTouchStart}
            >
                {/* Scroll Mode Toggle Button - Center Bottom (hover-triggered) */}
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
                        {/* Scroll Icon SVG */}
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

                {/* Content card - visual layer */}
                <div
                    ref={contentRef}
                    style={contentStyle}
                    data-note-id={element.id}
                    onMouseDown={handleMouseDown}
                >
                    {isEditing ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            {/* Mode Toggle Button */}
                            <button
                                onClick={() => setEditMode(prev => prev === 'raw' ? 'hybrid' : 'raw')}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    zIndex: 1000,
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: editMode === 'raw' ? '#818cf8' : '#6366f1',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {editMode === 'raw' ? '✨ Pretty' : '📝 Raw'}
                            </button>

                            {editMode === 'hybrid' ? (
                                <HybridMarkdownEditor
                                    content={content}
                                    onChange={updateContent}
                                    isDark={isDark}
                                    isScrollMode={true}
                                />
                            ) : (
                                <div style={{
                                    padding: '40px 20px 20px',
                                    width: '100%',
                                    height: '100%',
                                    boxSizing: 'border-box',
                                    overflow: 'auto'
                                }}>
                                    <MarkdownEditor
                                        value={content}
                                        onChange={updateContent}
                                        onBlur={() => { }} // We handle save on click outside
                                        onKeyDown={handleKeyDown}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            className="markdown-preview"
                            style={{
                                padding: '18px 22px',
                                paddingTop: '38px',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                width: '100%',
                                height: '100%',
                                overflow: isScrollMode ? 'auto' : 'hidden',
                            }}
                        >
                            <MarkdownPreview
                                content={content}
                                onCheckboxToggle={toggleCheckbox}
                                isDark={isDark}
                            />
                        </div>
                    )}
                </div>

                {/* Scoped styles */}
                <style>{getMarkdownStyles()}</style>
            </div>
        );
    }
));

MarkdownNoteInner.displayName = 'MarkdownNoteInner';

export const MarkdownNote = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(
    (props, ref) => <MarkdownNoteInner {...props} ref={ref} />
));

MarkdownNote.displayName = 'MarkdownNote';
