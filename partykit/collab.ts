/**
 * Collab Party — real-time collaboration room for Excalidraw canvases.
 *
 * Mirrors the excalidraw-room Socket.IO protocol over WebSockets:
 *   - init-room       : sent to new connection on connect
 *   - first-in-room   : sent when the room has no other participants and no stored state
 *   - new-user        : broadcast to existing users when a new user joins
 *   - room-user-change: broadcast to all when membership changes
 *   - client-broadcast: relay of an encrypted scene/cursor payload
 *
 * The server never decrypts payloads — all content is E2E encrypted by clients.
 */

import type * as Party from "partykit/server";

// --------------------------------------------------------------------------
// Wire types (un-encrypted envelope only)
// --------------------------------------------------------------------------

type ClientToServer =
  | { type: "server-broadcast"; payload: number[]; iv: number[] }
  | { type: "server-volatile-broadcast"; payload: number[]; iv: number[] };

type ServerToClient =
  | { type: "init-room" }
  | { type: "first-in-room" }
  | { type: "new-user"; socketId: string }
  | { type: "room-user-change"; socketIds: string[] }
  | { type: "client-broadcast"; payload: number[]; iv: number[] };

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function send(conn: Party.Connection, msg: ServerToClient) {
  conn.send(JSON.stringify(msg));
}

function broadcast(room: Party.Room, msg: ServerToClient, except?: string[]) {
  room.broadcast(JSON.stringify(msg), except);
}

// --------------------------------------------------------------------------
// Server
// --------------------------------------------------------------------------

export default class CollabRoom implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    const allConns = Array.from(this.room.getConnections());
    const others = allConns.filter((c) => c.id !== conn.id);

    // Always acknowledge the connection first.
    send(conn, { type: "init-room" });

    if (others.length === 0) {
      // This user may be the first in the room, or rejoining an empty room
      // that still has persisted state from a previous session.
      const stored = await this.room.storage.get<{ payload: number[]; iv: number[] }>("scene");
      if (stored) {
        send(conn, { type: "client-broadcast", ...stored });
      } else {
        send(conn, { type: "first-in-room" });
      }
    } else {
      // Notify existing users so they send the newcomer the current scene.
      for (const other of others) {
        send(other, { type: "new-user", socketId: conn.id });
      }
    }

    // Broadcast updated membership list to everyone, including the new conn.
    const socketIds = allConns.map((c) => c.id);
    broadcast(this.room, { type: "room-user-change", socketIds });
  }

  async onMessage(message: string, sender: Party.Connection) {
    let data: ClientToServer;
    try {
      data = JSON.parse(message) as ClientToServer;
    } catch {
      return;
    }

    if (data.type === "server-broadcast") {
      // Persist the latest encrypted scene so late-joiners can catch up.
      await this.room.storage.put("scene", { payload: data.payload, iv: data.iv });
      broadcast(this.room, { type: "client-broadcast", payload: data.payload, iv: data.iv }, [sender.id]);
    } else if (data.type === "server-volatile-broadcast") {
      // Cursor / pointer updates — relay without persisting.
      broadcast(this.room, { type: "client-broadcast", payload: data.payload, iv: data.iv }, [sender.id]);
    }
  }

  onClose(conn: Party.Connection) {
    const remaining = Array.from(this.room.getConnections())
      .filter((c) => c.id !== conn.id)
      .map((c) => c.id);
    broadcast(this.room, { type: "room-user-change", socketIds: remaining });
  }
}
