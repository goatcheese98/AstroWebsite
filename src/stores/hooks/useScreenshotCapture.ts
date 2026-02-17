/**
 * useScreenshotCapture Hook
 * 
 * React hook for capturing screenshots with store integration.
 * 
 * Usage:
 *   const { capture, captureForChat, captureForGeneration, data, isCapturing, error } = useScreenshotCapture();
 *   const result = await capture({ quality: 'high', elementIds: ['id1'] });
 */

import { useCallback, useState } from 'react';
import { useStore } from '../store';
import {
  captureScreenshot,
  captureForChat as captureForChatFn,
  captureForGeneration as captureForGenerationFn,
  captureForPreview as captureForPreviewFn,
  type ScreenshotOptions,
  type ScreenshotResult,
} from '../async/screenshot';

export interface UseScreenshotCaptureReturn {
  /** Current screenshot data if available */
  data: ScreenshotResult | null;
  /** Whether a capture is in progress */
  isCapturing: boolean;
  /** Error from last capture */
  error: string | null;
  /** Generic capture function */
  capture: (options?: ScreenshotOptions) => Promise<ScreenshotResult>;
  /** Capture for chat context (low quality) */
  captureForChat: (elementIds?: string[]) => Promise<ScreenshotResult>;
  /** Capture for image generation (high quality) */
  captureForGeneration: (elementIds: string[], backgroundColor?: string) => Promise<ScreenshotResult>;
  /** Capture for preview (medium quality) */
  captureForPreview: (elementIds: string[]) => Promise<ScreenshotResult>;
  /** Clear current data and error */
  reset: () => void;
}

export function useScreenshotCapture(): UseScreenshotCaptureReturn {
  const api = useStore((state) => state.excalidrawAPI);
  const [data, setData] = useState<ScreenshotResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(
    async (options: ScreenshotOptions = {}): Promise<ScreenshotResult> => {
      if (!api) {
        throw new Error('Excalidraw API not available');
      }

      setIsCapturing(true);
      setError(null);

      try {
        const result = await captureScreenshot(api, options);
        setData(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Screenshot failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsCapturing(false);
      }
    },
    [api]
  );

  const captureForChat = useCallback(
    async (elementIds?: string[]): Promise<ScreenshotResult> => {
      if (!api) {
        throw new Error('Excalidraw API not available');
      }
      return captureForChatFn(api, elementIds);
    },
    [api]
  );

  const captureForGeneration = useCallback(
    async (elementIds: string[], backgroundColor?: string): Promise<ScreenshotResult> => {
      if (!api) {
        throw new Error('Excalidraw API not available');
      }
      return captureForGenerationFn(api, elementIds, backgroundColor);
    },
    [api]
  );

  const captureForPreview = useCallback(
    async (elementIds: string[]): Promise<ScreenshotResult> => {
      if (!api) {
        throw new Error('Excalidraw API not available');
      }
      return captureForPreviewFn(api, elementIds);
    },
    [api]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsCapturing(false);
  }, []);

  return {
    data,
    isCapturing,
    error,
    capture,
    captureForChat,
    captureForGeneration,
    captureForPreview,
    reset,
  };
}
