/**
 * useImageGeneration - Store-integrated version
 * Replaces the original hook that used local state + prop drilling
 * 
 * This version uses the global Zustand store for image history,
 * eliminating prop drilling through CanvasApp -> AIChatContainer -> etc.
 */

import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useUnifiedCanvasStore, useExcalidrawAPISafe } from '@/stores';
import { canvasEvents } from '@/lib/events';

export interface GenerationOptions {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16';
  style?: 'vivid' | 'natural';
  backgroundColor?: string;
  hasReference?: boolean;
}

export interface ImageGenerationCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useImageGeneration() {
  const api = useExcalidrawAPISafe();
  const store = useUnifiedCanvasStore();

  const {
    imageHistory,
    setImageHistory,
    addImageToHistory,
    isGeneratingImage,
    setGeneratingImage,
    addToast,
  } = store;

  /**
   * Generate an image using the AI API
   */
  const generateImage = useCallback(async (
    screenshotData: string,
    options: GenerationOptions,
    callbacks?: ImageGenerationCallbacks
  ): Promise<void> => {
    setGeneratingImage(true);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: options.prompt,
          screenshot: screenshotData,
          aspectRatio: options.aspectRatio || '1:1',
          style: options.style || 'vivid',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.imageUrl) {
        throw new Error('No image URL in response');
      }

      // Add to history
      addImageToHistory({
        id: nanoid(),
        url: data.imageUrl,
        prompt: options.prompt,
        timestamp: new Date(),
        aspectRatio: options.aspectRatio || '1:1',
      });

      // Notify listeners
      callbacks?.onSuccess?.();
      addToast('Image generated successfully', 'success', 2000);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      addToast(`Image generation failed: ${err.message}`, 'error', 3000);
      throw err;
    } finally {
      setGeneratingImage(false);
    }
  }, [addImageToHistory, setGeneratingImage, addToast]);

  /**
   * Add a generated image directly to the canvas
   */
  const addToCanvas = useCallback(async (imageId: string): Promise<void> => {
    const image = imageHistory.find((img) => img.id === imageId);
    if (!image || !api) {
      throw new Error('Image not found or API not ready');
    }

    // Fetch the image and convert to data URL
    const response = await fetch(image.url);
    const blob = await response.blob();
    const dataURL = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    // Add to Excalidraw
    const elements = api.getSceneElements();
    const appState = api.getAppState();

    // Calculate center position based on viewport
    const centerX = (appState.scrollX + window.innerWidth / 2) / appState.zoom.value;
    const centerY = (appState.scrollY + window.innerHeight / 2) / appState.zoom.value;

    // Create image element
    const fileId = nanoid();
    api.addFiles([{
      id: fileId,
      mimeType: 'image/png',
      dataURL,
    }]);

    // Create element object (Excalidraw will convert it)
    const newElement = {
      type: 'image',
      x: centerX - 200,
      y: centerY - 200,
      width: 400,
      height: 400,
      fileId,
      status: 'saved',
    };

    // @ts-expect-error - Excalidraw internal API
    const converted = window.excalidrawAPI?.convertToExcalidrawElements?.([newElement]) || [newElement];

    api.updateScene({
      elements: [...elements, ...converted],
    });

    // Notify that image was inserted (for any listeners)
    canvasEvents.emit('excalidraw:image-inserted');
    addToast('Added to canvas', 'success', 2000);
  }, [imageHistory, api, addToast]);

  /**
   * Add a generated image to the library/assets panel
   */
  const addToLibrary = useCallback(async (imageId: string): Promise<void> => {
    const image = imageHistory.find((img) => img.id === imageId);
    if (!image) {
      throw new Error('Image not found');
    }

    // Notify asset library about new image
    canvasEvents.emit('asset:image-generated', {
      imageUrl: image.url,
      prompt: image.prompt,
      timestamp: image.timestamp
    });
    addToast('Added to library', 'info', 2000);
  }, [imageHistory, addToast]);

  /**
   * Remove an image from history
   */
  const removeImage = useCallback((imageId: string): void => {
    store.removeImageFromHistory(imageId);
  }, [store]);

  /**
   * Clear all image history
   */
  const clearHistory = useCallback((): void => {
    setImageHistory([]);
  }, [setImageHistory]);

  return {
    // State
    imageHistory,
    isGeneratingImage,

    // Actions
    generateImage,
    addToCanvas,
    addToLibrary,
    removeImage,
    clearHistory,
    setImageHistory,
  };
}
