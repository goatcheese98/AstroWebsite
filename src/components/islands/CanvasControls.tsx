import { useState } from "react";

interface CanvasControlsProps {
    onOpenChat: () => void;
    onOpenAssets: () => void;
    isChatOpen: boolean;
    isAssetsOpen: boolean;
}

export default function CanvasControls({ onOpenChat, onOpenAssets, isChatOpen, isAssetsOpen }: CanvasControlsProps) {
    const [exporting, setExporting] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(null), 3000);
    };

    const handleExportPNG = async () => {
        setExporting("png");
        try {
            const api = (window as any).excalidrawAPI;
            if (!api) {
                showMessage("Canvas not ready");
                return;
            }

            const elements = api.getSceneElements();
            if (elements.length === 0) {
                showMessage("Canvas is empty");
                setExporting(null);
                return;
            }

            const appState = api.getAppState();
            const files = api.getFiles();

            const { exportToCanvas } = await import("@excalidraw/excalidraw");
            const canvas = await exportToCanvas({ elements, appState, files });

            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `canvas-${Date.now()}.png`;
                    link.click();
                    URL.revokeObjectURL(url);
                    showMessage("✓ PNG downloaded");
                }
            });
        } catch (error) {
            console.error("Export PNG error:", error);
            showMessage("✗ Export failed");
        } finally {
            setExporting(null);
        }
    };

    const handleExportSVG = async () => {
        setExporting("svg");
        try {
            const api = (window as any).excalidrawAPI;
            if (!api) {
                showMessage("Canvas not ready");
                return;
            }

            const elements = api.getSceneElements();
            if (elements.length === 0) {
                showMessage("Canvas is empty");
                setExporting(null);
                return;
            }

            const appState = api.getAppState();
            const files = api.getFiles();

            const { exportToSvg } = await import("@excalidraw/excalidraw");
            const svg = await exportToSvg({ elements, appState, files });

            const svgData = svg.outerHTML;
            const blob = new Blob([svgData], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `canvas-${Date.now()}.svg`;
            link.click();
            URL.revokeObjectURL(url);
            showMessage("✓ SVG downloaded");
        } catch (error) {
            console.error("Export SVG error:", error);
            showMessage("✗ Export failed");
        } finally {
            setExporting(null);
        }
    };

    const handleCopyToClipboard = async () => {
        setExporting("clipboard");
        try {
            const api = (window as any).excalidrawAPI;
            if (!api) {
                showMessage("Canvas not ready");
                return;
            }

            const elements = api.getSceneElements();
            if (elements.length === 0) {
                showMessage("Canvas is empty");
                setExporting(null);
                return;
            }

            if (!navigator.clipboard || !navigator.clipboard.write) {
                showMessage("✗ Clipboard not supported");
                setExporting(null);
                return;
            }

            const appState = api.getAppState();
            const files = api.getFiles();

            const { exportToCanvas } = await import("@excalidraw/excalidraw");
            const canvas = await exportToCanvas({ elements, appState, files });

            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ "image/png": blob }),
                        ]);
                        showMessage("✓ Copied to clipboard");
                    } catch (err) {
                        console.error("Clipboard write error:", err);
                        showMessage("✗ Clipboard copy failed");
                    }
                }
            });
        } catch (error) {
            console.error("Copy to clipboard error:", error);
            showMessage("✗ Copy failed");
        } finally {
            setExporting(null);
        }
    };

    // Hide all controls when any panel is open
    const isPanelOpen = isChatOpen || isAssetsOpen;

    return (
        <>
            {/* Right side controls - vertically centered */}
            {!isPanelOpen && (
                <div className="canvas-controls">
                    <button onClick={onOpenChat} className="control-btn chat-btn" title="Open AI Chat">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span className="label">AI Chat</span>
                    </button>

                    <button onClick={onOpenAssets} className="control-btn assets-btn" title="Browse My Assets">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span className="label">My Assets</span>
                    </button>

                    {/* Divider */}
                    <div className="divider"></div>

                    {/* Export buttons */}
                    <button
                        onClick={handleExportPNG}
                        disabled={exporting !== null}
                        className="control-btn export-btn"
                        title="Download as PNG"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        <span className="label">PNG</span>
                    </button>

                    <button
                        onClick={handleExportSVG}
                        disabled={exporting !== null}
                        className="control-btn export-btn"
                        title="Download as SVG"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <path d="M14 2v6h6"/>
                            <path d="M9 13h6"/>
                            <path d="M9 17h6"/>
                        </svg>
                        <span className="label">SVG</span>
                    </button>

                    <button
                        onClick={handleCopyToClipboard}
                        disabled={exporting !== null}
                        className="control-btn export-btn"
                        title="Copy to clipboard"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span className="label">Copy</span>
                    </button>
                </div>
            )}

            {/* Toast message */}
            {message && <div className="toast-message">{message}</div>}

            <style>{`
                .canvas-controls {
                    position: fixed;
                    right: 1.5rem;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 0.625rem;
                    z-index: 1000;
                    pointer-events: none;
                }

                .canvas-controls > * {
                    pointer-events: auto;
                }

                .control-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.625rem;
                    padding: 0.75rem;
                    min-width: 3rem;
                    min-height: 3rem;
                    background: var(--color-surface, white);
                    border: 2px solid var(--color-stroke, #333);
                    border-radius: 10px;
                    cursor: pointer;
                    font-family: var(--font-hand, sans-serif);
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--color-text, #333);
                    box-shadow: 3px 3px 0 var(--color-stroke, #333);
                    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
                    position: relative;
                    overflow: visible;
                }

                .control-btn svg {
                    flex-shrink: 0;
                    position: relative;
                    z-index: 2;
                }

                .control-btn .label {
                    position: absolute;
                    right: 100%;
                    margin-right: 0.75rem;
                    padding: 0.625rem 1rem;
                    background: var(--color-surface, white);
                    border: 2px solid var(--color-stroke, #333);
                    border-radius: 8px;
                    box-shadow: 3px 3px 0 var(--color-stroke, #333);
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    transform: translateX(10px);
                    z-index: 1;
                }

                .control-btn:hover {
                    transform: translate(-2px, -2px);
                    box-shadow: 5px 5px 0 var(--color-stroke, #333);
                    background: var(--color-fill-1, #f8f9fa);
                }

                .control-btn:active {
                    transform: translate(1px, 1px);
                    box-shadow: 2px 2px 0 var(--color-stroke, #333);
                }

                .control-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .control-btn:disabled:hover {
                    transform: none;
                    box-shadow: 3px 3px 0 var(--color-stroke, #333);
                }

                /* Specific button styles */
                .chat-btn:hover {
                    background: #e3f2ff;
                    border-color: #1971c2;
                }

                .chat-btn:hover .label {
                    background: #e3f2ff;
                    border-color: #1971c2;
                    box-shadow: 3px 3px 0 #1971c2;
                }

                .assets-btn:hover {
                    background: #ebfbee;
                    border-color: #2f9e44;
                }

                .assets-btn:hover .label {
                    background: #ebfbee;
                    border-color: #2f9e44;
                    box-shadow: 3px 3px 0 #2f9e44;
                }

                .export-btn:hover:not(:disabled) {
                    background: #fff3bf;
                    border-color: #f59f00;
                }

                .export-btn:hover:not(:disabled) .label {
                    background: #fff3bf;
                    border-color: #f59f00;
                    box-shadow: 3px 3px 0 #f59f00;
                }

                .divider {
                    height: 2px;
                    background: var(--color-stroke-muted, #ddd);
                    margin: 0.25rem 0.5rem;
                    border-radius: 1px;
                }

                .toast-message {
                    position: fixed;
                    top: 1.5rem;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 0.875rem 1.5rem;
                    background: var(--color-surface, white);
                    border: 2px solid var(--color-stroke, #333);
                    border-radius: 10px;
                    font-family: var(--font-hand, sans-serif);
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--color-text, #333);
                    box-shadow: 4px 4px 0 var(--color-stroke, #333);
                    z-index: 1001;
                    animation: slideDown 0.2s ease;
                }

                @keyframes slideDown {
                    from {
                        transform: translate(-50%, -20px);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }

                /* Show labels on hover */
                .control-btn:hover .label {
                    opacity: 1;
                    transform: translateX(0);
                }

                @media (max-width: 768px) {
                    .canvas-controls {
                        right: 1rem;
                        gap: 0.5rem;
                    }

                    .control-btn {
                        min-width: 2.75rem;
                        min-height: 2.75rem;
                        padding: 0.625rem;
                    }

                    .control-btn svg {
                        width: 18px;
                        height: 18px;
                    }

                    .control-btn:hover {
                        padding: 0.625rem;
                    }

                    .control-btn:hover .label {
                        display: none;
                    }
                }

                @media (max-height: 600px) {
                    .canvas-controls {
                        top: 1rem;
                        transform: none;
                        gap: 0.5rem;
                    }

                    .control-btn {
                        min-width: 2.5rem;
                        min-height: 2.5rem;
                        padding: 0.5rem;
                    }
                }
            `}</style>
        </>
    );
}
