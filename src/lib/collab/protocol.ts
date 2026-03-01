/**
 * Wire protocol types and shared constants for Excalidraw collaboration.
 */

// --------------------------------------------------------------------------
// Encrypted payload types  (inside every client-broadcast message)
// --------------------------------------------------------------------------

export interface SceneUpdatePayload {
  type: "scene-update";
  elements: RemoteElement[];
  /** New files not yet seen by the room — deduped by each sender. */
  files?: Record<string, CollabFile>;
}

export interface CursorUpdatePayload {
  type: "cursor-update";
  /** Client-generated stable ID for this participant. */
  clientId: string;
  pointer: { x: number; y: number };
  button: "down" | "up";
  selectedElementIds: Record<string, boolean>;
  username?: string;
  color: CollaboratorColor;
}

export type BroadcastPayload = SceneUpdatePayload | CursorUpdatePayload;

// --------------------------------------------------------------------------
// Sub-types
// --------------------------------------------------------------------------

/** Minimal element shape expected from remote. Includes version info for reconciliation. */
export interface RemoteElement {
  id: string;
  version: number;
  versionNonce: number;
  isDeleted?: boolean;
  [key: string]: unknown;
}

export interface CollabFile {
  id: string;
  mimeType: string;
  dataURL: string;
  created: number;
}

export interface CollaboratorColor {
  background: string;
  stroke: string;
}

export interface CollaboratorState {
  pointer?: { x: number; y: number };
  button?: "down" | "up";
  selectedElementIds?: Record<string, boolean>;
  username?: string;
  color?: CollaboratorColor;
  avatarUrl?: string;
  id?: string;
}

// --------------------------------------------------------------------------
// Wire message types (un-encrypted envelope)
// --------------------------------------------------------------------------

export type ServerToClient =
  | { type: "init-room" }
  | { type: "first-in-room" }
  | { type: "new-user"; socketId: string }
  | { type: "room-user-change"; socketIds: string[] }
  | { type: "client-broadcast"; payload: string; iv: string };

export type ClientToServer =
  | { type: "server-broadcast"; payload: string; iv: string }
  | { type: "server-volatile-broadcast"; payload: string; iv: string }
  | { type: "resync-request" };

// --------------------------------------------------------------------------
// Collaborator colours (matches excalidraw.com)
// --------------------------------------------------------------------------

const COLORS: CollaboratorColor[] = [
  { background: "#ffa8a8", stroke: "#c92a2a" },
  { background: "#ffd8a8", stroke: "#e67700" },
  { background: "#fff3bf", stroke: "#e67700" },
  { background: "#d3f9d8", stroke: "#2b8a3e" },
  { background: "#74c0fc", stroke: "#1864ab" },
  { background: "#e599f7", stroke: "#862e9c" },
  { background: "#b197fc", stroke: "#5f3dc4" },
  { background: "#63e6be", stroke: "#087f5b" },
];

export function getCollaboratorColor(id: string): CollaboratorColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function getCollaboratorColorByIndex(index: number): CollaboratorColor {
  return COLORS[Math.abs(index) % COLORS.length];
}

export function getCollaboratorColorCount(): number {
  return COLORS.length;
}
