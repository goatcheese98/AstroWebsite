/**
 * CanvasPersistenceCoordinator
 * Pure TypeScript class handling canvas auto-save and persistence
 * 
 * Responsibilities:
 * - localStorage read/write
 * - Debounced auto-save
 * - Version checking and migration
 * - Local persistence only (server save handled elsewhere)
 * 
 * Event-driven architecture for React integration
 */

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
  "saved": { to: "localStorage" };
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

  private isQuotaError(err: unknown): boolean {
    return (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }

  /**
   * Level 1 strip: remove only markdown note inline images from customData.
   * Preserves Excalidraw native image files.
   */
  private stripMarkdownImages(canvasData: CanvasData): CanvasData {
    const elements = canvasData.elements.map((el: any) => {
      if (el.customData?.images && Object.keys(el.customData.images).length > 0) {
        return { ...el, customData: { ...el.customData, images: {} } };
      }
      return el;
    });
    return { ...canvasData, elements };
  }

  /**
   * Level 2 strip: remove ALL image data — both markdown customData images and
   * Excalidraw native image files.  Last-resort fallback so at least element
   * structure and text survive. Images reload from cloud on next sync.
   */
  private stripAllImages(canvasData: CanvasData): CanvasData {
    const elements = canvasData.elements.map((el: any) => {
      if (el.customData?.images) {
        return { ...el, customData: { ...el.customData, images: {} } };
      }
      return el;
    });
    return { ...canvasData, elements, files: {} };
  }

  /**
   * Execute immediate save to localStorage with cascading quota-fallback:
   *   1. Full data
   *   2. Strip markdown inline images only
   *   3. Strip all image data (markdown + Excalidraw files)
   * Images are always preserved in cloud (R2) storage and reload on next sync.
   */
  private executeSave(canvasData: CanvasData, canvasId: string | null): void {
    this._isSaving = true;
    this.emitStateChange();

    const persist = (data: CanvasData): void => {
      const dataToSave: SaveData = {
        version: STORAGE_VERSION,
        canvasData: data,
        savedAt: Date.now(),
        canvasId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    };

    const markSaved = (): void => {
      this._lastSaved = new Date();
      this._hasUnsavedChanges = false;
      this._isSaving = false;
      this.emitStateChange();
      this.emit("saved", { to: "localStorage" });
    };

    // Attempt 1: full save
    try {
      persist(canvasData);
      markSaved();
      return;
    } catch (err) {
      if (!this.isQuotaError(err)) {
        this._isSaving = false;
        this.emitStateChange();
        this.emit("error", err instanceof Error ? err : new Error("Save failed"));
        console.error("❌ Failed to save canvas:", err);
        return;
      }
    }

    // Attempt 2: strip markdown inline images
    try {
      persist(this.stripMarkdownImages(canvasData));
      markSaved();
      console.warn("⚠️ localStorage quota: saved without markdown inline images (safe in cloud)");
      return;
    } catch { /* try next level */ }

    // Attempt 3: strip all image data
    try {
      persist(this.stripAllImages(canvasData));
      markSaved();
      console.warn("⚠️ localStorage quota: saved without any images (safe in cloud storage)");
      return;
    } catch { /* fall through to error */ }

    // All attempts failed — storage completely full
    this._isSaving = false;
    this.emitStateChange();
    this.emit("error", new Error("Save failed: localStorage is full. Please clear browser storage or sign in to use cloud saves."));
    console.error("❌ localStorage completely full — canvas structure may be too large");
  }

  /**
   * Force immediate save (bypass debounce)
   */
  forceSave(canvasData: CanvasData, canvasId: string | null): void {
    this.cancelPendingSave();
    this.executeSave(canvasData, canvasId);
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
