import { useState, useEffect, useRef, useCallback } from "react";

interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    timestamp: Date;
}

interface MyAssetsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    imageHistory?: GeneratedImage[];
    onImageHistoryChange?: (history: GeneratedImage[]) => void;
}

// Popular icon collections from Iconify
const ICON_COLLECTIONS = [
    { id: "heroicons", name: "Heroicons", prefix: "heroicons" },
    { id: "material-symbols", name: "Material", prefix: "material-symbols" },
    { id: "lucide", name: "Lucide", prefix: "lucide" },
    { id: "ph", name: "Phosphor", prefix: "ph" },
    { id: "carbon", name: "Carbon", prefix: "carbon" },
    { id: "tabler", name: "Tabler", prefix: "tabler" },
];

// Popular icon names to show by default
const POPULAR_ICONS = [
    "user", "users", "heart", "star", "home", "settings", "search",
    "mail", "phone", "calendar", "clock", "chart", "folder", "file",
    "image", "video", "music", "download", "upload", "cloud", "database",
    "check", "x", "plus", "minus", "arrow-right", "arrow-left", "arrow-up",
    "arrow-down", "edit", "trash", "copy", "link", "external-link", "menu",
    "shopping-cart", "credit-card", "gift", "bookmark", "tag", "filter"
];

