/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🟣 MarkdownNote.tsx            "The Note Component"                         ║
 * ║                    🎯 UI Component | 🔵 Uses Multiple Hooks                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I am the markdown note overlay. I render on top of Excalidraw elements  ║
 * ║     and provide an interactive markdown editing experience. Users can       ║
 * ║     drag me, resize me, rotate me, and edit my content.                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ useMarkdown │─────▶│      ME      │─────▶│  Excalidraw │   │
 *      │   │    Note     │      │   (HOOK)     │      │     API     │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │   ┌─────────────────────────────────────────────────────────┐   │
 *      │   │  MarkdownEditor | MarkdownPreview | ResizeHandles       │   │
 *      │   │  RotationHandle | NoteBadge                             │   │
 *      │   └─────────────────────────────────────────────────────────┘   │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Note doesn't render, interactions don't work
 * - **User Impact:** Markdown notes completely broken
 * - **Quick Fix:** Check useMarkdownNote hook return values
 * - **Debug:** Inspect component tree and hook states
 * - **Common Issue:** element prop missing required fields
 * 
 * 📦 PROPS I RECEIVE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ element             │ The Excalidraw element with markdown customData      │
 * │ appState            │ Current zoom/scroll state for positioning            │
 * │ onChange            │ Callback when content changes                        │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE (via ref):
 * - exportAsImage(): Export note as PNG
 * 
 * 🔑 KEY CONCEPTS:
 * - Uses useMarkdownNote hook for all state/logic
 * - Positioned absolutely based on element coords + scroll + zoom
 * - Pointer events disabled during canvas panning
 * - Double-click to edit, ESC to exit
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-03: Extracted from 1055-line monolith to focused orchestrator
 *             - Extracted hooks: useDrag, useResize, useRotate, useSelection, useCanvasPan
 *             - Extracted components: MarkdownEditor, MarkdownPreview, ResizeHandles, etc.
 *             - Added comprehensive personified headers per AI_CODING_SYSTEM_PROMPT.md
 * 
 * @module markdown/MarkdownNote
 */

