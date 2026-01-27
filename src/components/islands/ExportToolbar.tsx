import { useState } from "react";
import { exportToCanvas, exportToSvg } from "@excalidraw/excalidraw";

export default function ExportToolbar() {
    const [exporting, setExporting] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(null), 3000);
    };

    const handleExportPNG = async () => {
        setExporting("png");
        try {
            // Get canvas state from the Excalidraw API
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

            // Export to canvas
            const canvas = await exportToCanvas({
                elements,
                appState,
                files,
            });

            // Convert to blob and download
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

            // Export to SVG
            const svg = await exportToSvg({
                elements,
                appState,
                files,
            });

            // Convert to blob and download
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

            const appState = api.getAppState();
            const files = api.getFiles();

            // Check if clipboard API is available
            if (!navigator.clipboard || !navigator.clipboard.write) {
                showMessage("✗ Clipboard not supported");
                setExporting(null);
                return;
            }

            // Export to canvas
            const canvas = await exportToCanvas({
                elements,
                appState,
                files,
            });

            // Convert to blob and copy
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

    return (
        <div className="export-toolbar">
            <button
                onClick={handleExportPNG}
                disabled={exporting !== null}
                className="export-btn"
                title="Download as PNG"
            >
                <span className="icon">📷</span>
                <span className="label">PNG</span>
                {exporting === "png" && <span className="spinner">⏳</span>}
            </button>

            <button
                onClick={handleExportSVG}
                disabled={exporting !== null}
                className="export-btn"
                title="Download as SVG"
            >
                <span className="icon">📄</span>
                <span className="label">SVG</span>
                {exporting === "svg" && <span className="spinner">⏳</span>}
            </button>

            <button
                onClick={handleCopyToClipboard}
                disabled={exporting !== null}
                className="export-btn"
                title="Copy to clipboard"
            >
                <span className="icon">📋</span>
                <span className="label">Copy</span>
                {exporting === "clipboard" && <span className="spinner">⏳</span>}
            </button>

            {message && <div className="export-message">{message}</div>}

            <style>{`
                .export-toolbar {
                    position: fixed;
                    top: 1rem;
                    right: 1rem;
                    display: flex;
                    gap: 0.5rem;
                    z-index: 1000;
                    flex-direction: row;
                }

                .export-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.5rem 0.75rem;
                    background: var(--color-surface, white);
                    border: 2px solid var(--color-stroke, #333);
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-text, #333);
                    transition: all 0.2s ease;
                    box-shadow: 2px 2px 0 var(--color-stroke, #333);
                }

                .export-btn:hover:not(:disabled) {
                    transform: translate(-1px, -1px);
                    box-shadow: 3px 3px 0 var(--color-stroke, #333);
                }

                .export-btn:active:not(:disabled) {
                    transform: translate(1px, 1px);
                    box-shadow: 1px 1px 0 var(--color-stroke, #333);
                }

                .export-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .export-btn .icon {
                    font-size: 1.125rem;
                }

                .export-btn .spinner {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .export-message {
                    position: fixed;
                    top: 4.5rem;
                    right: 1rem;
                    padding: 0.75rem 1rem;
                    background: var(--color-surface, white);
                    border: 2px solid var(--color-stroke, #333);
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    box-shadow: 2px 2px 0 var(--color-stroke, #333);
                    animation: slideIn 0.2s ease;
                }

                @keyframes slideIn {
                    from {
                        transform: translateY(-10px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                /* Mobile responsiveness */
                @media (max-width: 768px) {
                    .export-toolbar {
                        flex-direction: column;
                        top: auto;
                        bottom: 1rem;
                        right: 1rem;
                    }

                    .export-btn .label {
                        display: none;
                    }

                    .export-btn {
                        padding: 0.625rem;
                        min-width: 2.5rem;
                        justify-content: center;
                    }

                    .export-message {
                        top: auto;
                        bottom: 12rem;
                    }
                }
            `}</style>
        </div>
    );
}
