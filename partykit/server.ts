import type * as Party from "partykit/server";
import { encode, decode } from "@msgpack/msgpack";

interface CollaboratorColor {
  background: string;
  stroke: string;
}

interface CollaboratorPointer {
  x: number;
  y: number;
  tool: "pointer" | "laser";
  renderCursor?: boolean;
}

interface CollaboratorPresence {
  id: string;
  username?: string;
  avatarUrl?: string;
  color?: CollaboratorColor;
  pointer?: CollaboratorPointer;
  button?: "up" | "down";
  selectedElementIds?: Record<string, boolean>;
  lastUpdate: number;
}

interface CanvasSnapshot {
  elements: any[];
  appState: Record<string, any>;
  files: Record<string, any>;
  timestamp: number;
}

interface SharedState {
  originalState?: CanvasSnapshot;
  latestState?: CanvasSnapshot;

  // Legacy fields kept for migration compatibility.
  elements?: any[];
  appState?: any;
  files?: any;

  collaborators?: Record<string, CollaboratorPresence>;

  // Metadata
  lastActivity?: number;
  createdAt?: number;
}

// Expiration: 90 days of inactivity
const EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

// Cursor cleanup: remove inactive collaborator pointers.
const CURSOR_TIMEOUT_MS = 10 * 1000;

function decodeIncomingMessage(message: string | ArrayBuffer | ArrayBufferView): any {
  if (message instanceof ArrayBuffer || ArrayBuffer.isView(message)) {
    return decode(message);
  }
  try {
    return decode(new TextEncoder().encode(message));
  } catch {
    try {
      return JSON.parse(message);
    } catch {
      return null;
    }
  }
}

function getSceneFromState(state: SharedState | null): CanvasSnapshot | null {
  if (!state) return null;
  if (state.latestState) return state.latestState;
  if (state.elements || state.appState || state.files) {
    return {
      elements: state.elements || [],
      appState: state.appState || {},
      files: state.files || {},
      timestamp: state.lastActivity || Date.now(),
    };
  }
  return null;
}

function toRemoteCollaborator(collaborator: CollaboratorPresence) {
  return {
    id: collaborator.id,
    username: collaborator.username,
    avatarUrl: collaborator.avatarUrl,
    socketId: collaborator.id,
    pointer: collaborator.pointer,
    button: collaborator.button,
    selectedElementIds: collaborator.selectedElementIds,
    color: collaborator.color,
  };
}

export default class ExcalidrawParty implements Party.Server {
  constructor(readonly room: Party.PartyKitRoom) { }

  // Called when a new WebSocket connection is made
  async onConnect(conn: Party.PartyKitConnection, ctx: Party.PartyKitContext) {
    console.log(`[${this.room.id}] User ${conn.id} connected`);

    const connections = [...this.room.getConnections()];
    console.log(`[${this.room.id}] Active users: ${connections.length}`);

    let state = (await this.room.storage.get<SharedState>("canvasState")) ?? null;

    if (state && state.lastActivity) {
      const inactiveTime = Date.now() - state.lastActivity;
      if (inactiveTime > EXPIRATION_MS) {
        console.log(`[${this.room.id}] Room expired after ${Math.floor(inactiveTime / (24 * 60 * 60 * 1000))} days of inactivity`);

        // Delete expired state
        await this.room.storage.delete("canvasState");
        state = null;

        // Send expiration notification
        conn.send(encode({
          type: "room-expired",
          message: "This room expired after 90 days of inactivity",
          inactiveDays: Math.floor(inactiveTime / (24 * 60 * 60 * 1000))
        }) as any);
      }
    }

    const now = Date.now();

    if (state) {
      state.lastActivity = now;

      if (state.collaborators) {
        for (const userId of Object.keys(state.collaborators)) {
          const collaborator = state.collaborators[userId];
          if (now - collaborator.lastUpdate > CURSOR_TIMEOUT_MS) {
            delete state.collaborators[userId];
          }
        }
      }

      await this.room.storage.put("canvasState", state);
    }

    const scene = getSceneFromState(state);
    const collaborators: Record<string, any> = {};
    if (state?.collaborators) {
      for (const [userId, collaborator] of Object.entries(
        state.collaborators
      ) as [string, CollaboratorPresence][]) {
        collaborators[userId] = toRemoteCollaborator(collaborator);
      }
    }

    const initMessage = {
      type: "init",
      userId: conn.id,
      activeUsers: connections.length,
      scene,
      collaborators,
    };

    conn.send(encode(initMessage) as any);

    this.room.broadcast(
      encode({
        type: "user-joined",
        userId: conn.id,
        activeUsers: connections.length
      }) as any,
      [conn.id]
    );
  }

