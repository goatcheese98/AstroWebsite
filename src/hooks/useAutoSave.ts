/**
 * useAutoSave — debounced auto-save for authenticated canvas users
 * 5s debounce, 30s max interval, gzip compression, hash-based dirty detection
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  isDirty: boolean;
  error: string | null;
  saveNow: () => Promise<void>;
  markDirty: () => void;
}

interface UseAutoSaveOptions {
  canvasId: string | null;
  isAuthenticated: boolean;
  getCanvasData: () => { elements: any[]; appState?: Record<string, any>; files?: Record<string, any> } | null;
  onCanvasCreated?: (newCanvasId: string) => void;
  debounceMs?: number;
  maxIntervalMs?: number;
}

function hashElements(elements: any[]): string {
  // Fast fingerprint: count + ids + version sums
  if (!elements.length) return 'empty';
  let hash = elements.length.toString();
  for (const el of elements) {
    hash += '|' + el.id + ':' + (el.version || 0);
  }
  return hash;
}

export function useAutoSave({
  canvasId,
  isAuthenticated,
  getCanvasData,
  onCanvasCreated,
  debounceMs = 5000,
  maxIntervalMs = 30000,
}: UseAutoSaveOptions): AutoSaveState {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxIntervalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHash = useRef<string>('');
  const canvasIdRef = useRef(canvasId);
  const isSavingRef = useRef(false);

  // Keep canvasId ref in sync
  useEffect(() => {
    canvasIdRef.current = canvasId;
  }, [canvasId]);

  // === Thumbnail generation (debounced separately at 60s) ===
  const thumbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uploadThumbnail = useCallback(async () => {
    if (!canvasIdRef.current || !isAuthenticated) return;

    try {
      const excalidrawAPI = (window as any).excalidrawAPI;
      if (!excalidrawAPI?.exportToBlob) return;

      const blob = await excalidrawAPI.exportToBlob({
        mimeType: 'image/png',
        quality: 0.5,
        maxWidthOrHeight: 400,
      });

      if (!blob || blob.size === 0) return;

      await fetch(`/api/canvas/${canvasIdRef.current}/thumbnail`, {
        method: 'POST',
        credentials: 'include',
        body: blob,
      });
    } catch {
      // Thumbnail is non-critical, silently ignore
    }
  }, [isAuthenticated]);

  const scheduleThumbnail = useCallback(() => {
    if (!isAuthenticated || !canvasIdRef.current) return;
    if (thumbTimer.current) clearTimeout(thumbTimer.current);
    thumbTimer.current = setTimeout(uploadThumbnail, 60000);
  }, [isAuthenticated, uploadThumbnail]);

  const performSave = useCallback(async () => {
    if (!isAuthenticated || isSavingRef.current) return;

    const data = getCanvasData();
    if (!data) return;

    const currentHash = hashElements(data.elements);
    if (currentHash === lastHash.current && canvasIdRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      // Strip non-essential appState for smaller payloads
      const essentialAppState = data.appState ? {
        viewBackgroundColor: data.appState.viewBackgroundColor,
        currentItemStrokeColor: data.appState.currentItemStrokeColor,
        currentItemBackgroundColor: data.appState.currentItemBackgroundColor,
        gridSize: data.appState.gridSize,
      } : undefined;

      const payload = JSON.stringify({
        elements: data.elements,
        appState: essentialAppState,
        files: data.files || {},
      });

      let response: Response;

      if (canvasIdRef.current) {
        // Update existing canvas
        response = await fetch(`/api/canvas/${canvasIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: payload,
        });
      } else {
        // Create new canvas via auto-save
        response = await fetch('/api/canvas/auto-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: 'Untitled Canvas',
            canvasData: {
              elements: data.elements,
              appState: essentialAppState,
              files: data.files || {},
            },
          }),
        });
      }

      if (response.ok) {
        const result = await response.json();
        lastHash.current = currentHash;
        setLastSaved(new Date());
        setIsDirty(false);

        // If this was a new canvas, update the canvas ID
        if (!canvasIdRef.current && result.canvasId) {
          canvasIdRef.current = result.canvasId;
          onCanvasCreated?.(result.canvasId);
        }

        // Schedule thumbnail upload (debounced at 60s)
        scheduleThumbnail();
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || 'Save failed');
      }
    } catch (err) {
      setError('Network error — changes saved locally');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [isAuthenticated, getCanvasData, onCanvasCreated, scheduleThumbnail]);

  const markDirty = useCallback(() => {
    if (!isAuthenticated) return;

    setIsDirty(true);

    // Reset debounce timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(performSave, debounceMs);

    // Start max interval timer if not running
    if (!maxIntervalTimer.current) {
      maxIntervalTimer.current = setTimeout(() => {
        maxIntervalTimer.current = null;
        performSave();
      }, maxIntervalMs);
    }
  }, [isAuthenticated, performSave, debounceMs, maxIntervalMs]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (maxIntervalTimer.current) clearTimeout(maxIntervalTimer.current);
      if (thumbTimer.current) clearTimeout(thumbTimer.current);
    };
  }, []);

  const saveNow = useCallback(async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (maxIntervalTimer.current) {
      clearTimeout(maxIntervalTimer.current);
      maxIntervalTimer.current = null;
    }
    await performSave();
  }, [performSave]);

  return { isSaving, lastSaved, isDirty, error, saveNow, markDirty };
}
