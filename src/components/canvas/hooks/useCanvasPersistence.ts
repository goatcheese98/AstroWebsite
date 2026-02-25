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
      
      if (shouldClearOnMount) {
        console.log('🧹 Fresh canvas mode - skipping load');
      } else {
        const savedData = coordinator.loadFromStorage();
        if (savedData) {
          setCanvasData(savedData);
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
    
    coordinator.scheduleSave(canvasData, canvasId);
    
    return () => {
      coordinator.cancelPendingSave();
    };
  }, [canvasData, canvasId]);
}

// Re-export types
export type { PersistenceState };
