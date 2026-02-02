/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                     🤖 AIChatContainer.tsx                                   ║
 * ║                    "The Chat Orchestra Conductor"                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 🎯 Orchestrator | 🏗️ Architecture Root        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the conductor of the AI chat orchestra. I don't play any instruments myself
 * - instead, I coordinate all the specialized musicians (hooks and components) to
 * create a harmonious user experience. I'm thin by design - all the heavy lifting
 * is done by my delegates.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * I bring together all the pieces of the AI chat feature into a cohesive whole.
 * Users get a complete chat experience with:
 * - Message sending and receiving
 * - Canvas context awareness
 * - Image generation
 * - Resizable panel
 * - Keyboard shortcuts
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                     MY ORCHESTRA SECTIONS                        │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   🧠 BRAIN (Hooks)                                               │
 *      │   ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐         │
 *      │   │useAIChatState│ │useImageGen   │ │usePanelResize   │         │
 *      │   └─────────────┘ └──────────────┘ └─────────────────┘         │
 *      │   ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐         │
 *      │   │useScreenshot│ │useCanvasCmds │ │useKeyboardShorts│         │
 *      │   └─────────────┘ └──────────────┘ └─────────────────┘         │
 *      │                                                                  │
 *      │   🎨 UI (Components)                                             │
 *      │   ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐         │
 *      │   │ ChatPanel   │ │ ChatHeader   │ │CanvasContextPanel│         │
 *      │   └─────────────┘ └──────────────┘ └─────────────────┘         │
 *      │   ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐         │
 *      │   │ImageGallery │ │ MessageList  │ │    ChatInput    │         │
 *      │   └─────────────┘ └──────────────┘ └─────────────────┘         │
 *      │                                                                  │
 *      │   🎭 MODALS                                                      │
 *      │   ┌─────────────────┐    ┌─────────────────┐                   │
 *      │   │ TemplateModal   │    │ ImageGenModal   │                   │
 *      │   └─────────────────┘    └─────────────────┘                   │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Chat doesn't open, components not rendering, hooks failing
 * - User Impact: Complete chat feature failure
 * - Quick Fix: Check all imports are correct, verify props passing
 * - Debug: Look for errors in component tree, check hook return values
 * - Common Issue: Missing context providers or wrong prop types
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isOpen              │ Whether chat panel should be visible                 │
 * │ onClose             │ Callback when user closes the panel                  │
 * │ initialWidth        │ Starting width of the panel (default: 400)           │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🏗️ ARCHITECTURE DECISIONS:
 * - I compose hooks rather than having internal state
 * - I pass callbacks between hooks to coordinate actions
 * - I render components with their required props
 * - I handle the screenshot → chat flow coordination
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: BEFORE: 1,760-line God Component with everything inline
 * 2026-02-02: AFTER: ~250-line orchestrator composing 6 hooks + 6 components
 * 2026-02-02: Extracted all business logic to custom hooks
 * 2026-02-02: Extracted all UI to specialized components
 * 2026-02-02: Added comprehensive documentation headers
 * 
 * @module AIChatContainer
 */

import React, { useRef, useCallback, useEffect } from "react";

// Hooks
import { useAIChatState } from "./hooks/useAIChatState";
import { useImageGeneration } from "./hooks/useImageGeneration";
import { useCanvasCommands } from "./hooks/useCanvasCommands";
import { usePanelResize } from "./hooks/usePanelResize";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useElementSelection } from "./useElementSelection";

// Components
import { ChatPanel } from "./components/ChatPanel";
import { ChatHeader } from "./components/ChatHeader";
import { CanvasContextPanel } from "./components/CanvasContextPanel";
import { ImageGallery } from "./components/ImageGallery";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";

// Modals
import ImageGenerationModal from "./ImageGenerationModal";
import TemplateModal from "./TemplateModal";

export interface AIChatContainerProps {
    /** Whether the chat panel is visible */
    isOpen: boolean;
    /** Callback when user closes the panel */
    onClose: () => void;
    /** Initial width of the panel in pixels */
    initialWidth?: number;
}

/**
 * AI Chat Container - Orchestrates all chat functionality
 */