export default function MyAssetsPanel({
    isOpen,
    onClose,
    imageHistory = [],
    onImageHistoryChange
}: MyAssetsPanelProps) {
    const [activeTab, setActiveTab] = useState<"icons" | "generated">("icons");
    const [selectedCollection, setSelectedCollection] = useState(ICON_COLLECTIONS[0].prefix);
    const [searchQuery, setSearchQuery] = useState("");
    const [icons, setIcons] = useState<string[]>(POPULAR_ICONS);
    const [loading, setLoading] = useState(false);
    const [panelWidth, setPanelWidth] = useState(360);
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<number | null>(null);

    // Use external imageHistory if provided
    const isExternalHistory = onImageHistoryChange !== undefined;
    const [localGeneratedImages, setLocalGeneratedImages] = useState<GeneratedImage[]>([]);
    const generatedImages = isExternalHistory ? imageHistory : localGeneratedImages;

    // Helper to add a new image to history
    const addGeneratedImage = useCallback((imageUrl: string, prompt?: string) => {
        const newImage: GeneratedImage = {
            id: Date.now().toString(),
            url: imageUrl,
            prompt: prompt || "Generated Image",
            timestamp: new Date(),
        };

        if (isExternalHistory && onImageHistoryChange) {
            onImageHistoryChange([newImage, ...generatedImages]);
        } else {
            setLocalGeneratedImages(prev => [newImage, ...prev]);
        }
    }, [isExternalHistory, onImageHistoryChange, generatedImages]);

    // Helper to delete an image from history
    const deleteGeneratedImage = useCallback((id: string) => {
        if (isExternalHistory && onImageHistoryChange) {
            onImageHistoryChange(generatedImages.filter(img => img.id !== id));
        } else {
            setLocalGeneratedImages(prev => prev.filter(img => img.id !== id));
        }
    }, [isExternalHistory, onImageHistoryChange, generatedImages]);

    // Listen for new generated images
    useEffect(() => {
        const handleImageGenerated = (event: any) => {
            const { imageUrl, prompt } = event.detail;
            if (imageUrl) {
                addGeneratedImage(imageUrl, prompt);
            }
        };
        window.addEventListener("asset:image-generated", handleImageGenerated);
        return () => window.removeEventListener("asset:image-generated", handleImageGenerated);
    }, [addGeneratedImage]);

    // Search icons using Iconify API
    const searchIcons = useCallback(async (query: string, collection: string) => {
        if (!query.trim()) {
            setIcons(POPULAR_ICONS);
            return;
        }

        setLoading(true);
        try {
            // Search Iconify API
            const response = await fetch(
                `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefix=${collection}&limit=40`
            );
            const data = await response.json();

            if (data.icons && data.icons.length > 0) {
                setIcons(data.icons);
            } else {
                setIcons([]);
            }
        } catch (error) {
            console.error("Failed to search icons:", error);
            setIcons([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = window.setTimeout(() => {
            searchIcons(searchQuery, selectedCollection);
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, selectedCollection, searchIcons]);

    // Insert icon into canvas
    const handleIconClick = async (iconName: string) => {
        try {
            // Fetch SVG data from Iconify API
            const response = await fetch(
                `https://api.iconify.design/${selectedCollection}/${iconName}.svg?height=200`
            );
            const svgText = await response.text();

            // Convert SVG to base64 data URL (so it syncs across users)
            const base64 = btoa(unescape(encodeURIComponent(svgText)));
            const dataUrl = `data:image/svg+xml;base64,${base64}`;

            // Dispatch event to insert into canvas
            window.dispatchEvent(new CustomEvent("excalidraw:insert-image", {
                detail: {
                    imageData: dataUrl,
                    type: "svg+xml",
                    width: 200,
                    height: 200,
                },
            }));

            console.log(`✅ Inserted icon: ${selectedCollection}:${iconName} (base64 data URL)`);
        } catch (error) {
            console.error("Failed to insert icon:", error);
        }
    };

    // Insert generated image into canvas
    const handleImageClick = (image: GeneratedImage) => {
        const img = new Image();
        img.onload = () => {
            const aspectRatio = img.width / img.height;
            const maxWidth = 400;
            const width = Math.min(img.width, maxWidth);
            const height = width / aspectRatio;

            window.dispatchEvent(new CustomEvent("excalidraw:insert-image", {
                detail: {
                    imageData: image.url,
                    type: "png",
                    width,
                    height,
                },
            }));
        };
        img.src = image.url;
    };

    // Panel resizing
    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            setPanelWidth(Math.max(300, Math.min(800, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    if (!isOpen) return null;

    const filteredImages = generatedImages.filter((img) => {
        return searchQuery === "" ||
            img.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <>
            <div
                ref={panelRef}
                className="assets-panel"
                style={{ width: `${panelWidth}px` }}
            >
                {/* Resize handle */}
                <div className="resize-handle" onMouseDown={startResize} />

                {/* Header */}
                <div className="panel-header">
                    <h2>My Assets</h2>
                    <button className="close-btn" onClick={onClose} title="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === "icons" ? "active" : ""}`}
                        onClick={() => setActiveTab("icons")}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                            <line x1="9" y1="9" x2="9.01" y2="9"/>
                            <line x1="15" y1="9" x2="15.01" y2="9"/>
                        </svg>
                        Icons
                    </button>
                    <button
                        className={`tab ${activeTab === "generated" ? "active" : ""}`}
                        onClick={() => setActiveTab("generated")}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                        </svg>
                        Generated ({generatedImages.length})
                    </button>
                </div>

                {/* Search bar */}
                <div className="search-container">
                    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        type="text"
                        placeholder={activeTab === "icons" ? "Search icons..." : "Search images..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button className="clear-search" onClick={() => setSearchQuery("")}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    )}
                </div>

                {/* Icon collections (only show for icons tab) */}
                {activeTab === "icons" && (
                    <div className="collections">
                        {ICON_COLLECTIONS.map((collection) => (
                            <button
                                key={collection.id}
                                className={`collection-btn ${selectedCollection === collection.prefix ? "active" : ""}`}
                                onClick={() => {
                                    setSelectedCollection(collection.prefix);
                                    setSearchQuery(""); // Reset search when switching collection
                                }}
                            >
                                {collection.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="content">
                    {activeTab === "icons" ? (
                        <>
                            {loading ? (
                                <div className="loading">
                                    <div className="spinner" />
                                    <p>Searching icons...</p>
                                </div>
                            ) : icons.length === 0 ? (
                                <div className="empty-state">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="11" cy="11" r="8"/>
                                        <path d="m21 21-4.35-4.35"/>
                                    </svg>
                                    <p>No icons found</p>
                                    <p className="hint">Try a different search term</p>
                                </div>
                            ) : (
                                <div className="icon-grid">
                                    {icons.map((iconName) => (
                                        <button
                                            key={iconName}
                                            className="icon-item"
                                            onClick={() => handleIconClick(iconName)}
                                            title={iconName}
                                        >
                                            <img
                                                src={`https://api.iconify.design/${selectedCollection}/${iconName}.svg?height=32`}
                                                alt={iconName}
                                                width="32"
                                                height="32"
                                            />
                                            <span className="icon-name">{iconName.replace(/-/g, ' ')}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {filteredImages.length === 0 ? (
                                <div className="empty-state">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                        <path d="M21 15l-5-5L5 21"/>
                                    </svg>
                                    <p>No generated images yet</p>
                                    <p className="hint">Use "Generate Image" to create AI images</p>
                                </div>
                            ) : (
                                <div className="image-grid">
                                    {filteredImages.map((image) => (
                                        <div key={image.id} className="image-item">
                                            <img
                                                src={image.url}
                                                alt={image.prompt}
                                                onClick={() => handleImageClick(image)}
                                                className="image-preview"
                                            />
                                            <div className="image-info">
                                                <p className="image-prompt">{image.prompt}</p>
                                                <button
                                                    className="delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteGeneratedImage(image.id);
                                                    }}
                                                    title="Delete"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer info */}
                <div className="panel-footer">
                    <p className="footer-text">
                        {activeTab === "icons" ? (
                            <>Powered by <a href="https://iconify.design" target="_blank" rel="noopener">Iconify</a> • 200,000+ icons</>
                        ) : (
                            <>AI-generated images sync across all users</>
                        )}
                    </p>
                </div>
            </div>

            <style>{`
                .assets-panel {
                    position: fixed;
                    right: 0;
                    top: 0;
                    height: 100vh;
                    background: var(--color-surface, white);
                    border-left: 2px solid var(--color-stroke, #333);
                    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
                    display: flex;
                    flex-direction: column;
                    z-index: 1000;
                    font-family: var(--font-hand, sans-serif);
                }

                .resize-handle {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    cursor: ew-resize;
                    background: transparent;
                    transition: background 0.2s;
                }

                .resize-handle:hover {
                    background: var(--color-accent, #667eea);
                }

                .panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.5rem;
                    border-bottom: 2px solid var(--color-stroke-muted, #e5e5e5);
                }

                .panel-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--color-text, #333);
                }

                .close-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem;
                    color: var(--color-text-muted, #666);
                    transition: color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close-btn:hover {
                    color: var(--color-text, #333);
                }

                .tabs {
                    display: flex;
                    gap: 0.5rem;
                    padding: 1rem 1.5rem 0;
                }

                .tab {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: transparent;
                    border: 2px solid var(--color-stroke-muted, #e5e5e5);
                    border-bottom: none;
                    border-radius: 8px 8px 0 0;
                    font-family: var(--font-hand, sans-serif);
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--color-text-muted, #666);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tab:hover {
                    background: var(--color-fill-1, #f8f9fa);
                }

                .tab.active {
                    background: var(--color-surface, white);
                    border-color: var(--color-stroke, #333);
                    color: var(--color-text, #333);
                }

                .search-container {
                    position: relative;
                    padding: 1rem 1.5rem;
                    border-bottom: 2px solid var(--color-stroke-muted, #e5e5e5);
                }

                .search-icon {
                    position: absolute;
                    left: 2rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--color-text-muted, #666);
                    pointer-events: none;
                }

                .search-input {
                    width: 100%;
                    padding: 0.75rem 2.5rem 0.75rem 2.75rem;
                    border: 2px solid var(--color-stroke-muted, #e5e5e5);
                    border-radius: 8px;
                    font-family: var(--font-hand, sans-serif);
                    font-size: 0.9rem;
                    color: var(--color-text, #333);
                    background: var(--color-fill-1, #f8f9fa);
                    transition: all 0.2s;
                    box-sizing: border-box;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--color-accent, #667eea);
                    background: white;
                }

                .clear-search {
                    position: absolute;
                    right: 2rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem;
                    color: var(--color-text-muted, #666);
                    display: flex;
                    align-items: center;
                    transition: color 0.2s;
                }

                .clear-search:hover {
                    color: var(--color-text, #333);
                }

                .collections {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    padding: 1rem 1.5rem;
                    border-bottom: 2px solid var(--color-stroke-muted, #e5e5e5);
                }

                .collection-btn {
                    padding: 0.5rem 0.875rem;
                    background: var(--color-fill-1, #f8f9fa);
                    border: 2px solid var(--color-stroke-muted, #e5e5e5);
                    border-radius: 6px;
                    font-family: var(--font-hand, sans-serif);
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--color-text-muted, #666);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .collection-btn:hover {
                    background: white;
                    border-color: var(--color-stroke, #333);
                }

                .collection-btn.active {
                    background: var(--color-accent, #667eea);
                    border-color: var(--color-accent, #667eea);
                    color: white;
                }

                .content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                }

                .loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    gap: 1rem;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--color-stroke-muted, #e5e5e5);
                    border-top-color: var(--color-accent, #667eea);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 1rem;
                    color: var(--color-text-muted, #666);
                    text-align: center;
                }

                .empty-state svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state p {
                    margin: 0.5rem 0;
                    font-weight: 600;
                }

                .empty-state .hint {
                    font-size: 0.85rem;
                    font-weight: 400;
                    opacity: 0.7;
                }

                .icon-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 0.75rem;
                }

                .icon-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.875rem;
                    background: var(--color-fill-1, #f8f9fa);
                    border: 2px solid var(--color-stroke-muted, #e5e5e5);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 2px 2px 0 var(--color-stroke-muted, #e5e5e5);
                }

                .icon-item:hover {
                    background: white;
                    border-color: var(--color-accent, #667eea);
                    transform: translate(-1px, -1px);
                    box-shadow: 3px 3px 0 var(--color-accent, #667eea);
                }

                .icon-item img {
                    width: 32px;
                    height: 32px;
                    object-fit: contain;
                }

                .icon-name {
                    font-size: 0.7rem;
                    color: var(--color-text-muted, #666);
                    text-align: center;
                    line-height: 1.2;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    text-transform: capitalize;
                }

                .image-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 1rem;
                }

                .image-item {
                    position: relative;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 2px solid var(--color-stroke-muted, #e5e5e5);
                    background: var(--color-fill-1, #f8f9fa);
                    box-shadow: 2px 2px 0 var(--color-stroke-muted, #e5e5e5);
                    transition: all 0.2s;
                }

                .image-item:hover {
                    border-color: var(--color-stroke, #333);
                    transform: translate(-1px, -1px);
                    box-shadow: 3px 3px 0 var(--color-stroke, #333);
                }

                .image-preview {
                    width: 100%;
                    aspect-ratio: 1;
                    object-fit: cover;
                    cursor: pointer;
                    display: block;
                }

                .image-info {
                    padding: 0.75rem;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 0.5rem;
                }

                .image-prompt {
                    flex: 1;
                    margin: 0;
                    font-size: 0.75rem;
                    color: var(--color-text-muted, #666);
                    line-height: 1.3;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }

                .delete-btn {
                    flex-shrink: 0;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem;
                    color: var(--color-text-muted, #666);
                    transition: color 0.2s;
                    display: flex;
                    align-items: center;
                }

                .delete-btn:hover {
                    color: #e03131;
                }

                .panel-footer {
                    padding: 1rem 1.5rem;
                    border-top: 2px solid var(--color-stroke-muted, #e5e5e5);
                    background: var(--color-fill-1, #f8f9fa);
                }

                .footer-text {
                    margin: 0;
                    font-size: 0.75rem;
                    color: var(--color-text-muted, #666);
                    text-align: center;
                }

                .footer-text a {
                    color: var(--color-accent, #667eea);
                    text-decoration: none;
                    font-weight: 600;
                }

                .footer-text a:hover {
                    text-decoration: underline;
                }

                @media (max-width: 768px) {
                    .assets-panel {
                        width: 100% !important;
                    }

                    .resize-handle {
                        display: none;
                    }

                    .icon-grid {
                        grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
                    }

                    .image-grid {
                        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    }
                }
            `}</style>
        </>
    );
}
