import React, { memo, forwardRef, useImperativeHandle, useCallback, useState, useRef, useEffect } from 'react';
import { enhanceUrl, isKnownEmbeddable } from '@/lib/web-embed-utils';

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
        const [isInteracting, setIsInteracting] = useState(false);
        const [showFallback, setShowFallback] = useState(false);
        const [currentUrl, setCurrentUrl] = useState('');
        const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
        const [historyIndex, setHistoryIndex] = useState(-1);
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const urlInputRef = useRef<HTMLInputElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const dragStartRef = useRef<{ x: number; y: number; elementX: number; elementY: number } | null>(null);
        const historyRef = useRef<string[]>([]);
        const historyIndexRef = useRef(-1);
        const suppressHistoryUrlRef = useRef<string | null>(null);

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
        const hasConfiguredUrl = rawUrl.trim().length > 0;
        const { url: processedUrl, isSearch, embedUrl, warning } = rawUrl ? enhanceUrl(rawUrl) : { url: '', isSearch: false };
        const ensureEmbedIdOnProxyUrl = useCallback((candidateUrl: string) => {
            try {
                const parsed = new URL(candidateUrl);
                if (parsed.pathname.includes('/parties/main/proxy')) {
                    parsed.searchParams.set('embedId', element.id);
                    return parsed.toString();
                }
                return candidateUrl;
            } catch {
                return candidateUrl;
            }
        }, [element.id]);

        const displayUrl = ensureEmbedIdOnProxyUrl(embedUrl || processedUrl);
        const isReliableEmbed = isKnownEmbeddable(processedUrl);
        const hasWarning = !!warning;
        const isLiveEmbedMode = !isEditing && hasConfiguredUrl && !hasWarning && !showFallback && !!displayUrl;
        const isPassiveEmbedMode = !isInteracting && !isEditing;
        const canGoBack = historyIndex > 0;
        const canGoForward = historyIndex >= 0 && historyIndex < navigationHistory.length - 1;

        const normalizeTrackedUrl = useCallback((url: string) => {
            try {
                return new URL(url).href;
            } catch {
                return url.trim();
            }
        }, []);

        const syncHistoryState = useCallback((history: string[], index: number) => {
            historyRef.current = history;
            historyIndexRef.current = index;
            setNavigationHistory(history);
            setHistoryIndex(index);
        }, []);

        const observeNavigationUrl = useCallback((nextUrl: string) => {
            const normalized = normalizeTrackedUrl(nextUrl);
            if (!normalized || normalized.startsWith('about:')) return;

            setCurrentUrl(normalized);

            if (suppressHistoryUrlRef.current === normalized) {
                suppressHistoryUrlRef.current = null;
                return;
            }

            const currentHistory = historyRef.current;
            const currentIndex = historyIndexRef.current;

            if (currentIndex >= 0 && currentHistory[currentIndex] === normalized) return;

            const truncated = currentHistory.slice(0, Math.max(currentIndex + 1, 0));
            const last = truncated[truncated.length - 1];
            if (last === normalized) {
                syncHistoryState(truncated, truncated.length - 1);
                return;
            }

            const nextHistory = [...truncated, normalized];
            syncHistoryState(nextHistory, nextHistory.length - 1);
        }, [normalizeTrackedUrl, syncHistoryState]);

        // Initialize URL and history when embed URL changes via user input.
        useEffect(() => {
            if (!processedUrl) {
                setCurrentUrl('');
                syncHistoryState([], -1);
                suppressHistoryUrlRef.current = null;
                return;
            }

            const normalized = normalizeTrackedUrl(processedUrl);
            setCurrentUrl(normalized);
            syncHistoryState([normalized], 0);
            suppressHistoryUrlRef.current = null;
        }, [processedUrl, rawUrl, normalizeTrackedUrl, syncHistoryState]);

        // Reset loading state when URL changes and set timeout for sites that block embedding
        useEffect(() => {
            if (!displayUrl) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setHasError(false);
            setShowFallback(false);
            
            // Timeout for sites that block embedding via X-Frame-Options
            // If iframe doesn't load within 8 seconds, show content anyway
            const timeout = setTimeout(() => {
                setIsLoading(false);
            }, 8000);
            
            return () => clearTimeout(timeout);
        }, [displayUrl]);

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
            // Native-style behavior: when not interacting, this should behave like a passive canvas element.
            pointerEvents: isPassiveEmbedMode ? 'none' : 'auto',
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
            setIsInteracting(false);
            setIsLoading(true);
            setHasError(false);
            setShowFallback(false);
        }, [urlInput, element.id, onChange]);

        const handleEdit = useCallback(() => {
            setIsEditing(true);
            setIsInteracting(false);
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

        const resolveEmbedSrc = useCallback((url: string) => {
            const next = enhanceUrl(url);
            return ensureEmbedIdOnProxyUrl(next.embedUrl || next.url);
        }, [ensureEmbedIdOnProxyUrl]);

        const navigateHistory = useCallback((direction: 'back' | 'forward') => {
            const currentHistory = historyRef.current;
            const currentIndex = historyIndexRef.current;
            if (!currentHistory.length || currentIndex < 0) return;

            const targetIndex = direction === 'back' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= currentHistory.length) return;

            const targetUrl = currentHistory[targetIndex];
            syncHistoryState(currentHistory, targetIndex);
            suppressHistoryUrlRef.current = targetUrl;

            setCurrentUrl(targetUrl);
            setIsLoading(true);
            setHasError(false);
            setShowFallback(false);

            const targetSrc = resolveEmbedSrc(targetUrl);
            if (!targetSrc || !iframeRef.current) {
                setIsLoading(false);
                return;
            }

            iframeRef.current.src = targetSrc;
        }, [resolveEmbedSrc, syncHistoryState]);

        useEffect(() => {
            if (!isSelected || isEditing || !processedUrl) {
                setIsInteracting(false);
            }
        }, [isSelected, isEditing, processedUrl]);

        useEffect(() => {
            if (!isInteracting) return;

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    setIsInteracting(false);
                    iframeRef.current?.blur();
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [isInteracting]);

        // In passive mode, let wheel/pan events pass through, but allow click-anywhere
        // activation inside the full embed rectangle (native-style click-to-interact).
        useEffect(() => {
            if (!isLiveEmbedMode || !isPassiveEmbedMode || !isSelected) return;

            const handlePointerDownCapture = (event: PointerEvent) => {
                if (event.button !== 0) return;
                if (!containerRef.current) return;

                const rect = containerRef.current.getBoundingClientRect();
                const insideEmbed =
                    event.clientX >= rect.left &&
                    event.clientX <= rect.right &&
                    event.clientY >= rect.top &&
                    event.clientY <= rect.bottom;

                if (!insideEmbed) return;

                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                setIsInteracting(true);
                window.setTimeout(() => iframeRef.current?.focus(), 0);
            };

            window.addEventListener('pointerdown', handlePointerDownCapture, true);
            return () => window.removeEventListener('pointerdown', handlePointerDownCapture, true);
        }, [isLiveEmbedMode, isPassiveEmbedMode, isSelected]);

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
                const data =
                    event.data && typeof event.data === 'object'
                        ? (event.data as { type?: string; url?: string; embedId?: string })
                        : null;
                if (!data || data.type !== 'iframe-navigation' || !data.url) return;

                if (data.embedId) {
                    if (data.embedId !== element.id) return;
                    observeNavigationUrl(data.url);
                    return;
                }

                const iframeWindow = iframeRef.current?.contentWindow;
                if (!iframeWindow) return;

                // Isolation: handle navigation events only from this embed's iframe.
                if (event.source !== iframeWindow) return;

                observeNavigationUrl(data.url);
            };

            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }, [observeNavigationUrl, element.id]);

        // Try to track URL changes via iframe (limited by CORS)
        useEffect(() => {
            if (!iframeRef.current) return;

            const checkUrl = setInterval(() => {
                try {
                    // This will fail for cross-origin iframes due to CORS
                    const iframeWindow = iframeRef.current?.contentWindow;
                    if (iframeWindow && iframeWindow.location.href) {
                        const newUrl = iframeWindow.location.href;
                        if (!newUrl.startsWith('about:')) {
                            observeNavigationUrl(newUrl);
                        }
                    }
                } catch (e) {
                    // Expected error for cross-origin iframes - silently ignore
                }
            }, 1000);

            return () => clearInterval(checkUrl);
        }, [observeNavigationUrl]);

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
                            // Keep the full embed passive until explicitly activated.
                            pointerEvents: isPassiveEmbedMode ? 'none' : 'auto',
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
                                    ref={urlInputRef}
                                    type="text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSubmit();
                                        if (e.key === 'Escape') {
                                            if (hasConfiguredUrl) {
                                                setIsEditing(false);
                                            }
                                        }
                                    }}
                                    placeholder="Paste a full embeddable URL..."
                                    style={{
                                        flex: 1,
                                        padding: '4px 8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        outline: 'none',
                                        minWidth: 0,
                                    }}
                                    autoFocus={true}
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
                                    onClick={handleEdit}
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
                                        cursor: 'pointer',
                                        minWidth: 0,
                                    }}
                                    title={`Click to edit - Current URL: ${currentUrl || processedUrl}`}
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
                                <button
                                    onClick={() => navigateHistory('back')}
                                    disabled={!canGoBack}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    title="Back"
                                    style={{
                                        padding: '4px',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: canGoBack ? 'pointer' : 'not-allowed',
                                        color: '#6b7280',
                                        flexShrink: 0,
                                        opacity: canGoBack ? 1 : 0.35,
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => navigateHistory('forward')}
                                    disabled={!canGoForward}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    title="Forward"
                                    style={{
                                        padding: '4px',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: canGoForward ? 'pointer' : 'not-allowed',
                                        color: '#6b7280',
                                        flexShrink: 0,
                                        opacity: canGoForward ? 1 : 0.35,
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                                <a
                                    href={currentUrl || processedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    title="Open current page in new tab"
                                    style={{
                                        padding: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#6b7280',
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 3h7v7" />
                                        <path d="M10 14L21 3" />
                                        <path d="M21 14v7h-7" />
                                        <path d="M3 10V3h7" />
                                        <path d="M3 21l7-7" />
                                    </svg>
                                </a>
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
                        pointerEvents: isPassiveEmbedMode ? 'none' : 'auto',
                    }}
                    >

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
                                <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', lineHeight: 1.5 }}>
                                    Paste a full page URL (not a homepage/search query).<br />
                                    Example: youtube.com/watch?v=... or docs.google.com/.../preview
                                </div>
                                <div style={{ fontSize: '11px', color: '#4b5563', textAlign: 'center', lineHeight: 1.5 }}>
                                    Paste a URL, then click anywhere inside the rectangle to interact with the page. Press <strong>Esc</strong> to return to canvas pan/zoom.
                                </div>
                                <div style={{ fontSize: '11px', color: '#92400e', textAlign: 'center', lineHeight: 1.5, maxWidth: 360 }}>
                                    Some sites block web embedding via security policy (X-Frame-Options/CSP). Those links can only open in a new tab.
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
                                            pointerEvents: 'auto',
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
                                            pointerEvents: 'auto',
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
                                            pointerEvents: 'auto',
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
                                {!isLoading && isLiveEmbedMode && isPassiveEmbedMode && isSelected && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 2,
                                            padding: '10px 14px',
                                            background: 'rgba(17, 24, 39, 0.82)',
                                            color: '#fff',
                                            border: '1px solid rgba(255, 255, 255, 0.28)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            cursor: 'default',
                                            backdropFilter: 'blur(2px)',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        Click anywhere to interact
                                    </div>
                                )}
                                {isInteracting && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: 10,
                                            bottom: 10,
                                            zIndex: 2,
                                            background: 'rgba(17, 24, 39, 0.75)',
                                            color: '#fff',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        Press Esc to return to canvas
                                    </div>
                                )}

                                <iframe
                                    ref={iframeRef}
                                    src={displayUrl}
                                    onLoad={handleLoad}
                                    onError={handleError}
                                    onMouseDown={selectElement}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                        opacity: isLoading ? 0 : 1,
                                        pointerEvents: isInteracting ? 'auto' : 'none',
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
