/**
 * CanvasContainer - Unified Canvas Component
 * 
 * Consolidates functionality from:
 * - ExcalidrawCanvas.tsx (2,468 lines) - Core canvas + collaboration
 * - CanvasApp.tsx (759 lines) - UI controls + modals
 * - CanvasAppRefactored.tsx (470 lines) - Store-based approach
 * - CanvasRoot.tsx (64 lines) - Provider wrapper
 * 
 * Architecture:
 * - Uses unified Zustand store for all state
 * - No eventBus (direct store actions)
 * - No ExcalidrawProvider (store holds API reference)
 * - Extracted hooks for testability
 */

import { useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useUnifiedCanvasStore, useExcalidrawAPISafe, useSetExcalidrawAPI } from '@/stores';
import { useExcalidrawLoader } from './hooks/useExcalidrawLoader';
import { useCanvasPersistence } from './hooks/useCanvasPersistence';
import { useCanvasCollaboration } from './hooks/useCanvasCollaboration';

// Sub-components
import CanvasCore from './CanvasCore';
import CanvasUI from './CanvasUI';
import CanvasCollaborationLayer from './CanvasCollaborationLayer';
import CanvasNotesLayer from './CanvasNotesLayer';

import "@excalidraw/excalidraw/index.css";

interface CanvasContainerProps {
  /** Enable PartyKit collaboration */
  isSharedMode?: boolean;
  /** Room ID for collaboration */
  shareRoomId?: string;
  /** PartyKit host URL */
  partyKitHost?: string;
  /** Force clear canvas on mount (new canvas mode) */
  shouldClearOnMount?: boolean;
}

export default function CanvasContainer({
  isSharedMode = false,
  shareRoomId,
  partyKitHost = import.meta.env.PUBLIC_PARTYKIT_HOST || "astroweb-excalidraw.rohanjasani.partykit.dev",
  shouldClearOnMount = false,
}: CanvasContainerProps) {
  const { isSignedIn } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // === STORE CONNECTION ===
  const store = useUnifiedCanvasStore();
  const { 
    canvasId, 
    setCanvasId,
    addToast,
  } = store;
  
  // === EXCALIDRAW LOADING ===
  const { modules, isLoading: isLoadingExcalidraw, error: loadError } = useExcalidrawLoader();
  const ExcalidrawComponent = modules?.Excalidraw || null;
  
  // === API MANAGEMENT ===
  const api = useExcalidrawAPISafe();
  const setApi = useSetExcalidrawAPI();
  
  const handleApiReady = useCallback((excalidrawApi: any) => {
    setApi(excalidrawApi);
  }, [setApi]);
  
  // === PERSISTENCE ===
  useCanvasPersistence({
    api,
    canvasId,
    shouldClearOnMount,
    onSave: (id) => {
      setCanvasId(id);
      addToast('Canvas saved', 'success');
    },
    onError: (err) => {
      addToast(`Save failed: ${err.message}`, 'error');
    },
  });
  
  // === COLLABORATION ===
  const { isConnected, activeUsers, cursors } = useCanvasCollaboration({
    isSharedMode,
    shareRoomId,
    partyKitHost,
    api,
    onConnect: () => addToast('Connected to collaboration room', 'success'),
    onDisconnect: () => addToast('Disconnected from room', 'info'),
    onError: (err) => addToast(`Connection error: ${err.message}`, 'error'),
  });
  
  // === ERROR HANDLING ===
  if (loadError) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>Failed to load canvas</h2>
        <p>{loadError.message}</p>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className="canvas-container" 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        background: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* Core Excalidraw Canvas */}
      <CanvasCore
        ExcalidrawComponent={ExcalidrawComponent}
        isLoading={isLoadingExcalidraw}
        onApiReady={handleApiReady}
        isSharedMode={isSharedMode}
      />
      
      {/* Collaboration Layer (cursors, locks) */}
      {isSharedMode && isConnected && (
        <CanvasCollaborationLayer 
          cursors={cursors}
          activeUsers={activeUsers}
        />
      )}
      
      {/* Notes Layer (markdown, embeds) */}
      <CanvasNotesLayer api={api} />
      
      {/* UI Layer (controls, modals, chat) */}
      <CanvasUI 
        api={api}
        isSignedIn={isSignedIn}
        isSharedMode={isSharedMode}
        isConnected={isConnected}
        activeUsers={activeUsers}
      />
    </div>
  );
}
