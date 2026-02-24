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

import { useRef, useCallback, useMemo } from 'react';
import { useUnifiedCanvasStore, useExcalidrawAPISafe, useSetExcalidrawAPI } from '@/stores';
import { useCanvasPersistence } from './hooks/useCanvasPersistence';
import { useExcalidrawCollaboration } from './hooks/useExcalidrawCollaboration';

// Sub-components
import CanvasCore from './CanvasCore';
import CanvasUI from './CanvasUI';
import CanvasNotesLayer from './CanvasNotesLayer';
import CanvasAvatar from '../islands/CanvasAvatar';

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

  // Auth props passed from Astro
  isSignedIn?: boolean;
  userId?: string | null;
  userName?: string | null;
  avatarUrl?: string | null;
}

export default function CanvasContainer({
  isSharedMode = false,
  shareRoomId,
  partyKitHost = import.meta.env.PUBLIC_PARTYKIT_HOST || "astroweb-excalidraw.rohanjasani.partykit.dev",
  shouldClearOnMount = false,
  isSignedIn = false,
  userId = null,
  userName = null,
  avatarUrl = null,
}: CanvasContainerProps) {
  // const { isSignedIn } = useUser(); // Removed
  const containerRef = useRef<HTMLDivElement>(null);

  // === STORE CONNECTION ===
  const store = useUnifiedCanvasStore();
  const {
    canvasId,
    setCanvasId,
    addToast,
  } = store;

  // === API MANAGEMENT ===
  const api = useExcalidrawAPISafe();
  const setApi = useSetExcalidrawAPI();

  const handleApiReady = useCallback((excalidrawApi: any) => {
    setApi(excalidrawApi);
    (window as any).excalidrawAPI = excalidrawApi;
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

  // === NATIVE EXCALIDRAW COLLABORATION ===
  const { isConnected, activeUsers, onPointerUpdate, onSceneChange } = useExcalidrawCollaboration({
    enabled: isSharedMode,
    roomId: shareRoomId,
    partyKitHost,
    api,
    user: {
      id: userId,
      name: userName,
      avatarUrl,
    },
    onConnect: () => addToast('Connected to collaboration room', 'success'),
    onDisconnect: () => addToast('Disconnected from room', 'info'),
    onError: (err) => addToast(`Connection error: ${err.message}`, 'error'),
  });

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
        onApiReady={handleApiReady}
        isSharedMode={isSharedMode}
        isCollaborating={isSharedMode}
        onPointerUpdate={onPointerUpdate}
        onSceneChange={onSceneChange}
        renderTopRightUI={useMemo(() => (_isMobile: boolean, _appState: any) => (
          <CanvasAvatar
            user={isSignedIn && userId ? {
              id: userId,
              name: userName || undefined,
              email: undefined,
              avatarUrl: avatarUrl || undefined,
            } : null}
            isAuthenticated={!!isSignedIn}
            isLoading={false}
          />
        ), [isSignedIn, userId, userName, avatarUrl])}
      />

      {/* Notes Layer (markdown, embeds) */}
      <CanvasNotesLayer api={api} />

      {/* UI Layer (controls, modals, chat) */}
      <CanvasUI
        isSignedIn={isSignedIn}
        userId={userId}
        userName={userName}
        isSharedMode={isSharedMode}
        isConnected={isConnected}
        activeUsers={activeUsers}
      />
    </div>
  );
}
