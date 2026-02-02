/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      🎨 useImageGeneration.ts                                ║
 * ║                    "The Digital Artist's Assistant"                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔵 Custom Hook | 🔴 API Handler | 🟢 State Manager               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the creative engine behind the image generation feature. When users select
 * elements on their canvas and want a photorealistic version, I'm the one who
 * coordinates the screenshot capture, builds the prompt, and talks to the Gemini
 * API to transform wireframes into polished designs.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users sketch rough wireframes but need presentation-ready visuals. I bridge
 * that gap by:
 * - Capturing exactly what they selected on the canvas
 * - Letting them specify creative direction (prompt)
 * - Controlling output (background color, strict vs loose layout)
 * - Maintaining a gallery of generated images they can reuse
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────────┐    ┌─────────────────┐                    │
 *      │   │ ImageGeneration │───▶│       ME        │                    │
 *      │   │     Modal       │    │(useImageGen)    │                    │
 *      │   └─────────────────┘    └────────┬────────┘                    │
 *      │                                  │                             │
 *      │           ┌──────────────────────┼──────────────────────┐      │
 *      │           ▼                      ▼                      ▼      │
 *      │   ┌───────────────┐    ┌─────────────────┐    ┌──────────┐     │
 *      │   │useScreenshot  │    │  /api/generate  │    │ Image    │     │
 *      │   │   Capture     │    │    -image       │    │ Gallery  │     │
 *      │   └───────────────┘    └─────────────────┘    └──────────┘     │
 *      │                                                                  │
 *      │   I SEND TO: Excalidraw (insert-image event with final image)   │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: "Generating..." forever, no images appear, errors about screenshots
 * - User Impact: Can't transform wireframes to photorealistic images
 * - Quick Fix: Check if selected elements still exist on canvas
 * - Debug: Look for "🎨" and "📸" logs in console, verify API key for Gemini
 * - Common Issue: Screenshot request IDs not matching - check ref values
 * 
 * 📦 STATE I MANAGE:
 * ┌──────────────────────┬─────────────────────────────────────────────────────┐
 * │ isGeneratingImage    │ Whether we're waiting for Gemini API                │
 * │ screenshotData       │ Base64 data URL of captured screenshot              │
 * │ pendingOptions       │ Generation options waiting for screenshot           │
 * │ imageHistory         │ Array of previously generated images                │
 * │ generationRequestId  │ Unique ID to match screenshot with generation       │
 * └──────────────────────┴─────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - requestImageGeneration(): Start the screenshot → generate → insert flow
 * - addToHistory(): Save a generated image for later reuse
 * - clearHistory(): Remove all generated images
 * - copyImageToClipboard(): Let user copy any generated image
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~150 lines of image logic)
 * 2026-02-02: Separated screenshot coordination from API calls
 * 2026-02-02: Added proper request ID tracking for screenshot/response matching
 * 
 * @module useImageGeneration
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import type { GenerationOptions } from "../ImageGenerationModal";

export interface ImageHistoryItem {
    id: string;
    url: string;
    prompt: string;
    timestamp: Date;
}

export interface UseImageGenerationReturn {
    /** Whether image generation is in progress */
    isGeneratingImage: boolean;
    /** Whether we're waiting for screenshot capture */
    isCapturing: boolean;
    /** Base64 data URL of current screenshot */
    screenshotData: string | null;
    /** Options waiting to be processed */
    pendingOptions: GenerationOptions | null;
    /** History of generated images */
    imageHistory: ImageHistoryItem[];
    /** Current request ID for screenshot matching */
    generationRequestId: string | null;
    
    // Actions
    /** Start image generation process */
    requestImageGeneration: (options: GenerationOptions) => void;
    /** Handle screenshot captured event */
    handleScreenshotCaptured: (dataURL: string | null, error?: string) => void;
    /** Add image to history */
    addToHistory: (url: string, prompt: string) => void;
    /** Clear image history */
    clearHistory: () => void;
    /** Copy image to clipboard */
    copyImageToClipboard: (imageUrl: string) => Promise<void>;
    /** Reset generation state */
    resetGeneration: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
    // === 🎨 Generation State ===
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [screenshotData, setScreenshotData] = useState<string | null>(null);
    const [pendingOptions, setPendingOptions] = useState<GenerationOptions | null>(null);
    const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
    
    // === 🔄 Request Tracking ===
    const generationRequestIdRef = useRef<string | null>(null);
    
    /**
     * Request image generation - triggers screenshot capture first
     */
    const requestImageGeneration = useCallback((options: GenerationOptions) => {
        const requestId = `generation-${Date.now()}`;
        generationRequestIdRef.current = requestId;
        setPendingOptions(options);
        setIsCapturing(true);
        
        console.log("🎨 Starting image generation with requestId:", requestId);
    }, []);
    
    /**
     * Handle screenshot captured - triggers actual generation
     */
    const handleScreenshotCaptured = useCallback((dataURL: string | null, error?: string) => {
        if (error) {
            console.error("Screenshot error:", error);
            setIsCapturing(false);
            generationRequestIdRef.current = null;
            return;
        }
        
        setScreenshotData(dataURL);
        setIsCapturing(false);
        console.log("📸 Screenshot captured for image generation");
    }, []);
    
