import { useState, useCallback, useRef, useEffect } from "react";
import CanvasControls from "./CanvasControls";
import { AIChatContainer, ImageGenerationModal, useImageGeneration, useElementSelection } from "../ai-chat";
import MyAssetsPanel from "./MyAssetsPanel";
import SaveOptionsModal from "./SaveOptionsModal";
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

// State container for save/load coordination
interface CanvasStateContainer {
    messages: Message[];
    aiProvider: "kimi" | "claude";
    contextMode: "all" | "selected";
    imageHistory: ImageHistoryItem[];
}

export default function CanvasApp() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isAssetsOpen, setIsAssetsOpen] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [pendingSaveState, setPendingSaveState] = useState<CanvasState | null>(null);

    // Image generation modal state - managed independently of AI chat
    const [showImageModal, setShowImageModal] = useState(false);

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

    const showMessage = (msg: string) => {
        setSaveMessage(msg);
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const handleOpenChat = () => {
        console.log("Opening AI Chat");
        setIsChatOpen(true);
        setIsAssetsOpen(false); // Close assets if open
    };

    const handleOpenAssets = () => {
        console.log("Opening Assets");
        setIsAssetsOpen(true);
        setIsChatOpen(false); // Close chat if open
    };

    const handleCloseChat = () => {
        console.log("Closing AI Chat");
        setIsChatOpen(false);
    };

    const handleCloseAssets = () => {
        console.log("Closing Assets");
        setIsAssetsOpen(false);
    };

    /**
     * Handle save canvas state - opens modal to choose options
     */
    const handleSaveState = useCallback(() => {
        const excalidrawAPI = (window as any).excalidrawAPI;
        if (!excalidrawAPI) {
            showMessage("✗ Canvas not ready");
            return;
        }

        const state = collectCanvasState({
            excalidrawAPI,
            messages: stateContainerRef.current.messages,
            aiProvider: stateContainerRef.current.aiProvider,
            contextMode: stateContainerRef.current.contextMode,
            imageHistory: stateContainerRef.current.imageHistory,
        });

        // Store state and show modal
        setPendingSaveState(state);
        setIsSaveModalOpen(true);
    }, []);

    /**
     * Handle confirm save from modal
     */
    const handleConfirmSave = useCallback(async (options: SaveOptions) => {
        if (!pendingSaveState) return;

        setIsSaveModalOpen(false);

        try {
            await saveCanvasStateToFile(pendingSaveState, undefined, options);

            // Build status message
            let mode = options.compressed ? "compressed" : "full size";
            if (options.excludeHistory) {
                mode += " (no history)";
            }
            showMessage(`✓ Saved (${mode}): ${pendingSaveState.canvas.elements.length} elements, ${pendingSaveState.chat.messages.length} messages`);
        } catch (err) {
            console.error("Save failed:", err);
            showMessage("✗ Failed to save canvas state");
        } finally {
            setPendingSaveState(null);
        }
    }, [pendingSaveState]);

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
            pendingLoadStateRef.current = result.state;

            // Dispatch event to notify components to load state
            window.dispatchEvent(new CustomEvent("canvas:load-state", {
                detail: { state: result.state },
            }));

            showMessage(`✓ Loaded ${result.state.canvas.elements.length} elements, ${result.state.chat.messages.length} messages`);
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

    // === IMAGE GENERATION (moved from AIChatContainer) ===

    // Element selection from canvas - always enabled for image generation
    const {
        selectedElements,
        elementSnapshots,
        clearSelection,
    } = useElementSelection({
        enabled: true, // Always enabled for image generation
    });

    // Image generation hook
    const {
        isGeneratingImage,
        generateImage,
    } = useImageGeneration();

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
        console.log("🎨 Image generation requested, capturing screenshot...");

        // Store options for when screenshot arrives
        pendingImageGenRef.current = {
            options,
            isCapturing: true,
        };

        // Dispatch screenshot capture event
        const requestId = `generation-${Date.now()}`;
        window.dispatchEvent(new CustomEvent("excalidraw:capture-screenshot", {
            detail: {
                elementIds: selectedElements.length > 0 ? selectedElements : undefined,
                quality: "high",
                backgroundColor: options.backgroundColor !== "canvas" ? options.backgroundColor : undefined,
                requestId,
            }
        }));
    }, [selectedElements]);

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
                            setShowImageModal(false);
                            pendingImageGenRef.current = null;
                        },
                        onError: (err) => {
                            console.error("❌ Image generation failed:", err);
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
    }, [generateImage]);

    return (
        <>
            <CanvasControls
                onOpenChat={handleOpenChat}
                onOpenAssets={handleOpenAssets}
                isChatOpen={isChatOpen}
                isAssetsOpen={isAssetsOpen}
                onSaveState={handleSaveState}
                onLoadState={handleLoadState}
                onCreateMarkdown={handleCreateNote}
            />

            {/* Use new AIChatContainer with element selection feature */}
            <AIChatContainer
                isOpen={isChatOpen}
                onClose={handleCloseChat}
                onStateUpdate={handleStateUpdate}
                pendingLoadState={pendingLoadStateRef.current}
            />


            <MyAssetsPanel isOpen={isAssetsOpen} onClose={handleCloseAssets} />

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
