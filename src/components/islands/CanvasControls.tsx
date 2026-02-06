import { useState, useRef, useEffect } from "react";

interface CanvasControlsProps {
    onOpenChat: () => void;
    onOpenAssets: () => void;
    isChatOpen: boolean;
    isAssetsOpen: boolean;
    onSaveState?: () => void;
    onLoadState?: () => void;
    onCreateMarkdown?: () => void;
    onShare?: () => void;
}

export default function CanvasControls({
    onOpenChat,
    onOpenAssets,
    isChatOpen,
    isAssetsOpen,
    onSaveState,
    onLoadState,
    onCreateMarkdown,
    onShare
}: CanvasControlsProps) {
    const [message, setMessage] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(null), 3000);
    };

    // Listen for canvas selection changes
    useEffect(() => {
        const handleSelectionChange = (event: any) => {
            const selectedIds = event.detail?.selectedElementIds || {};
            setHasSelection(Object.keys(selectedIds).length > 0);
        };
        window.addEventListener("excalidraw:selection-change", handleSelectionChange);
        return () => window.removeEventListener("excalidraw:selection-change", handleSelectionChange);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExportPNG = async () => {
        setIsExporting(true);
        try {
            const api = (window as any).excalidrawAPI;
            if (!api) {
                showMessage("Canvas not ready");
                return;
            }
            const { exportToCanvas } = await import("@excalidraw/excalidraw");
            const canvas = await exportToCanvas({
                elements: api.getSceneElements(),
                appState: { ...api.getAppState(), exportBackground: true, exportWithDarkMode: false, exportScale: 2 },
                files: api.getFiles(),
            });
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `canvas-${Date.now()}.png`;
            link.click();
            showMessage("✓ PNG downloaded");
        } catch (error) {
            console.error("Export PNG error:", error);
            showMessage("✗ Export failed");
        }
        setIsExporting(false);
        setIsMenuOpen(false);
    };

    const handleExportSVG = async () => {
        setIsExporting(true);
        try {
            const api = (window as any).excalidrawAPI;
            if (!api) {
                showMessage("Canvas not ready");
                return;
            }
            const { exportToSvg } = await import("@excalidraw/excalidraw");
            const svg = await exportToSvg({
                elements: api.getSceneElements(),
                appState: { ...api.getAppState(), exportWithDarkMode: false },
                files: api.getFiles(),
            });
            const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
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
        }
        setIsExporting(false);
        setIsMenuOpen(false);
    };

    const handleSave = () => {
        console.log("💾 CanvasControls: Save clicked, onSaveState:", typeof onSaveState);
        if (onSaveState) {
            onSaveState();
        } else {
            console.error("❌ CanvasControls: onSaveState is not defined!");
        }
        setIsMenuOpen(false);
    };

    const handleLoad = () => {
        onLoadState?.();
        setIsMenuOpen(false);
    };

    const handleBulkMarkdownLoad = async () => {
        try {
            // Dynamically import the bulk markdown load function
            const { triggerBulkMarkdownLoad } = await import('../../lib/canvas-state-manager');
            const result = await triggerBulkMarkdownLoad();

            if (result.success && result.files) {
                // Create File objects from the loaded content
                const files = result.files.map(({ filename, content }) => {
                    const blob = new Blob([content], { type: 'text/markdown' });
                    return new File([blob], filename, { type: 'text/markdown' });
                });

                // Dispatch event to create markdown notes
                window.dispatchEvent(new CustomEvent('canvas:load-markdown-files', {
                    detail: { files },
                }));

                showMessage(`✓ Loading ${files.length} markdown files...`);
            } else if (result.error && result.error !== "Cancelled") {
                showMessage(`✗ ${result.error}`);
            }
        } catch (err) {
            console.error("Bulk markdown load error:", err);
            showMessage("✗ Failed to load markdown files");
        }
        setIsMenuOpen(false);
    };

    const handleGenerateImage = () => {
        // Open image generation modal directly without opening AI chat
        window.dispatchEvent(new CustomEvent("imagegen:open"));
    };

    // Note: Controls now always visible for access to Save/Load
    const isPanelOpen = false; // isChatOpen || isAssetsOpen;

    return (
        <>
            {/* Right side controls - vertically centered */}
            {!isPanelOpen && (
                <div className="canvas-controls">
                    {/* Generate Image - Top action with animation when selected */}
                    <button 
                        onClick={handleGenerateImage} 
                        className={`control-btn image-gen-btn ${hasSelection ? 'has-selection' : ''}`}
                        title="Generate image from canvas"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                        </svg>
                        <span className="label">Generate Image</span>
                    </button>

                    {/* Primary actions - most used */}
                    <button onClick={onOpenChat} className="control-btn chat-btn" title="Open AI Chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span className="label">AI Chat</span>
                    </button>

                    {onCreateMarkdown && (
                        <button onClick={onCreateMarkdown} className="control-btn note-btn" title="Add a note">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="12" y1="18" x2="12" y2="12"/>
                                <line x1="9" y1="15" x2="15" y2="15"/>
                            </svg>
                            <span className="label">Add Note</span>
                        </button>
                    )}

                    <button onClick={onOpenAssets} className="control-btn assets-btn" title="Browse My Assets">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span className="label">My Assets</span>
                    </button>

                    {onShare && (
                        <button onClick={onShare} className="control-btn share-btn" title="Share for real-time collaboration">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="5" r="3"/>
                                <circle cx="6" cy="12" r="3"/>
                                <circle cx="18" cy="19" r="3"/>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                            <span className="label">Share</span>
                        </button>
                    )}

                    {/* Divider */}
                    <div className="divider"></div>

                    {/* Menu button - contains Save, Load, Export */}
                    <div ref={menuRef} style={{ position: "relative" }}>
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)} 
                            className="control-btn menu-btn" 
                            title="More options"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="5" r="2"/>
                                <circle cx="12" cy="12" r="2"/>
                                <circle cx="12" cy="19" r="2"/>
                            </svg>
                            <span className="label">Menu</span>
                        </button>

                        {isMenuOpen && (
                            <div
                                style={{
                                    position: "absolute",
                                    right: "100%",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    marginRight: "10px",
                                    background: "white",
                                    border: "2px solid var(--color-stroke, #333)",
                                    borderRadius: "10px",
                                    boxShadow: "3px 3px 0 var(--color-stroke, #333)",
                                    minWidth: "160px",
                                    zIndex: 1001,
                                    overflow: "hidden",
                                }}
                            >
                                <button
                                    onClick={handleSave}
                                    disabled={false}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        border: "none",
                                        borderBottom: "1px solid #eee",
                                        background: "white",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        color: "#333",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        fontFamily: "var(--font-hand, sans-serif)",
                                        fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                        <polyline points="17 21 17 13 7 13 7 21"/>
                                        <polyline points="7 3 7 8 15 8"/>
                                    </svg>
                                    Save as .rj
                                </button>
                                <button
                                    onClick={handleLoad}
                                    disabled={!onLoadState}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        border: "none",
                                        borderBottom: "1px solid #eee",
                                        background: "white",
                                        textAlign: "left",
                                        cursor: onLoadState ? "pointer" : "not-allowed",
                                        fontSize: "0.85rem",
                                        color: onLoadState ? "#333" : "#999",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        fontFamily: "var(--font-hand, sans-serif)",
                                        fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => onLoadState && (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="17 8 12 3 7 8"/>
                                        <line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                    Load (.rj/.excalidraw/.md)
                                </button>
                                <button
                                    onClick={handleBulkMarkdownLoad}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        border: "none",
                                        borderBottom: "1px solid #eee",
                                        background: "white",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        color: "#333",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        fontFamily: "var(--font-hand, sans-serif)",
                                        fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                        <line x1="10" y1="9" x2="8" y2="9"/>
                                    </svg>
                                    Load Markdown (Bulk)
                                </button>
                                <div style={{ height: "1px", background: "#eee" }} />
                                <button
                                    onClick={handleExportPNG}
                                    disabled={isExporting}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        border: "none",
                                        borderBottom: "1px solid #eee",
                                        background: "white",
                                        textAlign: "left",
                                        cursor: isExporting ? "not-allowed" : "pointer",
                                        fontSize: "0.85rem",
                                        color: "#333",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        fontFamily: "var(--font-hand, sans-serif)",
                                        fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => !isExporting && (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                        <polyline points="21 15 16 10 5 21"/>
                                    </svg>
                                    Export PNG
                                </button>
                                <button
                                    onClick={handleExportSVG}
                                    disabled={isExporting}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        border: "none",
                                        background: "white",
                                        textAlign: "left",
                                        cursor: isExporting ? "not-allowed" : "pointer",
                                        fontSize: "0.85rem",
                                        color: "#333",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        fontFamily: "var(--font-hand, sans-serif)",
                                        fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => !isExporting && (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                        <polyline points="10 9 9 9 8 9"/>
                                    </svg>
                                    Export SVG
                                </button>
                            </div>
                        )}
                    </div>
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
                    gap: 0.5rem;
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
                    gap: 0.5rem;
                    padding: 0.5rem;
                    min-width: 2.25rem;
                    min-height: 2.25rem;
                    background: var(--color-surface, white);
                    border: 2px solid var(--color-stroke, #333);
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: var(--font-hand, sans-serif);
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--color-text, #333);
                    box-shadow: 2px 2px 0 var(--color-stroke, #333);
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
                    margin-right: 0.625rem;
                    padding: 0.5rem 0.875rem;
                    background: var(--color-surface, white);
                    border: 2px solid var(--color-stroke, #333);
                    border-radius: 8px;
                    box-shadow: 2px 2px 0 var(--color-stroke, #333);
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    transform: translateX(10px);
                    z-index: 1;
                }

                .control-btn:hover {
                    transform: translate(-1px, -1px);
                    box-shadow: 2px 2px 0 var(--color-stroke, #333);
                    background: var(--color-fill-1, #f8f9fa);
                }

                .control-btn:active {
                    transform: translate(1px, 1px);
                    box-shadow: 1px 1px 0 var(--color-stroke, #333);
                }

                .control-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .control-btn:disabled:hover {
                    transform: none;
                    box-shadow: 2px 2px 0 var(--color-stroke, #333);
                }

                /* Specific button styles */
                .chat-btn:hover {
                    background: #ffe8d6;
                    border-color: #d97706;
                }

                .chat-btn:hover .label {
                    background: #ffe8d6;
                    border-color: #d97706;
                    box-shadow: 2px 2px 0 #d97706;
                }

                .assets-btn:hover {
                    background: #ebfbee;
                    border-color: #2f9e44;
                }

                .assets-btn:hover .label {
                    background: #ebfbee;
                    border-color: #2f9e44;
                    box-shadow: 2px 2px 0 #2f9e44;
                }

                .share-btn:hover {
                    background: #f3e8ff;
                    border-color: #9c36b5;
                }

                .share-btn:hover .label {
                    background: #f3e8ff;
                    border-color: #9c36b5;
                    box-shadow: 2px 2px 0 #9c36b5;
                }

                .note-btn:hover {
                    background: #fff9db;
                    border-color: #fab005;
                }

                .note-btn:hover .label {
                    background: #fff9db;
                    border-color: #fab005;
                    box-shadow: 2px 2px 0 #fab005;
                }

                .menu-btn:hover {
                    background: #f8f9fa;
                    border-color: #868e96;
                }

                .menu-btn:hover .label {
                    background: #f8f9fa;
                    border-color: #868e96;
                    box-shadow: 2px 2px 0 #868e96;
                }

                .image-gen-btn:hover {
                    background: #e3f2ff;
                    border-color: #1971c2;
                }

                .image-gen-btn:hover .label {
                    background: #e3f2ff;
                    border-color: #1971c2;
                    box-shadow: 2px 2px 0 #1971c2;
                }

                .image-gen-btn.has-selection {
                    animation: selection-pulse 2s ease-in-out infinite;
                }

                @keyframes selection-pulse {
                    0%, 100% {
                        box-shadow: 2px 2px 0 var(--color-stroke, #333), 0 0 0 0 rgba(0, 0, 0, 0.2);
                    }
                    50% {
                        box-shadow: 2px 2px 0 var(--color-stroke, #333), 0 0 0 8px rgba(0, 0, 0, 0);
                    }
                }

                .export-btn:hover:not(:disabled) {
                    background: #fff3bf;
                    border-color: #f59f00;
                }

                .export-btn:hover:not(:disabled) .label {
                    background: #fff3bf;
                    border-color: #f59f00;
                    box-shadow: 2px 2px 0 #f59f00;
                }

                .save-btn:hover:not(:disabled) {
                    background: #e7f5ff;
                    border-color: #339af0;
                }

                .save-btn:hover:not(:disabled) .label {
                    background: #e7f5ff;
                    border-color: #339af0;
                    box-shadow: 2px 2px 0 #339af0;
                }

                .load-btn:hover:not(:disabled) {
                    background: #f3f0ff;
                    border-color: #7950f2;
                }

                .load-btn:hover:not(:disabled) .label {
                    background: #f3f0ff;
                    border-color: #7950f2;
                    box-shadow: 2px 2px 0 #7950f2;
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
