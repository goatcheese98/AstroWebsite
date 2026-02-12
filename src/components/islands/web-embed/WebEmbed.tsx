/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    🌐 WebEmbed.tsx                                           ║
 * ║                    "The Interactive Web Viewer"                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Simple web embed with:
 * - Click-through when not selected (scroll passes to canvas)
 * - Interaction only when selected
 * - Simple URL display (no navigation history - CORS blocks it)
 * - Red X to close
 */

import React, { memo, forwardRef, useImperativeHandle, useCallback, useState, useRef, useEffect } from 'react';
import { enhanceUrl, isKnownEmbeddable, RELIABLE_EMBED_SITES } from '@/lib/web-embed-utils';

export interface WebEmbedProps {
    element: any;
    appState: any;
    onChange: (elementId: string, url: string) => void;
    onPositionChange?: (elementId: string, x: number, y: number) => void;
    onDelete?: (elementId: string) => void;
}

export interface WebEmbedRef {
    exportAsImage: () => Promise<{ imageData: string; position: any }>;
    updateTransform: (x: number, y: number, width: number, height: number, angle: number, zoom: number, scrollX: number, scrollY: number) => void;
}

const WebEmbedInner = memo(forwardRef<WebEmbedRef, WebEmbedProps>(
    ({ element, appState, onChange, onPositionChange, onDelete }, ref) => {
        const [isLoading, setIsLoading] = useState(true);
        const [hasError, setHasError] = useState(false);
        const [urlInput, setUrlInput] = useState(element.customData?.url || '');
        const [isEditing, setIsEditing] = useState(!element.customData?.url);
        const [isDragging, setIsDragging] = useState(false);
        const [showFallback, setShowFallback] = useState(false);
        const [currentUrl, setCurrentUrl] = useState('');
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const dragStartRef = useRef<{ x: number; y: number; elementX: number; elementY: number } | null>(null);

        const rawUrl = element.customData?.url || '';
        const isSelected = appState.selectedElementIds?.[element.id] === true;

        // Helper to select this element in Excalidraw
        const selectElement = useCallback(() => {
            if (isSelected) return;
            const excalidrawAPI = (window as any).excalidrawAPI;
            if (excalidrawAPI) {
                const currentElements = excalidrawAPI.getSceneElements();
                excalidrawAPI.updateScene({
                    elements: currentElements,
                    appState: {
                        selectedElementIds: { [element.id]: true },
                    },
                });
            }
        }, [isSelected, element.id]);

        // Get embed-friendly URL
        const { url: processedUrl, isSearch, embedUrl, warning } = rawUrl ? enhanceUrl(rawUrl) : { url: '', isSearch: false };
        const displayUrl = embedUrl || processedUrl;
        const isReliableEmbed = isKnownEmbeddable(processedUrl);
        const hasWarning = !!warning;

        // Initialize and update current URL display
        useEffect(() => {
            if (processedUrl) {
                setCurrentUrl(processedUrl);
            }
        }, [processedUrl]);

        // Calculate screen position
        const zoom = appState.zoom.value;
        const screenCenterX = (element.x + element.width / 2 + appState.scrollX) * zoom;
        const screenCenterY = (element.y + element.height / 2 + appState.scrollY) * zoom;

        const containerStyle: React.CSSProperties = {
            position: 'absolute',
            top: `${screenCenterY - element.height / 2}px`,
            left: `${screenCenterX - element.width / 2}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            pointerEvents: 'none',
            zIndex: isDragging ? 100 : (isEditing ? 10 : (isSelected ? 3 : 2)),
        };

        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: isSelected
                ? '0 0 0 2px #6366f1, 0 10px 20px -3px rgba(0, 0, 0, 0.2)'
                : '0 4px 12px -1px rgba(0, 0, 0, 0.15)',
            // Keep pointer-events none to allow scroll/zoom to pass through
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
        };

        const handleLoad = useCallback(() => {
            setIsLoading(false);
            setHasError(false);
            setShowFallback(false);
        }, []);

        const handleError = useCallback(() => {
            setIsLoading(false);
            if (isReliableEmbed) {
                setHasError(true);
            } else {
                setShowFallback(true);
            }
        }, [isReliableEmbed]);

        const handleSubmit = useCallback(() => {
            const result = enhanceUrl(urlInput);

            if (!result.url) {
                alert('Invalid URL');
                return;
            }

            onChange(element.id, urlInput.trim());
            setIsEditing(false);
            setIsLoading(true);
            setHasError(false);
            setShowFallback(false);
        }, [urlInput, element.id, onChange]);

        const handleEdit = useCallback(() => {
            setIsEditing(true);
            setUrlInput(rawUrl);
        }, [rawUrl]);

        // Close button: Delete the element
        const handleClose = useCallback(() => {
            if (onDelete) {
                onDelete(element.id);
            } else {
                const excalidrawAPI = (window as any).excalidrawAPI;
                if (excalidrawAPI) {
                    const currentElements = excalidrawAPI.getSceneElements();
                    excalidrawAPI.updateScene({
                        elements: currentElements.filter((el: any) => el.id !== element.id),
                    });
                }
            }
        }, [element.id, onDelete]);

        const handleRefresh = useCallback(() => {
            if (iframeRef.current) {
                setIsLoading(true);
                setHasError(false);
                setShowFallback(false);
                iframeRef.current.src = iframeRef.current.src;
            }
        }, []);

        // Drag handlers
        const handleMouseDown = useCallback((e: React.MouseEvent) => {
            if (isEditing) return;

            setIsDragging(true);
            dragStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                elementX: element.x,
                elementY: element.y,
            };

            e.preventDefault();
            e.stopPropagation();
        }, [isEditing, element.x, element.y]);

        // Global drag handling
        useEffect(() => {
            if (!isDragging) return;

            const handleMouseMove = (e: MouseEvent) => {
                if (!dragStartRef.current) return;

                const dx = (e.clientX - dragStartRef.current.x) / zoom;
                const dy = (e.clientY - dragStartRef.current.y) / zoom;

                const newX = dragStartRef.current.elementX + dx;
                const newY = dragStartRef.current.elementY + dy;

                if (onPositionChange) {
                    onPositionChange(element.id, newX, newY);
                }
            };

            const handleMouseUp = () => {
                setIsDragging(false);
                dragStartRef.current = null;
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }, [isDragging, zoom, element.id, onPositionChange]);

        const exportAsImage = useCallback(async () => {
            return {
                imageData: '',
                position: {
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                    angle: element.angle || 0,
                },
            };
        }, [element]);

        // Update transform directly on DOM (bypasses React for smooth sync)
        const updateTransform = useCallback((x: number, y: number, width: number, height: number, angle: number, zoom: number, scrollX: number, scrollY: number) => {
            if (!containerRef.current) return;

            // Calculate screen center position using passed-in values (all from same frame)
            const screenCenterX = (x + width / 2 + scrollX) * zoom;
            const screenCenterY = (y + height / 2 + scrollY) * zoom;

            // Apply transform directly to DOM
            const container = containerRef.current;
            container.style.top = `${screenCenterY - height / 2}px`;
            container.style.left = `${screenCenterX - width / 2}px`;
            container.style.width = `${width}px`;
            container.style.height = `${height}px`;
            container.style.transform = `scale(${zoom})`;
        }, []); // No dependencies - uses only passed parameters

        useImperativeHandle(ref, () => ({
            exportAsImage,
            updateTransform
        }), [exportAsImage, updateTransform]);

        const getDomain = (url: string) => {
            try {
                return new URL(url).hostname;
            } catch {
                return url;
            }
        };

        // Listen for URL changes in iframe (via postMessage when available)
        useEffect(() => {
            const handleMessage = (event: MessageEvent) => {
                // Accept messages from any origin (for embedded content)
                // Check if it's a navigation message
                if (event.data && typeof event.data === 'object') {
                    if (event.data.type === 'iframe-navigation' && event.data.url) {
                        setCurrentUrl(event.data.url);
                    }
                }
            };

            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }, []);

        // Try to track URL changes via iframe (limited by CORS)
        useEffect(() => {
            if (!iframeRef.current) return;

            const checkUrl = setInterval(() => {
                try {
                    // This will fail for cross-origin iframes due to CORS
                    const iframeWindow = iframeRef.current?.contentWindow;
                    if (iframeWindow && iframeWindow.location.href) {
                        const newUrl = iframeWindow.location.href;
                        if (newUrl !== currentUrl && !newUrl.startsWith('about:')) {
                            setCurrentUrl(newUrl);
                        }
                    }
                } catch (e) {
                    // Expected error for cross-origin iframes - silently ignore
                }
            }, 1000);

            return () => clearInterval(checkUrl);
        }, [currentUrl]);

        // Selection event for AI
        useEffect(() => {
            if (isSelected && processedUrl) {
                window.dispatchEvent(new CustomEvent('webembed:selected', {
                    detail: { elementId: element.id, url: currentUrl || processedUrl, title: rawUrl },
                }));
            }
        }, [isSelected, currentUrl, processedUrl, rawUrl, element.id]);

        return (
            <div
                ref={containerRef}
                style={containerStyle}
                className="web-embed-container"
                data-embed-id={element.id}
            >
                <div style={contentStyle}>
                    {/* Header bar - draggable */}
                    <div
                        onMouseDown={handleMouseDown}
                        onClick={selectElement}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: isDragging ? '#e0e7ff' : '#f8f9fa',
                            borderBottom: '1px solid #e5e7eb',
                            gap: '8px',
                            cursor: isDragging ? 'grabbing' : (isSelected ? 'grab' : 'default'),
                            userSelect: 'none',
                            // Always enable pointer events on header for click-to-select
                            pointerEvents: 'auto',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            onMouseDown={(e) => e.stopPropagation()}
                            title="Close embed"
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: '#ef4444',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3">
                                <line x1="6" y1="6" x2="18" y2="18" />
                                <line x1="6" y1="18" x2="18" y2="6" />
                            </svg>
                        </button>

                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />

                        {/* URL display or input */}
                        {isEditing ? (
                            <div style={{ flex: 1, display: 'flex', gap: '8px', minWidth: 0 }}>
                                <input
                                    type="text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSubmit();
                                        if (e.key === 'Escape') setIsEditing(false);
                                    }}
                                    placeholder="URL or search..."
                                    style={{
                                        flex: 1,
                                        padding: '4px 8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        outline: 'none',
                                        minWidth: 0,
                                    }}
                                    autoFocus
                                />
                                <button onClick={handleSubmit} onMouseDown={(e) => e.stopPropagation()} style={{
                                    padding: '4px 12px',
                                    background: '#6366f1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                }}>
                                    Go
                                </button>
                            </div>
                        ) : (
                            <>
                                <div
                                    onDoubleClick={handleEdit}
                                    style={{
                                        flex: 1,
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'text',
                                        minWidth: 0,
                                    }}
                                    title={`Double-click to edit - Current URL: ${currentUrl || processedUrl}`}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                    </svg>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {isSearch ? `🔍 ${rawUrl}` : (currentUrl || processedUrl)}
                                    </span>
                                </div>
                                <button onClick={handleRefresh} onMouseDown={(e) => e.stopPropagation()} title="Refresh" style={{
                                    padding: '4px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    flexShrink: 0,
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23 4 23 10 17 10" />
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                </button>
                                <button onClick={handleEdit} onMouseDown={(e) => e.stopPropagation()} title="Edit URL" style={{
                                    padding: '4px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    flexShrink: 0,
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Content area */}
                    <div style={{
                        flex: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        // Keep disabled to allow scroll/zoom pass-through - iframe opens in new tab for interaction
                        pointerEvents: 'none',
                    }}>

                        {isEditing ? (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f9fafb',
                                color: '#9ca3af',
                                gap: '12px',
                                padding: '20px',
                            }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                                <div style={{ fontSize: '14px' }}>Enter a website URL</div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
                                    Try: youtube.com/watch?v=..., en.wikipedia.org/wiki/..., figma.com
                                </div>
                            </div>
                        ) : hasWarning ? (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#fef3c7',
                                color: '#92400e',
                                gap: '16px',
                                padding: '24px',
                                textAlign: 'center',
                            }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#78350f', marginBottom: '8px' }}>
                                        This site can't be embedded
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#92400e', maxWidth: '320px', lineHeight: 1.6 }}>
                                        {warning}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <a
                                        href={processedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '8px 16px',
                                            background: '#f59e0b',
                                            color: 'white',
                                            borderRadius: '6px',
                                            textDecoration: 'none',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Open in New Tab
                                    </a>
                                    <button
                                        onClick={handleEdit}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'white',
                                            color: '#92400e',
                                            border: '1px solid #fbbf24',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Try Different URL
                                    </button>
                                </div>
                            </div>
                        ) : showFallback ? (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f9fafb',
                                color: '#6b7280',
                                gap: '16px',
                                padding: '24px',
                                textAlign: 'center',
                            }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                    <line x1="2" y1="9" x2="22" y2="9" />
                                </svg>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                        This website blocks embedding
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', maxWidth: '300px', lineHeight: 1.5 }}>
                                        <strong>{getDomain(processedUrl)}</strong> has set X-Frame-Options to prevent embedding.
                                        This is a security feature that cannot be bypassed in web browsers.
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <a
                                        href={processedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '8px 16px',
                                            background: '#6366f1',
                                            color: 'white',
                                            borderRadius: '6px',
                                            textDecoration: 'none',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <>
                                {isLoading && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#f9fafb',
                                        zIndex: 1,
                                    }}>
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            border: '3px solid #e5e7eb',
                                            borderTopColor: '#6366f1',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite',
                                        }} />
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                    </div>
                                )}

                                <iframe
                                    ref={iframeRef}
                                    src={displayUrl}
                                    onLoad={handleLoad}
                                    onError={handleError}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                        opacity: isLoading ? 0 : 1,
                                        // Disabled to allow canvas scroll/zoom - users can open in new tab for interaction
                                        pointerEvents: 'none',
                                    }}
                                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-top-navigation-by-user-activation allow-modals allow-popups-to-escape-sandbox allow-downloads"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                    autoFocus={true}
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Web embed"
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }
));

WebEmbedInner.displayName = 'WebEmbedInner';

export const WebEmbed = memo(forwardRef<WebEmbedRef, WebEmbedProps>(
    (props, ref) => <WebEmbedInner {...props} ref={ref} />
));

WebEmbed.displayName = 'WebEmbed';

export default WebEmbed;
