import { useState } from "react";
import { svgLibrary, categories, type SVGMetadata } from "../../lib/svg-library-config";
import { eventBus } from "../../lib/events";

export default function SVGLibrary() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("icons");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredSvgs = svgLibrary.filter((svg) => {
        const matchesCategory = selectedCategory === "all" || svg.category === selectedCategory;
        const matchesSearch = searchQuery === "" ||
            svg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            svg.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const handleSvgClick = (svg: SVGMetadata) => {
        // Dispatch event to insert SVG into canvas
        eventBus.emit("excalidraw:insert-svg", { svgPath: svg.path, svgId: svg.id });
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="svg-library-toggle"
                title="Open SVG Library"
            >
                <span className="icon">📚</span>
                <span className="label">Library</span>
                <style>{`
                    .svg-library-toggle {
                        position: fixed;
                        left: 1rem;
                        top: 1rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.625rem 0.875rem;
                        background: var(--color-surface, white);
                        border: 2px solid var(--color-stroke, #333);
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: var(--font-hand, sans-serif);
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: var(--color-text, #333);
                        box-shadow: 2px 2px 0 var(--color-stroke, #333);
                        z-index: 1000;
                        transition: all 0.2s ease;
                    }

                    .svg-library-toggle:hover {
                        transform: translate(-1px, -1px);
                        box-shadow: 3px 3px 0 var(--color-stroke, #333);
                    }

                    .svg-library-toggle:active {
                        transform: translate(1px, 1px);
                        box-shadow: 1px 1px 0 var(--color-stroke, #333);
                    }

                    .svg-library-toggle .icon {
                        font-size: 1.125rem;
                    }

                    @media (max-width: 768px) {
                        .svg-library-toggle {
                            left: 0.5rem;
                            top: 0.5rem;
                            padding: 0.5rem;
                        }
                        .svg-library-toggle .label {
                            display: none;
                        }
                    }
                `}</style>
            </button>
        );
    }

    return (
        <div className="svg-library">
            <div className="svg-library-header">
                <h3 className="svg-library-title">📚 SVG Library</h3>
                <button onClick={() => setIsOpen(false)} className="close-btn" title="Close">
                    ✕
                </button>
            </div>

            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search icons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="category-tabs">
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
                {filteredSvgs.length === 0 ? (
                    <div className="empty-state">
                        <p>No icons found</p>
                    </div>
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
                )}
            </div>

            <style>{`
                .svg-library {
                    position: fixed;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 280px;
                    background: var(--color-surface, white);
                    border-right: 2px solid var(--color-stroke, #333);
                    display: flex;
                    flex-direction: column;
                    z-index: 999;
                    box-shadow: 4px 0 8px rgba(0, 0, 0, 0.1);
                }

                .svg-library-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    border-bottom: 2px solid var(--color-stroke, #333);
                    background: var(--color-bg, #fafafa);
                }

                .svg-library-title {
                    margin: 0;
                    font-family: var(--font-hand, sans-serif);
                    font-size: 1rem;
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
                    padding: 0.75rem;
                    border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                }

                .search-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid var(--color-stroke-muted, #ddd);
                    border-radius: 6px;
                    background: var(--color-bg, white);
                    font-family: var(--font-body, sans-serif);
                    font-size: 0.875rem;
                    color: var(--color-text, #333);
                    outline: none;
                    transition: border-color 0.2s;
                }

                .search-input:focus {
                    border-color: var(--color-stroke, #333);
                }

                .category-tabs {
                    display: flex;
                    gap: 0.25rem;
                    padding: 0.75rem;
                    border-bottom: 1px solid var(--color-stroke-muted, #ddd);
                    overflow-x: auto;
                    scrollbar-width: thin;
                }

                .category-tab {
                    padding: 0.375rem 0.75rem;
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
                    padding: 0.75rem;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.5rem;
                    align-content: start;
                }

                .svg-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.75rem 0.5rem;
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
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .svg-item:active {
                    transform: translateY(0);
                    box-shadow: none;
                }

                .svg-preview {
                    width: 48px;
                    height: 48px;
                    object-fit: contain;
                }

                .svg-name {
                    font-family: var(--font-body, sans-serif);
                    font-size: 0.625rem;
                    color: var(--color-text, #333);
                    text-align: center;
                    line-height: 1.2;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .empty-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 2rem 1rem;
                    color: var(--color-text-muted, #666);
                    font-family: var(--font-body, sans-serif);
                    font-size: 0.875rem;
                }

                @media (max-width: 768px) {
                    .svg-library {
                        width: 100%;
                        max-width: 320px;
                    }
                }
            `}</style>
        </div>
    );
}
