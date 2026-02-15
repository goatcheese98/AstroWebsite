// Image Generation Modal - Center popup with preview and generation options

import React, { useState, useEffect, useRef } from "react";
import { useMobileDetection } from "./hooks/useMobileDetection";
import { canvasEvents } from "@/lib/events/eventEmitter";

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
    backgroundColor: string; // hex color
    strictRatio: boolean; // true = 1:1, false = lenient
    useProModel: boolean; // false = Flash (Fast), true = Pro (Better quality)
    aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16';
    hasReference?: boolean; // whether there's a wireframe reference image
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

    // Check if we have selected elements for preview
    const hasSelectedElements = selectedElements.length > 0;

    // Capture preview once when modal opens (only if elements are selected)
    useEffect(() => {
        if (isOpen && hasSelectedElements && !hasCapturedPreview.current) {
            hasCapturedPreview.current = true;
            receivedResponseRef.current = false;
            setIsLoadingPreview(true);

            // Create a unique request ID to match response
            const requestId = `preview-${Date.now()}`;
            console.log("🖼️ Requesting preview screenshot with requestId:", requestId, "for elements:", selectedElements);

            // Set up event bus listener BEFORE emitting the event
            const unsubscribe = canvasEvents.on('excalidraw:screenshot-captured', (data) => {
                console.log("📸 Received screenshot event via eventBus:", data.requestId, "Expected:", requestId);

                // Ignore events that are responses to other requests
                if (data.requestId && data.requestId !== requestId) {
                    console.log("⏭️ Skipping - different requestId");
                    return;
                }

                // Mark that we received a response
                receivedResponseRef.current = true;

                if (data.error) {
                    console.error("❌ Preview capture error:", data.error);
                    setPreviewUrl(null);
                } else if (data.dataURL) {
                    console.log("✅ Preview captured successfully, length:", data.dataURL.length);
                    setPreviewUrl(data.dataURL);
                } else {
                    console.warn("⚠️ Received event without dataURL or error:", data);
                }
                setIsLoadingPreview(false);
                unsubscribe(); // Clean up listener after receiving response
            });

            // Delay to ensure canvas is ready - try multiple times if needed
            const attemptCapture = (attempt = 1) => {
                console.log(`🚀 Emitting screenshot request via canvasEvents (attempt ${attempt})`);
                canvasEvents.emit('excalidraw:capture-screenshot', {
                    elementIds: selectedElements,
                    quality: "preview",
                    requestId,
                });

                // If no response after 2 seconds, retry once
                if (attempt === 1) {
                    setTimeout(() => {
                        if (!receivedResponseRef.current) {
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
                    unsubscribe();
                    setIsLoadingPreview(false);
                    setPreviewUrl(null);
                } else {
                    console.log("⏱️ Timeout fired but response already received, ignoring");
                }
            }, 10000);

            return () => {
                clearTimeout(timeoutId);
                unsubscribe();
            };
        }
    }, [isOpen, hasSelectedElements, selectedElements]);

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

    // Handle generate button click
    const handleGenerate = () => {
        if (!prompt.trim() || isGenerating) return;

        onGenerate({
            prompt: prompt.trim(),
            backgroundColor: effectiveBackgroundColor,
            strictRatio,
            useProModel,
            aspectRatio: strictRatio ? '1:1' : '4:3',
            hasReference: hasSelectedElements && previewUrl !== null,
        });

        // Reset prompt after generation starts
        setPrompt("");
    };

    // Handle close - reset state
    const handleClose = () => {
        setPrompt("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className={`modal-overlay ${isMobile ? 'p-4' : 'p-6'}`}
            style={{ zIndex: 1001 }}
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div
                className="modal-content"
                style={{
                    maxHeight: isMobile ? 'calc(100vh - 32px)' : 'calc(100vh - 48px)',
                    animation: 'modalPop 0.2s ease-out',
                }}
            >
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            ✨ Generate Image
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">
                            {hasSelectedElements
                                ? "Using selected elements as reference"
                                : "Create images from text descriptions"}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isGenerating}
                        className={`btn-close ${isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="modal-body">
                    {/* Preview Area - Show selected elements preview */}
                    {hasSelectedElements && (
                        <div className="form-group">
                            <label className="form-label">
                                Reference Preview
                            </label>
                            <div
                                className="preview-box"
                                style={{ width: '100%', height: '180px' }}
                            >
                                {isLoadingPreview ? (
                                    <div className="text-center">
                                        <div className="animate-spin mb-2 mx-auto" style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                                        <span className="text-xs text-text-secondary">
                                            Capturing preview...
                                        </span>
                                    </div>
                                ) : previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Selected elements preview"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                ) : (
                                    <div className="placeholder-content">
                                        <svg
                                            width="32"
                                            height="32"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        >
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <path d="M21 15l-5-5L5 21" />
                                        </svg>
                                        <span className="placeholder-content__text">Preview unavailable</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Prompt Input */}
                    <div className="form-group">
                        <label className="form-label">
                            Describe your image
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                hasSelectedElements
                                    ? "Describe how you want the image based on the selected elements..."
                                    : "Describe the image you want to generate..."
                            }
                            disabled={isGenerating}
                            className="textarea"
                            style={{
                                background: isGenerating ? '#f9fafb' : undefined,
                                opacity: isGenerating ? 0.7 : 1,
                            }}
                        />
                    </div>

                    {/* Options */}
                    <div className="form-group">
                        <label className="form-label">
                            Options
                        </label>

                        {/* Background Color */}
                        <div className="mb-4">
                            <div className="form-label--small mb-2">
                                Background Color
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {/* Canvas option */}
                                <button
                                    onClick={() => setBackgroundColor("canvas")}
                                    className="color-swatch flex items-center justify-center text-xs"
                                    style={{
                                        background: '#f3f4f6',
                                        borderColor: backgroundColor === "canvas" ? '#6366f1' : '#e5e7eb',
                                    }}
                                    title="Use canvas background"
                                >
                                    🎨
                                </button>

                                {/* Preset colors */}
                                {PRESET_COLORS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        onClick={() => setBackgroundColor(preset.value)}
                                        className="color-swatch"
                                        style={{
                                            background: preset.color,
                                            borderColor: backgroundColor === preset.value ? '#6366f1' : '#e5e7eb',
                                        }}
                                        title={preset.name}
                                    />
                                ))}

                                {/* Custom color picker */}
                                <div ref={colorPickerRef} className="relative">
                                    <button
                                        onClick={() => setShowColorPicker(!showColorPicker)}
                                        className="color-swatch flex items-center justify-center"
                                        style={{
                                            borderColor: backgroundColor === "custom" ? '#6366f1' : '#e5e7eb',
                                            background: backgroundColor === "custom"
                                                ? customColor
                                                : 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)',
                                        }}
                                        title="Custom color"
                                    >
                                        {backgroundColor === "custom" ? (
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke={
                                                    customColor === "#000000" || customColor === "#343a40"
                                                        ? "white"
                                                        : "#374151"
                                                }
                                                strokeWidth="2"
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        ) : (
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="#6b7280"
                                                strokeWidth="2"
                                            >
                                                <circle cx="12" cy="12" r="3" />
                                                <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 17.66l-4.24 4.24M23 12h-6m-6 0H1m20.24 4.24l-4.24-4.24M6.34 6.34L2.1 2.1" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Color picker dropdown */}
                                    {showColorPicker && (
                                        <div
                                            className="bg-surface rounded-xl shadow-lg p-4 z-10"
                                            style={{
                                                position: 'absolute',
                                                top: '40px',
                                                left: 0,
                                                minWidth: '200px',
                                            }}
                                        >
                                            <div
                                                className="grid gap-1 mb-3"
                                                style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
                                            >
                                                {EXCALIDRAW_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        onClick={() => {
                                                            setCustomColor(color);
                                                            setBackgroundColor("custom");
                                                            setShowColorPicker(false);
                                                        }}
                                                        className="color-swatch"
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '6px',
                                                            background: color,
                                                            borderColor: customColor === color ? '#6366f1' : 'transparent',
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Custom hex input */}
                                            <div className="flex gap-2 items-center">
                                                <span className="text-xs text-text-secondary">#</span>
                                                <input
                                                    type="text"
                                                    value={customColor.replace("#", "")}
                                                    onChange={(e) => {
                                                        const hex = e.target.value.replace(/[^0-9a-fA-F]/g, "");
                                                        if (hex.length <= 6) {
                                                            setCustomColor(`#${hex}`);
                                                            setBackgroundColor("custom");
                                                        }
                                                    }}
                                                    placeholder="FFFFFF"
                                                    className="flex-1 px-2 py-1 rounded border border-border text-sm"
                                                    style={{ textTransform: 'uppercase' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div className="mb-4">
                            <div className="form-label--small mb-2">
                                Aspect Ratio
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStrictRatio(true)}
                                    className="flex-1 p-2 rounded-lg border-2 cursor-pointer text-sm"
                                    style={{
                                        borderColor: strictRatio ? '#6366f1' : '#e5e7eb',
                                        background: strictRatio ? '#eef2ff' : 'white',
                                        fontWeight: strictRatio ? 500 : 400,
                                        color: strictRatio ? '#6366f1' : '#374151',
                                    }}
                                >
                                    <div className="text-lg mb-1">□</div>
                                    Square (1:1)
                                </button>
                                <button
                                    onClick={() => setStrictRatio(false)}
                                    className="flex-1 p-2 rounded-lg border-2 cursor-pointer text-sm"
                                    style={{
                                        borderColor: !strictRatio ? '#6366f1' : '#e5e7eb',
                                        background: !strictRatio ? '#eef2ff' : 'white',
                                        fontWeight: !strictRatio ? 500 : 400,
                                        color: !strictRatio ? '#6366f1' : '#374151',
                                    }}
                                >
                                    <div className="text-lg mb-1">▭</div>
                                    Landscape (4:3)
                                </button>
                            </div>
                        </div>

                        {/* Model Selection */}
                        <div>
                            <div className="form-label--small mb-2">
                                Model
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setUseProModel(false)}
                                    className="flex-1 p-2 rounded-lg border-2 cursor-pointer text-sm text-left"
                                    style={{
                                        borderColor: !useProModel ? '#6366f1' : '#e5e7eb',
                                        background: !useProModel ? '#eef2ff' : 'white',
                                        fontWeight: !useProModel ? 500 : 400,
                                        color: !useProModel ? '#6366f1' : '#374151',
                                    }}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>⚡</span>
                                        <span>Flash</span>
                                    </div>
                                    <div className="text-xs text-text-secondary mt-1 font-normal">
                                        Fast, great for most images
                                    </div>
                                </button>
                                <button
                                    onClick={() => setUseProModel(true)}
                                    className="flex-1 p-2 rounded-lg border-2 cursor-pointer text-sm text-left"
                                    style={{
                                        borderColor: useProModel ? '#6366f1' : '#e5e7eb',
                                        background: useProModel ? '#eef2ff' : 'white',
                                        fontWeight: useProModel ? 500 : 400,
                                        color: useProModel ? '#6366f1' : '#374151',
                                    }}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>✨</span>
                                        <span>Pro</span>
                                    </div>
                                    <div className="text-xs text-text-secondary mt-1 font-normal">
                                        Best quality, more detail
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="modal-footer" style={{ padding: '20px 0 0 0', borderTop: '1px solid var(--color-border)' }}>
                        <button
                            onClick={handleClose}
                            disabled={isGenerating}
                            className={`flex-1 py-3 px-4 rounded-lg border font-medium text-sm ${isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer bg-surface'}`}
                            style={{ borderColor: '#e5e7eb', color: '#374151' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={!prompt.trim() || isGenerating}
                            className="btn-primary flex-[2]"
                            style={{
                                background: !prompt.trim() || isGenerating ? '#c7c8ff' : '#6366f1',
                                cursor: !prompt.trim() || isGenerating ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isGenerating ? (
                                <>
                                    <div
                                        className="animate-spin"
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: 'white',
                                            borderRadius: '50%',
                                        }}
                                    />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    Generate Image
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes modalPop {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
        </div>
    );
}
