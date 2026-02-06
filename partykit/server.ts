import type * as Party from "partykit/server";
import { encode, decode } from "@msgpack/msgpack";

interface SharedState {
  elements: any[];           // Excalidraw elements
  appState: any;            // Excalidraw app state
  files: any;               // Excalidraw files (images)
  markdownNotes: any[];     // Custom markdown notes
  imageHistory: any[];      // Gemini generated images
}

export default class ExcalidrawParty implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Called when a new WebSocket connection is made
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`[${this.room.id}] User ${conn.id} connected`);

    // Get active connection count
    const connections = [...this.room.getConnections()];
    console.log(`[${this.room.id}] Active users: ${connections.length}`);

    // Send current room state to new user
    const state = await this.room.storage.get<SharedState>("canvasState");
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
  async onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
    // Decode MessagePack binary
    const data = decode(message instanceof ArrayBuffer ? message : new Uint8Array(Buffer.from(message))) as any;

    // Broadcast to all other connections (already encoded)
    this.room.broadcast(message, [sender.id]);

    // Save latest state based on update type
    if (data.type === "canvas-update") {
      // Excalidraw elements, appState, files
      const currentState = await this.room.storage.get<SharedState>("canvasState") || {} as SharedState;
      await this.room.storage.put("canvasState", {
        ...currentState,
        elements: data.elements,
        appState: data.appState,
        files: data.files,
      });
    }
    else if (data.type === "markdown-update") {
      // Markdown notes
      const currentState = await this.room.storage.get<SharedState>("canvasState") || {} as SharedState;
      await this.room.storage.put("canvasState", {
        ...currentState,
        markdownNotes: data.markdownNotes,
      });
    }
    else if (data.type === "image-update") {
      // Image generation history
      const currentState = await this.room.storage.get<SharedState>("canvasState") || {} as SharedState;
      await this.room.storage.put("canvasState", {
        ...currentState,
        imageHistory: data.imageHistory,
      });
    }
  }

  // Called when a connection closes
  onClose(conn: Party.Connection) {
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
