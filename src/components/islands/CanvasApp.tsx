import { useState, useCallback, useRef, useEffect } from "react";
import CanvasControls from "./CanvasControls";
import { AIChatContainer, ImageGenerationModal, useElementSelection } from "../ai-chat";
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
import { useCanvasSession } from "../../hooks/useCanvasSession";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useExcalidrawAPISafe } from "../../context";
import { useCanvasStore } from "../../stores";
import { eventBus, useEvent } from "../../lib/events";
import WelcomeOverlay from "../onboarding/WelcomeOverlay";
import FeatureTour from "../onboarding/FeatureTour";
import CanvasStatusBadge from "./CanvasStatusBadge";
import LocalFeaturePopover from "./LocalFeaturePopover";
import TemplateGallery from "../onboarding/TemplateGallery";
import type { GenerationOptions } from "../ai-chat/ImageGenerationModal";

// localStorage key for image history persistence
const IMAGE_HISTORY_STORAGE_KEY = "canvas-image-history";
const IMAGE_HISTORY_STORAGE_VERSION = 2;

// Toast types
interface Toast {
    id: string;
    message: string;
    type: 'loading' | 'success' | 'info' | 'error';
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
            {toast.type === 'error' && (
                <span
                    style={{
                        width: '18px',
                        height: '18px',
                        background: '#ef4444',
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
                    ✕
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
    // === USE STORE FOR SHARED STATE ===
    const store = useCanvasStore();
    const {
        messages,
        aiProvider,
        contextMode,
        imageHistory,
        setImageHistory,
        addImageToHistory,
        addToast,
        removeToast,
        loadCanvasState,
        isChatOpen,
        setChatOpen,
    } = store;

    // === LOCAL UI STATE (component-specific) ===
    const [isAssetsOpen, setIsAssetsOpen] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [pendingSaveState, setPendingSaveState] = useState<CanvasState | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
    const [isLocalPopoverOpen, setIsLocalPopoverOpen] = useState(false);
    const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

    // Local toast state (mirror store toasts for backward compatibility)
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Sync local toasts with store
    useEffect(() => {
        const unsubscribe = useCanvasStore.subscribe((state) => {
            setToasts(state.toasts);
        });
        return unsubscribe;
    }, []);

    // Check welcome state
    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('astroweb-visited')) {
            setIsWelcomeOpen(true);
        }
    }, []);

    // === CONTEXT & SESSION ===
    const api = useExcalidrawAPISafe();
    const session = useCanvasSession();

    const getCanvasData = useCallback(() => {
        if (!api) return null;
        return {
            elements: api.getSceneElements() || [],
            appState: api.getAppState() || {},
            files: api.getFiles() || {},
        };
    }, [api]);

    const autoSave = useAutoSave({
        canvasId: session.canvasId,
        isAuthenticated: session.isAuthenticated,
        getCanvasData,
        onCanvasCreated: session.setCanvasId,
    });

    // === IMAGE GENERATION ===
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Track pending image generation
    const pendingImageGenRef = useRef<{
        options: GenerationOptions;
        isCapturing: boolean;
    } | null>(null);
    const loadingToastIdRef = useRef<string | null>(null);

    // === ELEMENT SELECTION ===
    const {
        selectedElements,
        elementSnapshots,
        clearSelection,
    } = useElementSelection({
        enabled: true,
    });

    // Handle auto-save errors
    useEffect(() => {
        if (autoSave.error) {
            addToast(`Save failed: ${autoSave.error}`, 'error', 5000);
        }
    }, [autoSave.error, addToast]);

    // === EVENT LISTENERS (using event bus) ===

    // Listen for canvas data changes
    useEvent('canvas:data-change', () => {
        autoSave.markDirty();
    }, [autoSave.markDirty]);

    // Listen for save trigger
    useEvent('canvas:debug-save', () => {
        handleSaveState();
    });

    // Listen for share modal
    useEvent('share:open', () => {
        setIsShareModalOpen(true);
    });

    // Listen for image generation open
    useEvent('imagegen:open', () => {
        setShowImageModal(true);
    });

    // Listen for screenshot captures
    useEvent('excalidraw:screenshot-captured', (data) => {
        if (!data.requestId?.startsWith("generation-")) return;
        if (!pendingImageGenRef.current?.isCapturing) return;

        pendingImageGenRef.current.isCapturing = false;

        if (data.error) {
            if (loadingToastIdRef.current) {
                removeToast(loadingToastIdRef.current);
                loadingToastIdRef.current = null;
            }
            addToast("Failed to capture screenshot", 'error', 3000);
            return;
        }

        if (data.dataURL && pendingImageGenRef.current.options) {
            handleImageGeneration(pendingImageGenRef.current.options, data.dataURL);
        }
    });

    // Listen for image insertion
    useEvent('excalidraw:image-inserted', () => {
        if (loadingToastIdRef.current) {
            removeToast(loadingToastIdRef.current);
            loadingToastIdRef.current = null;
        }
        addToast("Added to Canvas", 'success', 2000);
    });

    // Listen for asset library
    useEvent('asset:image-generated', () => {
        setTimeout(() => {
            addToast("Added to library", 'info', 2000);
        }, 500);
    });

    // === IMAGE GENERATION HANDLER ===
    const handleImageGeneration = useCallback(async (options: GenerationOptions, screenshotData: string) => {
        setIsGeneratingImage(true);

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: options.prompt,
                    imageData: screenshotData,
                    mode: screenshotData ? 'visual' : 'text',
                    model: options.useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image',
                    aspectRatio: options.aspectRatio || '1:1',
                    backgroundColor: options.backgroundColor,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.imageData) {
                const imageDataUrl = `data:${data.mimeType || 'image/png'};base64,${data.imageData}`;

                // Emit event for assets panel - this will update history via the store
                // because MyAssetsPanel listens to this and calls onImageHistoryChange
                eventBus.emit("asset:image-generated", {
                    imageUrl: imageDataUrl,
                    prompt: options.prompt,
                    timestamp: new Date()
                });

                // Insert into canvas
                eventBus.emit("excalidraw:insert-image", {
                    imageData: imageDataUrl,
                    type: data.mimeType?.split('/')[1] || "png",
                    width: 400,
                    height: 400,
                });

                // Clear loading toast and show success
                if (loadingToastIdRef.current) {
                    removeToast(loadingToastIdRef.current);
                }
                addToast("Image generated successfully", 'success', 2000);
            } else {
                throw new Error("No image data received from API");
            }
        } catch (error) {
            console.error("Image generation failed:", error);
            if (loadingToastIdRef.current) {
                removeToast(loadingToastIdRef.current);
            }
            addToast(error instanceof Error ? error.message : "Failed to generate image", 'error', 5000);
        } finally {
            setIsGeneratingImage(false);
            pendingImageGenRef.current = null;
        }
    }, [addToast, removeToast]);

    // === LOAD CANVAS FROM SERVER ===
    useEffect(() => {
        if (!session.isAuthenticated || !session.canvasId || session.isLoading) return;

        let cancelled = false;
        async function loadFromServer() {
            try {
                const response = await fetch(`/api/canvas/${session.canvasId}`, {
                    credentials: 'include',
                });
                if (!response.ok || cancelled) return;

                const data = await response.json();
                if (data.canvasData && !cancelled) {
                    eventBus.emit("canvas:load-state", {
                        state: {
                            canvas: data.canvasData,
                            chat: { messages: [], aiProvider: 'kimi', contextMode: 'all' },
                            images: { history: [] },
                        },
                    });
                }
            } catch (err) {
                console.error("Failed to load canvas from server:", err);
            }
        }

        loadFromServer();
        return () => { cancelled = true; };
    }, [session.isAuthenticated, session.canvasId, session.isLoading]);

    // === ANONYMOUS MIGRATION ===
    useEffect(() => {
        if (!session.isAuthenticated || session.isLoading) return;
        const anonId = localStorage.getItem('astroweb-anonymous-id');
        if (!anonId) return;
        if (localStorage.getItem('astroweb-migration-done')) return;

        if (!api) return;
        const elements = api.getSceneElements() || [];
        if (elements.length === 0) return;

        const canvasData = {
            elements,
            appState: api.getAppState() || {},
            files: api.getFiles() || {},
        };

        fetch('/api/user/migrate-anonymous', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ anonymousId: anonId, canvasData }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.canvasId) {
                    localStorage.setItem('astroweb-migration-done', '1');
                    session.setCanvasId(data.canvasId);
                    addToast('Canvas migrated to cloud', 'success', 3000);
                }
            })
            .catch(err => console.error('Migration failed:', err));
    }, [session.isAuthenticated, session.isLoading, api, session.setCanvasId, addToast]);

    // === ACTIONS ===
    const handleSaveState = useCallback(() => {
        if (!api) {
            setSaveMessage("✗ Canvas not ready");
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }

        const state = collectCanvasState({
            excalidrawAPI: api,
            messages,
            aiProvider,
            contextMode,
            imageHistory,
        });

        setPendingSaveState(state);
        setIsSaveModalOpen(true);
    }, [api, messages, aiProvider, contextMode, imageHistory]);

    const handleConfirmSave = useCallback(async (options: SaveOptions) => {
        if (!pendingSaveState) {
            setSaveMessage("✗ Save failed: no state to save");
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }

        setIsSaveModalOpen(false);

        try {
            await saveCanvasStateToFile(pendingSaveState, undefined, options);
            let mode = options.compressed ? "compressed" : "full size";
            if (options.excludeHistory) {
                mode += " (no history)";
            }
            setSaveMessage(`✓ Saved (${mode}): ${pendingSaveState.canvas.elements.length} elements`);
        } catch (err) {
            console.error("Save failed:", err);
            setSaveMessage("✗ Failed to save canvas state");
        } finally {
            setPendingSaveState(null);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    }, [pendingSaveState]);

    const handleLoadState = useCallback(async () => {
        const result = await triggerCanvasStateLoad();

        if (!result.success) {
            if (result.error !== "Cancelled") {
                setSaveMessage(`✗ ${result.error}`);
                setTimeout(() => setSaveMessage(null), 3000);
            }
            return;
        }

        if (result.state) {
            const markdownContent = (result.state as any).markdownContent;
            const markdownFilename = (result.state as any).markdownFilename;

            if (markdownContent && markdownFilename) {
                const blob = new Blob([markdownContent], { type: 'text/markdown' });
                const file = new File([blob], markdownFilename, { type: 'text/markdown' });
                eventBus.emit('canvas:load-markdown-files', { files: [file] });
                setSaveMessage(`✓ Loaded markdown: ${markdownFilename}`);
            } else {
                loadCanvasState(result.state);
                eventBus.emit('canvas:load-state', { state: result.state });
                setSaveMessage(`✓ Loaded ${result.state.canvas.elements.length} elements`);
            }
            setTimeout(() => setSaveMessage(null), 3000);
        }
    }, [loadCanvasState]);

    const handleCreateNote = useCallback(() => {
        const createFn = (window as any).createMarkdownNote;
        if (createFn) {
            createFn();
        }
    }, []);

    const handleCreateWebEmbed = useCallback(() => {
        const createFn = (window as any).createWebEmbed;
        if (createFn) {
            createFn();
        }
    }, []);

    const handleCreateLexicalNote = useCallback(() => {
        const createFn = (window as any).createLexicalNote;
        if (createFn) {
            createFn();
        }
    }, []);

    // === IMAGE GENERATION MODAL HANDLER ===
    const handleImageGenerationRequest = useCallback((options: GenerationOptions) => {
        setShowImageModal(false);
        loadingToastIdRef.current = addToast("Generating image...", 'info', 0);

        if (selectedElements.length === 0) {
            // Generate without reference
            handleImageGeneration(options, "");
            return;
        }

        pendingImageGenRef.current = {
            options,
            isCapturing: true,
        };

        const requestId = `generation-${Date.now()}`;
        eventBus.emit('excalidraw:capture-screenshot', {
            elementIds: selectedElements,
            quality: "high",
            backgroundColor: options.backgroundColor !== "canvas" ? options.backgroundColor : undefined,
            requestId,
        });
    }, [selectedElements, handleImageGeneration, addToast]);

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

            {/* Status badge — bottom-center (Local / Cloud save) */}
            <CanvasStatusBadge
                isAuthenticated={session.isAuthenticated}
                isLoading={session.isLoading}
                autoSave={autoSave}
                canvasId={session.canvasId}
                onLogin={() => { window.location.href = '/login'; }}
                onSaveVersion={async () => {
                    let loadingToastId: string | null = null;
                    try {
                        if (!session.canvasId) {
                            loadingToastId = addToast('Creating new canvas...', 'info', 0);
                        }

                        // Force a cloud sync first
                        console.log("💾 Manual version save: forcing cloud sync first...");
                        await autoSave.saveNow();

                        // Small delay to let state settle
                        let attempts = 0;
                        while (!session.canvasId && attempts < 10) {
                            await new Promise(r => setTimeout(r, 200));
                            attempts++;
                        }

                        if (loadingToastId) {
                            removeToast(loadingToastId);
                            loadingToastId = null;
                        }

                        // Check for recent auto-save errors
                        if (autoSave.error) {
                            addToast(`Cannot snapshot: Cloud sync failed - ${autoSave.error}`, 'error', 4000);
                            return;
                        }

                        if (!session.canvasId) {
                            addToast('Failed to identify canvas for snapshot', 'error', 3000);
                            return;
                        }

                        console.log("📸 Creating version snapshot for canvas:", session.canvasId);
                        const res = await fetch(`/api/canvas/${session.canvasId}/versions`, {
                            method: 'POST',
                            credentials: 'include',
                        });

                        if (res.ok) {
                            addToast('Version snapshot created', 'success', 2000);
                        } else {
                            const errData = await res.json().catch(() => ({}));
                            addToast(errData.error || 'Failed to create version', 'error', 3000);
                        }
                    } catch (err) {
                        if (loadingToastId) removeToast(loadingToastId);
                        console.error('Snapshot failed:', err);
                        addToast('Error during version snapshot', 'error', 3000);
                    }
                }}
                onLocalClick={() => setIsLocalPopoverOpen(true)}
            />

            {/* Local feature popover — appears above the badge */}
            <LocalFeaturePopover
                isOpen={isLocalPopoverOpen}
                onClose={() => setIsLocalPopoverOpen(false)}
            />

            <CanvasControls
                onOpenChat={() => {
                    setChatOpen(true);
                    store.setChatMinimized(false);
                }}
                onOpenAssets={() => setIsAssetsOpen(true)}
                isChatOpen={isChatOpen}
                isAssetsOpen={isAssetsOpen}
                onSaveState={handleSaveState}
                onLoadState={handleLoadState}
                onCreateMarkdown={handleCreateNote}
                onCreateWebEmbed={handleCreateWebEmbed}
                onCreateLexical={handleCreateLexicalNote}
                onShare={() => setIsShareModalOpen(true)}
            />

            {/* AIChatContainer - now uses store, no prop drilling needed */}
            <AIChatContainer
                isOpen={isChatOpen}
                onClose={() => setChatOpen(false)}
            />

            <MyAssetsPanel
                isOpen={isAssetsOpen}
                onClose={() => setIsAssetsOpen(false)}
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
                    isAuthenticated={session.isAuthenticated}
                    onCloudSave={() => autoSave.saveNow()}
                />
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                currentCanvasState={null}
            />

            {/* Image Generation Modal */}
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

            {/* === ONBOARDING COMPONENTS === */}

            {/* Welcome overlay — first visit only */}
            <WelcomeOverlay
                onStartBlank={() => setIsWelcomeOpen(false)}
                onBrowseTemplates={() => {
                    setIsWelcomeOpen(false);
                    setIsTemplateGalleryOpen(true);
                }}
                onSignIn={() => { window.location.href = '/login'; }}
                onDismiss={() => setIsWelcomeOpen(false)}
            />

            {/* Template gallery modal */}
            <TemplateGallery
                isOpen={isTemplateGalleryOpen}
                onClose={() => setIsTemplateGalleryOpen(false)}
                onSelectTemplate={() => { }}
            />

            {/* Feature tour */}
            <FeatureTour canStart={!isWelcomeOpen} />

            {/* Toast message for save/load feedback */}
            {saveMessage && (
                <div className="canvas-toast">
                    {saveMessage}
                    <style>{`
                        .canvas-toast {
                            position: fixed;
                            bottom: 4rem;
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
                            animation: slideUp 0.2s ease;
                        }
                        @keyframes slideUp {
                            from { transform: translate(-50%, 20px); opacity: 0; }
                            to { transform: translate(-50%, 0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