    /**
     * Generate image from screenshot data using Gemini API
     */
    const generateImage = useCallback(async (
        imageData: string,
        options: GenerationOptions,
        onSuccess?: (imageUrl: string) => void,
        onError?: (error: string) => void
    ) => {
        if (!imageData || !options) return;
        
        setIsGeneratingImage(true);
        
        try {
            // Build comprehensive prompt with strict instructions
            let systemInstructions = "You are an expert UI/UX designer tasked with transforming wireframes into photorealistic designs.\n\n";
            
            // Add background color instruction FIRST
            const bgColor = options.backgroundColor;
            if (bgColor && bgColor !== "canvas") {
                systemInstructions += `CRITICAL: The background color MUST be exactly ${bgColor}. Do not deviate from this color under any circumstances.\n\n`;
            }
            
            // Add layout instructions based on strict ratio setting
            if (options.strictRatio) {
                systemInstructions += `LAYOUT REQUIREMENTS (MANDATORY):
1. Maintain EXACT element positions - do not move any elements from their locations in the wireframe
2. Preserve PRECISE proportions - element sizes must match the wireframe exactly (1:1 ratio)
3. Keep IDENTICAL spacing - gaps between elements must be the same as shown
4. Follow the EXACT composition - overall layout structure cannot change
5. Maintain relative sizes - if element A is 2x larger than element B in the wireframe, keep this ratio

`;
            } else {
                systemInstructions += `LAYOUT REQUIREMENTS:
1. Follow the general layout structure shown in the wireframe
2. Element positions should be similar but can be adjusted for visual balance
3. Proportions should be close to the reference but can be refined for aesthetics
4. You have creative freedom to improve spacing and alignment

`;
            }
            
            // Add the user's creative prompt
            systemInstructions += `DESIGN VISION:\n${options.prompt}\n\n`;
            
            // Add quality and rendering instructions
            systemInstructions += `RENDERING REQUIREMENTS:
- Produce a photorealistic, high-quality design
- Use modern design principles (proper shadows, gradients, depth)
- Ensure professional polish and attention to detail
- Make it look like a finished product, not a prototype
${bgColor && bgColor !== "canvas" ? `- Background must be ${bgColor} with NO variations or gradients\n` : ""}
- If the reference shows UI elements (buttons, cards, text), make them look realistic and functional

IMPORTANT: Study the reference image carefully before generating. Your output MUST respect the layout constraints specified above.`;
            
            console.log('🎨 Generating image with prompt');
            console.log('🤖 Model:', options.useProModel ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash');
            
            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: systemInstructions,
                    model: options.useProModel
                        ? "gemini-3-pro-image-preview"
                        : "gemini-2.5-flash-image",
                    imageData: imageData,
                    mode: "visual",
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (data.details?.includes('understand') || data.details?.includes('cannot')) {
                    onError?.("I do not understand this prompt. Please provide clearer instructions.");
                } else {
                    onError?.(data.details || data.error || "Image generation failed");
                }
                return;
            }
            
            // Check if AI responded with confusion
            if (data.message && (
                data.message.toLowerCase().includes('do not understand') ||
                data.message.toLowerCase().includes('cannot understand')
            )) {
                onError?.("I do not understand this prompt. Please provide clearer instructions.");
                return;
            }
            
            // Success - create image data URL
            const imageDataUrl = `data:${data.mimeType};base64,${data.imageData}`;
            
            // Add to history
            setImageHistory(prev => [{
                id: nanoid(),
                url: imageDataUrl,
                prompt: options.prompt,
                timestamp: new Date(),
            }, ...prev]);
            
            console.log('✅ Image generated successfully');
            onSuccess?.(imageDataUrl);
            
        } catch (err) {
            console.error("Image generation error:", err);
            onError?.(err instanceof Error ? err.message : "Image generation failed");
        } finally {
            setIsGeneratingImage(false);
            setScreenshotData(null);
            generationRequestIdRef.current = null;
            setPendingOptions(null);
        }
    }, []);
    
    /**
     * Auto-trigger generation when screenshot data is available
     */
    useEffect(() => {
        if (screenshotData && pendingOptions && !isGeneratingImage) {
            generateImage(
                screenshotData,
                pendingOptions,
                (imageUrl) => {
                    // Calculate dimensions and insert into canvas
                    const img = new Image();
                    img.onload = () => {
                        const aspectRatio = img.width / img.height;
                        const maxWidth = 600;
                        const width = Math.min(img.width, maxWidth);
                        const height = width / aspectRatio;
                        
                        window.dispatchEvent(new CustomEvent("excalidraw:insert-image", {
                            detail: {
                                imageData: imageUrl,
                                type: "png",
                                width,
                                height,
                            },
                        }));
                    };
                    img.src = imageUrl;
                },
                (error) => {
                    console.error("Generation failed:", error);
                }
            );
        }
    }, [screenshotData, pendingOptions, isGeneratingImage, generateImage]);
    
    /**
     * Add image to history manually
     */
    const addToHistory = useCallback((url: string, prompt: string) => {
        setImageHistory(prev => [{
            id: nanoid(),
            url,
            prompt,
            timestamp: new Date(),
        }, ...prev]);
    }, []);
    
    /**
     * Clear all generated images from history
     */
    const clearHistory = useCallback(() => {
        setImageHistory([]);
    }, []);
    
    /**
     * Copy an image to clipboard
     */
    const copyImageToClipboard = useCallback(async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            console.log("✅ Image copied to clipboard");
        } catch (err) {
            console.error("Failed to copy image:", err);
        }
    }, []);
    
    /**
     * Reset all generation state
     */
    const resetGeneration = useCallback(() => {
        setIsGeneratingImage(false);
        setIsCapturing(false);
        setScreenshotData(null);
        setPendingOptions(null);
        generationRequestIdRef.current = null;
    }, []);
    
    return {
        isGeneratingImage,
        isCapturing,
        screenshotData,
        pendingOptions,
        imageHistory,
        generationRequestId: generationRequestIdRef.current,
        
        requestImageGeneration,
        handleScreenshotCaptured,
        addToHistory,
        clearHistory,
        copyImageToClipboard,
        resetGeneration,
    };
}

export default useImageGeneration;
