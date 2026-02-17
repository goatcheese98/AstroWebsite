/**
 * CollaborationCoordinator
 * Pure TypeScript class handling PartyKit/WebSocket collaboration
 * 
 * Responsibilities:
 * - WebSocket connection management
 * - Message encoding/decoding (msgpack)
 * - Element reconciliation (merge local/remote)
 * - Cursor tracking
 * 
 * Event-driven architecture for React integration
 */

import { encode, decode } from "@msgpack/msgpack";
import type { ExcalidrawAPI, ExcalidrawElement } from "@/stores";

export interface Cursor {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
  lastUpdate: number;
}

export interface CollaborationState {
  isConnected: boolean;
  activeUsers: number;
  cursors: Cursor[];
}

export interface CanvasData {
  elements: any[];
  appState: Record<string, any>;
  files: Record<string, any> | null;
}

interface CollaborationEvents {
  "state-change": CollaborationState;
  "connected": void;
  "disconnected": void;
  error: Error;
}

const SYNC_THROTTLE_MS = 100;
const CURSOR_TIMEOUT_MS = 10000;
const CURSOR_CLEANUP_INTERVAL_MS = 5000;

type EventCallback<T> = (detail: T) => void;

export class CollaborationCoordinator extends EventTarget {
  private socket: WebSocket | null = null;
  private api: ExcalidrawAPI | null = null;
  private lastSyncTime = 0;
  private mySequence = 0;
  private cursorCleanupInterval: number | null = null;

  // State
  private _isConnected = false;
  private _activeUsers = 1;
  private _cursors: Cursor[] = [];

  // Getters for current state
  get isConnected(): boolean {
    return this._isConnected;
  }

  get activeUsers(): number {
    return this._activeUsers;
  }

  get cursors(): Cursor[] {
    return [...this._cursors];
  }

  getState(): CollaborationState {
    return {
      isConnected: this._isConnected,
      activeUsers: this._activeUsers,
      cursors: [...this._cursors],
    };
  }