  // Called when a message is received from any connection
  async onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.PartyKitConnection) {
    const data = decodeIncomingMessage(message) as any;
    if (!data || typeof data !== "object") {
      return;
    }
    const now = Date.now();
    const connections = [...this.room.getConnections()];
    const activeUsers = connections.length;

    if (data.type === "pointer-update" || data.type === "presence-update" || data.type === "cursor-update") {
      const state = (await this.room.storage.get<SharedState>("canvasState")) || ({} as SharedState);
      state.collaborators = state.collaborators || {};

      const existing = state.collaborators[sender.id] || {
        id: sender.id,
        lastUpdate: now,
      };

      const userPayload = data.user || {};
      const pointerPayload =
        data.type === "cursor-update"
          ? { x: data.x, y: data.y, tool: "pointer" as const, renderCursor: true }
          : data.pointer;

      const collaborator: CollaboratorPresence = {
        ...existing,
        id: sender.id,
        username:
          userPayload.name ||
          data.userName ||
          existing.username ||
          `User ${sender.id.slice(0, 6)}`,
        avatarUrl: userPayload.avatarUrl || existing.avatarUrl,
        color: userPayload.color || existing.color,
        pointer: pointerPayload
          ? {
              x: pointerPayload.x,
              y: pointerPayload.y,
              tool: pointerPayload.tool === "laser" ? "laser" : "pointer",
              renderCursor: true,
            }
          : existing.pointer,
        button: data.button || existing.button || "up",
        selectedElementIds: data.selectedElementIds || existing.selectedElementIds || {},
        lastUpdate: now,
      };

      state.collaborators[sender.id] = collaborator;
      state.lastActivity = now;
      state.createdAt = state.createdAt || now;

      this.room.storage.put("canvasState", state);

      this.room.broadcast(
        encode({
          type: "pointer-update",
          userId: sender.id,
          collaborator: toRemoteCollaborator(collaborator),
          activeUsers,
        }) as any,
        [sender.id]
      );
      return;
    }

    if (data.type === "scene-update" || data.type === "canvas-update") {
      const scene = data.scene || {
        elements: data.elements || [],
        appState: data.appState || {},
        files: data.files || {},
      };

      const snapshot: CanvasSnapshot = {
        elements: scene.elements || [],
        appState: scene.appState || {},
        files: scene.files || {},
        timestamp: now,
      };

      const state = (await this.room.storage.get<SharedState>("canvasState")) || ({} as SharedState);

      if (!state.originalState && !state.elements) {
        state.originalState = snapshot;
        console.log(
          `[${this.room.id}] Saved original state (${snapshot.elements?.length || 0} elements)`
        );
      }

      state.latestState = snapshot;
      state.lastActivity = now;
      state.createdAt = state.createdAt || now;
      delete state.elements;
      delete state.appState;
      delete state.files;

      await this.room.storage.put("canvasState", state);

      this.room.broadcast(
        encode({
          type: "scene-update",
          userId: sender.id,
          scene: snapshot,
          sceneVersion: data.sceneVersion || now,
          activeUsers,
        }) as any,
        [sender.id]
      );
      return;
    }
  }

  // Handle HTTP requests (proxy for web embeds)
  async onRequest(req: Party.Request): Promise<Response> {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (req.method === "GET" && targetUrl) {
      try {
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        // Get content type
        const contentType = response.headers.get("content-type") || "";

        // Only process HTML - inject navigation tracking
        if (contentType.includes("text/html")) {
          let body = await response.text();

          // Inject navigation interceptor script (minimal - just for tracking)
          const script = `
            <script>
              (function() {
                const PROXY_BASE = window.location.origin + window.location.pathname;

                // Notify parent window of current URL
                function notifyParent(url) {
                  try {
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({
                        type: 'iframe-navigation',
                        url: url
                      }, '*');
                    }
                  } catch (e) {
                    console.error('Failed to notify parent:', e);
                  }
                }

                // Notify parent of initial URL
                const currentUrl = new URLSearchParams(window.location.search).get('url');
                if (currentUrl) {
                  notifyParent(currentUrl);
                }

                function wrapUrl(targetUrl) {
                  try {
                    const base = currentUrl || '${targetUrl}';
                    return PROXY_BASE + '?url=' + encodeURIComponent(new URL(targetUrl, base).href);
                  } catch (e) { return targetUrl; }
                }

                // Intercept link clicks
                document.addEventListener('click', function(e) {
                  const link = e.target.closest('a');
                  if (link && link.href && !link.href.startsWith('javascript:')) {
                    e.preventDefault();
                    const targetUrl = link.getAttribute('href');
                    const absoluteUrl = new URL(targetUrl, currentUrl || '${targetUrl}').href;
                    notifyParent(absoluteUrl);
                    window.location.href = wrapUrl(targetUrl);
                  }
                }, true);

                // Intercept form submissions
                document.addEventListener('submit', function(e) {
                  e.preventDefault();
                  const form = e.target;
                  const targetUrl = new URL(form.getAttribute('action') || '', currentUrl || '${targetUrl}');

                  if (form.method.toLowerCase() === 'get') {
                    const formData = new FormData(form);
                    for (let [k, v] of formData.entries()) {
                      targetUrl.searchParams.append(k, v);
                    }
                    notifyParent(targetUrl.href);
                    window.location.href = PROXY_BASE + '?url=' + encodeURIComponent(targetUrl.href);
                  }
                }, true);
              })();
            </script>
          `;

          body = body.replace('</head>', `${script}</head>`);

          // Create new headers - remove security restrictions
          const headers = new Headers(response.headers);
          headers.delete("x-frame-options");
          headers.delete("content-security-policy");
          headers.delete("content-security-policy-report-only");
          headers.set("access-control-allow-origin", "*");
          headers.set("access-control-allow-methods", "*");
          headers.set("access-control-allow-headers", "*");

          return new Response(body, {
            status: response.status,
            headers
          });
        }

        // For non-HTML (images, CSS, JS, videos, etc), stream through with CORS headers
        const headers = new Headers(response.headers);
        headers.set("access-control-allow-origin", "*");
        headers.set("access-control-allow-methods", "*");
        headers.set("access-control-allow-headers", "*");

        return new Response(response.body, {
          status: response.status,
          headers
        });

      } catch (e) {
        return new Response("Error fetching url: " + (e as Error).message, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  }

  // Called when a connection closes
  async onClose(conn: Party.PartyKitConnection) {
    console.log(`[${this.room.id}] User ${conn.id} disconnected`);

    const connections = [...this.room.getConnections()];
    const activeUsers = connections.length;

    const currentState = await this.room.storage.get<SharedState>("canvasState");
    if (currentState && currentState.collaborators) {
      delete currentState.collaborators[conn.id];
      currentState.lastActivity = Date.now();
      await this.room.storage.put("canvasState", currentState);
    }

    this.room.broadcast(encode({
      type: "user-left",
      userId: conn.id,
      activeUsers
    }) as any);
  }
  static async onBeforeConnect(request: Party.Request, _lobby: Party.Lobby, _ctx: Party.ExecutionContext) {
    // Optional: Add authentication or rate limiting here
    return request;
  }
}
