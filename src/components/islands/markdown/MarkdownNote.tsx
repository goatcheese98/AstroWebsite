import React, { memo, forwardRef, useImperativeHandle, useCallback, useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
import { applySearchHighlights, clearSearchHighlights } from '@/components/canvas/noteSearchHighlight';
import { useCommandSubscriber } from '@/stores';
import { MarkdownEditor, MarkdownPreview } from './components';
import { HybridMarkdownEditor } from './HybridMarkdownEditor';
import { getMarkdownStyles } from './styles/markdownStyles';
import { prewarmImageCache } from './utils/markdownMedia';
import type { MarkdownNoteProps, MarkdownNoteRef, MarkdownNoteSettings } from './types';
import { DEFAULT_NOTE_SETTINGS } from './types';
import { getOverlayZIndex } from '@/components/islands/overlay-utils';
import {
    getExcalidrawCornerRadius,
    getExcalidrawFontFamily,
    getExcalidrawSurfaceStyle,
} from '@/components/islands/excalidraw-element-style';
import { ZoomHint } from '@/components/islands/ZoomHint';
import { useZoomHint } from '@/components/islands/useZoomHint';
import html2canvas from 'html2canvas';

const MarkdownNoteInner = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(
    ({ element, appState, stackIndex = 0, onChange }, ref) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editMode, setEditMode] = useState<'raw' | 'hybrid'>('raw');
        const [content, setContent] = useState(element.customData?.content || '');
        const [images, setImages] = useState<Record<string, string>>(element.customData?.images || {});
        const [settings, setSettings] = useState<MarkdownNoteSettings>(() => {
            if (element.customData?.settings) return element.customData.settings;
            try {
                const saved = localStorage.getItem('md-note-defaults');
                if (saved) return { ...DEFAULT_NOTE_SETTINGS, ...JSON.parse(saved) };
            } catch { /* ignore */ }
            return DEFAULT_NOTE_SETTINGS;
        });
        const [showSettings, setShowSettings] = useState(false);

        // Pre-warm the blob URL cache during render so ImageRenderer gets instant src on first paint
        useMemo(() => { if (Object.keys(images).length > 0) prewarmImageCache(images); }, [images]);

        const [searchHighlight, setSearchHighlight] = useState<{ query: string; matchIndex: number } | null>(null);
        const hasMarksRef = useRef(false);
        const contentRef = useRef<HTMLDivElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        // Update content/images when element changes (e.g. collab sync)
        useEffect(() => {
            setContent(element.customData?.content || '');
        }, [element.customData?.content]);
        useEffect(() => {
            setImages(element.customData?.images || {});
        }, [element.customData?.images]);
        useEffect(() => {
            if (element.customData?.settings) setSettings(element.customData.settings);
        }, [element.customData?.settings]);

        const width = element.width;
        const height = element.height;
        const angle = element.angle || 0;

        // Determine theme - always light mode on canvas
        const isDark = false; // Canvas is always light mode
        const excalidrawFontFamily = getExcalidrawFontFamily(element.fontFamily);

        const borderRadius = getExcalidrawCornerRadius(
            element.width,
            element.height,
            element.roundness,
        );

        // Check if element is selected in Excalidraw
        const isSelected = appState.selectedElementIds?.[element.id] === true;
        const isInteractive = isEditing || isSelected;
        const { visible: zoomHintVisible } = useZoomHint(
          containerRef,
          isSelected && !isEditing,
          isSelected,
        );

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
            zIndex: getOverlayZIndex(isSelected, isEditing, stackIndex),
        };

        // Clip wrapper — handles shape matching (overflow:hidden + borderRadius) without creating
        // a scroll container, which would produce visible border-radius paint artifacts.
        const clipWrapperStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: `${borderRadius}px`,
            boxSizing: 'border-box',
            ...getExcalidrawSurfaceStyle({
                backgroundColor: element.backgroundColor,
                strokeColor: element.strokeColor,
                strokeWidth: element.strokeWidth,
                strokeStyle: element.strokeStyle,
                fillStyle: element.fillStyle,
                opacity: element.opacity,
            }),
            boxShadow: isSelected
                ? '0 10px 20px -3px rgba(129, 140, 248, 0.4)'
                : isDark
                    ? '0 4px 12px -1px rgba(0, 0, 0, 0.5)'
                    : '0 4px 8px -1px rgba(0, 0, 0, 0.1)',
        };

        // Content card style — scroll container, no border-radius to avoid paint artifacts
        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            color: isDark ? '#e5e5e5' : '#1a1a1a',
            padding: 0,
            overflow: 'auto',
            overscrollBehavior: 'contain',
            isolation: 'isolate',
            pointerEvents: isInteractive ? 'auto' : 'none',
            // Prevent text selection and interaction when not editing/scrolling
            userSelect: isEditing ? 'auto' : 'none',
            WebkitUserSelect: isEditing ? 'auto' : 'none',
            cursor: isEditing ? 'text' : 'default',
            outline: 'none',
        };

        // Enter edit mode
        const enterEditMode = useCallback((mode: 'raw' | 'hybrid' = 'raw') => {
            setEditMode(mode);
            setIsEditing(true);
        }, []);

        const deselectAll = useCallback(() => {
            const excalidrawAPI = (window as any).excalidrawAPI;
            if (!excalidrawAPI) return;
            excalidrawAPI.updateScene({ appState: { selectedElementIds: {} } });
        }, []);

        // Add an image to local state; it will be saved together with content on exit
        const handleImageAdd = useCallback((id: string, dataUrl: string) => {
            setImages(prev => ({ ...prev, [id]: dataUrl }));
        }, []);

        // Exit edit mode and save
        const exitEditMode = useCallback(() => {
            setIsEditing(false);
            setShowSettings(false);
            setEditMode('raw'); // Reset to raw for next time
            onChange(element.id, content, images, settings);
        }, [content, images, settings, element.id, onChange]);

        // Handle content update
        const updateContent = useCallback((value: string) => {
            setContent(value);
        }, []);

        // Handle keyboard shortcuts
        const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                exitEditMode();
                deselectAll();
            }
        }, [exitEditMode, deselectAll]);

        // Listen for edit command from store
        useCommandSubscriber({
            onMarkdownEdit: (data) => {
                if (!isEditing && data.elementId === element.id) {
                    enterEditMode(data.mode);
                }
            },
        });


        // Hit test helper
        const isPointInNote = useCallback((clientX: number, clientY: number) => {
            if (!containerRef.current) return { inNote: false };

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

            return { inNote };
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

            document.addEventListener('dblclick', handleGlobalDblClick, true);

            return () => {
                document.removeEventListener('dblclick', handleGlobalDblClick, true);
            };
        }, [isEditing, enterEditMode, isPointInNote]);

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
                }
            };

            document.addEventListener('click', handleClickOutside, true);

            return () => {
                document.removeEventListener('click', handleClickOutside, true);
            };
        }, [isEditing, isPointInNote, exitEditMode]);

        useEffect(() => {
            const handleEscapeToDeselect = (event: KeyboardEvent) => {
                if (event.key !== 'Escape') return;
                if (!isSelected) return;

                if (isEditing) {
                    exitEditMode();
                }
                deselectAll();
            };

            window.addEventListener('keydown', handleEscapeToDeselect, true);
            return () => window.removeEventListener('keydown', handleEscapeToDeselect, true);
        }, [isSelected, isEditing, exitEditMode, deselectAll]);

        // Touch handlers for pinch zoom pass-through
        const handleTouchStart = useCallback((e: React.TouchEvent) => {
            if (isEditing) return;
            if (e.touches.length > 1) {
                return;
            }
        }, [isEditing]);

        // Listen for search highlight events
        useEffect(() => {
            const handleHighlight = (e: Event) => {
                const { elementId, query, matchIndex = 0 } = (e as CustomEvent<{ elementId: string; query: string; matchIndex?: number }>).detail;
                if (elementId !== element.id) return;
                setSearchHighlight({ query, matchIndex });
            };
            const handleClear = () => setSearchHighlight(null);
            window.addEventListener('canvas:note-search-highlight', handleHighlight);
            window.addEventListener('canvas:note-search-clear', handleClear);
            return () => {
                window.removeEventListener('canvas:note-search-highlight', handleHighlight);
                window.removeEventListener('canvas:note-search-clear', handleClear);
            };
        }, [element.id]);

        // Re-apply search highlights when content or search query changes.
        // MarkdownPreview is React.memo so its DOM is only rebuilt when content/isDark/toggle changes.
        useLayoutEffect(() => {
            if (!contentRef.current) return;
            if (hasMarksRef.current) {
                clearSearchHighlights(contentRef.current);
                hasMarksRef.current = false;
            }
            if (searchHighlight) {
                applySearchHighlights(contentRef.current, searchHighlight.query, searchHighlight.matchIndex);
                hasMarksRef.current = true;
            }
        }, [searchHighlight, content, isEditing]);

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
            onChange(element.id, newContent, images, settings);
        }, [content, images, settings, element.id, onChange]);

        return (
            <div
                ref={containerRef}
                style={containerStyle}
                className="markdown-note-container"
                data-note-id={element.id}
                onTouchStart={handleTouchStart}
            >
                {/* Clip wrapper - matches Excalidraw element shape (borderRadius + roughness inset) */}
                <div style={clipWrapperStyle} data-note-id={element.id}>
                {/* Content card - scroll container only, no borderRadius to avoid paint artifacts */}
                <div
                    ref={contentRef}
                    style={contentStyle}
                >
                    {isEditing ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            {/* Top-right toolbar */}
                            <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 1000, display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {/* Settings button — only in pretty mode */}
                                {editMode === 'hybrid' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowSettings(v => !v); }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        title="Appearance"
                                        style={{
                                            width: 28, height: 28, padding: 0,
                                            borderRadius: '8px',
                                            border: showSettings ? '1.5px solid #6366f1' : '1.5px solid rgba(0,0,0,0.10)',
                                            background: showSettings ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.9)',
                                            color: showSettings ? '#6366f1' : '#9ca3af',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            backdropFilter: 'blur(8px)',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                                            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                                            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                                            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                                        </svg>
                                    </button>
                                )}
                                {/* Mode toggle */}
                                <button
                                    onClick={() => { setEditMode(prev => prev === 'raw' ? 'hybrid' : 'raw'); setShowSettings(false); }}
                                    style={{
                                        padding: '4px 12px', borderRadius: '12px', border: 'none',
                                        background: editMode === 'raw' ? '#818cf8' : '#6366f1',
                                        color: 'white', fontSize: '11px', fontWeight: 600,
                                        cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                                        transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                                    }}
                                >
                                    {editMode === 'raw' ? '✨ Pretty' : '📄 Raw'}
                                </button>
                            </div>

                            {/* Settings panel */}
                            {showSettings && editMode === 'hybrid' && (
                                <div
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute', top: 44, right: 8,
                                        width: 220, background: '#ffffff',
                                        borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.10)',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                                        padding: '12px', zIndex: 1001,
                                        fontFamily: 'system-ui, sans-serif',
                                    }}
                                >
                                    {/* Font family */}
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Font</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            {([
                                                { id: 'inherit', label: 'Default', family: 'system-ui, sans-serif' },
                                                { id: 'Georgia, serif', label: 'Serif', family: 'Georgia, serif' },
                                                { id: '"DM Sans", system-ui, sans-serif', label: 'DM Sans', family: '"DM Sans", system-ui, sans-serif' },
                                                { id: '"Playfair Display", Georgia, serif', label: 'Playfair', family: '"Playfair Display", Georgia, serif' },
                                                { id: '"SF Mono", monospace', label: 'Mono', family: 'monospace' },
                                            ] as const).map(f => (
                                                <button key={f.id} onClick={() => setSettings(s => ({ ...s, font: f.id }))}
                                                    style={{
                                                        padding: '4px 9px', border: settings.font === f.id ? '1.5px solid #6366f1' : '1.5px solid rgba(0,0,0,0.09)',
                                                        borderRadius: 6, background: settings.font === f.id ? 'rgba(99,102,241,0.07)' : 'transparent',
                                                        cursor: 'pointer', fontFamily: f.family, fontSize: 12,
                                                        fontWeight: settings.font === f.id ? 700 : 400,
                                                        color: settings.font === f.id ? '#6366f1' : '#374151', textAlign: 'left', transition: 'all 0.1s',
                                                    }}
                                                >{f.label}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 10 }} />

                                    {/* Font size */}
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Font Size</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) }))} disabled={settings.fontSize <= 10}
                                                style={{ width: 26, height: 26, border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 6, background: 'transparent', cursor: settings.fontSize <= 10 ? 'default' : 'pointer', fontSize: 15, color: settings.fontSize <= 10 ? '#d1d5db' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
                                            <span style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#374151' }}>{settings.fontSize}px</span>
                                            <button onClick={() => setSettings(s => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) }))} disabled={settings.fontSize >= 24}
                                                style={{ width: 26, height: 26, border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 6, background: 'transparent', cursor: settings.fontSize >= 24 ? 'default' : 'pointer', fontSize: 15, color: settings.fontSize >= 24 ? '#d1d5db' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
                                        </div>
                                    </div>

                                    <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 10 }} />

                                    {/* Line height */}
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Line Spacing</div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {([{ id: 1.4, label: 'Tight' }, { id: 1.65, label: 'Normal' }, { id: 2.0, label: 'Loose' }] as const).map(lh => (
                                                <button key={lh.id} onClick={() => setSettings(s => ({ ...s, lineHeight: lh.id }))}
                                                    style={{
                                                        flex: 1, padding: '4px 0', border: settings.lineHeight === lh.id ? '1.5px solid #6366f1' : '1.5px solid rgba(0,0,0,0.09)',
                                                        borderRadius: 6, background: settings.lineHeight === lh.id ? 'rgba(99,102,241,0.07)' : 'transparent',
                                                        cursor: 'pointer', fontSize: 11, fontWeight: settings.lineHeight === lh.id ? 700 : 400,
                                                        color: settings.lineHeight === lh.id ? '#6366f1' : '#6b7280', transition: 'all 0.1s',
                                                    }}
                                                >{lh.label}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 10 }} />

                                    {/* Set as Default */}
                                    <button
                                        onClick={() => {
                                            try { localStorage.setItem('md-note-defaults', JSON.stringify(settings)); } catch { /* ignore */ }
                                        }}
                                        style={{
                                            width: '100%', padding: '6px 0',
                                            border: '1.5px solid rgba(0,0,0,0.09)', borderRadius: 7,
                                            background: 'transparent', cursor: 'pointer',
                                            fontSize: 12, fontWeight: 600, color: '#6b7280',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.09)'; e.currentTarget.style.color = '#6b7280'; }}
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                        Set as Default
                                    </button>
                                </div>
                            )}

                            {editMode === 'hybrid' ? (
                                <HybridMarkdownEditor
                                    content={content}
                                    onChange={updateContent}
                                    isDark={isDark}
                                    isScrollMode={true}
                                    images={images}
                                    settings={settings}
                                    baseFontFamily={excalidrawFontFamily}
                                />
                            ) : (
                                <div style={{
                                    padding: '40px 20px 20px', width: '100%', height: '100%',
                                    boxSizing: 'border-box', overflow: 'auto',
                                    fontFamily: settings.font !== 'inherit' ? settings.font : excalidrawFontFamily,
                                    fontSize: settings.fontSize,
                                    lineHeight: settings.lineHeight,
                                }}>
                                    <MarkdownEditor
                                        value={content}
                                        onChange={updateContent}
                                        onBlur={() => { }}
                                        onKeyDown={handleKeyDown}
                                        onImageAdd={handleImageAdd}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            className="markdown-preview-frame"
                            style={{
                                padding: '18px 22px',
                                paddingTop: '38px',
                                paddingBottom: '18px',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                width: '100%',
                                height: '100%',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                                fontFamily: settings.font !== 'inherit' ? settings.font : excalidrawFontFamily,
                                fontSize: settings.fontSize,
                                lineHeight: settings.lineHeight,
                                backgroundColor: 'transparent',
                            }}
                        >
                            <MarkdownPreview
                                content={content}
                                onCheckboxToggle={toggleCheckbox}
                                isDark={isDark}
                                images={images}
                                settings={settings}
                            />
                        </div>
                    )}
                </div>
                </div>{/* end clip wrapper */}

                {/* Scoped styles */}
                <style>{getMarkdownStyles()}</style>
                <ZoomHint visible={zoomHintVisible} />
            </div>
        );
    }
));

MarkdownNoteInner.displayName = 'MarkdownNoteInner';

export const MarkdownNote = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(
    (props, ref) => <MarkdownNoteInner {...props} ref={ref} />
));

MarkdownNote.displayName = 'MarkdownNote';
