/**
 * CanvasContainer
 *
 * Hosts the Excalidraw instance and composes canvas UI layers.
 */

import { useRef, useCallback, useMemo, useState } from 'react';
import {
  useUnifiedCanvasStore,
  useExcalidrawAPISafe,
  useSetExcalidrawAPI,
  type ExcalidrawAPI,
} from '@/stores';
import { useCanvasPersistence } from './hooks/useCanvasPersistence';
import { LiveCollaborationTrigger, MainMenu } from "@excalidraw/excalidraw";

// Sub-components
import CanvasCore from './CanvasCore';
import CanvasUI from './CanvasUI';
import CanvasNotesLayer from './CanvasNotesLayer';
import CanvasAvatar from '../islands/CanvasAvatar';

import "@excalidraw/excalidraw/index.css";

declare global {
  interface Window {
    excalidrawAPI?: ExcalidrawAPI;
  }
}

interface CanvasContainerProps {
  /** Enable collaboration mode on mount */
  isSharedMode?: boolean;
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
  shouldClearOnMount = false,
  isSignedIn = false,
  userId = null,
  userName = null,
  avatarUrl = null,
}: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // === STORE CONNECTION ===
  const store = useUnifiedCanvasStore();
  const {
    canvasId,
    addToast,
  } = store;
  const [isCollaborating, setIsCollaborating] = useState(isSharedMode);

  // === API MANAGEMENT ===
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
    onError: (err) => {
      addToast(`Save failed: ${err.message}`, 'error');
    },
  });

  const toggleCollaboration = useCallback(() => {
    setIsCollaborating((prev) => {
      const next = !prev;
      addToast(
        next
          ? "Native collaboration mode enabled"
          : "Native collaboration mode disabled",
        "info"
      );
      return next;
    });
  }, [addToast]);

  const renderTopRightUI = useMemo(
    () => (_isMobile: boolean, _appState: unknown) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LiveCollaborationTrigger
          isCollaborating={isCollaborating}
          onSelect={toggleCollaboration}
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
    [avatarUrl, isCollaborating, isSignedIn, toggleCollaboration, userId, userName]
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
          onSelect={toggleCollaboration}
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
    [isCollaborating, toggleCollaboration]
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
        renderTopRightUI={renderTopRightUI}
      >
        {renderMainMenu}
      </CanvasCore>

      {/* Notes Layer (markdown, embeds) */}
      <CanvasNotesLayer api={api} />

      {/* UI Layer (controls, modals, chat) */}
      <CanvasUI
        isSharedMode={isSharedMode}
        isCollaborating={isCollaborating}
      />
    </div>
  );
}
