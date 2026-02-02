/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      🎨 useImageGeneration.ts                                ║
 * ║                    "The Digital Artist"                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔵 Custom Hook | 🔴 API Handler | 🟢 State Manager               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the artist that transforms wireframes into photorealistic images. When
 * users provide a screenshot of their canvas and creative instructions, I talk
 * to the Gemini API to generate a polished design. I also maintain a gallery
 * of previously generated images.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users sketch rough wireframes but need presentation-ready visuals. I:
 * - Send the screenshot + creative prompt to Gemini
 * - Handle the API response and extract the generated image
 * - Calculate dimensions and insert the result into the canvas
 * - Keep a history of generated images for reuse
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │   Parent    │─────▶│      ME      │─────▶│  /api/gen   │   │
 *      │   │(AIChatCont) │      │(useImageGen) │      │   -image    │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                  ┌─────────────────────┐                       │
 *      │                  │  excalidraw:insert  │                       │
 *      │                  │      -image         │                       │
 *      │                  └─────────────────────┘                       │
 *      │                                                                  │
 *      │   I RECEIVE: screenshot (base64), generation options             │
 *      │   I SEND TO: Excalidraw (insert-image event)                     │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: "Generating..." forever, no image appears, API errors
 * - User Impact: Can't transform wireframes to photorealistic images
 * - Quick Fix: Check /api/generate-image endpoint is working
 * - Debug: Look for "🎨" logs, check Network tab for API response
 * - Common Issue: Screenshot data too large, or API key expired
 * 
 * 📦 STATE I MANAGE:
 * ┌──────────────────────┬─────────────────────────────────────────────────────┐
 * │ isGeneratingImage    │ Whether we're waiting for Gemini API                │
 * │ imageHistory         │ Array of previously generated images                │
 * └──────────────────────┴─────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - generateImage(): Main function - send screenshot to API, get image back
 * - copyImageToClipboard(): Copy any image to clipboard
 * - clearHistory(): Remove all generated images
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx
 * 2026-02-02: Simplified - removed screenshot coordination (parent handles it)
 * 2026-02-02: Now receives screenshot directly via generateImage() params
 * 
 * @module useImageGeneration
 */

import { useState, useCallback } from "react";
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
    /** History of generated images */
    imageHistory: ImageHistoryItem[];
    /** Generate an image from screenshot and options */
    generateImage: (
        screenshotData: string,
        options: GenerationOptions,
        callbacks?: {
            onSuccess?: (imageUrl: string) => void;
            onError?: (error: string) => void;
        }
    ) => Promise<void>;
    /** Copy an image to clipboard */
    copyImageToClipboard: (imageUrl: string) => Promise<void>;
    /** Clear image history */
    clearHistory: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);

    /**
     * Generate an image using Gemini API
     * 
     * @param screenshotData - Base64 data URL of the screenshot
     * @param options - Generation options (prompt, background, etc.)
     * @param callbacks - Optional success/error callbacks
     */
    const generateImage = useCallback(async (
        screenshotData: string,
        options: GenerationOptions,
        callbacks?: {
            onSuccess?: (imageUrl: string) => void;
            onError?: (error: string) => void;
        }
    ): Promise<void> => {
        if (!screenshotData) {
            callbacks?.onError?.("No screenshot data provided");
            return;
        }

        setIsGeneratingImage(true);
        console.log("🎨 Starting image generation...");

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

            console.log('🎨 Calling Gemini API...');
            console.log('🤖 Model:', options.useProModel ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash');

            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: systemInstructions,
                    model: options.useProModel
                        ? "gemini-3-pro-image-preview"
                        : "gemini-2.5-flash-image",
                    imageData: screenshotData,
                    mode: "visual",
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Check for specific error cases
                if (data.details?.includes('understand') || data.details?.includes('cannot')) {
                    throw new Error("I do not understand this prompt or context. Please provide clearer instructions.");
                }
                throw new Error(data.details || data.error || "Image generation failed");
            }
            
            // Check if AI responded with confusion
            if (data.message && (
                data.message.toLowerCase().includes('do not understand') ||
                data.message.toLowerCase().includes('cannot understand')
            )) {
                throw new Error("I do not understand this prompt. Please provide clearer instructions.");
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
            
            // Calculate dimensions and insert into canvas
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const maxWidth = 600;
                const width = Math.min(img.width, maxWidth);
                const height = width / aspectRatio;
                
                window.dispatchEvent(new CustomEvent("excalidraw:insert-image", {
                    detail: {
                        imageData: imageDataUrl,
                        type: "png",
                        width,
                        height,
                    },
                }));
                
                callbacks?.onSuccess?.(imageDataUrl);
            };
            img.src = imageDataUrl;
            
        } catch (err) {
            console.error("Image generation error:", err);
            const errorMessage = err instanceof Error ? err.message : "Image generation failed";
            callbacks?.onError?.(errorMessage);
        } finally {
            setIsGeneratingImage(false);
        }
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
     * Clear all generated images from history
     */
    const clearHistory = useCallback(() => {
        setImageHistory([]);
    }, []);

    return {
        isGeneratingImage,
        imageHistory,
        generateImage,
        copyImageToClipboard,
        clearHistory,
    };
}

export default useImageGeneration;
