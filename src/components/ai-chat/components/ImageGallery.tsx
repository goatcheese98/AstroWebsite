/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      🖼️ ImageGallery.tsx                                     ║
 * ║                    "The Generated Art Gallery"                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 🎨 Visual Gallery | 🖱️ Interactive             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the horizontal gallery that displays all AI-generated images. When users
 * transform their wireframes into photorealistic designs, I keep a scrollable
 * history of those creations. Each image can be previewed, copied to clipboard,
 * or clicked to insert back into the canvas.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users generate multiple variations of designs and want to:
 * - See their creation history at a glance
 * - Copy images to paste elsewhere (presentations, docs)
 * - Revisit earlier generations without regenerating
 * - Keep track of what prompts produced what results
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ useImageGen │─────▶│      ME      │─────▶│ Clipboard   │   │
 *      │   │  (history)  │      │(ImageGallery)│      │  (copy)     │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │           ┌───────────────────┴───────────────────┐            │
 *      │           ▼                   ▼                   ▼            │
 *      │   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
 *      │   │   onCopy    │    │  onClear     │    │   Hover     │       │
 *      │   │  (button)   │    │   (button)   │    │  (preview)  │       │
 *      │   └─────────────┘    └──────────────┘    └─────────────┘       │
 *      │                                                                  │
 *      │   I RENDER: Horizontal scrollable row of image thumbnails        │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Images not showing, can't scroll, copy button missing
 * - User Impact: Generated images lost, can't reuse previous creations
 * - Quick Fix: Check imageHistory prop is array of {id, url, prompt}
 * - Debug: Verify image URLs are valid data URLs (data:image/...)
 * - Common Issue: Horizontal overflow - check flex container settings
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ imageHistory        │ Array of generated image objects                     │
 * │ onCopyImage         │ Callback to copy image to clipboard                  │
 * │ onClearHistory      │ Callback to clear all history                        │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎨 VISUAL FEATURES:
 * - Header: "Generated Images (N)" with clear button
 * - Thumbnails: 80x80px with rounded corners
 * - Hover: Scale up slightly, show copy button
 * - Scroll: Horizontal overflow with padding
 * - Empty: Collapsed when no images
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~120 lines of gallery markup)
 * 2026-02-02: Separated gallery from message list
 * 2026-02-02: Added proper alt text and accessibility
 * 
 * @module ImageGallery
 */

import React, { useState } from "react";

export interface ImageHistoryItem {
    id: string;
    url: string;
    prompt: string;
    timestamp: Date;
}

export interface ImageGalleryProps {
    /** Array of generated images to display */
    imageHistory: ImageHistoryItem[];
    /** Callback when user copies an image */
    onCopyImage: (url: string) => void;
    /** Callback when user clears history */
    onClearHistory: () => void;
}

/**
 * Individual image thumbnail with hover actions
 */
function ImageThumbnail({
    image,
    onCopy,
}: {
    image: ImageHistoryItem;
    onCopy: () => void;
}) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: "relative",
                minWidth: "80px",
                width: "80px",
                height: "80px",
                borderRadius: "8px",
                overflow: "hidden",
                border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                background: "var(--color-surface, #ffffff)",
                transform: isHovered ? "scale(1.05)" : "scale(1)",
                transition: "transform 0.15s",
                cursor: "pointer",
            }}
        >
            <img
                src={image.url}
                alt={image.prompt}
                title={image.prompt}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                }}
            />
            
            {/* Copy Button - appears on hover */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onCopy();
                }}
                title="Copy image"
                style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "4px",
                    border: "none",
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isHovered ? 1 : 0,
                    transition: "opacity 0.15s",
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
            </button>
        </div>
    );
}

/**
 * Gallery of generated images
 */
export function ImageGallery({ imageHistory, onCopyImage, onClearHistory }: ImageGalleryProps) {
    if (imageHistory.length === 0) return null;
    
    return (
        <div style={{
            padding: "14px 18px",
            background: "var(--color-fill-1, #f3f4f6)",
            borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
            flexShrink: 0,
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
            }}>
                <div style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--color-text-muted, #6b7280)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                }}>
                    Generated Images ({imageHistory.length})
                </div>
                <button
                    onClick={onClearHistory}
                    style={{
                        fontSize: "10px",
                        padding: "4px 8px",
                        background: "transparent",
                        border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                        borderRadius: "4px",
                        color: "var(--color-text-muted, #6b7280)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-error-bg, #fef2f2)";
                        e.currentTarget.style.borderColor = "var(--color-error, #ef4444)";
                        e.currentTarget.style.color = "var(--color-error, #ef4444)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "var(--color-stroke-muted, #e5e7eb)";
                        e.currentTarget.style.color = "var(--color-text-muted, #6b7280)";
                    }}
                >
                    Clear
                </button>
            </div>
            
            {/* Image Row */}
            <div style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                paddingBottom: "4px",
            }}>
                {imageHistory.map((image) => (
                    <ImageThumbnail
                        key={image.id}
                        image={image}
                        onCopy={() => onCopyImage(image.url)}
                    />
                ))}
            </div>
        </div>
    );
}

export default ImageGallery;
