/**
 * CanvasPersistenceCoordinator
 * Pure TypeScript class handling canvas auto-save and persistence
 * 
 * Responsibilities:
 * - localStorage read/write
 * - Debounced auto-save
 * - Version checking and migration
 * - Server save (when implemented)
 * 
 * Event-driven architecture for React integration
 */

import type { ExcalidrawAPI } from "@/stores/unifiedCanvasStore";

export interface CanvasData {
  elements: any[];
  appState: Record<string, any>;
  files: Record<string, any> | null;
}

export interface PersistenceState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

interface PersistenceEvents {
  "state-change": PersistenceState;
  "saved": { to: "localStorage" | "server" };
  "loaded": { from: "localStorage" };
  error: Error;
}

interface SaveData {
  version: number;
  canvasData: CanvasData;
  savedAt: number;
  canvasId: string | null;
}

const STORAGE_KEY = "excalidraw-canvas-data";
const STORAGE_VERSION = 2;
const SAVE_DEBOUNCE_MS = 1000;

export class CanvasPersistenceCoordinator extends EventTarget {
  private saveTimeout: number | null = null;
  private _lastSaved: Date | null = null;
  private _isSaving = false;
  private _hasUnsavedChanges = false;

  // Getters
  get isSaving(): boolean {
    return this._isSaving;
  }

  get lastSaved(): Date | null {
    return this._lastSaved;
  }

  get hasUnsavedChanges(): boolean {
    return this._hasUnsavedChanges;
  }

  getState(): PersistenceState {
    return {
      isSaving: this._isSaving,
      lastSaved: this._lastSaved,
      hasUnsavedChanges: this._hasUnsavedChanges,
    };
  }

  // Typed event emitters
  private emit<K extends keyof PersistenceEvents>(
    type: K,
    detail: PersistenceEvents[K]
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  private emitStateChange(): void {
    this.emit("state-change", this.getState());
  }

  /**
   * Load canvas from localStorage
   * Returns null if no saved data or version mismatch
   */
  loadFromStorage(): CanvasData | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const data: SaveData = JSON.parse(saved);
      
      if (data.version !== STORAGE_VERSION) {
        console.warn("⚠️ Canvas version mismatch, clearing");
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      if (!data.canvasData) {
        return null;
      }

      console.log("📂 Loaded canvas from localStorage");
      this.emit("loaded", { from: "localStorage" });
      return data.canvasData;
    } catch (err) {
      console.error("❌ Failed to load canvas:", err);
      localStorage.removeItem(STORAGE_KEY);
      this.emit("error", err instanceof Error ? err : new Error("Failed to load"));
      return null;
    }
  }

  /**
   * Schedule a debounced save to localStorage
   * Call this whenever canvas data changes
   */
  scheduleSave(canvasData: CanvasData, canvasId: string | null): void {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Mark as having unsaved changes
    this._hasUnsavedChanges = true;
    this.emitStateChange();

    // Schedule new save
    this.saveTimeout = window.setTimeout(() => {
      this.executeSave(canvasData, canvasId);
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Cancel any pending save
   */
  cancelPendingSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Execute immediate save to localStorage
   */
  private executeSave(canvasData: CanvasData, canvasId: string | null): void {
    this._isSaving = true;
    this.emitStateChange();

    try {
      const dataToSave: SaveData = {
        version: STORAGE_VERSION,
        canvasData,
        savedAt: Date.now(),
        canvasId,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      
      this._lastSaved = new Date();
      this._hasUnsavedChanges = false;
      this._isSaving = false;
      
      this.emitStateChange();
      this.emit("saved", { to: "localStorage" });
    } catch (err) {
      this._isSaving = false;
      this.emitStateChange();
      this.emit("error", err instanceof Error ? err : new Error("Save failed"));
      console.error("❌ Failed to save canvas:", err);
    }
  }

  /**
   * Force immediate save (bypass debounce)
   */
  forceSave(canvasData: CanvasData, canvasId: string | null): void {
    this.cancelPendingSave();
    this.executeSave(canvasData, canvasId);
  }

  /**
   * Save to server (placeholder for future implementation)
   */
  async saveToServer(
    api: ExcalidrawAPI,
    canvasId: string | null
  ): Promise<{ success: boolean; id: string }> {
    this._isSaving = true;
    this.emitStateChange();

    try {
      const data = {
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
      };

      // TODO: Implement actual server save
      console.log("💾 Saving to server:", data);

      this._lastSaved = new Date();
      this._hasUnsavedChanges = false;
      this._isSaving = false;

      this.emitStateChange();
      this.emit("saved", { to: "server" });

      return { success: true, id: canvasId || "local" };
    } catch (err) {
      this._isSaving = false;
      this.emitStateChange();
      this.emit("error", err instanceof Error ? err : new Error("Server save failed"));
      throw err;
    }
  }

  /**
   * Clear saved canvas from storage
   */
  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._lastSaved = null;
    this._hasUnsavedChanges = false;
    this.emitStateChange();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cancelPendingSave();
  }
}