  // Typed event emitters
  private emit<K extends keyof CollaborationEvents>(
    type: K,
    detail: CollaborationEvents[K]
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  private emitStateChange(): void {
    this.emit("state-change", this.getState());
  }

  /**
   * Connect to PartyKit room
   */
  connect(
    partyKitHost: string,
    shareRoomId: string,
    api: ExcalidrawAPI
  ): void {
    if (this.socket) {
      console.warn("Already connected, disconnect first");
      return;
    }

    this.api = api;

    console.log(`🌐 Connecting to shared room: ${shareRoomId}`);
    const wsUrl = `wss://${partyKitHost}/parties/main/${shareRoomId}`;
    const ws = new WebSocket(wsUrl);
    this.socket = ws;

    ws.onopen = () => {
      console.log("✅ Connected to shared room");
      this._isConnected = true;
      this.startCursorCleanup();
      this.emitStateChange();
      this.emit("connected", undefined);
    };

    ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    ws.onclose = () => {
      console.log("🔌 Disconnected from room");
      this._isConnected = false;
      this.stopCursorCleanup();
      this.emitStateChange();
      this.emit("disconnected", undefined);
      this.socket = null;
      this.api = null;
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
      this.emit("error", new Error("Connection failed"));
    };
  }

  /**
   * Disconnect from PartyKit
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.api = null;
    this._isConnected = false;
    this._activeUsers = 1;
    this._cursors = [];
    this.stopCursorCleanup();
  }

  /**
   * Send canvas update to server (throttled)
   */
  sendCanvasUpdate(canvasData: CanvasData): void {
    if (!this._isConnected || !this.socket) return;

    const now = Date.now();
    if (now - this.lastSyncTime < SYNC_THROTTLE_MS) return;

    this.lastSyncTime = now;
    this.mySequence++;

    const message = {
      type: "canvas-update",
      elements: canvasData.elements,
      appState: canvasData.appState,
      files: canvasData.files,
      seq: this.mySequence,
    };

    try {
      this.socket.send(encode(message));
    } catch (err) {
      console.error("❌ Failed to send update:", err);
    }
  }

  /**
   * Send cursor position update
   */
  sendCursorUpdate(x: number, y: number, color?: string, userName?: string): void {
    if (!this._isConnected || !this.socket) return;

    const message = {
      type: "cursor-update",
      x,
      y,
      color: color || "#6366f1",
      userName: userName || "User",
    };

    try {
      this.socket.send(encode(message));
    } catch (err) {
      console.error("❌ Failed to send cursor:", err);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: ArrayBuffer | Blob): void {
    if (!this.api) return;

    try {
      const message = decode(data as ArrayBuffer) as any;

      switch (message.type) {
        case "init":
          this.handleInit(message);
          break;

        case "canvas-update":
          this.handleRemoteUpdate(message);
          break;

        case "cursor-update":
          this.handleCursorUpdate(message);
          break;

        case "user-joined":
        case "user-left":
          this._activeUsers = message.activeUsers || 1;
          this.emitStateChange();
          break;
      }
    } catch (err) {
      console.error("❌ Failed to process message:", err);
    }
  }

  /**
   * Handle initial state from server
   */
  private handleInit(data: any): void {
    if (data.state?.elements && this.api) {
      this.api.updateScene({ elements: data.state.elements });
    }
    this._activeUsers = data.activeUsers || 1;
    this.emitStateChange();
  }

  /**
   * Handle remote canvas update
   */
  private handleRemoteUpdate(data: any): void {
    if (!this.api) return;

    // Don't apply our own updates
    if (data.seq && data.seq === this.mySequence) return;

    // Merge remote elements with local
    const localElements = this.api.getSceneElements();
    const merged = this.reconcileElements(localElements, data.elements || []);

    this.api.updateScene({ elements: merged });
  }

  /**
   * Handle remote cursor update
   */
  private handleCursorUpdate(data: any): void {
    this._cursors = this._cursors.filter((c) => c.id !== data.userId);
    this._cursors.push({
      id: data.userId,
      x: data.x,
      y: data.y,
      color: data.color || "#6366f1",
      name: data.userName || "User",
      lastUpdate: Date.now(),
    });
    this.emitStateChange();
  }

  /**
   * Start interval to clean up stale cursors
   */
  private startCursorCleanup(): void {
    this.cursorCleanupInterval = window.setInterval(() => {
      const now = Date.now();
      const beforeCount = this._cursors.length;
      this._cursors = this._cursors.filter(
        (c) => now - c.lastUpdate < CURSOR_TIMEOUT_MS
      );
      if (this._cursors.length !== beforeCount) {
        this.emitStateChange();
      }
    }, CURSOR_CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop cursor cleanup interval
   */
  private stopCursorCleanup(): void {
    if (this.cursorCleanupInterval) {
      clearInterval(this.cursorCleanupInterval);
      this.cursorCleanupInterval = null;
    }
  }

  /**
   * Reconcile local and remote elements using CRDT-like approach
   * Higher version wins, if versions equal, higher versionNonce wins
   */
  private reconcileElements(
    local: readonly ExcalidrawElement[],
    remote: readonly ExcalidrawElement[]
  ): ExcalidrawElement[] {
    const elementMap = new Map<string, ExcalidrawElement>();

    local.forEach((el) => elementMap.set(el.id, el));

    remote.forEach((remoteEl) => {
      const localEl = elementMap.get(remoteEl.id);

      if (
        !localEl ||
        (remoteEl.version ?? 0) > (localEl.version ?? 0) ||
        ((remoteEl.version ?? 0) === (localEl.version ?? 0) &&
          (remoteEl.versionNonce ?? 0) > (localEl.versionNonce ?? 0))
      ) {
        elementMap.set(remoteEl.id, remoteEl);
      }
    });

    return Array.from(elementMap.values());
  }
}

// Re-export types for convenience
export type { ExcalidrawElement };
