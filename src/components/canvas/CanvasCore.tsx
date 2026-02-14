/**
 * CanvasCore - The Core Excalidraw Instance
 * 
 * Responsibilities:
 * - Render the Excalidraw component
 * - Handle API initialization
 * - Manage initial data loading
 * - Handle theme
 */

import { useState, useCallback, useEffect, type ComponentType } from 'react';
import { useUnifiedCanvasStore } from '@/stores';
import type { ExcalidrawAPI, ExcalidrawElement, ExcalidrawAppState } from '@/stores/unifiedCanvasStore';

interface CanvasCoreProps {
  ExcalidrawComponent: ComponentType<any> | null;
  isLoading: boolean;
  onApiReady: (api: ExcalidrawAPI) => void;
  isSharedMode?: boolean;
}

// Helper to sanitize appState (fixes Map serialization issues)
const sanitizeAppState = (appState: ExcalidrawAppState | null | undefined): Partial<ExcalidrawAppState> | undefined => {
  if (!appState) return undefined;
  const sanitized = { ...appState };
  if (sanitized.collaborators && !(sanitized.collaborators instanceof Map)) {
    delete sanitized.collaborators;
  }
  return sanitized;
};

export default function CanvasCore({
  ExcalidrawComponent,
  isLoading,
  onApiReady,
  isSharedMode,
}: CanvasCoreProps) {
  const [initialData, setInitialData] = useState<any>(null);
  const { canvasData, setCanvasData, setDirty } = useUnifiedCanvasStore();
  
  // Load initial data from store or localStorage
  useEffect(() => {
    if (canvasData) {
      setInitialData(canvasData);
    } else {
      // Try loading from localStorage
      try {
        const saved = localStorage.getItem('excalidraw-canvas-data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.version === 2 && parsed.canvasData) {
            setInitialData(parsed.canvasData);
          }
        }
      } catch (err) {
        console.error('Failed to load initial canvas data:', err);
      }
    }
  }, [canvasData]);
  
  const handleChange = useCallback((
    elements: readonly ExcalidrawElement[],
    appState: ExcalidrawAppState,
    files: BinaryFileData
  ) => {
    // Update store
    setCanvasData({
      elements: [...elements],
      appState: { ...appState },
      files: { ...files },
    });
    setDirty(true);
  }, [setCanvasData, setDirty]);
  
  const handleExcalidrawRef = useCallback((api: any) => {
    if (api) {
      onApiReady(api);
    }
  }, [onApiReady]);
  
  if (isLoading || !ExcalidrawComponent) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5',
      }}>
        <div>Loading canvas...</div>
      </div>
    );
  }
  
  const UIOptions = {
    canvasActions: {
      changeViewBackgroundColor: true,
      clearCanvas: !isSharedMode, // Disable clear in shared mode
      export: { saveFileToDisk: true },
      loadScene: !isSharedMode,
      saveToActiveFile: !isSharedMode,
      toggleTheme: true,
      saveAsImage: true,
    },
  };
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ExcalidrawComponent
        ref={handleExcalidrawRef}
        initialData={initialData}
        onChange={handleChange}
        theme="light"
        UIOptions={UIOptions}
        name="Untitled Canvas"
      />
    </div>
  );
}

// Type for binary file data
interface BinaryFileData {
  mimeType: string;
  id: string;
  dataURL?: string;
}
