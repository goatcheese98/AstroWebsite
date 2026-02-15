import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { canvasEvents } from "@/lib/events/eventEmitter";
import type { GenerationOptions } from "../ImageGenerationModal";

export interface ImageHistoryItem {
    id: string;
    url: string;
    prompt: string;
    timestamp: Date;
    aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16';
}

export interface UseImageGenerationReturn {
    /** Whether image generation is in progress */
    isGeneratingImage: boolean;
    /** History of generated images */
    imageHistory: ImageHistoryItem[];
    /** Set image history directly (for loading saved state) */
    setImageHistory: (history: ImageHistoryItem[]) => void;
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
        // Check if we have a reference image
        const hasReference = options.hasReference !== false && screenshotData && screenshotData.length > 0;

        setIsGeneratingImage(true);
        console.log("🎨 Starting image generation...");

        try {
            // Check if we have a reference wireframe
            const hasReference = options.hasReference !== false;
            const bgColor = options.backgroundColor;

            // Build comprehensive prompt with strict instructions
            let systemInstructions = "";

            if (hasReference) {
                // Prompt for wireframe-to-design transformation
                systemInstructions = "You are an expert UI/UX designer tasked with transforming wireframes into photorealistic designs.\n\n";
            } else {
                // Prompt for pure generation from text (no reference)
                systemInstructions = "You are an expert UI/UX designer creating photorealistic designs from a description.\n\n";
            }

            // Add background color instruction FIRST - STRICT ENFORCEMENT
            if (bgColor) {
                systemInstructions += `BACKGROUND COLOR REQUIREMENTS (ABSOLUTELY MANDATORY - HIGHEST PRIORITY):
1. The ENTIRE background of the generated image MUST be exactly ${bgColor}
2. Use ${bgColor} as the SOLID background color across 100% of the image canvas
3. NO gradients, NO patterns, NO variations from ${bgColor}
4. NO shadows or lighting effects that change the background color
5. Every single pixel that is not part of the main design elements must be ${bgColor}
6. This is the MOST IMPORTANT rule - failure to use exactly ${bgColor} is unacceptable

`;
            }

            // Add layout instructions based on strict ratio setting and reference availability
            if (hasReference) {
                if (options.strictRatio) {
                    systemInstructions += `LAYOUT REQUIREMENTS (MANDATORY):
1. Study the provided wireframe/reference image carefully
2. Maintain EXACT element positions - do not move any elements from their locations in the wireframe
3. Preserve PRECISE proportions - element sizes must match the wireframe exactly (1:1 ratio)
4. Keep IDENTICAL spacing - gaps between elements must be the same as shown
5. Follow the EXACT composition - overall layout structure cannot change
6. Maintain relative sizes - if element A is 2x larger than element B in the wireframe, keep this ratio

`;
                } else {
                    systemInstructions += `LAYOUT REQUIREMENTS:
1. Study the provided wireframe/reference image for general guidance
2. Follow the general layout structure shown in the wireframe
3. Element positions should be similar but can be adjusted for visual balance
4. Proportions should be close to the reference but can be refined for aesthetics
5. You have creative freedom to improve spacing and alignment

`;
                }
            }

            // Add the user's creative prompt
            systemInstructions += `DESIGN VISION:\n${options.prompt}\n\n`;

            // Add quality and rendering instructions
            if (hasReference) {
                systemInstructions += `RENDERING REQUIREMENTS:
- Transform the wireframe into a photorealistic, high-quality design
- Use modern design principles (proper shadows, gradients, depth) - BUT ONLY on UI elements, NOT the background
- Ensure professional polish and attention to detail
- Make it look like a finished product, not a prototype
- Background MUST remain exactly ${bgColor} with NO variations, NO gradients, NO shadows
- If the reference shows UI elements (buttons, cards, text), make them look realistic and functional

FINAL REMINDER: The background color is ${bgColor}. This is NON-NEGOTIABLE. Every pixel of the background must be this exact color.`;
            } else {
                systemInstructions += `RENDERING REQUIREMENTS:
- Create a photorealistic, high-quality design based on the description
- Use modern design principles (proper shadows, gradients, depth) - BUT ONLY on UI elements, NOT the background
- Ensure professional polish and attention to detail
- Make it look like a finished product, not a prototype
- Background MUST remain exactly ${bgColor} with NO variations, NO gradients, NO shadows

FINAL REMINDER: The background color is ${bgColor}. This is NON-NEGOTIABLE. Every pixel of the background must be this exact color.`;
            }

            console.log('🎨 Calling Gemini API...');
            console.log('🤖 Model:', options.useProModel ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash');

            // Build request body - only include image if we have a reference
            const requestBody: any = {
                prompt: systemInstructions,
                model: options.useProModel
                    ? "gemini-3-pro-image-preview"
                    : "gemini-2.5-flash-image",
                mode: hasReference ? "visual" : "text",
            };

            if (hasReference) {
                requestBody.imageData = screenshotData;
            }

            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
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

            // Dispatch to My Assets panel
            canvasEvents.emit("asset:image-generated", {
                imageUrl: imageDataUrl,
                prompt: options.prompt,
            });

            console.log('✅ Image generated and added to assets');

            // Calculate dimensions and insert into canvas
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const maxWidth = 600;
                const width = Math.min(img.width, maxWidth);
                const height = width / aspectRatio;

                canvasEvents.emit("excalidraw:insert-image", {
                    imageData: imageDataUrl,
                    type: "png",
                    width,
                    height,
                });

                // Dispatch event for toast notification
                canvasEvents.emit("excalidraw:image-inserted");

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

    /**
     * Set image history directly (used for loading saved state)
     */
    const setImageHistoryCallback = useCallback((history: ImageHistoryItem[]) => {
        setImageHistory(history);
    }, []);

    return {
        isGeneratingImage,
        imageHistory,
        setImageHistory: setImageHistoryCallback,
        generateImage,
        copyImageToClipboard,
        clearHistory,
    };
}

export default useImageGeneration;
