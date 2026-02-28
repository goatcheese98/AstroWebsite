/**
 * CanvasContainer
 *
 * Hosts the Excalidraw instance and composes canvas UI layers.
 * Owns the collaboration session via useCollaboration.
 */

import { useRef, useCallback, useMemo, useState } from 'react';
import {
  useUnifiedCanvasStore,
  useExcalidrawAPISafe,
  useSetExcalidrawAPI,
  type ExcalidrawAPI,
} from '@/stores';
import { useCanvasPersistence } from './hooks/useCanvasPersistence';
import { useCollaboration } from '@/hooks/useCollaboration';
import { MainMenu, LiveCollaborationTrigger } from "@excalidraw/excalidraw";

// Sub-components
import CanvasCore from './CanvasCore';
import CanvasUI from './CanvasUI';
import CanvasNotesLayer from './CanvasNotesLayer';
import CanvasAvatar from '../islands/CanvasAvatar';
import CollabDialog from './CollabDialog';

import "@excalidraw/excalidraw/index.css";

declare global {
  interface Window {
    excalidrawAPI?: ExcalidrawAPI;
  }
}

interface CanvasContainerProps {
  isSharedMode?: boolean;
  shouldClearOnMount?: boolean;
  isSignedIn?: boolean;
  userId?: string | null;
  userName?: string | null;
  avatarUrl?: string | null;
}

export default function CanvasContainer({
  isSharedMode = false,
  shouldClearOnMount = false,
  isSignedIn = false,
  userId = null,
  userName = null,
  avatarUrl = null,
}: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // === STORE ===
  const store = useUnifiedCanvasStore();
  const { canvasId, addToast } = store;

  // === API ===
  const api = useExcalidrawAPISafe();
  const setApi = useSetExcalidrawAPI();

  const handleApiReady = useCallback((api: unknown) => {
    const excalidrawApi = api as ExcalidrawAPI;
    setApi(excalidrawApi);
    window.excalidrawAPI = excalidrawApi;
  }, [setApi]);

  // === PERSISTENCE ===
  useCanvasPersistence({
    canvasId,
    shouldClearOnMount,
    onError: (err) => addToast(`Save failed: ${err.message}`, 'error'),
  });

  // === COLLABORATION ===
  const {
    isCollaborating,
    roomLink,
    username,
    setUsername,
    startSession,
    stopSession,
    handleSceneChange,
    handlePointerUpdate,
  } = useCollaboration();

  const [isCollabDialogOpen, setIsCollabDialogOpen] = useState(false);

  const openCollabDialog = useCallback(() => setIsCollabDialogOpen(true), []);
  const closeCollabDialog = useCallback(() => setIsCollabDialogOpen(false), []);

  // === EXCALIDRAW LAYOUT ===

  const renderTopRightUI = useMemo(
    () => (_isMobile: boolean, _appState: unknown) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LiveCollaborationTrigger
          isCollaborating={isCollaborating}
          onSelect={openCollabDialog}
        />
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
      </div>
    ),
    [avatarUrl, isCollaborating, isSignedIn, openCollabDialog, userId, userName],
  );

  const renderMainMenu = useMemo(
    () => (
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveToActiveFile />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.LiveCollaborationTrigger
          isCollaborating={isCollaborating}
          onSelect={openCollabDialog}
        />
        <MainMenu.DefaultItems.CommandPalette />
        <MainMenu.DefaultItems.SearchMenu />
        <MainMenu.Separator />
        <MainMenu.DefaultItems.Help />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.Separator />
        <MainMenu.Group title="Excalidraw links">
          <MainMenu.DefaultItems.Socials />
        </MainMenu.Group>
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ToggleTheme />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    ),
    [isCollaborating, openCollabDialog],
  );

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
        isCollaborating={isCollaborating}
        onSceneChange={handleSceneChange}
        onPointerUpdate={handlePointerUpdate}
        renderTopRightUI={renderTopRightUI}
      >
        {renderMainMenu}
      </CanvasCore>

      {/* Notes Layer (markdown, embeds) */}
      <CanvasNotesLayer api={api} />

      {/* UI Layer (controls, modals, chat) */}
      <CanvasUI isSharedMode={isSharedMode} />

      {/* Live Collaboration Dialog */}
      <CollabDialog
        isOpen={isCollabDialogOpen}
        onClose={closeCollabDialog}
        isCollaborating={isCollaborating}
        roomLink={roomLink}
        username={username}
        onUsernameChange={setUsername}
        onStartSession={startSession}
        onStopSession={() => {
          stopSession();
          addToast("Collaboration session ended", "info");
        }}
      />
    </div>
  );
}
