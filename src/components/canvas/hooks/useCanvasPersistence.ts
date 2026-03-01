/**
 * useCanvasPersistence
 * Thin React wrapper around CanvasPersistenceCoordinator
 * 
 * Handles auto-saving canvas to localStorage
 */

import { useEffect, useRef } from 'react';
import { useUnifiedCanvasStore } from '@/stores';
import { 
  CanvasPersistenceCoordinator,
  type PersistenceState 
} from '@/lib/persistence/CanvasPersistenceCoordinator';

const buildMutationSignature = (
  elements: Array<{ id?: string; version?: number; versionNonce?: number; isDeleted?: boolean }>,
  files: Record<string, unknown> | null
) => {
  const elementPart = elements
    .map((el) => `${el.id || ''}:${el.version ?? 0}:${el.versionNonce ?? 0}:${el.isDeleted ? 1 : 0}`)
    .join('|');

  const fileMap = files || {};
  const fileKeys = Object.keys(fileMap).sort();
  const filePart = fileKeys
    .map((key) => {
      const file = (fileMap as Record<string, Record<string, unknown>>)[key] || {};
      const version = typeof file.version === 'number' ? file.version : 0;
      return `${key}:${version}`;
    })
    .join('|');

  return `${elements.length}::${elementPart}::${fileKeys.length}::${filePart}`;
};

interface UseCanvasPersistenceOptions {
  canvasId: string | null;
  shouldClearOnMount: boolean;
  onError?: (error: Error) => void;
}

export function useCanvasPersistence({
  canvasId,
  shouldClearOnMount,
  onError,
}: UseCanvasPersistenceOptions) {
  const { canvasData, setCanvasData, setDirty, setLastSaved } = useUnifiedCanvasStore();
  const hasLoadedRef = useRef(false);
  const coordinatorRef = useRef<CanvasPersistenceCoordinator | null>(null);
  const lastMutationSignatureRef = useRef<string>('');
  
  // Create coordinator and load on mount
  useEffect(() => {
    const coordinator = new CanvasPersistenceCoordinator();
    coordinatorRef.current = coordinator;
    
    // Subscribe to events
    const handleSaved = (e: Event) => {
      const customEvent = e as CustomEvent<{ to: "localStorage" }>;
      if (customEvent.detail.to !== "localStorage") return;
      setLastSaved(new Date());
      setDirty(false);
    };
    
    const handleError = (e: Event) => {
      const customEvent = e as CustomEvent<Error>;
      onError?.(customEvent.detail);
    };
    
    coordinator.addEventListener('saved', handleSaved);
    coordinator.addEventListener('error', handleError);
    
    // Load on mount
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      if (!shouldClearOnMount) {
        const savedData = coordinator.loadFromStorage();
        if (savedData) {
          setCanvasData(savedData);
          lastMutationSignatureRef.current = buildMutationSignature(
            savedData.elements || [],
            savedData.files || null
          );
        }
      }
    }
    
    return () => {
      coordinator.removeEventListener('saved', handleSaved);
      coordinator.removeEventListener('error', handleError);
      coordinator.dispose();
      coordinatorRef.current = null;
    };
  }, [shouldClearOnMount, setCanvasData, setLastSaved, setDirty, onError]);
  
  // Auto-save when canvasData changes
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator || !canvasData) return;

    const signature = buildMutationSignature(
      canvasData.elements || [],
      canvasData.files || null
    );

    // First seen state (initial load/bootstrapping) should not trigger autosave.
    if (!lastMutationSignatureRef.current) {
      lastMutationSignatureRef.current = signature;
      return;
    }

    // Ignore appState-only churn (pan/zoom/hover/selection).
    if (signature === lastMutationSignatureRef.current) {
      return;
    }

    lastMutationSignatureRef.current = signature;
    coordinator.scheduleSave(canvasData, canvasId);
  }, [canvasData, canvasId]);
}

// Re-export types
export type { PersistenceState };
