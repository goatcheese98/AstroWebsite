import { useState, useCallback, useRef, useEffect } from "react";
import CanvasControls from "./CanvasControls";
import { AIChatContainer, ImageGenerationModal, useImageGeneration, useElementSelection } from "../ai-chat";
import MyAssetsPanel from "./MyAssetsPanel";
import SaveOptionsModal from "./SaveOptionsModal";
import ShareModal from "./ShareModal";
import {
    collectCanvasState,
    saveCanvasStateToFile,
    triggerCanvasStateLoad,
    type CanvasState,
    type SaveOptions
} from "../../lib/canvas-state-manager";
import type { Message } from "../ai-chat/types";
import type { ImageHistoryItem } from "../ai-chat/hooks/useImageGeneration";
import type { GenerationOptions } from "../ai-chat/ImageGenerationModal";

// localStorage key for image history persistence
const IMAGE_HISTORY_STORAGE_KEY = "canvas-image-history";
const IMAGE_HISTORY_STORAGE_VERSION = 2; // Bumped to invalidate old cache

// State container for save/load coordination
interface CanvasStateContainer {
    messages: Message[];
    aiProvider: "kimi" | "claude";
    contextMode: "all" | "selected";
    imageHistory: ImageHistoryItem[];
}

// Toast types
interface Toast {
    id: string;
    message: string;
    type: 'loading' | 'success' | 'info';
    duration?: number;
}

// Simple Toast Component
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                onRemove(toast.id);
            }, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast, onRemove]);

    return (
        <div 
            style={{
                background: 'white',
                border: '2px solid #333',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '3px 3px 0 #333',
                animation: 'toastIn 0.3s ease',
                minWidth: '180px',
            }}
        >
            {toast.type === 'loading' && (
                <div 
                    style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #e5e7eb',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        flexShrink: 0,
                    }}
                />
            )}
            {toast.type === 'success' && (
                <span 
                    style={{
                        width: '18px',
                        height: '18px',
                        background: '#22c55e',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                    }}
                >
                    ✓
                </span>
            )}
            <span 
                style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#333',
                }}
            >
                {toast.message}
            </span>
        </div>
    );
}

