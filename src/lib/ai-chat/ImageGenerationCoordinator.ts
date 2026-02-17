/**
 * ImageGenerationCoordinator - Pure TypeScript image generation logic
 * 
 * Handles:
 * - Prompt building with system instructions
 * - Gemini API communication
 * - Image processing and insertion
 * - Error handling
 * 
 * No React dependencies
 */

import type { GenerationOptions } from "@/components/ai-chat/ImageGenerationModal";

export interface ImageGenerationResult {
  imageUrl: string;
  width: number;
  height: number;
  prompt: string;
}

export interface ImageGenerationError {
  message: string;
  isUnderstandable?: boolean;
}

export interface ImageGenerationCallbacks {
  onSuccess?: (result: ImageGenerationResult) => void;
  onError?: (error: ImageGenerationError) => void;
  onImageLoaded?: (imageUrl: string, prompt: string) => void;
}

/**
 * Builds system instructions for image generation
 */
export function buildGenerationPrompt(options: GenerationOptions): string {
  const hasReference = options.hasReference !== false;
  const bgColor = options.backgroundColor;

  let systemInstructions = "";

  if (hasReference) {
    systemInstructions =
      "You are an expert UI/UX designer tasked with transforming wireframes into photorealistic designs.\n\n";
  } else {
    systemInstructions =
      "You are an expert UI/UX designer creating photorealistic designs from a description.\n\n";
  }

  // Add background color instruction
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

  // Add layout instructions
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

  // Add user's creative prompt
  systemInstructions += `DESIGN VISION:\n${options.prompt}\n\n`;

  // Add quality instructions
  const renderingInstructions = `RENDERING REQUIREMENTS:
- ${hasReference ? "Transform the wireframe into" : "Create"} a photorealistic, high-quality design
- Use modern design principles (proper shadows, gradients, depth) - BUT ONLY on UI elements, NOT the background
- Ensure professional polish and attention to detail
- Make it look like a finished product, not a prototype
- Background MUST remain exactly ${bgColor} with NO variations, NO gradients, NO shadows
${hasReference ? "- If the reference shows UI elements (buttons, cards, text), make them look realistic and functional\n" : ""}
FINAL REMINDER: The background color is ${bgColor}. This is NON-NEGOTIABLE. Every pixel of the background must be this exact color.`;

  systemInstructions += renderingInstructions;

  return systemInstructions;
}

/**
 * Gets the model name based on options
 */
export function getGenerationModel(useProModel: boolean): string {
  return useProModel
    ? "gemini-3-pro-image-preview"
    : "gemini-2.5-flash-image";
}

/**
 * Process generated image (calculate dimensions)
 */
export function processGeneratedImage(
  imageDataUrl: string,
  maxWidth: number = 600
): Promise<{ imageUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const width = Math.min(img.width, maxWidth);
      const height = width / aspectRatio;

      resolve({
        imageUrl: imageDataUrl,
        width,
        height,
      });
    };
    img.onerror = () => reject(new Error("Failed to load generated image"));
    img.src = imageDataUrl;
  });
}

/**
 * Validates image generation response
 */
export function validateGenerationResponse(data: any): ImageGenerationResult {
  // Check for AI confusion
  if (
    data.message &&
    (data.message.toLowerCase().includes("do not understand") ||
      data.message.toLowerCase().includes("cannot understand"))
  ) {
    throw new Error(
      "I do not understand this prompt. Please provide clearer instructions."
    );
  }

  if (!data.imageData) {
    throw new Error(data.details || data.error || "Image generation failed");
  }

  const imageUrl = `data:${data.mimeType};base64,${data.imageData}`;

  return {
    imageUrl,
    width: 0, // Will be set after image loads
    height: 0,
    prompt: data.prompt || "",
  };
}

/**
 * Main image generation function
 */
export async function generateImage(
  screenshotData: string,
  options: GenerationOptions,
  callbacks?: ImageGenerationCallbacks
): Promise<ImageGenerationResult | null> {
  const hasReference = options.hasReference !== false && screenshotData?.length > 0;

  console.log("🎨 Starting image generation...");
  console.log("🤖 Model:", options.useProModel ? "Gemini 3 Pro" : "Gemini 2.5 Flash");

  try {
    const systemInstructions = buildGenerationPrompt(options);

    const requestBody: any = {
      prompt: systemInstructions,
      model: getGenerationModel(options.useProModel),
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
      if (
        data.details?.includes("understand") ||
        data.details?.includes("cannot")
      ) {
        throw new Error(
          "I do not understand this prompt or context. Please provide clearer instructions."
        );
      }
      throw new Error(data.details || data.error || "Image generation failed");
    }

    // Validate and process response
    const result = validateGenerationResponse(data);

    // Process image dimensions
    const processed = await processGeneratedImage(result.imageUrl);

    console.log("✅ Image generated successfully");

    // Notify callbacks
    callbacks?.onSuccess?.(processed);
    callbacks?.onImageLoaded?.(processed.imageUrl, options.prompt);

    return processed;
  } catch (err) {
    console.error("Image generation error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Image generation failed";
    callbacks?.onError?.({ message: errorMessage });
    return null;
  }
}

/**
 * Copy image to clipboard
 */
export async function copyImageToClipboard(
  imageUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    console.log("✅ Image copied to clipboard");
    return true;
  } catch (err) {
    console.error("Failed to copy image:", err);
    return false;
  }
}
