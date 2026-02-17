// Image Generation Modal - Center popup with preview and generation options

import React, { useState, useEffect, useRef } from "react";
import { useMobileDetection } from "./hooks/useMobileDetection";
import { useStore } from "@/stores";

const EXCALIDRAW_COLORS = [
  "#000000", "#ffffff", "#ffc9c9", "#ff8787", "#fa5252", "#e03131",
  "#ffec99", "#ffe066", "#fcc419", "#f59f00", "#b2f2bb", "#69db7c",
  "#40c057", "#2f9e44", "#a5d8ff", "#74c0fc", "#339af0", "#1971c2",
  "#d0bfff", "#b197fc", "#845ef7", "#6741d9", "#ffd8a8", "#ffa94d",
  "#ff922b", "#f76707",
];

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
  backgroundColor: string;
  strictRatio: boolean;
  useProModel: boolean;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16';
  hasReference?: boolean;
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
  const dispatchCommand = useStore((state) => state.dispatchCommand);
  
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

  const effectiveBackgroundColor = backgroundColor === "custom" ? customColor : backgroundColor;
  const hasSelectedElements = selectedElements.length > 0;

  // Capture preview using command pattern
  useEffect(() => {
    if (isOpen && hasSelectedElements && !hasCapturedPreview.current) {
      hasCapturedPreview.current = true;
      setIsLoadingPreview(true);

      const capturePreview = async () => {
        try {
          // Use dispatchCommand to capture screenshot
          const result = await dispatchCommand("captureScreenshot", {
            elementIds: selectedElements,
            quality: "preview",
          });

          if (result?.dataURL) {
            setPreviewUrl(result.dataURL);
          } else {
            setPreviewUrl(null);
          }
        } catch (err) {
          console.error("Failed to capture preview:", err);
          setPreviewUrl(null);
        } finally {
          setIsLoadingPreview(false);
        }
      };

      // Small delay to ensure canvas is ready
      const timeoutId = setTimeout(capturePreview, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, hasSelectedElements, selectedElements, dispatchCommand]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        hasCapturedPreview.current = false;
        setPreviewUrl(null);
        setIsLoadingPreview(false);
      }, 300);
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

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

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

    setPrompt("");
  };

  const handleClose = () => {
    setPrompt("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay ${isMobile ? 'p-4' : 'p-6'}`}
      style={{ zIndex: 1001 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
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
            <h2 className="modal-title">✨ Generate Image</h2>
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
          {/* Preview Area */}
          {hasSelectedElements && (
            <div className="form-group">
              <label className="form-label">Reference Preview</label>
              <div className="preview-box" style={{ width: '100%', height: '180px' }}>
                {isLoadingPreview ? (
                  <div className="text-center">
                    <div className="animate-spin mb-2 mx-auto" style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                    <span className="text-xs text-text-secondary">Capturing preview...</span>
                  </div>
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Selected elements preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="placeholder-content">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
            <label className="form-label">Describe your image</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={hasSelectedElements
                ? "Describe how you want the image based on the selected elements..."
                : "Describe the image you want to generate..."}
              disabled={isGenerating}
              className="textarea"
              style={{ background: isGenerating ? '#f9fafb' : undefined, opacity: isGenerating ? 0.7 : 1 }}
            />
          </div>

          {/* Options */}
          <div className="form-group">
            <label className="form-label">Options</label>

            {/* Background Color */}
            <div className="mb-4">
              <div className="form-label--small mb-2">Background Color</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setBackgroundColor("canvas")}
                  className="color-swatch flex items-center justify-center text-xs"
                  style={{ background: '#f3f4f6', borderColor: backgroundColor === "canvas" ? '#6366f1' : '#e5e7eb' }}
                  title="Use canvas background"
                >
                  🎨
                </button>

                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setBackgroundColor(preset.value)}
                    className="color-swatch"
                    style={{ background: preset.color, borderColor: backgroundColor === preset.value ? '#6366f1' : '#e5e7eb' }}
                    title={preset.name}
                  />
                ))}

                <div ref={colorPickerRef} className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="color-swatch flex items-center justify-center"
                    style={{
                      borderColor: backgroundColor === "custom" ? '#6366f1' : '#e5e7eb',
                      background: backgroundColor === "custom" ? customColor : 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)',
                    }}
                    title="Custom color"
                  >
                    {backgroundColor === "custom" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={customColor === "#000000" || customColor === "#343a40" ? "white" : "#374151"} strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 17.66l-4.24 4.24M23 12h-6m-6 0H1m20.24 4.24l-4.24-4.24M6.34 6.34L2.1 2.1" />
                      </svg>
                    )}
                  </button>

                  {showColorPicker && (
                    <div
                      className="bg-surface rounded-xl shadow-lg p-4 z-10"
                      style={{ position: 'absolute', top: '40px', left: 0, minWidth: '200px' }}
                    >
                      <div className="grid gap-1 mb-3" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                        {EXCALIDRAW_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              setCustomColor(color);
                              setBackgroundColor("custom");
                              setShowColorPicker(false);
                            }}
                            className="color-swatch"
                            style={{ width: '24px', height: '24px', borderRadius: '6px', background: color, borderColor: customColor === color ? '#6366f1' : 'transparent' }}
                          />
                        ))}
                      </div>
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
              <div className="form-label--small mb-2">Aspect Ratio</div>
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
              <div className="form-label--small mb-2">Model</div>
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
                  <div className="flex items-center gap-1"><span>⚡</span><span>Flash</span></div>
                  <div className="text-xs text-text-secondary mt-1 font-normal">Fast, great for most images</div>
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
                  <div className="flex items-center gap-1"><span>✨</span><span>Pro</span></div>
                  <div className="text-xs text-text-secondary mt-1 font-normal">Best quality, more detail</div>
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
                  <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
