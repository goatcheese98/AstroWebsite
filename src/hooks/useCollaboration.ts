/**
 * useCollaboration
 *
 * Manages a live collaboration session backed by a PartyKit Durable Object.
 * Protocol mirrors excalidraw-room (Socket.IO) translated to plain WebSockets.
 *
 * Architecture:
 *   - AES-GCM-128 E2E encryption  (key lives only in the URL hash — never sent to server)
 *   - `reconcileElements` from @excalidraw/excalidraw for conflict resolution
 *   - Scene changes throttled at 100 ms; cursor/pointer updates at 50 ms
 *   - Custom elements (Lexical, Markdown, WebEmbed) collaborate automatically:
 *     CanvasNotesLayer bumps version/versionNonce on every content edit and calls
 *     api.updateScene(), which fires the Excalidraw onChange and gets picked up here.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import { reconcileElements } from "@excalidraw/excalidraw";
import {
  generateEncryptionKey,
  exportKeyToBase64,
  importKeyFromBase64,
  encryptData,
  decryptData,
} from "@/lib/collab/encryption";
import {
  getCollaboratorColor,
  getCollaboratorColorByIndex,
  getCollaboratorColorCount,
  type BroadcastPayload,
  type CollaboratorColor,
  type CollaboratorState,
  type CollabFile,
  type RemoteElement,
  type ServerToClient,
} from "@/lib/collab/protocol";
import { useExcalidrawAPISafe } from "@/stores";

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

const SCENE_THROTTLE_MS = 100;
const CURSOR_THROTTLE_MS = 50;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const USERNAME_KEY = "excalidraw_name";
const LAST_COLOR_INDEX_KEY = "excalidraw_last_collab_color_index";

function getPartykitHost(): string {
  if (typeof window === "undefined") return "localhost:1999";
  const isDev = window.location.hostname === "localhost";
  return isDev
    ? "localhost:1999"
    : (import.meta.env.PUBLIC_PARTYKIT_HOST || "astroweb-excalidraw.rohanjasani.partykit.dev");
}

// --------------------------------------------------------------------------
// Public interface
// --------------------------------------------------------------------------

export interface CollaborationControls {
  isCollaborating: boolean;
  collaborators: Map<string, CollaboratorState>;
  roomLink: string | null;
  username: string;
  setUsername: (name: string) => void;
  startSession: () => Promise<void>;
  stopSession: () => void;
  /** Call from CanvasCore's onSceneChange to broadcast element updates. */
  handleSceneChange: (
    elements: readonly unknown[],
    appState: unknown,
    files: unknown,
  ) => void;
  /** Call from Excalidraw's onPointerUpdate to broadcast cursor position. */
  handlePointerUpdate: (payload: {
    pointer: { x: number; y: number };
    button: "down" | "up";
    pointersMap: Map<number, Readonly<{ x: number; y: number }>>;
  }) => void;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function readUsername(): string {
  if (typeof window === "undefined") return "Anonymous";
  return localStorage.getItem(USERNAME_KEY) || "Anonymous";
}

function persistUsername(name: string) {
  if (typeof window !== "undefined") localStorage.setItem(USERNAME_KEY, name);
}

function getSessionCollaboratorColor(): CollaboratorColor {
  const totalColors = getCollaboratorColorCount();
  if (totalColors <= 0) {
    return getCollaboratorColor(nanoid(10));
  }

  if (typeof window === "undefined") {
    return getCollaboratorColor(nanoid(10));
  }

  const raw = localStorage.getItem(LAST_COLOR_INDEX_KEY);
  const previousIndex = raw !== null ? Number.parseInt(raw, 10) : Number.NaN;

  let nextIndex = Math.floor(Math.random() * totalColors);
  if (totalColors > 1 && Number.isInteger(previousIndex) && nextIndex === previousIndex) {
    nextIndex = (nextIndex + 1) % totalColors;
  }

  localStorage.setItem(LAST_COLOR_INDEX_KEY, String(nextIndex));
  return getCollaboratorColorByIndex(nextIndex);
}

function parseRoomHash(): { roomId: string; keyBase64: string } | null {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/^#room=([^,]+),(.+)$/);
  return m ? { roomId: m[1], keyBase64: m[2] } : null;
}

