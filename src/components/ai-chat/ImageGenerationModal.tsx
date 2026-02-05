// Image Generation Modal - Center popup with preview and generation options

import React, { useState, useEffect, useRef } from "react";
import { useMobileDetection } from "./hooks/useMobileDetection";

// Excalidraw color palette presets
const EXCALIDRAW_COLORS = [
    "#000000", // Black
    "#ffffff", // White
    "#ffc9c9", // Red 1
    "#ff8787", // Red 2
    "#fa5252", // Red 3
    "#e03131", // Red 4
    "#ffec99", // Yellow 1
    "#ffe066", // Yellow 2
    "#fcc419", // Yellow 3
    "#f59f00", // Yellow 4
    "#b2f2bb", // Green 1
    "#69db7c", // Green 2
    "#40c057", // Green 3
    "#2f9e44", // Green 4
    "#a5d8ff", // Blue 1
    "#74c0fc", // Blue 2
    "#339af0", // Blue 3
    "#1971c2", // Blue 4
    "#d0bfff", // Purple 1
    "#b197fc", // Purple 2
    "#845ef7", // Purple 3
    "#6741d9", // Purple 4
    "#ffd8a8", // Orange 1
    "#ffa94d", // Orange 2
    "#ff922b", // Orange 3
    "#f76707", // Orange 4
];

// Common presets - simplified to white, black, and custom only
const PRESET_COLORS = [
    { name: "White", value: "#ffffff", color: "#ffffff" },
    { name: "Black", value: "#000000", color: "#000000" },
];

interface ImageGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedElements: string[];
    elementSnapshots: Map<string, any>;
    canvasState: any;
    onGenerate: (options: GenerationOptions) => void;
    isGenerating: boolean;
}

export interface GenerationOptions {
    prompt: string;
    backgroundColor: string; // "canvas" | hex color
    strictRatio: boolean; // true = 1:1, false = lenient
    useProModel: boolean; // false = Nano Banana (Fast), true = Nano Banana Pro (Thinking)
}

