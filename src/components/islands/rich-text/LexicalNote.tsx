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
    ({ element, appState, onChange, onDeselect }, ref) => {
        const [lexicalState, setLexicalState] = useState(element.customData?.lexicalState || '');
        const [isDragging, setIsDragging] = useState(false);
        const [backgroundOpacity, setBackgroundOpacity] = useState(element.customData?.backgroundOpacity ?? 1);
        const [blurAmount, setBlurAmount] = useState(element.customData?.blurAmount ?? 5);
        const contentRef = useRef<HTMLDivElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        // Update content when element changes (only if it differs from local state)
        useEffect(() => {
            const incomingState = element.customData?.lexicalState || '';
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
            zIndex: isSelected ? 3 : 2,
        };

        // Content card style - visual layer
        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            color: isDark ? '#e5e5e5' : '#1a1a1a',
            borderRadius: '8px',
            padding: 0,
            overflow: 'hidden',
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

        return (
            <div
                ref={containerRef}
                style={containerStyle}
                className="lexical-note-container"
                data-lexical-id={element.id}
            >
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
                        showToolbar={true}
                        autoFocus={false}
                        transparent={!isSelected}
                        onEscape={onDeselect}
                        backgroundOpacity={backgroundOpacity}
                        onBackgroundOpacityChange={(val) => updateContent({ backgroundOpacity: val })}
                        blurAmount={blurAmount}
                        onBlurAmountChange={(val) => updateContent({ blurAmount: val })}
                        backgroundColor={element.backgroundColor}
                        fillStyle={element.fillStyle}
                        elementOpacity={element.opacity}
                        strokeColor={element.strokeColor}
                        strokeWidth={element.strokeWidth}
                        strokeStyle={element.strokeStyle}
                    />
                </div>
            </div>
        );
    }
));

LexicalNoteInner.displayName = 'LexicalNoteInner';

export const LexicalNote = memo(forwardRef<LexicalNoteRef, LexicalNoteProps>(
    (props, ref) => <LexicalNoteInner {...props} ref={ref} />
));

LexicalNote.displayName = 'LexicalNote';

