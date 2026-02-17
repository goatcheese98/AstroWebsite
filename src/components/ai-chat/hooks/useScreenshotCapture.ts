/**
 * useScreenshotCapture (Migrated)
 * 
 * This file now re-exports from the new store architecture.
 * The old event-based implementation has been replaced with async/await.
 * 
 * For new code, import directly from '@/stores':
 *   import { useScreenshotCapture } from '@/stores';
 */

// Re-export everything from the new store location
export {
  useScreenshotCapture,
  captureScreenshot,
  captureForChat,
  captureForGeneration,
  captureForPreview,
} from '@/stores';

export type {
  ScreenshotOptions,
  ScreenshotResult,
  UseScreenshotCaptureReturn,
} from '@/stores';

// Backward compatibility: old hook API mapped to new async API
import { useScreenshotCapture as useNewScreenshotCapture } from '@/stores';
import { useCallback, useState, useEffect } from 'react';
import type { ScreenshotResult as OldScreenshotResult } from '@/lib/canvas/ScreenshotCaptureCoordinator';

export interface UseScreenshotCaptureOptions {
  /** Callback when chat screenshot is captured */
  onChatScreenshot?: (result: OldScreenshotResult) => void;
  /** Callback when generation screenshot is captured */
  onGenerationScreenshot?: (result: OldScreenshotResult) => void;
}

export interface UseScreenshotCaptureReturn {
  /** Whether we're waiting for a chat screenshot */
  isCaptureForChat: boolean;
  /** The captured chat screenshot data */
  chatScreenshotData: string | null;
  /** Current chat request ID */
  chatRequestId: string | null;
  /** Request a screenshot for chat context */
  captureForChat: (elementIds?: string[]) => string;
  /** Request a screenshot for image generation */
  captureForGeneration: (elementIds: string[], backgroundColor?: string) => string;
  /** Clear the chat screenshot */
  clearChatScreenshot: () => void;
  /** Reset all capture state */
  reset: () => void;
}

/**
 * @deprecated Use useScreenshotCapture from '@/stores' instead
 * This compatibility hook maintains the old API while using the new implementation
 */
export function useScreenshotCaptureCompat(
  options: UseScreenshotCaptureOptions = {}
): UseScreenshotCaptureReturn {
  const { onChatScreenshot, onGenerationScreenshot } = options;
  const { captureForChat: captureChat, captureForGeneration: captureGen } = useNewScreenshotCapture();
  
  const [isCaptureForChat, setIsCaptureForChat] = useState(false);
  const [chatScreenshotData, setChatScreenshotData] = useState<string | null>(null);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);

  const captureForChat = useCallback((elementIds?: string[]): string => {
    const requestId = `chat-${Date.now()}`;
    setIsCaptureForChat(true);
    setChatRequestId(requestId);
    
    captureChat(elementIds)
      .then((result) => {
        setChatScreenshotData(result.dataUrl);
        setIsCaptureForChat(false);
        onChatScreenshot?.({
          dataURL: result.dataUrl,
          elementCount: result.elementCount,
          requestId,
        } as OldScreenshotResult);
      })
      .catch(() => {
        setIsCaptureForChat(false);
      });
    
    return requestId;
  }, [captureChat, onChatScreenshot]);

  const captureForGeneration = useCallback((elementIds: string[], backgroundColor?: string): string => {
    const requestId = `gen-${Date.now()}`;
    
    captureGen(elementIds, backgroundColor)
      .then((result) => {
        onGenerationScreenshot?.({
          dataURL: result.dataUrl,
          elementCount: result.elementCount,
          requestId,
        } as OldScreenshotResult);
      });
    
    return requestId;
  }, [captureGen, onGenerationScreenshot]);

  const clearChatScreenshot = useCallback(() => {
    setChatScreenshotData(null);
    setIsCaptureForChat(false);
    setChatRequestId(null);
  }, []);

  const reset = useCallback(() => {
    clearChatScreenshot();
  }, [clearChatScreenshot]);

  return {
    isCaptureForChat,
    chatScreenshotData,
    chatRequestId,
    captureForChat,
    captureForGeneration,
    clearChatScreenshot,
    reset,
  };
}

// Default export uses the new implementation
export default useNewScreenshotCapture;
