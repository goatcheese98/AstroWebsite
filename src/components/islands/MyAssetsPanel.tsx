import { useState, useEffect, useRef, useCallback } from "react";
import { svgLibrary, categories, type SVGMetadata } from "../../lib/svg-library-config";

interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    timestamp: Date;
}

interface MyAssetsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    /** Image history from useImageGeneration hook (for persistence) */
    imageHistory?: GeneratedImage[];
    /** Callback when image history changes (for persistence) */
    onImageHistoryChange?: (history: GeneratedImage[]) => void;
}

export default function MyAssetsPanel({ 
    isOpen, 
    onClose, 
    imageHistory = [], 
    onImageHistoryChange 
}: MyAssetsPanelProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("generated");
    const [searchQuery, setSearchQuery] = useState("");
    const [panelWidth, setPanelWidth] = useState(360);
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    
    // Use external imageHistory if provided, otherwise fall back to local state
    const isExternalHistory = onImageHistoryChange !== undefined;
    const [localGeneratedImages, setLocalGeneratedImages] = useState<GeneratedImage[]>([]);
    
    // Use external or local state
    const generatedImages = isExternalHistory ? imageHistory : localGeneratedImages;
    
    // Helper to add a new image to history (handles both external and local state)
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

    const filteredSvgs = svgLibrary.filter((svg) => {
        const matchesCategory = selectedCategory === "all" || svg.category === selectedCategory;
        const matchesSearch = searchQuery === "" ||
            svg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            svg.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const filteredImages = generatedImages.filter((img) => {
        return searchQuery === "" ||
            img.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleSvgClick = (svg: SVGMetadata) => {
        window.dispatchEvent(new CustomEvent("excalidraw:insert-svg", {
            detail: { svgPath: svg.path, svgId: svg.id },
        }));
    };

    const handleImageClick = (image: GeneratedImage) => {
        // Insert image into canvas without opening chat
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

    const handleDeleteImage = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // Show confirmation dialog
        const confirmed = window.confirm("Delete this generated image? This cannot be undone.");
        if (confirmed) {
            deleteGeneratedImage(id);
            // Show success toast
            window.dispatchEvent(new CustomEvent("canvas:show-toast", {
                detail: { message: "Image deleted", type: "info" }
            }));
        }
    };

    const handleCopyImage = async (e: React.MouseEvent, image: GeneratedImage) => {
        e.stopPropagation();
        try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            // Dispatch toast event for copy success
            window.dispatchEvent(new CustomEvent("canvas:show-toast", {
                detail: { message: "Image copied to clipboard!", type: "success" }
            }));
        } catch (err) {
            console.error("Failed to copy image:", err);
            window.dispatchEvent(new CustomEvent("canvas:show-toast", {
                detail: { message: "Failed to copy image", type: "info" }
            }));
        }
    };

    // Resize functionality
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const newWidth = window.innerWidth - e.clientX;
            const minWidth = 280;
            const maxWidth = window.innerWidth * 0.6;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                setPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isResizing) {
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="assets-panel" style={{ width: `${panelWidth}px` }}>
                <div className="resize-handle" onMouseDown={handleResizeStart} />
                <div className="panel-header">
                    <h3 className="panel-title">📦 My Assets</h3>
                    <button onClick={onClose} className="close-btn">
                        ✕
                    </button>
                </div>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="category-tabs">
                    <button
                        onClick={() => setSelectedCategory("generated")}
                        className={`category-tab ${selectedCategory === "generated" ? "active" : ""}`}
                    >
                        ✨ Generated
                    </button>
                    <button
                        onClick={() => setSelectedCategory("all")}
                        className={`category-tab ${selectedCategory === "all" ? "active" : ""}`}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`category-tab ${selectedCategory === cat.id ? "active" : ""}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="svg-grid">
                    {selectedCategory === "generated" ? (
                        // Generated Images Grid
                        filteredImages.length === 0 ? (
                            <div className="empty-state">
                                No generated images yet.<br />
                                Click "Generate Image" to create some!
                            </div>
                        ) : (
                            filteredImages.map((img) => (
                                <button
                                    key={img.id}
                                    onClick={() => handleImageClick(img)}
                                    className="svg-item generated-image-item"
                                    title={img.prompt}
                                >
                                    <img src={img.url} alt={img.prompt} className="svg-preview" />
                                    <span className="svg-name">{img.prompt.slice(0, 30)}{img.prompt.length > 30 ? "..." : ""}</span>
                                    <div className="image-actions">
                                        <button 
                                            className="copy-image-btn"
                                            onClick={(e) => handleCopyImage(e, img)}
                                            title="Copy image"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        </button>
                                        <button 
                                            className="delete-image-btn"
                                            onClick={(e) => handleDeleteImage(e, img.id)}
                                            title="Delete image"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </button>
                            ))
                        )
                    ) : (
                        // SVG Library Grid
                        filteredSvgs.length === 0 ? (
                            <div className="empty-state">No assets found</div>
                        ) : (
                            filteredSvgs.map((svg) => (
                                <button
                                    key={svg.id}
                                    onClick={() => handleSvgClick(svg)}
                                    className="svg-item"
                                    title={svg.description}
                                >
                                    <img src={svg.path} alt={svg.name} className="svg-preview" />
                                    <span className="svg-name">{svg.name}</span>
                                </button>
                            ))
                        )
                    )}
                </div>

                <style>{`
                    .assets-panel {
                        position: fixed;
                        right: 0;
                        top: 0;
                        bottom: 0;
                        background: var(--color-surface, white);
                        border-left: 2px solid var(--color-stroke, #333);
                        display: flex;
                        flex-direction: column;
                        z-index: 999;
                        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
                    }

                    .resize-handle {
                        position: absolute;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        width: 6px;
                        cursor: ew-resize;
                        background: transparent;
                        z-index: 1000;
                    }

                    .resize-handle:hover {
                        background: var(--color-stroke-muted, #ddd);
                    }

                    .resize-handle:active {
                        background: var(--color-stroke, #333);
                    }

                    .panel-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 1rem 1.25rem;
                        border-bottom: 2px solid var(--color-stroke, #333);
                        background: var(--color-bg, #fafafa);
                    }

                    .panel-title {
                        margin: 0;
                        font-family: var(--font-hand, sans-serif);
                        font-size: 1.125rem;
                        font-weight: 600;
                        color: var(--color-text, #333);
                    }

                    .close-btn {
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 1.25rem;
                        color: var(--color-text-muted, #666);
                        padding: 0.25rem;
                        transition: color 0.2s;
                    }

                    .close-btn:hover {
                        color: var(--color-text, #333);
                    }

                    .search-container {
                        padding: 1rem 1.25rem;
                        border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                    }

                    .search-input {
                        width: 100%;
                        padding: 0.625rem 0.875rem;
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        border-radius: 6px;
                        background: var(--color-bg, white);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                        color: var(--color-text, #333);
                        outline: none;
                    }

                    .category-tabs {
                        display: flex;
                        gap: 0.375rem;
                        padding: 0.875rem 1.25rem;
                        border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                        overflow-x: auto;
                    }

                    .category-tab {
                        padding: 0.5rem 0.875rem;
                        background: var(--color-bg, white);
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.75rem;
                        font-weight: 500;
                        color: var(--color-text, #333);
                        white-space: nowrap;
                        transition: all 0.2s;
                    }

                    .category-tab:hover {
                        background: var(--color-fill-1, #e9ecef);
                    }

                    .category-tab.active {
                        background: var(--color-fill-1, #e9ecef);
                        border-color: var(--color-stroke, #333);
                        font-weight: 600;
                    }

                    .svg-grid {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1.25rem;
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
                        gap: 0.875rem;
                        align-content: start;
                    }

                    .empty-state {
                        grid-column: 1 / -1;
                        text-align: center;
                        padding: 3rem 1.5rem;
                        color: var(--color-text-muted, #666);
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.875rem;
                    }

                    .svg-item {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 1rem 0.75rem;
                        background: var(--color-bg, white);
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .svg-item:hover {
                        background: var(--color-fill-1, #e9ecef);
                        border-color: var(--color-stroke, #333);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    }

                    .svg-item:active {
                        transform: translateY(0);
                        box-shadow: none;
                    }

                    .svg-preview {
                        width: 56px;
                        height: 56px;
                        object-fit: contain;
                    }

                    .svg-name {
                        font-family: var(--font-body, sans-serif);
                        font-size: 0.6875rem;
                        color: var(--color-text, #333);
                        text-align: center;
                        line-height: 1.2;
                        max-width: 100%;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .generated-image-item {
                        position: relative;
                    }

                    .generated-image-item .svg-preview {
                        width: 64px;
                        height: 64px;
                        object-fit: cover;
                        border-radius: 4px;
                    }

                    .image-actions {
                        position: absolute;
                        top: 4px;
                        right: 4px;
                        display: flex;
                        gap: 4px;
                        opacity: 0.7;
                        transition: opacity 0.2s;
                    }

                    .generated-image-item:hover .image-actions {
                        opacity: 1;
                    }

                    /* Always show actions on mobile/touch devices */
                    @media (hover: none) {
                        .image-actions {
                            opacity: 1;
                        }
                    }

                    .copy-image-btn,
                    .delete-image-btn {
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.95);
                        border: 1px solid var(--color-stroke-muted, #ddd);
                        color: var(--color-text-muted, #666);
                        font-size: 16px;
                        line-height: 1;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                        padding: 0;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
                    }

                    .copy-image-btn:hover {
                        background: #dbeafe;
                        color: #2563eb;
                        border-color: #93c5fd;
                        transform: scale(1.1);
                    }

                    .delete-image-btn {
                        font-weight: bold;
                    }

                    .delete-image-btn:hover {
                        background: #fee2e2;
                        color: #dc2626;
                        border-color: #fca5a5;
                        transform: scale(1.1);
                    }

                    .delete-image-btn:active,
                    .copy-image-btn:active {
                        transform: scale(0.95);
                    }

                    @media (max-width: 768px) {
                        .assets-panel {
                            width: 100%;
                            max-width: 360px;
                        }
                    }
                `}</style>
            </div>
        </>
    );
}