export default function CanvasApp() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isAssetsOpen, setIsAssetsOpen] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [pendingSaveState, setPendingSaveState] = useState<CanvasState | null>(null);

    // Image generation modal state - managed independently of AI chat
    const [showImageModal, setShowImageModal] = useState(false);

    // Share modal state
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Toast state
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Refs to access state from child components
    const stateContainerRef = useRef<CanvasStateContainer>({
        messages: [],
        aiProvider: "kimi",
        contextMode: "all",
        imageHistory: [],
    });

    // Pending state to load (set when loading, applied when components mount/update)
    const pendingLoadStateRef = useRef<CanvasState | null>(null);

    // Track pending image generation (screenshot coordination)
    const pendingImageGenRef = useRef<{
        options: GenerationOptions;
        isCapturing: boolean;
    } | null>(null);

    // Ref to always have latest pendingSaveState (avoid stale closure)
    const pendingSaveStateRef = useRef<CanvasState | null>(null);
    
    // Keep ref in sync with state
    useEffect(() => {
        pendingSaveStateRef.current = pendingSaveState;
    }, [pendingSaveState]);

    // === IMAGE GENERATION (needed for save functionality) ===
    const {
        isGeneratingImage,
        generateImage,
        imageHistory,
        setImageHistory,
    } = useImageGeneration();

    // === IMAGE HISTORY PERSISTENCE ===
    // Track if we've loaded initial data (to avoid saving on mount)
    const hasLoadedInitialHistory = useRef(false);

    // Load image history from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(IMAGE_HISTORY_STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                console.log("📂 Image history from localStorage:", {
                    version: data.version,
                    expectedVersion: IMAGE_HISTORY_STORAGE_VERSION,
                    historyLength: data.history?.length || 0,
                });

                if (data.version === IMAGE_HISTORY_STORAGE_VERSION && data.history) {
                    // Restore timestamps as Date objects
                    const restoredHistory = data.history.map((img: any) => ({
                        ...img,
                        timestamp: img.timestamp ? new Date(img.timestamp) : new Date(),
                    }));
                    setImageHistory(restoredHistory);
                    console.log(`✅ Restored ${restoredHistory.length} images from localStorage`);
                } else {
                    console.warn(`⚠️ Image history version mismatch (got ${data.version}, expected ${IMAGE_HISTORY_STORAGE_VERSION}), clearing old data`);
                    localStorage.removeItem(IMAGE_HISTORY_STORAGE_KEY);
                }
            } else {
                console.log("📂 No image history in localStorage");
            }
            // Mark that we've completed initial load
            hasLoadedInitialHistory.current = true;
        } catch (err) {
            console.error("❌ Failed to load image history from localStorage:", err);
            // Clear corrupted data
            localStorage.removeItem(IMAGE_HISTORY_STORAGE_KEY);
            hasLoadedInitialHistory.current = true;
        }
    }, [setImageHistory]);

    // Save image history to localStorage whenever it changes (after initial load)
    useEffect(() => {
        // Skip saving on initial mount
        if (!hasLoadedInitialHistory.current) {
            return;
        }

        try {
            if (imageHistory.length === 0) {
                // Clear localStorage if history is empty
                localStorage.removeItem(IMAGE_HISTORY_STORAGE_KEY);
                console.log("🗑️ Cleared image history from localStorage");
            } else {
                // Serialize history with timestamps as ISO strings
                const dataToSave = {
                    version: IMAGE_HISTORY_STORAGE_VERSION,
                    history: imageHistory.map(img => ({
                        ...img,
                        timestamp: img.timestamp instanceof Date
                            ? img.timestamp.toISOString()
                            : img.timestamp,
                    })),
                };
                localStorage.setItem(IMAGE_HISTORY_STORAGE_KEY, JSON.stringify(dataToSave));
                console.log(`💾 Saved ${imageHistory.length} images to localStorage`);
            }
        } catch (err) {
            console.error("Failed to save image history to localStorage:", err);
        }
    }, [imageHistory]);

    // Toast helper functions
    const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration: number = 3000) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const toast: Toast = { id, message, type, duration };
        setToasts(prev => [...prev, toast]);
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showMessage = (msg: string) => {
        setSaveMessage(msg);
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const handleOpenChat = () => {
        console.log("Opening AI Chat");
        setIsChatOpen(true);
        // Allow both panels to be open simultaneously
    };

    const handleOpenAssets = () => {
        console.log("Opening Assets");
        setIsAssetsOpen(true);
        // Allow both panels to be open simultaneously
    };

    const handleCloseChat = () => {
        console.log("Closing AI Chat");
        setIsChatOpen(false);
    };

    const handleCloseAssets = () => {
        console.log("Closing Assets");
        setIsAssetsOpen(false);
    };

    const handleShare = () => {
        console.log("Opening Share modal");
        setIsShareModalOpen(true);
    };

    const handleCloseShare = () => {
        console.log("Closing Share modal");
        setIsShareModalOpen(false);
    };

    /**
     * Handle save canvas state - opens modal to choose options
     */
    const handleSaveState = useCallback(() => {
        console.log("💾 CanvasApp: handleSaveState called");
        
        const excalidrawAPI = (window as any).excalidrawAPI;
        console.log("💾 CanvasApp: excalidrawAPI exists:", !!excalidrawAPI);
        
        if (!excalidrawAPI) {
            showMessage("✗ Canvas not ready");
            return;
        }

        // Debug logging
        const elements = excalidrawAPI?.getSceneElements?.() || [];
        console.log("📊 Save - Elements count:", elements.length);
        console.log("📊 Save - Image history count:", imageHistory.length);
        console.log("📊 Save - Messages count:", stateContainerRef.current.messages.length);

        const state = collectCanvasState({
            excalidrawAPI,
            messages: stateContainerRef.current.messages,
            aiProvider: stateContainerRef.current.aiProvider,
            contextMode: stateContainerRef.current.contextMode,
            imageHistory, // Use imageHistory directly from useImageGeneration hook
        });

        console.log("📊 Save - Total elements in state:", state.canvas.elements.length);
        console.log("📊 Save - Total images in state:", state.images.history.length);
        console.log("📊 Save - Opening modal...");

        // Store state and show modal
        setPendingSaveState(state);
        setIsSaveModalOpen(true);
        console.log("📊 Save - Modal state set");
    }, [imageHistory]);

    /**
     * Handle confirm save from modal
     */
    const handleConfirmSave = useCallback(async (options: SaveOptions) => {
        console.log("💾 CanvasApp: handleConfirmSave called with options:", options);
        
        // Use ref to get latest state (avoid stale closure)
        const stateToSave = pendingSaveStateRef.current;
        console.log("💾 CanvasApp: stateToSave from ref:", stateToSave ? "exists" : "null");
        
        if (!stateToSave) {
            console.error("❌ Save failed: pendingSaveState is null");
            showMessage("✗ Save failed: no state to save");
            return;
        }

        console.log("💾 Confirming save with:", {
            elements: stateToSave.canvas.elements.length,
            images: stateToSave.images.history.length,
            messages: stateToSave.chat.messages.length,
            options,
        });

        setIsSaveModalOpen(false);

        try {
            await saveCanvasStateToFile(stateToSave, undefined, options);
            console.log("✅ File saved successfully");

            // Build status message
            let mode = options.compressed ? "compressed" : "full size";
            if (options.excludeHistory) {
                mode += " (no history)";
            }
            showMessage(`✓ Saved (${mode}): ${stateToSave.canvas.elements.length} elements, ${stateToSave.chat.messages.length} messages`);
        } catch (err) {
            console.error("Save failed:", err);
            showMessage("✗ Failed to save canvas state");
        } finally {
            setPendingSaveState(null);
        }
    }, []);

    /**
     * Handle load canvas state from file
     */
    const handleLoadState = useCallback(async () => {
        const result = await triggerCanvasStateLoad();

        if (!result.success) {
            if (result.error !== "Cancelled") {
                showMessage(`✗ ${result.error}`);
            }
            return;
        }

        if (result.state) {
            console.log("📂 Load - State loaded from file:", {
                elements: result.state.canvas.elements.length,
                images: result.state.images?.history?.length || 0,
                messages: result.state.chat.messages.length,
            });

            // Check if this is a markdown file
            const markdownContent = (result.state as any).markdownContent;
            const markdownFilename = (result.state as any).markdownFilename;

            if (markdownContent && markdownFilename) {
                // Create a File object from the markdown content
                const blob = new Blob([markdownContent], { type: 'text/markdown' });
                const file = new File([blob], markdownFilename, { type: 'text/markdown' });

                // Dispatch event to create markdown note
                window.dispatchEvent(new CustomEvent('canvas:load-markdown-files', {
                    detail: { files: [file] },
                }));

                showMessage(`✓ Loaded markdown: ${markdownFilename}`);
            } else {
                pendingLoadStateRef.current = result.state;

                // Dispatch event to notify components to load state
                window.dispatchEvent(new CustomEvent("canvas:load-state", {
                    detail: { state: result.state },
                }));

                showMessage(`✓ Loaded ${result.state.canvas.elements.length} elements, ${result.state.chat.messages.length} messages, ${result.state.images?.history?.length || 0} images`);
            }
        }
    }, []);

    /**
     * Update state container from AIChatContainer
     */
    const handleStateUpdate = useCallback((updates: Partial<CanvasStateContainer>) => {
        stateContainerRef.current = {
            ...stateContainerRef.current,
            ...updates,
        };
    }, []);

    const handleCreateNote = useCallback(() => {
        const createFn = (window as any).createMarkdownNote;
        if (createFn) {
            createFn();
        } else {
            console.warn("Note creation not available yet");
        }
    }, []);

    // Debug: Add global save trigger for testing
    useEffect(() => {
        const handleDebugSave = () => {
            console.log("🔧 Debug save triggered");
            handleSaveState();
        };
        window.addEventListener("canvas:debug-save", handleDebugSave);
        return () => window.removeEventListener("canvas:debug-save", handleDebugSave);
    }, [handleSaveState]);

    // Listen for share modal open requests (from WelcomeScreen)
    useEffect(() => {
        const handleShareOpen = () => {
            console.log("🔧 Share modal opened from WelcomeScreen");
            setIsShareModalOpen(true);
        };
        window.addEventListener("share:open", handleShareOpen);
        return () => window.removeEventListener("share:open", handleShareOpen);
    }, []);

    // === IMAGE GENERATION (moved from AIChatContainer) ===

    // Element selection from canvas - always enabled for image generation
    const {
        selectedElements,
        elementSnapshots,
        clearSelection,
    } = useElementSelection({
        enabled: true, // Always enabled for image generation
    });

    // Sync loaded image history from file
    useEffect(() => {
        if (pendingLoadStateRef.current?.images?.history) {
            const historyLength = pendingLoadStateRef.current.images.history.length;
            console.log(`📂 Sync effect - Loading ${historyLength} images`);
            const loadedHistory = pendingLoadStateRef.current.images.history.map((img: any) => ({
                ...img,
                timestamp: img.timestamp instanceof Date ? img.timestamp : new Date(img.timestamp),
            }));
            setImageHistory(loadedHistory);
            console.log(`✅ Sync effect - Set ${loadedHistory.length} images into state`);
            // Clear the pending state so we don't reload on next render
            pendingLoadStateRef.current = null;
        }
    }, [setImageHistory]);

    // Ref to track the loading toast id
    const loadingToastIdRef = useRef<string | null>(null);

    // Listen for external events to open image generation modal
    useEffect(() => {
        const handleOpenImageGen = () => {
            setShowImageModal(true);
        };
        window.addEventListener("imagegen:open", handleOpenImageGen);
        return () => window.removeEventListener("imagegen:open", handleOpenImageGen);
    }, []);

    /**
     * Handle image generation request from modal
     * Triggers screenshot capture, then calls API
     */
    const handleImageGenerationRequest = useCallback((options: GenerationOptions) => {
        console.log("🎨 Image generation requested...");

        // Close modal immediately
        setShowImageModal(false);

        // Show loading toast
        loadingToastIdRef.current = addToast("Generating image...", 'loading', 0);

        // If no elements are selected, generate without a reference screenshot
        if (selectedElements.length === 0) {
            console.log("🎨 No elements selected - generating without reference image");
            generateImage(
                "", // No screenshot data
                { ...options, hasReference: false },
                {
                    onSuccess: () => {
                        console.log("✅ Image generation complete");
                        // Loading toast will be removed when canvas-inserted event fires
                    },
                    onError: (err) => {
                        console.error("❌ Image generation failed:", err);
                        // Remove loading toast and show error
                        if (loadingToastIdRef.current) {
                            removeToast(loadingToastIdRef.current);
                            loadingToastIdRef.current = null;
                        }
                        addToast("Failed to generate image", 'info', 3000);
                    }
                }
            );
            return;
        }

        // Store options for when screenshot arrives
        pendingImageGenRef.current = {
            options,
            isCapturing: true,
        };

        // Dispatch screenshot capture event
        const requestId = `generation-${Date.now()}`;
        window.dispatchEvent(new CustomEvent("excalidraw:capture-screenshot", {
            detail: {
                elementIds: selectedElements,
                quality: "high",
                backgroundColor: options.backgroundColor !== "canvas" ? options.backgroundColor : undefined,
                requestId,
            }
        }));
    }, [selectedElements, generateImage, addToast, removeToast]);

    /**
     * Listen for screenshot captures and trigger image generation
     */
    useEffect(() => {
        const handleScreenshotCaptured = (event: any) => {
            const { requestId, dataURL, error } = event.detail || {};

            // Only handle generation screenshots (not chat or preview)
            if (!requestId?.startsWith("generation-")) return;

            console.log("📸 Generation screenshot received:", requestId);

            if (!pendingImageGenRef.current?.isCapturing) {
                console.log("⏭️ No pending image generation, ignoring");
                return;
            }

            pendingImageGenRef.current.isCapturing = false;

            if (error) {
                console.error("❌ Screenshot error:", error);
                // Remove loading toast and show error
                if (loadingToastIdRef.current) {
                    removeToast(loadingToastIdRef.current);
                    loadingToastIdRef.current = null;
                }
                addToast("Failed to capture screenshot", 'info', 3000);
                return;
            }

            if (dataURL && pendingImageGenRef.current.options) {
                console.log("🚀 Starting API call with screenshot...");
                generateImage(
                    dataURL,
                    pendingImageGenRef.current.options,
                    {
                        onSuccess: () => {
                            console.log("✅ Image generation complete");
                            pendingImageGenRef.current = null;
                            // Loading toast will be removed when canvas-inserted event fires
                        },
                        onError: (err) => {
                            console.error("❌ Image generation failed:", err);
                            // Remove loading toast and show error
                            if (loadingToastIdRef.current) {
                                removeToast(loadingToastIdRef.current);
                                loadingToastIdRef.current = null;
                            }
                            addToast("Failed to generate image", 'info', 3000);
                            pendingImageGenRef.current = null;
                        }
                    }
                );
            }
        };

        window.addEventListener("excalidraw:screenshot-captured", handleScreenshotCaptured);
        return () => {
            window.removeEventListener("excalidraw:screenshot-captured", handleScreenshotCaptured);
        };
    }, [generateImage, addToast, removeToast]);

    // Listen for image insertion to canvas
    useEffect(() => {
        const handleImageInserted = () => {
            console.log("🎨 Image inserted to canvas");
            // Remove loading toast
            if (loadingToastIdRef.current) {
                removeToast(loadingToastIdRef.current);
                loadingToastIdRef.current = null;
            }
            // Show success toast
            addToast("Added to Canvas", 'success', 2000);
        };

        window.addEventListener("excalidraw:image-inserted", handleImageInserted);
        return () => window.removeEventListener("excalidraw:image-inserted", handleImageInserted);
    }, [addToast, removeToast]);

    // Listen for image added to library/assets
    useEffect(() => {
        const handleImageAddedToLibrary = () => {
            console.log("🎨 Image added to library");
            // Show library toast (staggered after canvas toast)
            setTimeout(() => {
                addToast("Added to library", 'info', 2000);
            }, 500);
        };

        window.addEventListener("asset:image-generated", handleImageAddedToLibrary);
        return () => window.removeEventListener("asset:image-generated", handleImageAddedToLibrary);
    }, [addToast]);

    // Listen for generic toast requests
    useEffect(() => {
        const handleShowToast = (event: any) => {
            const { message, type = 'info' } = event.detail || {};
            if (message) {
                addToast(message, type, 2000);
            }
        };

        window.addEventListener("canvas:show-toast", handleShowToast);
        return () => window.removeEventListener("canvas:show-toast", handleShowToast);
    }, [addToast]);

    return (
        <>
            {/* Global styles for toast animations */}
            <style>{`
                @keyframes toastIn {
                    from {
                        opacity: 0;
                        transform: translateX(50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* Toast Container - Bottom Right */}
            <div 
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'flex-end',
                }}
            >
                {toasts.map((toast) => (
                    <ToastItem 
                        key={toast.id} 
                        toast={toast} 
                        onRemove={removeToast} 
                    />
                ))}
            </div>

            <CanvasControls
                onOpenChat={handleOpenChat}
                onOpenAssets={handleOpenAssets}
                isChatOpen={isChatOpen}
                isAssetsOpen={isAssetsOpen}
                onSaveState={handleSaveState}
                onLoadState={handleLoadState}
                onCreateMarkdown={handleCreateNote}
                onShare={handleShare}
            />

            {/* Use new AIChatContainer with element selection feature */}
            <AIChatContainer
                isOpen={isChatOpen}
                onClose={handleCloseChat}
                onStateUpdate={handleStateUpdate}
                pendingLoadState={pendingLoadStateRef.current}
                imageHistory={imageHistory}
                setImageHistory={setImageHistory}
            />


            <MyAssetsPanel 
                isOpen={isAssetsOpen} 
                onClose={handleCloseAssets} 
                imageHistory={imageHistory}
                onImageHistoryChange={setImageHistory}
            />

            {/* Save Options Modal */}
            {pendingSaveState && (
                <SaveOptionsModal
                    isOpen={isSaveModalOpen}
                    onClose={() => {
                        setIsSaveModalOpen(false);
                        setPendingSaveState(null);
                    }}
                    onConfirm={handleConfirmSave}
                    elementCount={pendingSaveState.canvas.elements.length}
                    messageCount={pendingSaveState.chat.messages.length}
                    imageCount={pendingSaveState.images.history.length}
                />
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={handleCloseShare}
                currentCanvasState={null}
            />

            {/* Image Generation Modal - now independent of AI chat */}
            <ImageGenerationModal
                isOpen={showImageModal}
                onClose={() => {
                    setShowImageModal(false);
                    pendingImageGenRef.current = null;
                }}
                selectedElements={selectedElements}
                elementSnapshots={elementSnapshots}
                canvasState={null}
                onGenerate={handleImageGenerationRequest}
                isGenerating={isGeneratingImage}
            />

            {/* Toast message for save/load feedback */}
            {saveMessage && (
                <div className="canvas-toast">
                    {saveMessage}
                    <style>{`
                        .canvas-toast {
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
                            from { transform: translate(-50%, -20px); opacity: 0; }
                            to { transform: translate(-50%, 0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
