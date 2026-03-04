import React, { memo, forwardRef, useImperativeHandle, useCallback, useState, useRef, useEffect } from 'react';
import { enhanceUrl, isKnownEmbeddable } from '@/lib/web-embed-utils';
import { getOverlayZIndex } from '@/components/islands/overlay-utils';
import { ZoomHint } from '@/components/islands/ZoomHint';
import { useZoomHint } from '@/components/islands/useZoomHint';

type EmbedViewMode = 'inline' | 'pip' | 'expanded';
type PipPosition = { x: number; y: number };

const PIP_MIN_WIDTH = 260;
const PIP_MAX_WIDTH = 420;
const PIP_WIDTH_RATIO = 0.28;
const PIP_ASPECT_RATIO = 16 / 10;
const PIP_MARGIN = 20;
const PIP_TOP_OFFSET = 88;

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getPipDimensions = (viewportWidth: number) => {
    const width = Math.min(PIP_MAX_WIDTH, Math.max(PIP_MIN_WIDTH, viewportWidth * PIP_WIDTH_RATIO));
    const height = width / PIP_ASPECT_RATIO;
    return { width, height };
};

export interface WebEmbedProps {
    element: any;
    appState: any;
    stackIndex?: number;
    onChange: (elementId: string, url: string) => void;
    onPositionChange?: (elementId: string, x: number, y: number) => void;
    onDelete?: (elementId: string) => void;
}

export interface WebEmbedRef {
    exportAsImage: () => Promise<{ imageData: string; position: any }>;
    updateTransform: (
        x: number,
        y: number,
        width: number,
        height: number,
        angle: number,
        zoom: number,
        scrollX: number,
        scrollY: number
    ) => void;
}

