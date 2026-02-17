/**
 * CanvasCommandProcessor - Pure TypeScript canvas operations
 * 
 * Handles:
 * - Canvas state queries
 * - Element operations (draw, update, insert)
 * - Description generation
 * - Selection tracking
 * 
 * No React dependencies
 */

import { useUnifiedCanvasStore } from "@/stores";

export interface CanvasState {
  elements: any[];
  appState: {
    scrollX: number;
    scrollY: number;
    zoom: { value: number };
    selectedElementIds?: Record<string, boolean>;
    [key: string]: any;
  };
}

export interface CanvasElementCounts {
  [type: string]: number;
}

/**
 * Get current canvas state from Excalidraw API
 */
export function getCurrentCanvasState(): CanvasState | null {
  const api = useUnifiedCanvasStore.getState().getExcalidrawAPI();
  if (!api) return null;

  return {
    elements: api.getSceneElements(),
    appState: api.getAppState(),
  };
}

/**
 * Get selected element IDs from canvas
 */
export function getSelectedElementIds(): string[] {
  const api = useUnifiedCanvasStore.getState().getExcalidrawAPI();
  if (!api) return [];

  const appState = api.getAppState();
  return Object.entries(appState.selectedElementIds || {})
    .filter(([_, selected]) => selected)
    .map(([id]) => id);
}

/**
 * Get element counts by type
 */
export function getElementCounts(canvasState: CanvasState | null): CanvasElementCounts {
  if (!canvasState?.elements?.length) {
    return {};
  }

  const counts: CanvasElementCounts = {};
  for (const el of canvasState.elements) {
    counts[el.type] = (counts[el.type] || 0) + 1;
  }

  return counts;
}

/**
 * Generate human-readable description of canvas
 */
export function getCanvasDescription(canvasState: CanvasState | null): string {
  if (!canvasState?.elements?.length) {
    return "The canvas is currently empty.";
  }

  const counts = getElementCounts(canvasState);

  const desc = Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
    .join(", ");

  return `Canvas has ${canvasState.elements.length} elements: ${desc}`;
}

/**
 * Dispatch a draw elements command
 */
export function drawElements(
  elements: any[],
  isModification = false
): boolean {
  try {
    if (!Array.isArray(elements)) {
      console.error("❌ Invalid drawing command: elements must be an array");
      return false;
    }

    if (elements.length === 0) {
      console.warn("⚠️ Empty drawing command - nothing to draw");
      return false;
    }

    useUnifiedCanvasStore
      .getState()
      .dispatchCommand("drawElements", { elements, isModification });
    console.log(`✅ Dispatched draw command: ${elements.length} elements`);
    return true;
  } catch (err) {
    console.error("❌ Failed to execute drawing command:", err);
    return false;
  }
}

/**
 * Dispatch an update elements command
 */
export function updateElements(elements: any[]): boolean {
  try {
    if (!Array.isArray(elements)) {
      console.error("❌ Invalid update command: elements must be an array");
      return false;
    }

    if (elements.length === 0) {
      console.warn("⚠️ Empty update command - nothing to update");
      return false;
    }

    useUnifiedCanvasStore
      .getState()
      .dispatchCommand("updateElements", { elements });
    console.log(`✅ Dispatched update command: ${elements.length} elements`);
    return true;
  } catch (err) {
    console.error("❌ Failed to execute update command:", err);
    return false;
  }
}

/**
 * Dispatch an insert image command
 */
export function insertImage(
  imageData: string,
  width: number,
  height: number,
  type = "png"
): boolean {
  try {
    useUnifiedCanvasStore
      .getState()
      .dispatchCommand("insertImage", { imageData, type, width, height });
    console.log(`✅ Dispatched insert-image: ${width}x${height}`);
    return true;
  } catch (err) {
    console.error("❌ Failed to insert image:", err);
    return false;
  }
}

/**
 * Dispatch an insert SVG command
 */
export function insertSvg(svgPath: string, svgId: string): boolean {
  try {
    useUnifiedCanvasStore
      .getState()
      .dispatchCommand("insertSvg", { svgPath, svgId });
    console.log(`✅ Dispatched insert-svg: ${svgId}`);
    return true;
  } catch (err) {
    console.error("❌ Failed to insert SVG:", err);
    return false;
  }
}

/**
 * CanvasCommandProcessor class for stateful operations
 */
export class CanvasCommandProcessor {
  private state: CanvasState | null = null;
  private listeners: Set<(state: CanvasState) => void> = new Set();

  /**
   * Get current canvas state
   */
  getState(): CanvasState | null {
    return this.state;
  }

  /**
   * Set canvas state directly
   */
  setState(state: CanvasState | null): void {
    this.state = state;
    if (state) {
      this.listeners.forEach((listener) => listener(state));
    }
  }

  /**
   * Refresh state from Excalidraw API
   */
  refreshState(): CanvasState | null {
    const state = getCurrentCanvasState();
    this.setState(state);
    return state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: CanvasState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get description of current canvas
   */
  getDescription(): string {
    return getCanvasDescription(this.state);
  }

  /**
   * Get selected element IDs
   */
  getSelectedIds(): string[] {
    return getSelectedElementIds();
  }

  /**
   * Draw elements on canvas
   */
  draw(elements: any[], isModification = false): boolean {
    const success = drawElements(elements, isModification);
    if (success) {
      this.refreshState();
    }
    return success;
  }

  /**
   * Update existing elements
   */
  update(elements: any[]): boolean {
    const success = updateElements(elements);
    if (success) {
      this.refreshState();
    }
    return success;
  }

  /**
   * Insert an image
   */
  insertImage(
    imageData: string,
    width: number,
    height: number,
    type?: string
  ): boolean {
    const success = insertImage(imageData, width, height, type);
    if (success) {
      this.refreshState();
    }
    return success;
  }
}

/**
 * Factory function to create a processor
 */
export function createCanvasCommandProcessor(): CanvasCommandProcessor {
  return new CanvasCommandProcessor();
}
