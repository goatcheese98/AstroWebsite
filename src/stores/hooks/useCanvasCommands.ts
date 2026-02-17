/**
 * useCanvasCommands Hook
 * 
 * React hook for dispatching canvas commands and tracking their status.
 * 
 * Usage:
 *   const { insertImage, drawElements, isPending, lastError } = useCanvasCommands();
 *   await insertImage(imageUrl, 800, 600);
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { CommandType, CommandPayload } from '../types';

export interface UseCanvasCommandsReturn {
  /** Whether a command is currently pending */
  isPending: boolean;
  /** Error from last command */
  lastError: string | null;
  /** Insert an image into the canvas */
  insertImage: (imageData: string, width: number, height: number, type?: string) => Promise<void>;
  /** Insert an SVG into the canvas */
  insertSvg: (svgPath: string, svgId: string) => Promise<void>;
  /** Draw elements on the canvas */
  drawElements: (elements: any[], isModification?: boolean) => Promise<void>;
  /** Update existing elements */
  updateElements: (elements: any[]) => Promise<void>;
  /** Clear the last error */
  clearError: () => void;
}

export function useCanvasCommands(): UseCanvasCommandsReturn {
  const dispatchCommand = useStore((state) => state.dispatchCommand);
  const pendingCommand = useStore((state) => state.pendingCommand);
  const [lastError, setLastError] = useState<string | null>(null);
  const pendingRef = useRef<Promise<any> | null>(null);

  const isPending = pendingCommand !== null;

  // Track command resolution
  useEffect(() => {
    if (!pendingCommand) {
      pendingRef.current = null;
    }
  }, [pendingCommand]);

  const executeCommand = useCallback(
    async <T extends CommandType>(
      type: T,
      payload: CommandPayload[T]
    ): Promise<any> => {
      setLastError(null);
      try {
        const promise = dispatchCommand(type, payload);
        pendingRef.current = promise;
        const result = await promise;
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Command failed';
        setLastError(message);
        throw error;
      }
    },
    [dispatchCommand]
  );

  const insertImage = useCallback(
    (imageData: string, width: number, height: number, type = 'png'): Promise<void> => {
      return executeCommand('insertImage', { imageData, type, width, height });
    },
    [executeCommand]
  );

  const insertSvg = useCallback(
    (svgPath: string, svgId: string): Promise<void> => {
      return executeCommand('insertSvg', { svgPath, svgId });
    },
    [executeCommand]
  );

  const drawElements = useCallback(
    (elements: any[], isModification = false): Promise<void> => {
      return executeCommand('drawElements', { elements, isModification });
    },
    [executeCommand]
  );

  const updateElements = useCallback(
    (elements: any[]): Promise<void> => {
      return executeCommand('updateElements', { elements });
    },
    [executeCommand]
  );

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    isPending,
    lastError,
    insertImage,
    insertSvg,
    drawElements,
    updateElements,
    clearError,
  };
}