function buildRoomLink(roomId: string, keyBase64: string): string {
  const base = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "";
  return `${base}#room=${roomId},${keyBase64}`;
}

/** Simple leading + trailing throttle backed by refs (no lodash needed). */
function useThrottledCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  const lastRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    (...args: A) => {
      const now = Date.now();
      if (now - lastRef.current >= ms) {
        lastRef.current = now;
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        fnRef.current(...args);
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          lastRef.current = Date.now();
          timerRef.current = null;
          fnRef.current(...args);
        }, ms - (now - lastRef.current));
      }
    },
    [ms],
  );
}

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

export function useCollaboration(): CollaborationControls {
  const api = useExcalidrawAPISafe();

  const [isCollaborating, setIsCollaborating] = useState(false);
  const [collaborators, setCollaborators] = useState<Map<string, CollaboratorState>>(new Map());
  const [roomLink, setRoomLink] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string>(readUsername);

  // Stable refs so async callbacks always see current values.
  const apiRef = useRef(api);
  apiRef.current = api;
  const isCollaboratingRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const encKeyRef = useRef<CryptoKey | null>(null);
  const keyBase64Ref = useRef<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const clientIdRef = useRef<string>(nanoid(10));
  const collaboratorColorRef = useRef<CollaboratorColor>(getSessionCollaboratorColor());
  const collaboratorsRef = useRef<Map<string, CollaboratorState>>(new Map());
  const sentFileIdsRef = useRef<Set<string>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const setUsername = useCallback((name: string) => {
    setUsernameState(name);
    persistUsername(name);
  }, []);

  // -------------------------------------------------------------------------
  // Outgoing — scene broadcast
  // -------------------------------------------------------------------------

  const broadcastSceneRaw = useCallback(
    async (
      elements: readonly unknown[],
      files: Record<string, unknown> | null,
      volatile: boolean,
    ) => {
      const ws = wsRef.current;
      const key = encKeyRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !key) return;

      // Collect unsent files to include in this broadcast.
      const newFiles: Record<string, CollabFile> = {};
      if (files) {
        for (const [id, file] of Object.entries(files)) {
          if (!sentFileIdsRef.current.has(id) && file) {
            const f = file as Record<string, unknown>;
            if (f.dataURL && f.mimeType) {
              newFiles[id] = {
                id,
                mimeType: f.mimeType as string,
                dataURL: f.dataURL as string,
                created: (f.created as number) ?? Date.now(),
              };
              sentFileIdsRef.current.add(id);
            }
          }
        }
      }

      const payload: BroadcastPayload = {
        type: "scene-update",
        elements: elements as RemoteElement[],
        ...(Object.keys(newFiles).length > 0 ? { files: newFiles } : {}),
      };

      try {
        const encrypted = await encryptData(payload, key);
        const msgType = volatile ? "server-volatile-broadcast" : "server-broadcast";
        ws.send(JSON.stringify({ type: msgType, ...encrypted }));
      } catch (err) {
        console.error("[Collab] Encrypt/send failed:", err);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Outgoing — cursor broadcast (volatile, high-frequency)
  // -------------------------------------------------------------------------

  const broadcastCursorRaw = useCallback(
    async (pointer: { x: number; y: number }, button: "down" | "up", selectedElementIds: Record<string, boolean>) => {
      const ws = wsRef.current;
      const key = encKeyRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !key) return;

      const payload: BroadcastPayload = {
        type: "cursor-update",
        clientId: clientIdRef.current,
        pointer,
        button,
        selectedElementIds,
        color: collaboratorColorRef.current,
      };

      try {
        const encrypted = await encryptData(payload, key);
        ws.send(JSON.stringify({ type: "server-volatile-broadcast", ...encrypted }));
      } catch {
        // non-fatal
      }
    },
    [],
  );

  const broadcastCursorThrottled = useThrottledCallback(broadcastCursorRaw, CURSOR_THROTTLE_MS);

  // -------------------------------------------------------------------------
  // Public scene-change handler (called from CanvasCore's onSceneChange)
  // -------------------------------------------------------------------------

  const broadcastSceneThrottled = useThrottledCallback(
    (elements: readonly unknown[], files: Record<string, unknown> | null) => {
      broadcastSceneRaw(elements, files, false);
    },
    SCENE_THROTTLE_MS,
  );

  const handleSceneChange = useCallback(
    (elements: readonly unknown[], _appState: unknown, files: unknown) => {
      if (!isCollaboratingRef.current) return;
      broadcastSceneThrottled(elements, files as Record<string, unknown> | null);
    },
    [broadcastSceneThrottled],
  );

  // -------------------------------------------------------------------------
  // Public pointer-update handler (called from Excalidraw's onPointerUpdate)
  // -------------------------------------------------------------------------

  const handlePointerUpdate = useCallback(
    (payload: {
      pointer: { x: number; y: number };
      button: "down" | "up";
      pointersMap: Map<number, Readonly<{ x: number; y: number }>>;
    }) => {
      if (!isCollaboratingRef.current) return;
      const api = apiRef.current;
      const selectedElementIds = (api?.getAppState()?.selectedElementIds ?? {}) as Record<string, boolean>;
      broadcastCursorThrottled(payload.pointer, payload.button, selectedElementIds);
    },
    [broadcastCursorThrottled],
  );

  // -------------------------------------------------------------------------
  // Incoming message handler
  // -------------------------------------------------------------------------

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const key = encKeyRef.current;
      if (!key) return;

      let msg: ServerToClient;
      try {
        msg = JSON.parse(event.data as string) as ServerToClient;
      } catch {
        return;
      }

      const api = apiRef.current;

      switch (msg.type) {
        case "init-room":
          break;

        case "first-in-room":
          // We're the first/only participant — seed the room with our current scene.
          if (api) {
            const elements = api.getSceneElements();
            const files = api.getFiles() as Record<string, unknown>;
            await broadcastSceneRaw(elements, files, false);
          }
          break;

        case "new-user":
          // A new participant joined — respond with full current scene.
          if (api) {
            const elements = api.getSceneElements();
            const files = api.getFiles() as Record<string, unknown>;
            await broadcastSceneRaw(elements, files, false);
          }
          break;

        case "room-user-change": {
          // Prune collaborators that are no longer connected.
          const activeIds = new Set(msg.socketIds);
          const updated = new Map<string, CollaboratorState>();
          for (const [id, state] of collaboratorsRef.current) {
            if (activeIds.has(id)) updated.set(id, state);
          }
          collaboratorsRef.current = updated;
          setCollaborators(new Map(updated));
          api?.updateScene({ appState: { collaborators: updated } as Parameters<typeof api.updateScene>[0]["appState"] });
          break;
        }

        case "client-broadcast": {
          if (!msg.payload || !msg.iv) break;

          let decrypted: BroadcastPayload;
          try {
            decrypted = await decryptData<BroadcastPayload>(msg.payload, msg.iv, key);
          } catch {
            break; // wrong key or corrupted — ignore
          }

          if (decrypted.type === "scene-update" && api) {
            // 1. Add new files before updating the scene so image elements resolve.
            if (decrypted.files) {
              const toAdd = Object.values(decrypted.files).map((f) => ({
                id: f.id,
                mimeType: f.mimeType,
                dataURL: f.dataURL,
                created: f.created,
              }));
              if (toAdd.length) {
                api.addFiles(toAdd as Parameters<typeof api.addFiles>[0]);
                for (const f of toAdd) sentFileIdsRef.current.add(f.id);
              }
            }

            // 2. Reconcile remote elements against local state.
            //    reconcileElements handles version vectors and versionNonce tie-breaking,
            //    exactly matching excalidraw.com's conflict resolution.
            const localElements = api.getSceneElements();
            const localAppState = api.getAppState();
            const reconciled = reconcileElements(
              localElements as unknown as Parameters<typeof reconcileElements>[0],
              decrypted.elements as unknown as Parameters<typeof reconcileElements>[1],
              localAppState as unknown as Parameters<typeof reconcileElements>[2],
            );
            api.updateScene({ elements: reconciled });

          } else if (decrypted.type === "cursor-update") {
            const { clientId, pointer, button, selectedElementIds, username: uname, color } = decrypted;

            const updated = new Map(collaboratorsRef.current);
            const state: CollaboratorState = {
              pointer,
              button,
              selectedElementIds,
              color,
              id: clientId,
              ...(uname ? { username: uname } : {}),
            };
            updated.set(clientId, state);
            collaboratorsRef.current = updated;
            setCollaborators(new Map(updated));

            // Excalidraw renders remote cursors natively when collaborators is set on appState.
            api?.updateScene({ appState: { collaborators: updated } as Parameters<typeof api.updateScene>[0]["appState"] });
          }
          break;
        }
      }
    },
    [broadcastSceneRaw],
  );

  // -------------------------------------------------------------------------
  // WebSocket connection lifecycle
  // -------------------------------------------------------------------------

  const connect = useCallback(
    (roomId: string, key: CryptoKey, keyBase64: string) => {
      // Tear down any existing connection first.
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      encKeyRef.current = key;
      keyBase64Ref.current = keyBase64;
      roomIdRef.current = roomId;
      sentFileIdsRef.current = new Set();
      collaboratorsRef.current = new Map();
      setCollaborators(new Map());
      reconnectAttemptRef.current = 0;

      const host = getPartykitHost();
      const proto = host.startsWith("localhost") ? "ws" : "wss";
      const ws = new WebSocket(`${proto}://${host}/parties/collab/${roomId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        isCollaboratingRef.current = true;
        setIsCollaborating(true);
        setRoomLink(buildRoomLink(roomId, keyBase64));
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        // Auto-reconnect unless stopSession() was called (which nulls encKeyRef).
        if (!encKeyRef.current) return;
        // Exponential backoff: 1s, 2s, 4s, 8s … capped at 30s
        const attempt = reconnectAttemptRef.current++;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
        reconnectTimerRef.current = setTimeout(() => {
          if (encKeyRef.current && roomIdRef.current && keyBase64Ref.current) {
            connect(roomIdRef.current, encKeyRef.current, keyBase64Ref.current);
          }
        }, delay);
      };

      ws.onerror = () => {
        // Errors are expected when the server is down; onclose fires next and schedules reconnect.
      };
    },
    [handleMessage],
  );

  // -------------------------------------------------------------------------
  // Public controls
  // -------------------------------------------------------------------------

  const startSession = useCallback(async () => {
    const roomId = nanoid(20);
    const key = await generateEncryptionKey();
    const keyBase64 = await exportKeyToBase64(key);
    // Write the room credentials into the URL hash so the link is shareable.
    // The hash is never sent to the server by browsers.
    history.pushState(null, "", `${window.location.pathname}${window.location.search}#room=${roomId},${keyBase64}`);
    connect(roomId, key, keyBase64);
  }, [connect]);

  const stopSession = useCallback(() => {
    // Null the key first to prevent the onclose handler from reconnecting.
    encKeyRef.current = null;
    keyBase64Ref.current = null;
    roomIdRef.current = null;
    isCollaboratingRef.current = false;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    collaboratorsRef.current = new Map();
    setCollaborators(new Map());
    setRoomLink(null);
    setIsCollaborating(false);

    // Clear URL hash and remove collaborator cursors from Excalidraw.
    history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    apiRef.current?.updateScene({
      appState: { collaborators: new Map() } as Parameters<typeof apiRef.current.updateScene>[0]["appState"],
    });
  }, []);

  // -------------------------------------------------------------------------
  // Auto-join if URL hash contains room credentials on first render
  // -------------------------------------------------------------------------

  useEffect(() => {
    const parsed = parseRoomHash();
    if (!parsed) return;
    importKeyFromBase64(parsed.keyBase64)
      .then((key) => connect(parsed.roomId, key, parsed.keyBase64))
      .catch((err) => console.error("[Collab] Failed to import key from URL:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      encKeyRef.current = null; // prevent reconnect
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return {
    isCollaborating,
    collaborators,
    roomLink,
    username,
    setUsername,
    startSession,
    stopSession,
    handleSceneChange,
    handlePointerUpdate,
  };
}
