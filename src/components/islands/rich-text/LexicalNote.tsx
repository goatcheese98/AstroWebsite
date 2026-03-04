import React, { memo, forwardRef, useImperativeHandle, useCallback, useEffect, useState, useRef } from 'react';
import { applyLexicalHighlight, clearLexicalHighlight } from '@/components/canvas/noteSearchHighlight';
import { getOverlayZIndex } from '@/components/islands/overlay-utils';
import { ZoomHint } from '@/components/islands/ZoomHint';
import { useZoomHint } from '@/components/islands/useZoomHint';
import type { LexicalNoteProps, LexicalNoteRef } from './types';
import { DEFAULT_NOTE_STATE } from './types';
import { RichTextEditor } from './RichTextEditor';
import { getLexicalEditorStyles } from './themes/lexicalTheme';
import html2canvas from 'html2canvas';

const LexicalNoteInner = memo(forwardRef<LexicalNoteRef, LexicalNoteProps>(
    ({ element, appState, stackIndex = 0, onChange, onDeselect }, ref) => {
        const [lexicalState, setLexicalState] = useState(element.customData?.lexicalState || DEFAULT_NOTE_STATE);
        const [isDragging, setIsDragging] = useState(false);
        const searchRafRef = useRef<number | null>(null);
        const [backgroundOpacity, setBackgroundOpacity] = useState(element.customData?.backgroundOpacity ?? 1);
        const [blurAmount, setBlurAmount] = useState(element.customData?.blurAmount ?? 5);
        const contentRef = useRef<HTMLDivElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        // Update content when element changes (only if it differs from local state)
        useEffect(() => {
            const incomingState = element.customData?.lexicalState || DEFAULT_NOTE_STATE;
            if (incomingState !== lexicalState) {
                setLexicalState(incomingState);
            }
            if (element.customData?.backgroundOpacity !== undefined) {
                setBackgroundOpacity(element.customData.backgroundOpacity);
            }
            if (element.customData?.blurAmount !== undefined) {
                setBlurAmount(element.customData.blurAmount);
            }
        }, [element.customData?.lexicalState, element.customData?.backgroundOpacity, element.customData?.blurAmount, lexicalState]);

        // Determine theme - always light mode on canvas
        const isDark = false; // Canvas is always light mode

        // Check if element is selected in Excalidraw
        const isSelected = appState.selectedElementIds?.[element.id] === true;
        const { visible: zoomHintVisible } = useZoomHint(containerRef, isSelected);

        // Calculate screen center position
        const zoom = appState.zoom.value;
        const screenCenterX = (element.x + element.width / 2 + appState.scrollX) * zoom;
        const screenCenterY = (element.y + element.height / 2 + appState.scrollY) * zoom;

        // Match Excalidraw corner rounding and keep content inset from stroke edges
        const borderRadius = (() => {
            if (!element.roundness) return 0;
            if (element.roundness.type === 3) return Math.min(element.width, element.height) * 0.25;
            if (element.roundness.type === 2) return element.roundness.value ?? 32;
            return 0;
        })();
        const roughnessInset = Math.round((element.roughness ?? 0) * 2 + (element.strokeWidth ?? 1) * 0.5);
        const contentInset = Math.max(0, Math.min(6, roughnessInset));
        const clampedRadius = Math.max(0, borderRadius - contentInset);

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
            zIndex: getOverlayZIndex(isSelected, false, stackIndex),
        };

        // Clip wrapper no longer has overflow:hidden - moved to content only
        // This allows toolbar to extend beyond the rounded corners
        const clipWrapperStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            padding: `${contentInset}px`,
            borderRadius: `${clampedRadius}px`,
            // overflow: 'hidden' removed - now applied only to content area
        };

        // Content card style - visual layer
        // overflow: 'hidden' is applied here to clip the editor content
        // but NOT the toolbar which is rendered before this container
        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            color: isDark ? '#e5e5e5' : '#1a1a1a',
            borderRadius: 0,
            padding: 0,
            overflow: 'hidden',
            isolation: 'isolate',
            boxShadow: isSelected
                ? '0 0 0 2px #6366f1, 0 10px 40px -10px rgba(0,0,0,0.5)'
                : 'none',
            pointerEvents: isSelected ? 'auto' : 'none',
            userSelect: isSelected ? 'auto' : 'none',
            WebkitUserSelect: isSelected ? 'auto' : 'none',
            cursor: isSelected ? 'text' : 'default',
            outline: 'none',
            transition: 'all 0.2s ease',
            backdropFilter: backgroundOpacity < 1 ? `blur(${blurAmount}px)` : 'none',
            WebkitBackdropFilter: backgroundOpacity < 1 ? `blur(${blurAmount}px)` : 'none',
            display: 'flex',
            flexDirection: 'column',
        };

        // Manual dragging support
        const handleMouseDown = useCallback((e: React.MouseEvent) => {
            if (!isSelected) return;
            setIsDragging(true);

            const handleMouseUp = () => {
                setIsDragging(false);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            document.addEventListener('mouseup', handleMouseUp);
        }, [isSelected]);

        // Handle content update
        const updateContent = useCallback((updates: { lexicalState?: string; backgroundOpacity?: number; blurAmount?: number }) => {
            if (updates.lexicalState !== undefined) {
                setLexicalState(updates.lexicalState);
            }
            if (updates.backgroundOpacity !== undefined) {
                setBackgroundOpacity(updates.backgroundOpacity);
            }
            if (updates.blurAmount !== undefined) {
                setBlurAmount(updates.blurAmount);
            }
            onChange(element.id, updates);
        }, [element.id, onChange]);

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

        // Listen for search highlight events.
        // Uses CSS Custom Highlight API — zero DOM mutations, so Lexical's
        // MutationObserver never fires and won't revert the highlights.
        useEffect(() => {
            const handleHighlight = (e: Event) => {
                const { elementId, query, matchIndex = 0 } = (e as CustomEvent<{ elementId: string; query: string; matchIndex?: number }>).detail;
                if (elementId !== element.id) return;
                if (searchRafRef.current !== null) cancelAnimationFrame(searchRafRef.current);
                // One rAF to let Lexical finish its current paint cycle
                searchRafRef.current = requestAnimationFrame(() => {
                    searchRafRef.current = null;
                    if (!contentRef.current) return;
                    const editorContent = (contentRef.current.querySelector('.editor-content-wrapper') as HTMLElement | null)
                        ?? contentRef.current;
                    const targetRange = applyLexicalHighlight(editorContent, query, matchIndex);
                    // Scroll to target match inside the editor content wrapper
                    if (targetRange) {
                        const rect = targetRange.getBoundingClientRect();
                        const wrapperRect = editorContent.getBoundingClientRect();
                        if (rect.top < wrapperRect.top || rect.bottom > wrapperRect.bottom) {
                            editorContent.scrollTop += rect.top - wrapperRect.top - editorContent.clientHeight / 2;
                        }
                    }
                });
            };
            const handleClear = () => {
                if (searchRafRef.current !== null) {
                    cancelAnimationFrame(searchRafRef.current);
                    searchRafRef.current = null;
                }
                clearLexicalHighlight();
            };
            window.addEventListener('canvas:note-search-highlight', handleHighlight);
            window.addEventListener('canvas:note-search-clear', handleClear);
            return () => {
                window.removeEventListener('canvas:note-search-highlight', handleHighlight);
                window.removeEventListener('canvas:note-search-clear', handleClear);
                if (searchRafRef.current !== null) cancelAnimationFrame(searchRafRef.current);
                clearLexicalHighlight();
            };
        }, [element.id]);

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

        // Update transform directly on DOM
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

        useEffect(() => {
            const handleEscapeToDeselect = (event: KeyboardEvent) => {
                if (event.key !== 'Escape') return;
                if (!isSelected) return;
                onDeselect?.();
            };

            window.addEventListener('keydown', handleEscapeToDeselect, true);
            return () => window.removeEventListener('keydown', handleEscapeToDeselect, true);
        }, [isSelected, onDeselect]);

        return (
            <div
                ref={containerRef}
                style={containerStyle}
                className="lexical-note-container"
                data-lexical-id={element.id}
            >
                {/* Toolbar area - OUTSIDE the clip wrapper so it's not clipped by borderRadius */}
                {isSelected && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '-46px', // Position above the note
                            left: '0',
                            right: '0',
                            height: '44px',
                            zIndex: 100,
                            pointerEvents: 'auto',
                            display: 'flex',
                            justifyContent: 'flex-start',
                            padding: '0 4px',
                        }}
                        data-lexical-toolbar={element.id}
                    >
                        <div 
                            style={{
                                background: isDark ? 'rgba(26, 26, 26, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                                borderRadius: '8px',
                                boxShadow: isDark 
                                    ? '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
                                    : '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                fontSize: '13px',
                                color: isDark ? '#e5e5e5' : '#333',
                            }}
                        >
                            {/* Toolbar will be rendered here via portal from RichTextEditor */}
                            <div id={`toolbar-portal-${element.id}`} style={{ display: 'flex', alignItems: 'center', gap: '2px' }} />
                        </div>
                    </div>
                )}
                <div style={clipWrapperStyle} data-lexical-id={element.id}>
                    <div
                        ref={contentRef}
                        style={contentStyle}
                        data-lexical-id={element.id}
                        onMouseDown={handleMouseDown}
                    >
                        <RichTextEditor
                            initialState={lexicalState}
                            onChange={updateContent}
                            isDark={isDark}
                            isScrollMode={true}
                            showToolbar={isSelected}
                            toolbarPortalId={`toolbar-portal-${element.id}`}
                            autoFocus={false}
                            transparent={false}
                            onEscape={onDeselect}
                            backgroundOpacity={backgroundOpacity}
                            onBackgroundOpacityChange={(val) => updateContent({ backgroundOpacity: val })}
                            blurAmount={blurAmount}
                            onBlurAmountChange={(val) => updateContent({ blurAmount: val })}
                            backgroundColor={element.backgroundColor}
                            fillStyle={element.fillStyle}
                            elementOpacity={element.opacity}
                            strokeColor="transparent"
                            strokeWidth={0}
                            strokeStyle={element.strokeStyle}
                        />
                    </div>
                </div>
                <ZoomHint visible={zoomHintVisible} />
            </div>
        );
    }
));

LexicalNoteInner.displayName = 'LexicalNoteInner';

export const LexicalNote = memo(forwardRef<LexicalNoteRef, LexicalNoteProps>(
    (props, ref) => <LexicalNoteInner {...props} ref={ref} />
));

LexicalNote.displayName = 'LexicalNote';