import React, { memo, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
import { useMarkdownNote } from './hooks/useMarkdownNote';
import { MarkdownEditor, MarkdownPreview, ResizeHandles, RotationHandle, NoteBadge, ErrorBoundary } from './components';
import { getMarkdownStyles } from './styles/markdownStyles';
import type { MarkdownNoteProps, MarkdownNoteRef } from './types';

const MarkdownNoteInner = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(
    ({ element, appState, onChange }, ref) => {
        // Main hook - orchestrates all functionality
        const {
            isEditing,
            isHovered,
            isNewNote,
            content,
            isDragging,
            isResizing,
            isRotating,
            isSelected,
            isCanvasPanning,
            edgeProximity,
            hoveredEdge,
            setIsHovered,
            setHoveredEdge,
            enterEditMode,
            exitEditMode,
            updateContent,
            toggleCheckbox,
            handleContentMouseDown,
            handleResizeStart,
            handleMouseMove,
            handleRotateStart,
            select,
            exportAsImage,
            contentRef,
        } = useMarkdownNote({ element, appState, onChange });

        // Expose export method via ref
        useImperativeHandle(ref, () => ({ exportAsImage }), [exportAsImage]);

        // Calculate screen position
        const x = (element.x + appState.scrollX) * appState.zoom.value;
        const y = (element.y + appState.scrollY) * appState.zoom.value;
        const width = element.width;
        const height = element.height;
        const angle = element.angle || 0;

        // Light mode only - theme is enforced application-wide
        const isDark = false;

        // Container style (positioned absolutely over Excalidraw element)
        const containerStyle: React.CSSProperties = {
            position: 'absolute',
            top: `${y}px`,
            left: `${x}px`,
            width: `${width}px`,
            height: `${height}px`,
            transform: `rotate(${angle}rad) scale(${appState.zoom.value})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            zIndex: isEditing ? 100 : 10,
            opacity: isNewNote ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
        };

        // Content card style (the visible note)
        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: isDark ? 'rgba(23, 23, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            color: isDark ? '#e5e5e5' : '#1a1a1a',
            border: isEditing
                ? '2px solid #3b82f6'
                : isSelected
                    ? '2px solid #818cf8'
                    : `1px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.1)'}`,
            borderRadius: '10px',
            padding: '18px 22px',
            paddingTop: '38px',
            overflow: 'auto',
            boxShadow: isEditing
                ? '0 12px 24px -4px rgba(59, 130, 246, 0.3), 0 0 0 3px rgba(59, 130, 246, 0.1)'
                : isSelected
                    ? isDark
                        ? '0 10px 20px -3px rgba(129, 140, 248, 0.4), 0 0 0 1px rgba(129, 140, 248, 0.2)'
                        : '0 10px 20px -3px rgba(99, 102, 241, 0.25)'
                    : isHovered
                        ? isDark
                            ? '0 6px 16px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(82, 82, 91, 0.3)'
                            : '0 6px 12px -2px rgba(0, 0, 0, 0.15)'
                        : isDark
                            ? '0 4px 12px -1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(82, 82, 91, 0.2)'
                            : '0 4px 8px -1px rgba(0, 0, 0, 0.1)',
            pointerEvents: isCanvasPanning ? 'none' : 'auto',
            cursor: isDragging ? 'grabbing' : 'default',
            outline: 'none',
            backdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
            WebkitBackdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
        };

        // Handle double-click to edit
        const handleDoubleClick = useCallback((e: React.MouseEvent) => {
            const target = e.target as HTMLElement;
            const tagName = target.tagName.toLowerCase();

            // Don't enter edit mode on interactive elements
            if (tagName === 'a' || tagName === 'input' || tagName === 'button') {
                return;
            }

            e.stopPropagation();
            enterEditMode();
        }, [enterEditMode]);

        // Handle keyboard shortcuts in edit mode
        const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                exitEditMode();
            }
        }, [exitEditMode]);

        // Set up native double-click listener (more reliable than React's)
        useEffect(() => {
            const contentDiv = contentRef.current;
            if (!contentDiv || isEditing) return;

            const handleNativeDoubleClick = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();

                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('input')) {
                    return;
                }

                enterEditMode();
            };

            contentDiv.addEventListener('dblclick', handleNativeDoubleClick, true);
            return () => contentDiv.removeEventListener('dblclick', handleNativeDoubleClick, true);
        }, [isEditing, enterEditMode]);

        return (
            <div
                style={containerStyle}
                onMouseEnter={() => !isCanvasPanning && setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    setHoveredEdge(null);
                }}
                className="markdown-note-container"
                data-note-id={element.id}
            >
                {/* Note type badge */}
                <NoteBadge isVisible={!isEditing && (isSelected || isHovered)} isSelected={isSelected} />

                {/* Rotation handle */}
                <RotationHandle
                    isVisible={!isEditing && (isHovered || isRotating)}
                    isRotating={isRotating}
                    onMouseDown={handleRotateStart}
                />

                {/* Resize handles */}
                <ResizeHandles
                    isHovered={isHovered}
                    isResizing={isResizing}
                    edgeProximity={edgeProximity}
                    hoveredEdge={hoveredEdge}
                    onResizeStart={handleResizeStart}
                    onEdgeEnter={setHoveredEdge}
                    onEdgeLeave={() => setHoveredEdge(null)}
                />

                {/* Content card */}
                <div
                    style={contentStyle}
                    data-note-id={element.id}
                    onMouseDown={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('a') || target.closest('input')) {
                            return;
                        }
                        handleContentMouseDown(e);
                    }}
                    onMouseMove={handleMouseMove}
                    onDoubleClick={handleDoubleClick}
                    className="markdown-note-overlay"
                >
                    <div ref={contentRef} style={{ width: '100%', height: '100%' }}>
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
                                    pointerEvents: 'auto',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    MozUserSelect: 'none',
                                    msUserSelect: 'none',
                                }}
                            >
                                <MarkdownPreview content={content} onCheckboxToggle={toggleCheckbox} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Scoped styles */}
                <style>{getMarkdownStyles()}</style>
            </div>
        );
    }
));

MarkdownNoteInner.displayName = 'MarkdownNoteInner';

/**
 * Exported MarkdownNote component with error boundary
 */
export const MarkdownNote = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(
    (props, ref) => (
        <ErrorBoundary>
            <MarkdownNoteInner {...props} ref={ref} />
        </ErrorBoundary>
    )
));

MarkdownNote.displayName = 'MarkdownNote';
