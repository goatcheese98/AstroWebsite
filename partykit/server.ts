import type * as Party from "partykit/server";
import { encode, decode } from "@msgpack/msgpack";

interface SharedState {
  elements: any[];           // Excalidraw elements
  appState: any;            // Excalidraw app state
  files: any;               // Excalidraw files (images)
  markdownNotes: any[];     // Custom markdown notes
  imageHistory: any[];      // Gemini generated images
  lastActivity?: number;    // Timestamp of last activity (for expiration)
  createdAt?: number;       // Timestamp of room creation
}

// Expiration: 90 days of inactivity
const EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

export default class ExcalidrawParty implements Party.PartyKitServer {
  constructor(readonly room: Party.PartyKitRoom) { }

  // Called when a new WebSocket connection is made
  async onConnect(conn: Party.PartyKitConnection, ctx: Party.PartyKitContext) {
    console.log(`[${this.room.id}] User ${conn.id} connected`);

    // Get active connection count
    const connections = [...this.room.getConnections()];
    console.log(`[${this.room.id}] Active users: ${connections.length}`);

    // Send current room state to new user
    let state = await this.room.storage.get<SharedState>("canvasState");

    // Check if room has expired (90 days of inactivity)
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

    // Update last activity on connect
    if (state) {
      state.lastActivity = Date.now();
      await this.room.storage.put("canvasState", state);
    }

    const initMessage = {
      type: "init",
      state: state || null,
      activeUsers: state ? connections.length : 1
    };

    // Send as MessagePack binary
    conn.send(encode(initMessage) as any);

    // Broadcast user joined event
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
  async onMessage(message: string | ArrayBuffer, sender: Party.PartyKitConnection) {
    // Decode MessagePack binary
    const data = decode(message instanceof ArrayBuffer ? message : new Uint8Array(Buffer.from(message))) as any;

    // Broadcast to all other connections (already encoded)
    this.room.broadcast(message, [sender.id]);

    const now = Date.now();

    // Save latest state based on update type
    if (data.type === "canvas-update") {
      // Excalidraw elements, appState, files
      const currentState = await this.room.storage.get<SharedState>("canvasState") || {} as SharedState;
      await this.room.storage.put("canvasState", {
        ...currentState,
        elements: data.elements,
        appState: data.appState,
        files: data.files,
        lastActivity: now,
        createdAt: currentState.createdAt || now,
      });
    }
    else if (data.type === "markdown-update") {
      // Markdown notes
      const currentState = await this.room.storage.get<SharedState>("canvasState") || {} as SharedState;
      await this.room.storage.put("canvasState", {
        ...currentState,
        markdownNotes: data.markdownNotes,
        lastActivity: now,
        createdAt: currentState.createdAt || now,
      });
    }
    else if (data.type === "image-update") {
      // Image generation history
      const currentState = await this.room.storage.get<SharedState>("canvasState") || {} as SharedState;
      await this.room.storage.put("canvasState", {
        ...currentState,
        imageHistory: data.imageHistory,
        lastActivity: now,
        createdAt: currentState.createdAt || now,
      });
    }
  }

  // Handle HTTP requests (proxy for web embeds)
  async onRequest(req: Party.PartyKitRequest): Promise<Response> {
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
  onClose(conn: Party.PartyKitConnection) {
    console.log(`[${this.room.id}] User ${conn.id} disconnected`);

    const connections = [...this.room.getConnections()];

    // Broadcast user left event
    this.room.broadcast(encode({
      type: "user-left",
      userId: conn.id,
      activeUsers: connections.length
    }) as any);
  }
}

ExcalidrawParty.onBeforeConnect = async (request, lobby) => {
  // Optional: Add authentication or rate limiting here
  return request;
};
