
import React, { useState } from "react";
import type { CanvasElementSnapshot } from "../types";

export interface CanvasContextOverlayProps {
    /** Current context mode */
    contextMode: "all" | "selected";
    /** Callback when mode changes */
    onContextModeChange: (mode: "all" | "selected") => void;
    /** Selected element IDs */
    selectedElements: string[];
    /** Element snapshots for display */
    elementSnapshots: Map<string, CanvasElementSnapshot>;
    /** Total canvas element count */
    canvasElementCount: number;
    /** Callback to clear selection */
    onClearSelection: () => void;
}

/**
 * Compact image carousel
 */
function ImageCarousel({ images }: { images: CanvasElementSnapshot[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (images.length === 0) return null;

    const currentImage = images[currentIndex];

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                width: "100%",
            }}
        >
            {/* Image Display */}
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.02)",
                    borderRadius: "8px",
                    overflow: "hidden",
                }}
            >
                <img
                    src={currentImage.imageDataURL}
                    alt={`Selected image ${currentIndex + 1}`}
                    style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "120px",
                        objectFit: "contain",
                        display: "block",
                    }}
                />

                {/* Navigation Arrows (only show if multiple images) */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={goToPrevious}
                            style={{
                                position: "absolute",
                                left: "4px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: "rgba(255, 255, 255, 0.9)",
                                border: "1px solid rgba(0, 0, 0, 0.1)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>

                        <button
                            onClick={goToNext}
                            style={{
                                position: "absolute",
                                right: "4px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: "rgba(255, 255, 255, 0.9)",
                                border: "1px solid rgba(0, 0, 0, 0.1)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {/* Pagination Dots */}
            {images.length > 1 && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "4px",
                    }}
                >
                    {images.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            style={{
                                width: "5px",
                                height: "5px",
                                borderRadius: "50%",
                                border: "none",
                                background: index === currentIndex ? "#6366f1" : "#d1d5db",
                                cursor: "pointer",
                                padding: 0,
                                transition: "all 0.2s",
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Image Counter */}
            <div
                style={{
                    fontSize: "8px",
                    color: "#6b7280",
                    textAlign: "center",
                }}
            >
                {images.length > 1 ? `${currentIndex + 1} of ${images.length}` : '1 image'}
            </div>
        </div>
    );
}

/**
 * Separate preview panel to the LEFT of chat
 */
export function CanvasContextOverlay({
    contextMode,
    selectedElements,
    elementSnapshots,
}: CanvasContextOverlayProps) {
    const isSelectedMode = contextMode === "selected";

    // Extract images from selected elements
    const selectedImages = React.useMemo(() => {
        if (!isSelectedMode || !elementSnapshots.size) return [];
        const images: CanvasElementSnapshot[] = [];
        elementSnapshots.forEach((snapshot) => {
            if (snapshot.type === 'image' && snapshot.imageDataURL) {
                images.push(snapshot);
            }
        });
        return images;
    }, [isSelectedMode, elementSnapshots]);

    // Calculate element type counts
    const elementCounts = React.useMemo(() => {
        if (!elementSnapshots.size) return {};
        const counts: Record<string, number> = {};
        elementSnapshots.forEach((snapshot) => {
            counts[snapshot.type] = (counts[snapshot.type] || 0) + 1;
        });
        return counts;
    }, [elementSnapshots]);

    // Don't show if no selection or no images
    if (!isSelectedMode || selectedElements.length === 0 || selectedImages.length === 0) return null;

    return (
        <div
            style={{
                position: "fixed",
                // Position to the left of the chat panel
                right: "400px", // Chat panel width (360px) + gap (40px)
                bottom: "20px",
                width: "180px",
                maxHeight: "300px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "10px",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(0, 0, 0, 0.1)",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                zIndex: 998, // Just below chat panel (999)
                pointerEvents: "auto",
                animation: "slideInLeft 0.2s ease",
            }}
        >
            {/* Header */}
            <div
                style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: "#6366f1",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    textAlign: "center",
                }}
            >
                Selected Items
            </div>

            {/* Image Carousel */}
            <ImageCarousel images={selectedImages} />

            {/* Element Summary - Compact */}
            <div
                style={{
                    padding: "6px",
                    background: "rgba(99, 102, 241, 0.05)",
                    borderRadius: "6px",
                    fontSize: "9px",
                    textAlign: "center",
                }}
            >
                <div style={{ fontWeight: 600, color: "#374151", marginBottom: "2px" }}>
                    {selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''}
                </div>
                {Object.entries(elementCounts).length > 0 && (
                    <div style={{ color: "#6b7280", fontSize: "8px" }}>
                        {Object.entries(elementCounts)
                            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                            .join(', ')}
                    </div>
                )}
            </div>

            {/* AI Vision Note */}
            <div
                style={{
                    fontSize: "8px",
                    color: "#6b7280",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "4px",
                    background: "rgba(99, 102, 241, 0.05)",
                    borderRadius: "4px",
                }}
            >
                AI can analyze {selectedImages.length > 1 ? 'these' : 'this'}
            </div>

            <style>{`
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `}</style>
        </div>
    );
}

export default CanvasContextOverlay;