const WebEmbedInner = memo(
    forwardRef<WebEmbedRef, WebEmbedProps>(({ element, appState, stackIndex = 0, onChange, onDelete }, ref) => {
        const [isLoading, setIsLoading] = useState(true);
        const [hasError, setHasError] = useState(false);
        const [urlInput, setUrlInput] = useState(element.customData?.url || '');
        const [isEditing, setIsEditing] = useState(!element.customData?.url);
        const [showFallback, setShowFallback] = useState(false);
        const [currentUrl, setCurrentUrl] = useState('');
        const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
        const [historyIndex, setHistoryIndex] = useState(-1);
        const [viewMode, setViewMode] = useState<EmbedViewMode>('inline');
        const [isPipDragging, setIsPipDragging] = useState(false);
        const [viewportSize, setViewportSize] = useState(() => ({
            width: typeof window !== 'undefined' ? window.innerWidth : 1440,
            height: typeof window !== 'undefined' ? window.innerHeight : 900,
        }));
        const [pipPosition, setPipPosition] = useState<PipPosition | null>(null);

        const iframeRef = useRef<HTMLIFrameElement>(null);
        const urlInputRef = useRef<HTMLInputElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const historyRef = useRef<string[]>([]);
        const historyIndexRef = useRef(-1);
        const suppressHistoryUrlRef = useRef<string | null>(null);
        const viewModeRef = useRef<EmbedViewMode>('inline');
        const pipDragRef = useRef<{
            startX: number;
            startY: number;
            initialX: number;
            initialY: number;
        } | null>(null);

        const rawUrl = element.customData?.url || '';
        const isSelected = appState.selectedElementIds?.[element.id] === true;
        const { visible: zoomHintVisible } = useZoomHint(containerRef, isSelected && viewMode === 'inline');

        const hasConfiguredUrl = rawUrl.trim().length > 0;
        const { url: processedUrl, isSearch, embedUrl, warning } = rawUrl
            ? enhanceUrl(rawUrl)
            : { url: '', isSearch: false };

        const ensureEmbedIdOnProxyUrl = useCallback(
            (candidateUrl: string) => {
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
            },
            [element.id]
        );

        const displayUrl = ensureEmbedIdOnProxyUrl(embedUrl || processedUrl);
        const isReliableEmbed = isKnownEmbeddable(processedUrl);
        const hasWarning = !!warning;
        const isLiveEmbedMode = !isEditing && hasConfiguredUrl && !hasWarning && !showFallback && !!displayUrl;
        const isInlineFocused = viewMode === 'inline' && isSelected;
        const isInteractive = viewMode !== 'inline' || isInlineFocused;
        const shouldPassThroughSetupSurface =
            viewMode === 'inline' && isEditing && !hasConfiguredUrl;
        const canGoBack = historyIndex > 0;
        const canGoForward = historyIndex >= 0 && historyIndex < navigationHistory.length - 1;
        const pipDimensions = getPipDimensions(viewportSize.width);

        useEffect(() => {
            viewModeRef.current = viewMode;
        }, [viewMode]);

        useEffect(() => {
            const handleResize = () => {
                setViewportSize({ width: window.innerWidth, height: window.innerHeight });
            };
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        useEffect(() => {
            if (isEditing) {
                setTimeout(() => urlInputRef.current?.focus(), 0);
            }
        }, [isEditing]);

        useEffect(() => {
            const { width, height } = getPipDimensions(viewportSize.width);
            const maxX = Math.max(PIP_MARGIN, viewportSize.width - width - PIP_MARGIN);
            const maxY = Math.max(PIP_TOP_OFFSET, viewportSize.height - height - PIP_MARGIN);

            setPipPosition((prev) => {
                if (!prev) {
                    return { x: maxX, y: PIP_TOP_OFFSET };
                }
                return {
                    x: clampValue(prev.x, PIP_MARGIN, maxX),
                    y: clampValue(prev.y, PIP_TOP_OFFSET, maxY),
                };
            });
        }, [viewportSize.width, viewportSize.height]);

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

        const observeNavigationUrl = useCallback(
            (nextUrl: string) => {
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
            },
            [normalizeTrackedUrl, syncHistoryState]
        );

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

        useEffect(() => {
            if (!displayUrl) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setHasError(false);
            setShowFallback(false);

            const timeout = setTimeout(() => {
                setIsLoading(false);
            }, 8000);

            return () => clearTimeout(timeout);
        }, [displayUrl]);

        const zoom = appState.zoom.value;
        const screenCenterX = (element.x + element.width / 2 + appState.scrollX) * zoom;
        const screenCenterY = (element.y + element.height / 2 + appState.scrollY) * zoom;

        const inlineContainerStyle: React.CSSProperties = {
            position: 'absolute',
            top: `${screenCenterY - element.height / 2}px`,
            left: `${screenCenterX - element.width / 2}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            transform: `scale(${zoom}) rotate(${element.angle || 0}rad)`,
            transformOrigin: 'center center',
            pointerEvents: 'none',
            zIndex: getOverlayZIndex(isSelected, false, stackIndex),
        };

        const pipContainerStyle: React.CSSProperties = {
            position: 'fixed',
            top: `${pipPosition?.y ?? PIP_TOP_OFFSET}px`,
            left: `${pipPosition?.x ?? Math.max(PIP_MARGIN, viewportSize.width - pipDimensions.width - PIP_MARGIN)}px`,
            width: `${pipDimensions.width}px`,
            height: `${pipDimensions.height}px`,
            transform: 'none',
            transformOrigin: 'center center',
            pointerEvents: 'auto',
            zIndex: 1100,
        };

        const expandedContainerStyle: React.CSSProperties = {
            position: 'fixed',
            top: '5vh',
            left: '5vw',
            width: '90vw',
            height: '90vh',
            transform: 'none',
            transformOrigin: 'center center',
            pointerEvents: 'auto',
            zIndex: 1201,
        };

        const containerStyle: React.CSSProperties =
            viewMode === 'expanded'
                ? expandedContainerStyle
                : viewMode === 'pip'
                  ? pipContainerStyle
                  : inlineContainerStyle;
        const pipInlinePlaceholderStyle: React.CSSProperties = {
            ...inlineContainerStyle,
            pointerEvents: 'none',
            zIndex: 2,
        };

        const cardPointerEvents =
            shouldPassThroughSetupSurface ? 'none' : isInteractive ? 'auto' : 'none';
        const bodyPointerEvents =
            shouldPassThroughSetupSurface ? 'none' : isInteractive ? 'auto' : 'none';

        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            borderRadius: viewMode === 'expanded' ? '14px' : '10px',
            overflow: 'hidden',
            isolation: 'isolate',
            boxShadow:
                viewMode === 'expanded'
                    ? '0 28px 72px rgba(15, 23, 42, 0.35)'
                    : viewMode === 'pip'
                      ? '0 20px 40px rgba(15, 23, 42, 0.3)'
                      : isSelected
                        ? '0 0 0 2px #6366f1, 0 10px 20px -3px rgba(0, 0, 0, 0.2)'
                        : '0 4px 12px -1px rgba(0, 0, 0, 0.15)',
            pointerEvents: cardPointerEvents,
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

        const handleCloseElement = useCallback(() => {
            if (onDelete) {
                onDelete(element.id);
                return;
            }

            const excalidrawAPI = (window as any).excalidrawAPI;
            if (!excalidrawAPI) return;
            const currentElements = excalidrawAPI.getSceneElements();
            excalidrawAPI.updateScene({
                elements: currentElements.filter((el: any) => el.id !== element.id),
            });
        }, [element.id, onDelete]);

        const handleRefresh = useCallback(() => {
            if (!iframeRef.current) return;
            setIsLoading(true);
            setHasError(false);
            setShowFallback(false);
            iframeRef.current.src = iframeRef.current.src;
        }, []);

        const resolveEmbedSrc = useCallback(
            (url: string) => {
                const next = enhanceUrl(url);
                return ensureEmbedIdOnProxyUrl(next.embedUrl || next.url);
            },
            [ensureEmbedIdOnProxyUrl]
        );

        const navigateHistory = useCallback(
            (direction: 'back' | 'forward') => {
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
            },
            [resolveEmbedSrc, syncHistoryState]
        );

        const setModeAndCloseEditor = useCallback((mode: EmbedViewMode) => {
            pipDragRef.current = null;
            setIsPipDragging(false);
            setViewMode(mode);
            setIsEditing(false);
        }, []);

        const deselectAll = useCallback(() => {
            const excalidrawAPI = (window as any).excalidrawAPI;
            if (!excalidrawAPI) return;
            excalidrawAPI.updateScene({ appState: { selectedElementIds: {} } });
        }, []);

        const beginPipDrag = useCallback(
            (event: React.MouseEvent<HTMLDivElement>) => {
                if (viewMode !== 'pip' || !pipPosition) return;

                const target = event.target as HTMLElement;
                if (target.closest('button, input, a, textarea, select')) return;

                pipDragRef.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    initialX: pipPosition.x,
                    initialY: pipPosition.y,
                };
                setIsPipDragging(true);
                event.preventDefault();
            },
            [viewMode, pipPosition]
        );

        useEffect(() => {
            const handleMouseMove = (event: MouseEvent) => {
                if (!pipDragRef.current) return;

                const dx = event.clientX - pipDragRef.current.startX;
                const dy = event.clientY - pipDragRef.current.startY;
                const { width, height } = getPipDimensions(viewportSize.width);
                const maxX = Math.max(PIP_MARGIN, viewportSize.width - width - PIP_MARGIN);
                const maxY = Math.max(PIP_TOP_OFFSET, viewportSize.height - height - PIP_MARGIN);

                setPipPosition({
                    x: clampValue(pipDragRef.current.initialX + dx, PIP_MARGIN, maxX),
                    y: clampValue(pipDragRef.current.initialY + dy, PIP_TOP_OFFSET, maxY),
                });
            };

            const handleMouseUp = () => {
                if (!pipDragRef.current) return;
                pipDragRef.current = null;
                setIsPipDragging(false);
            };

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }, [viewportSize.width, viewportSize.height]);

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

        const updateTransform = useCallback(
            (
                x: number,
                y: number,
                width: number,
                height: number,
                angle: number,
                nextZoom: number,
                scrollX: number,
                scrollY: number
            ) => {
                if (!containerRef.current) return;
                if (viewModeRef.current !== 'inline') return;

                const screenX = (x + width / 2 + scrollX) * nextZoom;
                const screenY = (y + height / 2 + scrollY) * nextZoom;

                const container = containerRef.current;
                container.style.top = `${screenY - height / 2}px`;
                container.style.left = `${screenX - width / 2}px`;
                container.style.width = `${width}px`;
                container.style.height = `${height}px`;
                container.style.transform = `scale(${nextZoom}) rotate(${angle || 0}rad)`;
            },
            []
        );

        useImperativeHandle(
            ref,
            () => ({
                exportAsImage,
                updateTransform,
            }),
            [exportAsImage, updateTransform]
        );

        const getDomain = (url: string) => {
            try {
                return new URL(url).hostname;
            } catch {
                return url;
            }
        };

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
                if (event.source !== iframeWindow) return;
                observeNavigationUrl(data.url);
            };

            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }, [observeNavigationUrl, element.id]);

        useEffect(() => {
            if (!iframeRef.current) return;

            const checkUrl = setInterval(() => {
                try {
                    const iframeWindow = iframeRef.current?.contentWindow;
                    if (iframeWindow && iframeWindow.location.href) {
                        const nextUrl = iframeWindow.location.href;
                        if (!nextUrl.startsWith('about:')) {
                            observeNavigationUrl(nextUrl);
                        }
                    }
                } catch {
                    // Expected for cross-origin iframes.
                }
            }, 1000);

            return () => clearInterval(checkUrl);
        }, [observeNavigationUrl]);

        useEffect(() => {
            if (isSelected && processedUrl) {
                window.dispatchEvent(
                    new CustomEvent('webembed:selected', {
                        detail: { elementId: element.id, url: currentUrl || processedUrl, title: rawUrl },
                    })
                );
            }
        }, [isSelected, currentUrl, processedUrl, rawUrl, element.id]);

        useEffect(() => {
            const handleEscapeToDeselect = (event: KeyboardEvent) => {
                if (event.key !== 'Escape') return;
                if (!isSelected) return;

                // If setup has no URL yet, keep setup UI visible after deselect.
                if (isEditing && hasConfiguredUrl) {
                    setIsEditing(false);
                }
                pipDragRef.current = null;
                setIsPipDragging(false);
                deselectAll();
            };

            window.addEventListener('keydown', handleEscapeToDeselect, true);
            return () => window.removeEventListener('keydown', handleEscapeToDeselect, true);
        }, [isSelected, isEditing, hasConfiguredUrl, deselectAll]);

        return (
            <>
                {viewMode === 'expanded' && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.35)',
                            backdropFilter: 'blur(2px)',
                            WebkitBackdropFilter: 'blur(2px)',
                            zIndex: 1200,
                        }}
                        onClick={() => setModeAndCloseEditor('inline')}
                    />
                )}
                {viewMode === 'pip' && (
                    <div style={pipInlinePlaceholderStyle}>
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(248, 250, 252, 0.84)',
                                borderRadius: 10,
                                border: '1px dashed rgba(100, 116, 139, 0.6)',
                                color: '#334155',
                                fontSize: 13,
                                fontWeight: 600,
                                letterSpacing: 0.2,
                                textAlign: 'center',
                                padding: '10px 16px',
                                boxSizing: 'border-box',
                            }}
                        >
                            Picture-in-picture active
                            <br />
                            Use the PiP X button to restore
                        </div>
                    </div>
                )}
                <div
                    ref={containerRef}
                    style={containerStyle}
                    className="web-embed-container"
                    data-embed-id={element.id}
                >
                    <div style={contentStyle}>
                        <div
                            onMouseDown={beginPipDrag}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: '#f8fafc',
                                borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
                                gap: '8px',
                                userSelect: 'none',
                                minHeight: 38,
                                pointerEvents: isInteractive ? 'auto' : 'none',
                                cursor: viewMode === 'pip' ? (isPipDragging ? 'grabbing' : 'grab') : 'default',
                            }}
                        >
                            <button
                                onClick={handleCloseElement}
                                onMouseDown={(e) => e.stopPropagation()}
                                title="Delete embed"
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

                            <button
                                onClick={() => setModeAndCloseEditor('pip')}
                                onMouseDown={(e) => e.stopPropagation()}
                                title="Minimize to picture-in-picture"
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: '#f59e0b',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            />
                            <button
                                onClick={() => setModeAndCloseEditor('expanded')}
                                onMouseDown={(e) => e.stopPropagation()}
                                title="Expand embed"
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            />

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
                                            if (e.key === 'Escape' && hasConfiguredUrl) {
                                                setIsEditing(false);
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
                                    />
                                    <button
                                        onClick={handleSubmit}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        style={{
                                            padding: '4px 12px',
                                            background: '#6366f1',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                        }}
                                    >
                                        Go
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleEdit}
                                        onMouseDown={(e) => e.stopPropagation()}
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
                                            background: 'transparent',
                                            border: 'none',
                                            textAlign: 'left',
                                            padding: 0,
                                        }}
                                        title={`Edit URL - ${currentUrl || processedUrl}`}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                        </svg>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {isSearch ? `🔍 ${rawUrl}` : currentUrl || processedUrl}
                                        </span>
                                    </button>
                                    <button
                                        onClick={handleRefresh}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        title="Refresh"
                                        style={{
                                            padding: '4px',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#6b7280',
                                            flexShrink: 0,
                                        }}
                                    >
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
                                        title="Open in new tab"
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
                                </>
                            )}

                            {viewMode !== 'inline' && (
                                <button
                                    onClick={() => setModeAndCloseEditor('inline')}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    title={viewMode === 'expanded' ? 'Close expanded view' : 'Remove from picture-in-picture'}
                                    style={{
                                        marginLeft: '2px',
                                        width: 24,
                                        height: 24,
                                        borderRadius: '6px',
                                        border: '1px solid rgba(148, 163, 184, 0.35)',
                                        background: 'white',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        color: '#334155',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                        <line x1="6" y1="18" x2="18" y2="6" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div
                            style={{
                                flex: 1,
                                position: 'relative',
                                overflow: 'hidden',
                                background: '#ffffff',
                                pointerEvents: bodyPointerEvents,
                            }}
                        >
                            {isEditing ? (
                                <div
                                    style={{
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
                                    }}
                                >
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
                                    <div style={{ fontSize: '11px', color: '#92400e', textAlign: 'center', lineHeight: 1.5, maxWidth: 360 }}>
                                        Some sites block web embedding via security policy (X-Frame-Options/CSP). Those links can only open in a new tab.
                                    </div>
                                </div>
                            ) : hasWarning ? (
                                <div
                                    style={{
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
                                    }}
                                >
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
                                </div>
                            ) : showFallback ? (
                                <div
                                    style={{
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
                                    }}
                                >
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
                                            <strong>{getDomain(processedUrl)}</strong> doesn't allow its pages to be previewed here.
                                            You can still open it in a new tab.
                                        </div>
                                    </div>
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
                            ) : (
                                <>
                                    {isLoading && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: '#f9fafb',
                                                zIndex: 1,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    border: '3px solid #e5e7eb',
                                                    borderTopColor: '#6366f1',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite',
                                                }}
                                            />
                                            <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
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
                                            pointerEvents: isInteractive ? 'auto' : 'none',
                                        }}
                                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-top-navigation-by-user-activation allow-modals allow-popups-to-escape-sandbox allow-downloads"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title="Web embed"
                                    />
                                    {hasError && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'rgba(255,255,255,0.9)',
                                                color: '#b91c1c',
                                                fontSize: 13,
                                                fontWeight: 500,
                                            }}
                                        >
                                            Failed to load this embed.
                                        </div>
                                    )}
                                    {viewMode === 'pip' && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                right: 10,
                                                bottom: 10,
                                                background: 'rgba(15, 23, 42, 0.75)',
                                                color: '#fff',
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                fontSize: 11,
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            Picture-in-picture
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <ZoomHint visible={zoomHintVisible} />
                </div>
            </>
        );
    })
);

WebEmbedInner.displayName = 'WebEmbedInner';

export const WebEmbed = memo(
    forwardRef<WebEmbedRef, WebEmbedProps>((props, ref) => <WebEmbedInner {...props} ref={ref} />)
);

WebEmbed.displayName = 'WebEmbed';

export default WebEmbed;
