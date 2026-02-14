/**
 * Excalidraw API Context
 * Replaces (window as any).excalidrawAPI with type-safe React context
 * 
 * Usage:
 *   const api = useExcalidrawAPI(); // Throws if not available
 *   const api = useExcalidrawAPISafe(); // Returns null if not available
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// Minimal type definition for Excalidraw API surface we use
export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  version?: number;
  versionNonce?: number;
  isDeleted?: boolean;
  customData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ExcalidrawAppState {
  scrollX: number;
  scrollY: number;
  zoom: { value: number };
  viewBackgroundColor?: string;
  currentItemStrokeColor?: string;
  currentItemBackgroundColor?: string;
  gridSize?: number | null;
  editingElement?: ExcalidrawElement | null;
  [key: string]: unknown;
}

export interface ExcalidrawAPI {
  getSceneElements: () => ExcalidrawElement[];
  getAppState: () => ExcalidrawAppState;
  getFiles: () => Record<string, { mimeType: string; id: string; dataURL?: string }>;
  updateScene: (scene: { 
    elements?: ExcalidrawElement[]; 
    appState?: Partial<ExcalidrawAppState>;
    collaborators?: unknown[];
  }) => void;
  scrollToContent: () => void;
  exportToBlob: (opts: {
    mimeType?: string;
    quality?: number;
    maxWidthOrHeight?: number;
    elements?: ExcalidrawElement[];
  }) => Promise<Blob | null>;
  addFiles: (files: Array<{ id: string; mimeType: string; dataURL: string }>) => void;
}

interface ExcalidrawContextValue {
  api: ExcalidrawAPI | null;
  isReady: boolean;
  setApi: (api: ExcalidrawAPI | null) => void;
}

const ExcalidrawContext = createContext<ExcalidrawContextValue | null>(null);

export interface ExcalidrawProviderProps {
  children: ReactNode;
}

export function ExcalidrawProvider({ children }: ExcalidrawProviderProps) {
  const [api, setApiState] = useState<ExcalidrawAPI | null>(null);
  
  const setApi = useCallback((newApi: ExcalidrawAPI | null) => {
    setApiState(newApi);
  }, []);

  const value: ExcalidrawContextValue = {
    api,
    isReady: api !== null,
    setApi,
  };

  return (
    <ExcalidrawContext.Provider value={value}>
      {children}
    </ExcalidrawContext.Provider>
  );
}

/**
 * Hook to access Excalidraw API
 * @throws Error if used outside of ExcalidrawProvider or if API not ready
 */
export function useExcalidrawAPI(): ExcalidrawAPI {
  const context = useContext(ExcalidrawContext);
  if (!context) {
    throw new Error('useExcalidrawAPI must be used within an ExcalidrawProvider');
  }
  if (!context.api) {
    throw new Error('Excalidraw API not initialized yet');
  }
  return context.api;
}

/**
 * Hook to access Excalidraw API safely (returns null if not ready)
 * Does not throw errors
 */
export function useExcalidrawAPISafe(): ExcalidrawAPI | null {
  const context = useContext(ExcalidrawContext);
  if (!context) {
    return null;
  }
  return context.api;
}

/**
 * Hook to check if Excalidraw is ready
 */
export function useExcalidrawReady(): boolean {
  const context = useContext(ExcalidrawContext);
  if (!context) {
    return false;
  }
  return context.isReady;
}

/**
 * Hook to set the Excalidraw API (used by ExcalidrawCanvas component)
 */
export function useSetExcalidrawAPI(): (api: ExcalidrawAPI | null) => void {
  const context = useContext(ExcalidrawContext);
  if (!context) {
    throw new Error('useSetExcalidrawAPI must be used within an ExcalidrawProvider');
  }
  return context.setApi;
}