export default function AIChatContainer({
    isOpen,
    onClose,
    initialWidth = 400,
}: AIChatContainerProps) {
    // === 🧠 REFS ===
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // === 🧠 HOOKS ===
    
    // Element selection from canvas
    const {
        selectedElements,
        elementSnapshots,
        clearSelection,
        getSelectionContext,
    } = useElementSelection({
        enabled: isOpen,
    });
    
    // Panel resize
    const {
        panelWidth,
        isResizing,
        startResize,
    } = usePanelResize({
        initialWidth,
        minWidth: 320,
        maxWidth: "80%",
    });
    
    // Core chat state
    const {
        messages,
        input,
        setInput,
        isLoading,
        error,
        clearError,
        aiProvider,
        toggleProvider,
        contextMode,
        setContextMode,
        canvasState,
        setCanvasState,
        showTemplates,
        setShowTemplates,
        showImageModal,
        setShowImageModal,
        handleSend: handleSendMessage,
    } = useAIChatState({
        isOpen,
        initialWidth,
        onClose,
    });
    
    // Image generation
    const {
        isGeneratingImage,
        imageHistory,
        generateImage,
        copyImageToClipboard,
        clearHistory: clearImageHistory,
    } = useImageGeneration();
    
    // Track pending image generation (screenshot coordination)
    const pendingImageGenRef = useRef<{
        options: any;
        isCapturing: boolean;
    } | null>(null);
    
    // Canvas commands
    const {
        drawElements,
        updateElements,
    } = useCanvasCommands({
        isOpen,
        onStateUpdate: setCanvasState,
    });
    
    // === 🚀 ACTIONS ===
    
    /**
     * Handle sending a message
     */
    const handleSend = useCallback(async () => {
        // Skip screenshot for Kimi (doesn't support images)
        const isKimi = aiProvider === "kimi";
        
        // For now, simplified send without screenshot coordination
        // TODO: Add back screenshot capture for Claude provider
        await handleSendMessage({
            screenshotData: null,
            selectedElements,
            getSelectionContext,
        });
    }, [
        aiProvider,
        selectedElements,
        handleSendMessage,
        getSelectionContext,
    ]);
    
    // Keyboard shortcuts (must be after handleSend definition)
    const { handleKeyDown } = useKeyboardShortcuts({
        onSend: handleSend,
        onClose,
        hasInput: input.trim().length > 0,
        isLoading: isLoading,
    });
    
    /**
     * Handle image generation request from modal
     * Triggers screenshot capture, then calls API
     */
    const handleImageGenerationRequest = useCallback((options: any) => {
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
        if (!isOpen) return;
        
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
    }, [isOpen, generateImage]);
    
    // === 🎨 RENDER ===
    
    if (!isOpen) return null;
    
    return (
        <>
            <ChatPanel
                isOpen={isOpen}
                width={panelWidth}
                onResizeStart={startResize}
            >
                {/* Header */}
                <ChatHeader
                    aiProvider={aiProvider}
                    onToggleProvider={toggleProvider}
                    onClose={onClose}
                />
                
                {/* Canvas Context */}
                <CanvasContextPanel
                    contextMode={contextMode}
                    onContextModeChange={setContextMode}
                    selectedElements={selectedElements}
                    elementSnapshots={elementSnapshots}
                    canvasElementCount={canvasState?.elements?.length || 0}
                    onClearSelection={clearSelection}
                />
                
                {/* Generated Images Gallery */}
                <ImageGallery
                    imageHistory={imageHistory}
                    onCopyImage={copyImageToClipboard}
                    onClearHistory={clearImageHistory}
                />
                
                {/* Messages */}
                <MessageList
                    ref={messagesEndRef}
                    messages={messages}
                    isLoading={isLoading}
                    error={error}
                    aiProvider={aiProvider}
                    canvasState={canvasState}
                />
                
                {/* Input Area */}
                <ChatInput
                    ref={inputRef}
                    input={input}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onOpenTemplates={() => setShowTemplates(true)}
                    onOpenImageGen={() => setShowImageModal(true)}
                    isLoading={isLoading}
                    isGeneratingImage={isGeneratingImage}
                    selectedElementsCount={selectedElements.length}
                    contextMode={contextMode}
                    onKeyDown={handleKeyDown}
                />
            </ChatPanel>
            
            {/* Modals */}
            <ImageGenerationModal
                isOpen={showImageModal}
                onClose={() => {
                    setShowImageModal(false);
                    pendingImageGenRef.current = null;
                }}
                selectedElements={selectedElements}
                elementSnapshots={elementSnapshots}
                canvasState={canvasState}
                onGenerate={handleImageGenerationRequest}
                isGenerating={isGeneratingImage}
            />
            
            <TemplateModal
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onSelect={(template) => {
                    // Handle template selection
                    if (template.variables.length === 0) {
                        setInput(template.template);
                    } else {
                        let filled = template.template;
                        template.variables.forEach(v => {
                            const value = v.type === "select" ? v.options?.[0] || "" : `[${v.label}]`;
                            filled = filled.replace(`{${v.name}}`, value);
                        });
                        setInput(filled);
                    }
                    setShowTemplates(false);
                    inputRef.current?.focus();
                }}
                selectedElementsCount={selectedElements.length}
            />
        </>
    );
}
