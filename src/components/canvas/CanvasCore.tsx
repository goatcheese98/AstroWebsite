/**
 * CanvasCore - The Core Excalidraw Instance
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useUnifiedCanvasStore } from '@/stores';
import type {
  CanvasData,
  ExcalidrawAppState,
  ExcalidrawElement,
} from '@/stores';

// Import Excalidraw - the client:only directive in parent handles SSR
import { Excalidraw } from "@excalidraw/excalidraw";

type SceneFiles = Record<string, unknown>;

interface CanvasCoreProps {
  isLoading?: boolean;
  onApiReady: (api: unknown) => void;
  isSharedMode?: boolean;
  isCollaborating?: boolean;
  onSceneChange?: (
    elements: readonly ExcalidrawElement[],
    appState: Partial<ExcalidrawAppState>,
    files: SceneFiles
  ) => void;
  onPointerUpdate?: (payload: {
    pointer: { x: number; y: number };
    button: "down" | "up";
    pointersMap: Map<number, Readonly<{ x: number; y: number }>>;
  }) => void;
  renderTopRightUI?: (isMobile: boolean, appState: unknown) => React.ReactElement | null;
  children?: React.ReactNode;
}

// Deep sanitize initial data to fix collaborators and other serialization issues
const sanitizeInitialData = (data: unknown): CanvasData | null => {
  if (!data || typeof data !== "object") return null;

  const source = data as Partial<CanvasData> & {
    appState?: ExcalidrawAppState;
    files?: unknown;
  };

  const appState: Partial<ExcalidrawAppState> =
    source.appState && typeof source.appState === "object"
      ? { ...source.appState }
      : {};

  // Remove invalid collaborator state to avoid runtime forEach errors.
  if (
    appState.collaborators &&
    !(appState.collaborators instanceof Map)
  ) {
    delete appState.collaborators;
  }

  const elements = Array.isArray(source.elements)
    ? [...source.elements]
    : [];

  const files =
    source.files && typeof source.files === "object"
      ? ({ ...source.files } as Record<string, unknown>)
      : {};

  return {
    elements,
    appState,
    files,
  };
};

export default function CanvasCore({
  isLoading: propIsLoading,
  onApiReady,
  isSharedMode,
  isCollaborating,
  onSceneChange,
  onPointerUpdate,
  renderTopRightUI,
  children,
}: CanvasCoreProps) {
  const [initialData, setInitialData] = useState<CanvasData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { canvasData, setCanvasData, setDirty } = useUnifiedCanvasStore();
  const apiRef = useRef<unknown>(null);
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
    elements: readonly unknown[],
    appState: unknown,
    files: unknown
  ) => {
    const safeElements = Array.isArray(elements)
      ? (elements as ExcalidrawElement[])
      : [];
    const safeAppState =
      appState && typeof appState === "object"
        ? (appState as Partial<ExcalidrawAppState>)
        : {};
    const safeFiles =
      files && typeof files === "object"
        ? ({ ...files } as SceneFiles)
        : {};

    setCanvasData({
      elements: [...safeElements],
      appState: { ...safeAppState },
      files: { ...safeFiles },
    });
    setDirty(true);
    onSceneChange?.(safeElements, safeAppState, safeFiles);
  }, [setCanvasData, setDirty, onSceneChange]);
  
  // Handle API ready - Excalidraw passes API via excalidrawAPI prop callback
  const handleApiChange = useCallback((api: unknown) => {
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
        initialData={initialData as React.ComponentProps<typeof Excalidraw>["initialData"]}
        onChange={handleChange}
        onPointerUpdate={onPointerUpdate}
        isCollaborating={!!isCollaborating}
        theme="light"
        UIOptions={UIOptions}
        name="Untitled Canvas"
        renderTopRightUI={renderTopRightUI}
      >
        {children}
      </Excalidraw>
    </div>
  );
}
