/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🟣 MarkdownNote.tsx            "The Note Overlay"                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I am a visual overlay on top of an Excalidraw rectangle element. I      ║
 * ║     display markdown content and provide a purple glow when selected.       ║
 * ║     Excalidraw handles all the heavy lifting (drag, resize, arrows).        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 ARCHITECTURE:
 * - Underlying element: Native Excalidraw rectangle (transparent stroke)
 * - This overlay: React component that tracks element position
 * - Excalidraw handles: Drag, resize, rotate, arrow binding, pinch zoom
 * - We handle: Content rendering, edit mode, purple glow effect, wheel scrolling
 * 
 * 🎯 INTERACTION MODEL:
 * - Single click/drag: Excalidraw handles it via underlying rect 
 * - Double-click: Shield layer captures it and enters edit mode
 * - Scroll/wheel: Captured by overlay for content scrolling
 * - Pinch zoom: Passes through to Excalidraw canvas zoom
 * 
 * @module markdown/MarkdownNote
 */

import React, { memo, forwardRef, useImperativeHandle, useCallback, useEffect, useState, useRef } from 'react';
import { MarkdownEditor, MarkdownPreview } from './components';
import { getMarkdownStyles } from './styles/markdownStyles';
import type { MarkdownNoteProps, MarkdownNoteRef } from './types';
import html2canvas from 'html2canvas';

const MarkdownNoteInner = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(
    ({ element, appState, onChange }, ref) => {
        const [isEditing, setIsEditing] = useState(false);
        const [content, setContent] = useState(element.customData?.content || '');
        const [isHovered, setIsHovered] = useState(false);
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

        // Determine theme
        const isDark = typeof document !== 'undefined' &&
            document.documentElement.getAttribute('data-theme') === 'dark';

        // Check if element is selected in Excalidraw
        const isSelected = appState.selectedElementIds?.[element.id] === true;

        // Container style - position over the Excalidraw element
        const containerStyle: React.CSSProperties = {
            position: 'absolute',
            top: `${y}px`,
            left: `${x}px`,
            width: `${width}px`,
            height: `${height}px`,
            transform: `rotate(${angle}rad) scale(${appState.zoom.value})`,
            transformOrigin: 'top left',
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
            padding: '18px 22px',
            paddingTop: '38px',
            overflow: 'auto',
            boxShadow: isSelected
                ? '0 0 0 2px transparent, 0 10px 20px -3px rgba(129, 140, 248, 0.4)'
                : isDark
                    ? '0 4px 12px -1px rgba(0, 0, 0, 0.5)'
                    : '0 4px 8px -1px rgba(0, 0, 0, 0.1)',
            pointerEvents: isEditing ? 'auto' : 'none',
            cursor: isEditing ? 'text' : 'default',
            outline: 'none',
            backdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
            WebkitBackdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
        };

        // Enter edit mode
        const enterEditMode = useCallback(() => {
            setIsEditing(true);
        }, []);

        // Exit edit mode and save
        const exitEditMode = useCallback(() => {
            setIsEditing(false);
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
            if (!containerRef.current) return false;

            // Screen coordinates calculated exactly like containerStyle
            const screenX = (element.x + appState.scrollX) * appState.zoom.value;
            const screenY = (element.y + appState.scrollY) * appState.zoom.value;
            const zoom = appState.zoom.value;

            // Translate point relative to note top-left
            let dx = clientX - screenX;
            let dy = clientY - screenY;

            // If rotated, rotate point back
            if (element.angle) {
                const cos = Math.cos(-element.angle);
                const sin = Math.sin(-element.angle);
                const rx = dx * cos - dy * sin;
                const ry = dx * sin + dy * cos;
                dx = rx;
                dy = ry;
            }

            // Hit test in unzoomed space
            return dx >= 0 && dx <= element.width * zoom && dy >= 0 && dy <= element.height * zoom;
        }, [element.x, element.y, element.width, element.height, element.angle, appState.scrollX, appState.scrollY, appState.zoom.value]);

        // Global capture-phase event handlers
        useEffect(() => {
            if (isEditing) return;

            const handleGlobalDblClick = (e: MouseEvent) => {
                if (isPointInNote(e.clientX, e.clientY)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    enterEditMode();
                }
            };

            const handleGlobalWheel = (e: WheelEvent) => {
                if (isPointInNote(e.clientX, e.clientY)) {
                    const contentEl = contentRef.current;
                    if (!contentEl) return;

                    const { scrollTop, scrollHeight, clientHeight } = contentEl;
                    const isScrollingDown = e.deltaY > 0;
                    const isScrollingUp = e.deltaY < 0;
                    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
                    const isAtTop = scrollTop <= 0;

                    // If at scroll boundaries, let event propagate to canvas for panning
                    if ((isScrollingDown && isAtBottom) || (isScrollingUp && isAtTop)) {
                        return;
                    }

                    // Otherwise, scroll the content and stop the canvas from zooming
                    e.preventDefault();
                    e.stopPropagation();
                    contentEl.scrollTop += e.deltaY;
                }
            };

            const handleGlobalMouseMove = (e: MouseEvent) => {
                const hovered = isPointInNote(e.clientX, e.clientY);
                if (hovered !== isHovered) {
                    setIsHovered(hovered);
                }
            };

            document.addEventListener('dblclick', handleGlobalDblClick, true);
            document.addEventListener('wheel', handleGlobalWheel, { capture: true, passive: false });
            document.addEventListener('mousemove', handleGlobalMouseMove, true);

            return () => {
                document.removeEventListener('dblclick', handleGlobalDblClick, true);
                document.removeEventListener('wheel', handleGlobalWheel, true);
                document.removeEventListener('mousemove', handleGlobalMouseMove, true);
            };
        }, [isEditing, isHovered, enterEditMode, isPointInNote]);

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

        // Expose export method
        useImperativeHandle(ref, () => ({ exportAsImage }), [exportAsImage]);

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
                {/* Content card - visual layer */}
                <div
                    ref={contentRef}
                    style={contentStyle}
                    data-note-id={element.id}
                >
                    {isEditing ? (
                        <MarkdownEditor
                            value={content}
                            onChange={updateContent}
                            onBlur={exitEditMode}
                            onKeyDown={handleKeyDown}
                        />
                    ) : (
                        <div
                            className="markdown-preview"
                            style={{
                                pointerEvents: 'none',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                            }}
                        >
                            <MarkdownPreview content={content} onCheckboxToggle={toggleCheckbox} />
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
