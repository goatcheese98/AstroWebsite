import { useState, useRef, useEffect } from "react";


interface CanvasControlsProps {
    onOpenChat: () => void;
    onOpenAssets: () => void;
    isChatOpen: boolean;
    isAssetsOpen: boolean;
    onSaveState?: () => void;
    onLoadState?: () => void;
    onCreateMarkdown?: () => void;
    onCreateWebEmbed?: () => void;
    onCreateLexical?: () => void;
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
    onCreateWebEmbed,
    onCreateLexical,
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
                    {/* User Menu - Top */}


                    {/* Generate Image - Top action with animation when selected */}
                    <button
                        onClick={handleGenerateImage}
                        className={`control-btn image-gen-btn ${hasSelection ? 'has-selection' : ''}`}
                        title="Generate image from canvas"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span className="label">Generate Image</span>
                    </button>

                    {/* Primary actions - most used */}
                    <button onClick={onOpenChat} className="control-btn chat-btn" title="Open AI Chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="label">AI Chat</span>
                    </button>

                    {onCreateMarkdown && (
                        <button onClick={onCreateMarkdown} className="control-btn note-btn" title="Add a markdown note">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="12" y1="18" x2="12" y2="12" />
                                <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                            <span className="label">Markdown Note</span>
                        </button>
                    )}

                    {onCreateLexical && (
                        <button onClick={onCreateLexical} className="control-btn rich-text-btn" title="Add a rich text note">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 7V4h16v3" />
                                <path d="M9 20h6" />
                                <path d="M12 4v16" />
                                <path d="M8 12h8" />
                            </svg>
                            <span className="label">Rich Text</span>
                        </button>
                    )}

                    {onCreateWebEmbed && (
                        <button onClick={onCreateWebEmbed} className="control-btn embed-btn" title="Embed a website">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <span className="label">Web Embed</span>
                        </button>
                    )}

                    <button onClick={onOpenAssets} className="control-btn assets-btn" title="Browse My Assets">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="label">My Assets</span>
                    </button>

                    {onShare && (
                        <button onClick={onShare} className="control-btn share-btn" title="Share & Collaborate">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                            </svg>
                            <span className="label">Menu</span>
                        </button>

                        {isMenuOpen && (
                            <div className="dropdown-menu">
                                <button
                                    onClick={handleSave}
                                    disabled={false}
                                    className="dropdown-item"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                        <polyline points="17 21 17 13 7 13 7 21" />
                                        <polyline points="7 3 7 8 15 8" />
                                    </svg>
                                    Save as .rj
                                </button>
                                <button
                                    onClick={handleLoad}
                                    disabled={!onLoadState}
                                    className="dropdown-item"
                                    style={{ opacity: onLoadState ? 1 : 0.5, cursor: onLoadState ? 'pointer' : 'not-allowed' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Load (.rj/.excalidraw/.md)
                                </button>
                                <button
                                    onClick={handleBulkMarkdownLoad}
                                    className="dropdown-item"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <line x1="10" y1="9" x2="8" y2="9" />
                                    </svg>
                                    Load Markdown (Bulk)
                                </button>
                                <div className="dropdown-divider" />
                                <button
                                    onClick={handleExportPNG}
                                    disabled={isExporting}
                                    className="dropdown-item"
                                    style={{ opacity: isExporting ? 0.5 : 1, cursor: isExporting ? 'not-allowed' : 'pointer' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                    Export PNG
                                </button>
                                <button
                                    onClick={handleExportSVG}
                                    disabled={isExporting}
                                    className="dropdown-item"
                                    style={{ opacity: isExporting ? 0.5 : 1, cursor: isExporting ? 'not-allowed' : 'pointer' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
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
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    z-index: 1000;
                    pointer-events: none;
                    background: white;
                    padding: 2px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                }

                .canvas-controls > * {
                    pointer-events: auto;
                }

                .control-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: white;
                    border: 1px solid transparent;
                    border-radius: 7px;
                    cursor: pointer;
                    color: #4b5563;
                    transition: all 0.15s ease;
                    position: relative;
                }

                .control-btn svg {
                    width: 16px;
                    height: 16px;
                    stroke-width: 2.2;
                }

                .control-btn:hover {
                    background: #f3f4f6;
                    color: #111827;
                }

                .control-btn:active {
                    background: #e5e7eb;
                }

                .control-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .control-btn .label {
                    position: absolute;
                    right: 100%;
                    top: 50%;
                    transform: translateY(-50%) translateX(-8px);
                    padding: 4px 8px;
                    background: #111827;
                    color: white;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 500;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.2s ease;
                    z-index: 1002;
                }

                .control-btn:hover .label {
                    opacity: 1;
                    transform: translateY(-50%) translateX(-12px);
                }

                /* Active/Selected State for toggle buttons */
                .control-btn.active {
                    background: #eef2ff;
                    color: #4f46e5;
                    border-color: #c7d2fe;
                }

                .image-gen-btn.has-selection {
                   background: #f0fdf4;
                   color: #16a34a;
                   border-color: #bbf7d0;
                }

                .divider {
                    height: 1px;
                    background: #e5e7eb;
                    margin: 4px 6px;
                }

                .dropdown-menu {
                    position: absolute;
                    right: 48px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.1);
                    min-width: 200px;
                    z-index: 1001;
                    padding: 6px;
                }

                .dropdown-item {
                    width: 100%;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 6px;
                    background: transparent;
                    text-align: left;
                    cursor: pointer;
                    font-size: 0.8rem;
                    color: #374151;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-family: var(--font-ui, sans-serif);
                    font-weight: 500;
                    transition: background 0.15s ease;
                }

                .dropdown-item:hover {
                    background: #f3f4f6;
                    color: #111827;
                }

                .dropdown-divider {
                    height: 1px;
                    background: #e5e7eb;
                    margin: 6px 8px;
                }

                .toast-message {
                    position: fixed;
                    bottom: 2rem;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 10px 20px;
                    background: #111827;
                    color: white;
                    border-radius: 8px;
                    font-family: var(--font-ui, sans-serif);
                    font-size: 0.85rem;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 2000;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUp {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }

                @media (max-width: 768px) {
                    .canvas-controls {
                        right: 8px;
                        top: auto;
                        bottom: 80px;
                        padding: 2px;
                    }
                    .control-btn {
                       width: 32px;
                       height: 32px;
                    }
                    .control-btn:hover .label {
                        display: none;
                    }
                }
            `}</style>
        </>
    );
}
