/**
 * useCanvasPersistence
 * Handles saving/loading canvas data to localStorage and server
 * 
 * Extracted from ExcalidrawCanvas to simplify the main component
 */

import { useEffect, useRef, useCallback } from 'react';
import { useUnifiedCanvasStore } from '@/stores';
import type { ExcalidrawAPI } from '@/stores/unifiedCanvasStore';

interface UseCanvasPersistenceOptions {
  api: ExcalidrawAPI | null;
  canvasId: string | null;
  shouldClearOnMount: boolean;
  onSave?: (id: string) => void;
  onError?: (error: Error) => void;
}

const STORAGE_KEY = 'excalidraw-canvas-data';
const STORAGE_VERSION = 2;
const SAVE_DEBOUNCE_MS = 1000;

export function useCanvasPersistence({
  api,
  canvasId,
  shouldClearOnMount,
  onSave,
  onError,
}: UseCanvasPersistenceOptions) {
  const { canvasData, setCanvasData, setDirty, setLastSaved } = useUnifiedCanvasStore();
  const saveTimeoutRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);
  
  // Load on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    if (shouldClearOnMount) {
      console.log('🧹 Fresh canvas mode - skipping load');
      return;
    }
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.version === STORAGE_VERSION && data.canvasData) {
          setCanvasData(data.canvasData);
          console.log('📂 Loaded canvas from localStorage');
        } else {
          console.warn('⚠️ Canvas version mismatch, clearing');
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('❌ Failed to load canvas:', err);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [shouldClearOnMount, setCanvasData]);
  
  // Auto-save when canvasData changes
  useEffect(() => {
    if (!canvasData || !api) return;
    
    // Debounced save to localStorage
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        const dataToSave = {
          version: STORAGE_VERSION,
          canvasData,
          savedAt: Date.now(),
          canvasId,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        setLastSaved(new Date());
        setDirty(false);
      } catch (err) {
        console.error('❌ Failed to save canvas:', err);
        onError?.(err instanceof Error ? err : new Error('Save failed'));
      }
    }, SAVE_DEBOUNCE_MS);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [canvasData, api, canvasId, setLastSaved, setDirty, onError]);
  
  // Manual save function
  const saveToServer = useCallback(async () => {
    if (!api) return;
    
    try {
      const data = {
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
      };
      
      // TODO: Implement server save
      console.log('💾 Saving to server:', data);
      
      setLastSaved(new Date());
      setDirty(false);
      onSave?.(canvasId || 'local');
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Server save failed'));
    }
  }, [api, canvasId, setLastSaved, setDirty, onSave, onError]);
  
  return { saveToServer };
}
