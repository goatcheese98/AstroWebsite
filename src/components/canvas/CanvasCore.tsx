/**
 * CanvasCore - The Core Excalidraw Instance
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useUnifiedCanvasStore } from '@/stores';
import type { ExcalidrawAPI } from '@/stores';

// Import Excalidraw - the client:only directive in parent handles SSR
import { Excalidraw } from "@excalidraw/excalidraw";

interface CanvasCoreProps {
  isLoading?: boolean;
  onApiReady: (api: any) => void;
  isSharedMode?: boolean;
  isCollaborating?: boolean;
  onPointerUpdate?: (payload: {
    pointer: { x: number; y: number; tool: "pointer" | "laser" };
    button: "down" | "up";
  }) => void;
  onSceneChange?: (
    elements: readonly any[],
    appState: any,
    files: any
  ) => void;
  renderTopRightUI?: (isMobile: boolean, appState: any) => React.ReactElement | null;
}

// Deep sanitize initial data to fix collaborators and other serialization issues
const sanitizeInitialData = (data: any): any => {
  if (!data) return null;
  
  const sanitized = { ...data };
  
  // Remove collaborators if not a Map (causes forEach error)
  if (sanitized.appState) {
    sanitized.appState = { ...sanitized.appState };
    if (sanitized.appState.collaborators && !(sanitized.appState.collaborators instanceof Map)) {
      delete sanitized.appState.collaborators;
    }
  }
  
  // Ensure elements is an array
  if (!sanitized.elements || !Array.isArray(sanitized.elements)) {
    sanitized.elements = [];
  }
  
  // Ensure files is an object
  if (!sanitized.files || typeof sanitized.files !== 'object') {
    sanitized.files = {};
  }
  
  return sanitized;
};

export default function CanvasCore({
  isLoading: propIsLoading,
  onApiReady,
  isSharedMode,
  isCollaborating,
  onPointerUpdate,
  onSceneChange,
  renderTopRightUI,
}: CanvasCoreProps) {
  const [initialData, setInitialData] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const { canvasData, setCanvasData, setDirty } = useUnifiedCanvasStore();
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const hasInitializedRef = useRef(false);
  
  // Load initial data
  useEffect(() => {
    if (hasInitializedRef.current) return;
    let dataToLoad = null;
    
    if (canvasData) {
      dataToLoad = canvasData;
    } else {
      // Try loading from localStorage
      try {
        const saved = localStorage.getItem('excalidraw-canvas-data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.version === 2 && parsed.canvasData) {
            dataToLoad = parsed.canvasData;
          }
        }
      } catch (err) {
        console.error('Failed to load initial canvas data:', err);
      }
    }
    
    // Sanitize before setting
    setInitialData(sanitizeInitialData(dataToLoad));
    setIsReady(true);
    hasInitializedRef.current = true;
  }, [canvasData]);
  
  const handleChange = useCallback((
    elements: readonly any[],
    appState: any,
    files: any
  ) => {
    setCanvasData({
      elements: [...elements],
      appState: { ...appState },
      files: { ...files },
    });
    setDirty(true);
    onSceneChange?.(elements, appState, files);
  }, [setCanvasData, setDirty, onSceneChange]);
  
  // Handle API ready - Excalidraw passes API via excalidrawAPI prop callback
  const handleApiChange = useCallback((api: any) => {
    if (api && api !== apiRef.current) {
      apiRef.current = api;
      onApiReady(api);
    }
  }, [onApiReady]);

  const UIOptions = useMemo(
    () => ({
      canvasActions: {
        changeViewBackgroundColor: true,
        clearCanvas: !isSharedMode,
        export: { saveFileToDisk: true },
        loadScene: !isSharedMode,
        saveToActiveFile: !isSharedMode,
        toggleTheme: true,
        saveAsImage: true,
      },
    }),
    [isSharedMode]
  );
  
  if (propIsLoading || !isReady) {
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
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Excalidraw
        excalidrawAPI={handleApiChange}
        initialData={initialData}
        onChange={handleChange}
        isCollaborating={!!isCollaborating}
        onPointerUpdate={onPointerUpdate}
        theme="light"
        UIOptions={UIOptions}
        name="Untitled Canvas"
        renderTopRightUI={renderTopRightUI}
      />
    </div>
  );
}
