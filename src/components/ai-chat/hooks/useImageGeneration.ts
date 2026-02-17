/**
 * useImageGeneration.ts - Image Generation Hook
 * 
 * Uses dispatchCommand from store for canvas operations.
 */

import { useState, useCallback, useRef } from "react";
import { useStore } from "@/stores";
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
  isGeneratingImage: boolean;
  imageHistory: ImageHistoryItem[];
  setImageHistory: (history: ImageHistoryItem[]) => void;
  generateImage: (
    screenshotData: string,
    options: GenerationOptions,
    callbacks?: {
      onSuccess?: (imageUrl: string) => void;
      onError?: (error: string) => void;
    }
  ) => Promise<void>;
  copyImageToClipboard: (imageUrl: string) => Promise<void>;
  clearHistory: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const dispatchCommand = useStore((state) => state.dispatchCommand);
  const addToast = useStore((state) => state.addToast);
  const addGeneratedImage = useStore((state) => state.addGeneratedImage);

  const isGeneratingRef = useRef(false);

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
        onSuccess: async (result: ImageGenerationResult) => {
          // Add to image history in store
          addGeneratedImage({
            id: `generated-${Date.now()}`,
            url: result.imageUrl,
            prompt: options.prompt,
            timestamp: new Date(),
            width: result.width,
            height: result.height,
          });

          // Insert image into canvas via command
          try {
            await dispatchCommand("insertImage", {
              imageData: result.imageUrl,
              type: "png",
              width: result.width,
              height: result.height,
            });

            addToast("Image added to canvas", "success");
          } catch (err) {
            console.error("Failed to insert image:", err);
            addToast("Failed to add image to canvas", "error");
          }

          callbacks?.onSuccess?.(result.imageUrl);
        },
        onError: (err) => {
          addToast(`Image generation failed: ${err.message}`, "error");
          callbacks?.onError?.(err.message);
        },
      };

      await generateImage(screenshotData, options, coordinatorCallbacks);

      isGeneratingRef.current = false;
      setIsGeneratingImage(false);
    },
    [dispatchCommand, addToast, addGeneratedImage]
  );

  const copyImageToClipboard = useCallback(async (imageUrl: string) => {
    await copyImage(imageUrl);
  }, []);

  const clearHistory = useCallback(() => {
    setImageHistory([]);
  }, []);

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
