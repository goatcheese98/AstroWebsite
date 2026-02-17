/**
 * useImageGeneration.ts - Thin React wrapper around ImageGenerationCoordinator
 * 
 * All business logic has been moved to lib/ai-chat/ImageGenerationCoordinator.ts
 */

import { useState, useCallback, useRef } from "react";
import { canvasEvents } from "@/lib/events/eventEmitter";
import type { GenerationOptions } from "../ImageGenerationModal";
import {
  generateImage,
  copyImageToClipboard as copyImage,
} from "@/lib/ai-chat";
import type {
  ImageGenerationResult,
  ImageGenerationCallbacks,
} from "@/lib/ai-chat";

export interface ImageHistoryItem {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  aspectRatio?: "1:1" | "16:9" | "4:3" | "9:16";
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

/**
 * React hook for image generation
 * Thin wrapper around ImageGenerationCoordinator
 */
export function useImageGeneration(): UseImageGenerationReturn {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);

  // Use ref to track generation state for callbacks
  const isGeneratingRef = useRef(false);

  /**
   * Generate an image using Gemini API
   */
  const generateImageCallback = useCallback(
    async (
      screenshotData: string,
      options: GenerationOptions,
      callbacks?: {
        onSuccess?: (imageUrl: string) => void;
        onError?: (error: string) => void;
      }
    ): Promise<void> => {
      isGeneratingRef.current = true;
      setIsGeneratingImage(true);

      const coordinatorCallbacks: ImageGenerationCallbacks = {
        onSuccess: (result: ImageGenerationResult) => {
          // Dispatch to My Assets panel
          canvasEvents.emit("asset:image-generated", {
            imageUrl: result.imageUrl,
            prompt: options.prompt,
          });

          // Dispatch insert command
          canvasEvents.emit("excalidraw:insert-image", {
            imageData: result.imageUrl,
            type: "png",
            width: result.width,
            height: result.height,
          });

          // Dispatch toast notification
          canvasEvents.emit("excalidraw:image-inserted");

          callbacks?.onSuccess?.(result.imageUrl);
        },
        onError: (err) => {
          callbacks?.onError?.(err.message);
        },
      };

      await generateImage(screenshotData, options, coordinatorCallbacks);

      isGeneratingRef.current = false;
      setIsGeneratingImage(false);
    },
    []
  );

  /**
   * Copy an image to clipboard
   */
  const copyImageToClipboard = useCallback(async (imageUrl: string) => {
    await copyImage(imageUrl);
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
  const setImageHistoryCallback = useCallback(
    (history: ImageHistoryItem[]) => {
      setImageHistory(history);
    },
    []
  );

  return {
    isGeneratingImage,
    imageHistory,
    setImageHistory: setImageHistoryCallback,
    generateImage: generateImageCallback,
    copyImageToClipboard,
    clearHistory,
  };
}

export default useImageGeneration;
