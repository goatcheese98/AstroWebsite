/**
 * useExcalidrawLoader
 * Handles dynamic loading of Excalidraw and related components
 */

import { useState, useEffect, useCallback, type ComponentType } from 'react';

// Module caches
let ExcalidrawModule: ComponentType<any> | null = null;
let convertToExcalidrawElements: ((elements: any[]) => any) | null = null;

interface LoadedModules {
  Excalidraw: ComponentType<any>;
  convertToExcalidrawElements: ((elements: any[]) => any) | null;
}

export function useExcalidrawLoader() {
  const [modules, setModules] = useState<LoadedModules | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadModules = useCallback(async () => {
    if (ExcalidrawModule) {
      setModules({
        Excalidraw: ExcalidrawModule,
        convertToExcalidrawElements,
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const mod = await import("@excalidraw/excalidraw");
      ExcalidrawModule = mod.Excalidraw;
      convertToExcalidrawElements = mod.convertToExcalidrawElements || null;
      
      setModules({
        Excalidraw: ExcalidrawModule,
        convertToExcalidrawElements,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load Excalidraw'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  return { modules, isLoading, error, reload: loadModules };
}
