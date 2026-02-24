import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CaptureUpdateAction,
  getSceneVersion,
  reconcileElements,
} from "@excalidraw/excalidraw";
import type { ExcalidrawAPI, ExcalidrawElement, ExcalidrawAppState } from "@/stores";

interface UserIdentity {
  id?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}

interface UseExcalidrawCollaborationOptions {
  enabled: boolean;
  roomId?: string;
  partyKitHost: string;
  api: ExcalidrawAPI | null;
  user?: UserIdentity;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface PointerPayload {
  pointer: { x: number; y: number; tool: "pointer" | "laser" };
  button: "down" | "up";
}

interface ScenePayload {
  elements: readonly ExcalidrawElement[];
  appState: ExcalidrawAppState;
  files: Record<string, any>;
}

interface RemoteCollaborator {
  id: string;
  username?: string | null;
  avatarUrl?: string;
  socketId?: string;
  button?: "up" | "down";
  selectedElementIds?: Record<string, boolean>;
  pointer?: {
    x: number;
    y: number;
    tool: "pointer" | "laser";
    renderCursor?: boolean;
  };
  color?: {
    background: string;
    stroke: string;
  };
}

interface UseExcalidrawCollaborationResult {
  isConnected: boolean;
  activeUsers: number;
  onPointerUpdate: (payload: PointerPayload) => void;
  onSceneChange: (
    elements: readonly ExcalidrawElement[],
    appState: ExcalidrawAppState,
    files: Record<string, any>
  ) => void;
}

interface SharedScene {
  elements: ExcalidrawElement[];
  appState: Record<string, any>;
  files: Record<string, any>;
}

const CURSOR_TIMEOUT_MS = 15_000;
const CURSOR_CLEANUP_INTERVAL_MS = 5_000;
const SCENE_THROTTLE_MS = 80;

type MsgpackEncode = (input: unknown) => Uint8Array;
type MsgpackDecode = (input: ArrayBuffer | Uint8Array) => unknown;

let msgpackModulePromise: Promise<{
  encode: MsgpackEncode;
  decode: MsgpackDecode;
}> | null = null;

async function loadMsgpack() {
  if (!msgpackModulePromise) {
    msgpackModulePromise = import("@msgpack/msgpack").then((mod) => ({
      encode: mod.encode as MsgpackEncode,
      decode: mod.decode as MsgpackDecode,
    }));
  }
  return msgpackModulePromise;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getUserColor(seed: string): { background: string; stroke: string } {
  const palette = [
    { background: "#60a5fa", stroke: "#1d4ed8" },
    { background: "#34d399", stroke: "#047857" },
    { background: "#f472b6", stroke: "#be185d" },
    { background: "#f59e0b", stroke: "#b45309" },
    { background: "#a78bfa", stroke: "#6d28d9" },
    { background: "#fb7185", stroke: "#be123c" },
  ];
  return palette[hashString(seed) % palette.length];
}

function getWsBase(host: string): string {
  if (host.startsWith("wss://") || host.startsWith("ws://")) {
    return host;
  }
  if (host.startsWith("https://")) {
    return host.replace("https://", "wss://");
  }
  if (host.startsWith("http://")) {
    return host.replace("http://", "ws://");
  }
  return `wss://${host}`;
}

function toCollaborativeAppState(appState: ExcalidrawAppState): Record<string, any> {
  return {
    viewBackgroundColor: appState.viewBackgroundColor,
    gridSize: appState.gridSize ?? null,
  };
}

function normalizeRemoteAppState(appState: Record<string, any> | undefined): Record<string, any> {
  if (!appState) return {};
  return {
    viewBackgroundColor: appState.viewBackgroundColor,
    gridSize: appState.gridSize ?? null,
  };
}

function decodeMessage(
  message: string | ArrayBuffer,
  decodeFn: MsgpackDecode | null
): any | null {
  if (message instanceof ArrayBuffer && decodeFn) {
    return decodeFn(message);
  }
  if (message instanceof ArrayBuffer) {
    return null;
  }
  try {
    if (decodeFn) {
      return decodeFn(new TextEncoder().encode(message));
    }
    return JSON.parse(message);
  } catch {
    return null;
  }
}

export function useExcalidrawCollaboration({
  enabled,
  roomId,
  partyKitHost,
  api,
  user,
  onConnect,
  onDisconnect,
  onError,
}: UseExcalidrawCollaborationOptions): UseExcalidrawCollaborationResult {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState(1);

  const callbackRefs = useRef({ onConnect, onDisconnect, onError });
  const wsRef = useRef<WebSocket | null>(null);
  const hasActiveSessionRef = useRef(false);
  const selfSocketIdRef = useRef<string | null>(null);
  const applyingRemoteRef = useRef(false);
  const pendingRemoteSceneRef = useRef<SharedScene | null>(null);
  const collaboratorsRef = useRef<Map<string, RemoteCollaborator>>(new Map());
  const collaboratorLastSeenRef = useRef<Map<string, number>>(new Map());
  const queuedSceneRef = useRef<ScenePayload | null>(null);
  const sceneFlushTimeoutRef = useRef<number | null>(null);
  const msgpackEncodeRef = useRef<MsgpackEncode | null>(null);
  const msgpackDecodeRef = useRef<MsgpackDecode | null>(null);
  const lastSentRef = useRef<{ sceneVersion: number; bg: string | null }>({
    sceneVersion: -1,
    bg: null,
  });

  const sessionUserId = useMemo(
    () => user?.id || `guest-${Math.random().toString(36).slice(2, 10)}`,
    [user?.id]
  );
  const sessionUserName = useMemo(
    () => user?.name?.trim() || `Guest ${sessionUserId.slice(0, 4)}`,
    [sessionUserId, user?.name]
  );
  const sessionUserColor = useMemo(() => getUserColor(sessionUserId), [sessionUserId]);

  useEffect(() => {
    callbackRefs.current = { onConnect, onDisconnect, onError };
  }, [onConnect, onDisconnect, onError]);

  const updateCollaboratorsInScene = useCallback(() => {
    if (!api) return;
    try {
      (api as any).updateScene({
        collaborators: new Map(collaboratorsRef.current),
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    } catch (error) {
      console.error("[Collab] Failed to update collaborators in scene:", error);
    }
  }, [api]);

  const applyRemoteScene = useCallback(
    (scene: SharedScene | null) => {
      if (!scene) return;
      if (!api) {
        pendingRemoteSceneRef.current = scene;
        return;
      }

      try {
        const localElements =
          (api as any).getSceneElementsIncludingDeleted?.() ?? api.getSceneElements();
        const localAppState = api.getAppState();
        const mergedElements = reconcileElements(
          localElements as any,
          (scene.elements || []) as any,
          localAppState as any
        );

        applyingRemoteRef.current = true;
        (api as any).updateScene({
          elements: mergedElements,
          appState: normalizeRemoteAppState(scene.appState),
          files: scene.files || {},
          collaborators: new Map(collaboratorsRef.current),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      } catch (error) {
        console.error("[Collab] Failed to apply remote scene:", error);
      }
    },
    [api]
  );

  useEffect(() => {
    if (api && pendingRemoteSceneRef.current) {
      const scene = pendingRemoteSceneRef.current;
      pendingRemoteSceneRef.current = null;
      applyRemoteScene(scene);
    }
  }, [api, applyRemoteScene]);

  const upsertCollaborator = useCallback(
    (userId: string, collaborator: RemoteCollaborator) => {
      if (!userId || userId === selfSocketIdRef.current) return;
      collaboratorsRef.current.set(userId, {
        ...collaboratorsRef.current.get(userId),
        ...collaborator,
      });
      collaboratorLastSeenRef.current.set(userId, Date.now());
      updateCollaboratorsInScene();
    },
    [updateCollaboratorsInScene]
  );

  const removeCollaborator = useCallback(
    (userId: string) => {
      collaboratorsRef.current.delete(userId);
      collaboratorLastSeenRef.current.delete(userId);
      updateCollaboratorsInScene();
    },
    [updateCollaboratorsInScene]
  );

  const sendMessage = useCallback((data: Record<string, any>) => {
    const encodeFn = msgpackEncodeRef.current;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !encodeFn) return;
    try {
      socket.send(encodeFn(data));
    } catch (error) {
      console.error("[Collab] Failed to send message:", error);
    }
  }, []);

  const flushQueuedScene = useCallback(() => {
    sceneFlushTimeoutRef.current = null;
    const queued = queuedSceneRef.current;
    queuedSceneRef.current = null;
    if (!queued) return;

    const sceneVersion = getSceneVersion(queued.elements as any);
    const bg = queued.appState.viewBackgroundColor || null;
    lastSentRef.current = { sceneVersion, bg };

    sendMessage({
      type: "scene-update",
      sceneVersion,
      scene: {
        elements: queued.elements,
        appState: toCollaborativeAppState(queued.appState),
        files: queued.files,
      },
      user: {
        id: sessionUserId,
        name: sessionUserName,
      },
    });
  }, [sendMessage, sessionUserId, sessionUserName]);

  const onSceneChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: ExcalidrawAppState,
      files: Record<string, any>
    ) => {
      if (!enabled) return;
      if (!isConnected) return;

      if (applyingRemoteRef.current) {
        applyingRemoteRef.current = false;
        return;
      }

      const sceneVersion = getSceneVersion(elements as any);
      const bg = appState.viewBackgroundColor || null;
      if (
        sceneVersion === lastSentRef.current.sceneVersion &&
        bg === lastSentRef.current.bg
      ) {
        return;
      }

      queuedSceneRef.current = {
        elements,
        appState,
        files,
      };

      if (sceneFlushTimeoutRef.current === null) {
        sceneFlushTimeoutRef.current = window.setTimeout(
          flushQueuedScene,
          SCENE_THROTTLE_MS
        );
      }
    },
    [enabled, isConnected, flushQueuedScene]
  );

  const onPointerUpdate = useCallback(
    (payload: PointerPayload) => {
      if (!enabled || !isConnected || !api) return;
      const appState = api.getAppState();
      sendMessage({
        type: "pointer-update",
        pointer: payload.pointer,
        button: payload.button,
        selectedElementIds: appState.selectedElementIds || {},
        user: {
          id: sessionUserId,
          name: sessionUserName,
          avatarUrl: user?.avatarUrl || undefined,
          color: sessionUserColor,
        },
      });
    },
    [
      api,
      enabled,
      isConnected,
      sendMessage,
      sessionUserColor,
      sessionUserId,
      sessionUserName,
      user?.avatarUrl,
    ]
  );

  useEffect(() => {
    if (!enabled || !roomId || !api) {
      // Only run cleanup once when transitioning from active to inactive.
      if (hasActiveSessionRef.current) {
        wsRef.current?.close();
        wsRef.current = null;
        selfSocketIdRef.current = null;
        collaboratorsRef.current.clear();
        collaboratorLastSeenRef.current.clear();
        updateCollaboratorsInScene();
        setIsConnected(false);
        setActiveUsers(1);
        hasActiveSessionRef.current = false;
      }
      return;
    }

    let ws: WebSocket | null = null;
    let cancelled = false;

    const init = async () => {
      try {
        const msgpack = await loadMsgpack();
        if (cancelled) return;
        msgpackEncodeRef.current = msgpack.encode;
        msgpackDecodeRef.current = msgpack.decode;
      } catch (error) {
        console.error("[Collab] Failed to load msgpack transport:", error);
        callbackRefs.current.onError?.(new Error("Failed to load collaboration transport"));
        return;
      }

      const wsUrl = `${getWsBase(partyKitHost)}/parties/main/${roomId}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      hasActiveSessionRef.current = true;

      ws.onopen = () => {
        setIsConnected(true);
        callbackRefs.current.onConnect?.();
        sendMessage({
          type: "presence-update",
          selectedElementIds: api.getAppState().selectedElementIds || {},
          user: {
            id: sessionUserId,
            name: sessionUserName,
            avatarUrl: user?.avatarUrl || undefined,
            color: sessionUserColor,
          },
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        setActiveUsers(1);
        selfSocketIdRef.current = null;
        collaboratorsRef.current.clear();
        collaboratorLastSeenRef.current.clear();
        updateCollaboratorsInScene();
        hasActiveSessionRef.current = false;
        callbackRefs.current.onDisconnect?.();
      };

      ws.onerror = () => {
        callbackRefs.current.onError?.(new Error("Collaboration connection failed"));
      };

      ws.onmessage = (event) => {
        const message = decodeMessage(event.data, msgpackDecodeRef.current);
        if (!message || typeof message !== "object") return;

        switch ((message as any).type) {
          case "init": {
            const initMessage = message as any;
            selfSocketIdRef.current = initMessage.userId || null;
            setActiveUsers(initMessage.activeUsers || 1);

            const incomingCollaborators = initMessage.collaborators || {};
            collaboratorsRef.current.clear();
            collaboratorLastSeenRef.current.clear();
            for (const [id, collaborator] of Object.entries(incomingCollaborators)) {
              if (id === selfSocketIdRef.current) continue;
              collaboratorsRef.current.set(id, collaborator as RemoteCollaborator);
              collaboratorLastSeenRef.current.set(id, Date.now());
            }
            updateCollaboratorsInScene();

            if (initMessage.scene) {
              applyRemoteScene(initMessage.scene as SharedScene);
            }
            break;
          }

          case "scene-update": {
            const sceneMessage = message as any;
            if (sceneMessage.userId && sceneMessage.userId === selfSocketIdRef.current) return;
            applyRemoteScene(sceneMessage.scene as SharedScene);
            break;
          }

          case "pointer-update": {
            const pointerMessage = message as any;
            if (!pointerMessage.userId || pointerMessage.userId === selfSocketIdRef.current) return;
            const collaborator = (pointerMessage.collaborator || {}) as RemoteCollaborator;
            upsertCollaborator(pointerMessage.userId, collaborator);
            break;
          }

          case "user-joined":
          case "user-left": {
            const presenceMessage = message as any;
            if (typeof presenceMessage.activeUsers === "number") {
              setActiveUsers(presenceMessage.activeUsers);
            }
            if (presenceMessage.type === "user-left" && presenceMessage.userId) {
              removeCollaborator(presenceMessage.userId);
            }
            break;
          }

          case "room-expired": {
            const expiredMessage = message as any;
            callbackRefs.current.onError?.(
              new Error(expiredMessage.message || "Collaboration room expired")
            );
            break;
          }
        }
      };
    };

    void init();

    return () => {
      cancelled = true;
      ws?.close();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      hasActiveSessionRef.current = false;
    };
  }, [
    api,
    applyRemoteScene,
    enabled,
    partyKitHost,
    roomId,
    sendMessage,
    sessionUserColor,
    sessionUserId,
    sessionUserName,
    updateCollaboratorsInScene,
    upsertCollaborator,
    removeCollaborator,
    user?.avatarUrl,
  ]);

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      let updated = false;
      for (const [id, seenAt] of collaboratorLastSeenRef.current.entries()) {
        if (now - seenAt > CURSOR_TIMEOUT_MS) {
          collaboratorLastSeenRef.current.delete(id);
          collaboratorsRef.current.delete(id);
          updated = true;
        }
      }
      if (updated) {
        updateCollaboratorsInScene();
      }
    }, CURSOR_CLEANUP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, updateCollaboratorsInScene]);

  useEffect(() => {
    return () => {
      if (sceneFlushTimeoutRef.current !== null) {
        clearTimeout(sceneFlushTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    activeUsers,
    onPointerUpdate,
    onSceneChange,
  };
}