export default function ImageGenerationModal({
    isOpen,
    onClose,
    selectedElements,
    elementSnapshots,
    canvasState,
    onGenerate,
    isGenerating,
}: ImageGenerationModalProps) {
    const { isMobile } = useMobileDetection();
    const [prompt, setPrompt] = useState("");
    const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
    const [customColor, setCustomColor] = useState<string>("#ffffff");
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [strictRatio, setStrictRatio] = useState(true);
    const [useProModel, setUseProModel] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    
    const colorPickerRef = useRef<HTMLDivElement>(null);
    const hasCapturedPreview = useRef(false);
    const receivedResponseRef = useRef(false);

    // Get effective background color
    const effectiveBackgroundColor = backgroundColor === "custom" ? customColor : backgroundColor;

    // Capture preview once when modal opens
    useEffect(() => {
        if (isOpen && selectedElements.length > 0 && !hasCapturedPreview.current) {
            hasCapturedPreview.current = true;
            receivedResponseRef.current = false;
            setIsLoadingPreview(true);

            // Create a unique request ID to match response
            const requestId = `preview-${Date.now()}`;
            console.log("🖼️ Requesting preview screenshot with requestId:", requestId, "for elements:", selectedElements);

            const handlePreviewCaptured = (event: any) => {
                console.log("📸 Received screenshot event:", event.detail?.requestId, "Expected:", requestId);

                // Ignore events that are responses to other requests
                if (event.detail?.requestId && event.detail.requestId !== requestId) {
                    console.log("⏭️ Skipping - different requestId");
                    return;
                }

                // Mark that we received a response
                receivedResponseRef.current = true;

                if (event.detail?.error) {
                    console.error("❌ Preview capture error:", event.detail.error);
                    setPreviewUrl(null);
                } else if (event.detail?.dataURL) {
                    console.log("✅ Preview captured successfully, length:", event.detail.dataURL.length);
                    setPreviewUrl(event.detail.dataURL);
                } else {
                    console.warn("⚠️ Received event without dataURL or error:", event.detail);
                }
                setIsLoadingPreview(false);
                // Clean up listener after receiving response
                window.removeEventListener("excalidraw:screenshot-captured", handlePreviewCaptured);
            };

            // Set up listener BEFORE dispatching the event
            window.addEventListener("excalidraw:screenshot-captured", handlePreviewCaptured);

            // Delay to ensure canvas is ready - try multiple times if needed
            const attemptCapture = (attempt = 1) => {
                console.log(`🚀 Dispatching screenshot request (attempt ${attempt})`);
                window.dispatchEvent(new CustomEvent("excalidraw:capture-screenshot", {
                    detail: {
                        elementIds: selectedElements,
                        quality: "preview",
                        requestId,
                    }
                }));
                
                // If no response after 2 seconds, retry once
                if (attempt === 1) {
                    setTimeout(() => {
                        if (isLoadingPreview) {
                            console.log("🔄 Retrying screenshot capture...");
                            attemptCapture(2);
                        }
                    }, 2000);
                }
            };
            
            setTimeout(() => attemptCapture(1), 300);

            // Timeout after 10 seconds in case capture fails
            const timeoutId = setTimeout(() => {
                // Only process timeout if we haven't received a response yet
                if (!receivedResponseRef.current) {
                    console.error("⏱️ Preview capture timed out after 10 seconds");
                    window.removeEventListener("excalidraw:screenshot-captured", handlePreviewCaptured);
                    setIsLoadingPreview(false);
                    setPreviewUrl(null);
                } else {
                    console.log("⏱️ Timeout fired but response already received, ignoring");
                }
            }, 10000);

            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener("excalidraw:screenshot-captured", handlePreviewCaptured);
            };
        }
    }, [isOpen, selectedElements]);

    // Reset all state when modal closes
    useEffect(() => {
        if (!isOpen) {
            // Use setTimeout to reset after modal closes to avoid flickering
            setTimeout(() => {
                hasCapturedPreview.current = false;
                receivedResponseRef.current = false;
                setPreviewUrl(null);
                setIsLoadingPreview(false);
            }, 300); // Match modal animation duration
        }
    }, [isOpen]);

    // Close color picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                setShowColorPicker(false);
            }
        };

        if (showColorPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showColorPicker]);

    // Reset form state when modal opens (but not preview state)
    useEffect(() => {
        if (isOpen) {
            setPrompt("");
            setBackgroundColor("#ffffff");
            setCustomColor("#ffffff");
            setStrictRatio(true);
            setUseProModel(false);
            // Don't reset preview here - handled by the close effect
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isGenerating) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, isGenerating, onClose]);

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        
        onGenerate({
            prompt: prompt.trim(),
            backgroundColor: effectiveBackgroundColor || "canvas",
            strictRatio,
            useProModel,
        });
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomColor(e.target.value);
        setBackgroundColor("custom");
    };

    // Compute ready state - simple derived value
    const isReady = prompt.trim().length > 0 && !isGenerating;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="image-gen-modal-backdrop"
                onClick={!isGenerating ? onClose : undefined}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(4px)",
                    zIndex: 2000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "fadeIn 0.2s ease",
                }}
            />

            {/* Modal */}
            <div
                className="image-gen-modal"
                style={{
                    position: "fixed",
                    top: isMobile ? 0 : "50%",
                    left: isMobile ? 0 : "50%",
                    transform: isMobile ? "none" : "translate(-50%, -50%)",
                    width: isMobile ? "100%" : "90%",
                    height: isMobile ? "100%" : undefined,
                    maxWidth: isMobile ? "none" : "480px",
                    maxHeight: isMobile ? "100vh" : "85vh",
                    background: "var(--color-surface, #ffffff)",
                    borderRadius: isMobile ? 0 : "16px",
                    boxShadow: isMobile ? "none" : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    zIndex: 2001,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    animation: isMobile ? "slideUp 0.25s ease" : "modalSlideIn 0.25s ease",
                }}
            >
                {/* Header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "18px 20px",
                    borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    background: "var(--color-bg, #fafafa)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            background: "#6366f1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </div>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "var(--color-text, #1f2937)",
                            }}>
                                Generate Image
                            </h2>
                            <p style={{
                                margin: 0,
                                fontSize: "12px",
                                color: "var(--color-text-muted, #6b7280)",
                            }}>
                                {selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} selected
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: isGenerating ? "not-allowed" : "pointer",
                            padding: "8px",
                            borderRadius: "8px",
                            color: "var(--color-text-muted, #6b7280)",
                            opacity: isGenerating ? 0.5 : 1,
                            transition: "all 0.15s",
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                }}>
                    {/* Preview Section */}
                    <div>
                        <label style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--color-text, #1f2937)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "10px",
                        }}>
                            Preview
                        </label>
                        <div style={{
                            maxHeight: "180px",
                            minHeight: "120px",
                            background: "var(--color-fill-1, #f3f4f6)",
                            borderRadius: "12px",
                            border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            position: "relative",
                            padding: "16px",
                        }}>
                            {isLoadingPreview ? (
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "12px",
                                    color: "var(--color-text-muted, #6b7280)",
                                }}>
                                    <div style={{
                                        width: "32px",
                                        height: "32px",
                                        border: "3px solid var(--color-stroke-muted, #e5e7eb)",
                                        borderTopColor: "var(--color-accent, #6366f1)",
                                        borderRadius: "50%",
                                        animation: "spin 0.8s linear infinite",
                                    }} />
                                    <span style={{ fontSize: "13px" }}>Capturing preview...</span>
                                </div>
                            ) : previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Selected elements preview"
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                        objectFit: "contain",
                                    }}
                                />
                            ) : (
                                <div style={{
                                    textAlign: "center",
                                    color: "var(--color-text-muted, #6b7280)",
                                }}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "8px", opacity: 0.5 }}>
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                    <p style={{ margin: 0, fontSize: "13px" }}>No preview available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Prompt Input */}
                    <div>
                        <label style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--color-text, #1f2937)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "10px",
                        }}>
                            <span>Prompt</span>
                            <span style={{
                                fontSize: "11px",
                                fontWeight: 400,
                                color: "var(--color-text-muted, #6b7280)",
                                textTransform: "none",
                            }}>
                                Describe what you want to create
                            </span>
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Modern SaaS dashboard with blue theme, clean UI, professional look..."
                            rows={isMobile ? 2 : 3}
                            disabled={isGenerating}
                            style={{
                                width: "100%",
                                padding: isMobile ? "14px 16px" : "12px 14px",
                                border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                                borderRadius: "10px",
                                fontSize: isMobile ? "16px" : "14px", // 16px prevents iOS zoom
                                lineHeight: 1.5,
                                resize: "none",
                                fontFamily: "inherit",
                                background: "var(--color-surface, #ffffff)",
                                color: "var(--color-text, #1f2937)",
                                outline: "none",
                                transition: "border-color 0.15s",
                            }}
                            onFocus={(e) => e.target.style.borderColor = "var(--color-accent, #6366f1)"}
                            onBlur={(e) => e.target.style.borderColor = "var(--color-stroke-muted, #e5e7eb)"}
                        />
                    </div>

                    {/* Background Selection */}
                    <div>
                        <label style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--color-text, #1f2937)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "10px",
                        }}>
                            Background
                        </label>
                        
                        {/* Preset Colors */}
                        <div style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                            marginBottom: "12px",
                        }}>
                            {PRESET_COLORS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setBackgroundColor(preset.value)}
                                    disabled={isGenerating}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "6px 12px",
                                        borderRadius: "8px",
                                        border: "2px solid",
                                        borderColor: backgroundColor === preset.value 
                                            ? "var(--color-accent, #6366f1)" 
                                            : "var(--color-stroke-muted, #e5e7eb)",
                                        background: preset.value === "canvas" 
                                            ? "var(--color-fill-1, #f3f4f6)" 
                                            : preset.color,
                                        cursor: isGenerating ? "not-allowed" : "pointer",
                                        opacity: isGenerating ? 0.6 : 1,
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <span style={{
                                        width: "16px",
                                        height: "16px",
                                        borderRadius: "4px",
                                        background: preset.color,
                                        border: "1px solid rgba(0,0,0,0.1)",
                                    }} />
                                    <span style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: preset.value === "#000000" 
                                            ? "white" 
                                            : "var(--color-text, #1f2937)",
                                    }}>
                                        {preset.name}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Custom Color Picker */}
                        <div style={{ position: "relative" }} ref={colorPickerRef}>
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                disabled={isGenerating}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 14px",
                                    borderRadius: "8px",
                                    border: "2px dashed",
                                    borderColor: backgroundColor === "custom"
                                        ? "var(--color-accent, #6366f1)"
                                        : "var(--color-stroke-muted, #e5e7eb)",
                                    background: "var(--color-surface, #ffffff)",
                                    cursor: isGenerating ? "not-allowed" : "pointer",
                                    opacity: isGenerating ? 0.6 : 1,
                                    width: "100%",
                                    justifyContent: "flex-start",
                                }}
                            >
                                <span style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "6px",
                                    background: customColor,
                                    border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                                }} />
                                <span style={{
                                    fontSize: "13px",
                                    color: backgroundColor === "custom" 
                                        ? "var(--color-text, #1f2937)" 
                                        : "var(--color-text-muted, #6b7280)",
                                }}>
                                    {backgroundColor === "custom" ? customColor.toUpperCase() : "Custom color..."}
                                </span>
                            </button>

                            {/* Color Picker Dropdown */}
                            {showColorPicker && (
                                <div style={{
                                    position: "absolute",
                                    top: "calc(100% + 8px)",
                                    left: 0,
                                    right: 0,
                                    padding: "14px",
                                    background: "var(--color-surface, #ffffff)",
                                    border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                    borderRadius: "12px",
                                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                                    zIndex: 100,
                                }}>
                                    {/* Hex Input */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        marginBottom: "14px",
                                        paddingBottom: "14px",
                                        borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                    }}>
                                        <input
                                            type="color"
                                            value={customColor}
                                            onChange={handleColorChange}
                                            style={{
                                                width: "40px",
                                                height: "40px",
                                                border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                padding: "2px",
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={customColor}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                                    setCustomColor(value.toLowerCase());
                                                    setBackgroundColor("custom");
                                                }
                                            }}
                                            placeholder="#RRGGBB"
                                            style={{
                                                flex: 1,
                                                padding: "10px 12px",
                                                border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                                                borderRadius: "8px",
                                                fontSize: "14px",
                                                fontFamily: "monospace",
                                                textTransform: "uppercase",
                                            }}
                                        />
                                    </div>

                                    {/* Color Grid */}
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(7, 1fr)",
                                        gap: "6px",
                                    }}>
                                        {EXCALIDRAW_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => {
                                                    setCustomColor(color);
                                                    setBackgroundColor("custom");
                                                }}
                                                style={{
                                                    width: "100%",
                                                    aspectRatio: "1",
                                                    borderRadius: "6px",
                                                    background: color,
                                                    border: "2px solid",
                                                    borderColor: customColor === color 
                                                        ? "var(--color-accent, #6366f1)" 
                                                        : "transparent",
                                                    cursor: "pointer",
                                                    transition: "transform 0.1s",
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                                title={color.toUpperCase()}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <p style={{
                            margin: "8px 0 0",
                            fontSize: "11px",
                            color: "var(--color-text-muted, #6b7280)",
                            lineHeight: 1.5,
                        }}>
                            💡 The generated image will have a solid {backgroundColor === "custom" ? customColor.toUpperCase() : backgroundColor.toUpperCase()} background. Choose white for light themes, black for dark themes, or a custom color to match your design.
                        </p>
                    </div>

                    {/* Toggle Options */}
                    <div style={{
                        display: "grid",
                        gap: "14px",
                    }}>
                        {/* Layout Ratio Toggle */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 16px",
                            background: "var(--color-fill-1, #f3f4f6)",
                            borderRadius: "10px",
                        }}>
                            <div>
                                <div style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: "var(--color-text, #1f2937)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <path d="M3 9h18M9 21V9" />
                                    </svg>
                                    1:1 Layout Ratio
                                </div>
                                <div style={{
                                    fontSize: "11px",
                                    color: "var(--color-text-muted, #6b7280)",
                                    marginTop: "2px",
                                }}>
                                    {strictRatio 
                                        ? "Strict one-to-one positioning" 
                                        : "Loose layout following"}
                                </div>
                            </div>
                            <button
                                onClick={() => setStrictRatio(!strictRatio)}
                                disabled={isGenerating}
                                style={{
                                    width: "48px",
                                    height: "26px",
                                    borderRadius: "13px",
                                    border: "none",
                                    background: strictRatio 
                                        ? "var(--color-accent, #6366f1)" 
                                        : "var(--color-stroke-muted, #d1d5db)",
                                    position: "relative",
                                    cursor: isGenerating ? "not-allowed" : "pointer",
                                    opacity: isGenerating ? 0.6 : 1,
                                    transition: "background 0.2s",
                                }}
                            >
                                <span style={{
                                    position: "absolute",
                                    top: "3px",
                                    left: strictRatio ? "25px" : "3px",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    background: "white",
                                    transition: "left 0.2s",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                }} />
                            </button>
                        </div>

                        {/* Model Toggle */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 16px",
                            background: "var(--color-fill-1, #f3f4f6)",
                            borderRadius: "10px",
                        }}>
                            <div>
                                <div style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: "var(--color-text, #1f2937)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </svg>
                                    {useProModel ? "Gemini 3 Pro Image" : "Gemini 2.5 Flash Image"}
                                    <span style={{
                                        fontSize: "10px",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        background: useProModel ? "#8b5cf6" : "#22c55e",
                                        color: "white",
                                        fontWeight: 500,
                                    }}>
                                        {useProModel ? "Pro" : "Fast"}
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: "11px",
                                    color: "var(--color-text-muted, #6b7280)",
                                    marginTop: "2px",
                                }}>
                                    {useProModel
                                        ? "Better quality, more accurate generation"
                                        : "Quick results, standard quality"}
                                </div>
                            </div>
                            <button
                                onClick={() => setUseProModel(!useProModel)}
                                disabled={isGenerating}
                                style={{
                                    width: "48px",
                                    height: "26px",
                                    borderRadius: "13px",
                                    border: "none",
                                    background: useProModel 
                                        ? "#8b5cf6" 
                                        : "var(--color-stroke-muted, #d1d5db)",
                                    position: "relative",
                                    cursor: isGenerating ? "not-allowed" : "pointer",
                                    opacity: isGenerating ? 0.6 : 1,
                                    transition: "background 0.2s",
                                }}
                            >
                                <span style={{
                                    position: "absolute",
                                    top: "3px",
                                    left: useProModel ? "25px" : "3px",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    background: "white",
                                    transition: "left 0.2s",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: "16px 20px 20px",
                    borderTop: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    background: "var(--color-bg, #fafafa)",
                    display: "flex",
                    gap: "12px",
                }}>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        style={{
                            flex: 1,
                            padding: "12px 20px",
                            borderRadius: "10px",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            background: "var(--color-surface, #ffffff)",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--color-text, #1f2937)",
                            cursor: isGenerating ? "not-allowed" : "pointer",
                            opacity: isGenerating ? 0.6 : 1,
                            transition: "all 0.15s",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={!isReady}
                        style={{
                            flex: 2,
                            padding: "12px 20px",
                            borderRadius: "10px",
                            border: "none",
                            background: !isReady 
                                ? "var(--color-fill-2, #e5e7eb)" 
                                : "#6366f1",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: !isReady ? "var(--color-text-muted, #9ca3af)" : "white",
                            cursor: !isReady ? "not-allowed" : "pointer",
                            transition: "opacity 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                        }}
                    >
                        {isGenerating ? (
                            <>
                                <div style={{
                                    width: "16px",
                                    height: "16px",
                                    border: "2px solid rgba(255,255,255,0.3)",
                                    borderTopColor: "white",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                }} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                Generate Image
                            </>
                        )}
                    </button>
                </div>

                {/* Animations */}
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes modalSlideIn {
                        from { 
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(0.95);
                        }
                        to { 
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1);
                        }
                    }
                    @keyframes slideUp {
                        from {
                            transform: translateY(100%);
                        }
                        to {
                            transform: translateY(0);
                        }
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </>
    );
}
