/**
 * Canvas Slice
 * 
 * Manages Excalidraw canvas state:
 * - Elements and their properties
 * - App state (viewport, selection, etc.)
 * - Excalidraw API reference
 * - Canvas metadata (id, title, dirty state)
 */

import type { StateCreator } from 'zustand';
import type { 
  CanvasSlice, 
  CanvasData, 
  ExcalidrawElement, 
  ExcalidrawAPI 
} from '../types';

// Default initial state
const defaultAppState = {
  scrollX: 0,
  scrollY: 0,
  zoom: { value: 1 },
  selectedElementIds: {},
  viewBackgroundColor: '#ffffff',
};

export const createCanvasSlice: StateCreator<
  CanvasSlice,
  [],
  [],
  CanvasSlice
> = (set, get) => ({
  // === State ===
  canvasData: null,
  elements: [],
  appState: { ...defaultAppState },
  files: null,
  excalidrawAPI: null,
  isExcalidrawReady: false,
  canvasId: null,
  canvasTitle: 'Untitled Canvas',
  isDirty: false,
  lastSaved: null,

  // === Actions ===
  setCanvasData: (data: CanvasData | null) => {
    if (!data) {
      set({
        canvasData: null,
        elements: [],
        appState: { ...defaultAppState },
        files: null,
        isDirty: false,
      });
      return;
    }

    set({
      canvasData: data,
      elements: data.elements || [],
      appState: { ...get().appState, ...data.appState },
      files: data.files || null,
      isDirty: true,
    });
  },

  setElements: (elements: ExcalidrawElement[]) => {
    set((state) => ({
      elements,
      canvasData: {
        elements,
        appState: state.appState,
        files: state.files,
      },
      isDirty: true,
    }));
  },

  setAppState: (appState) => {
    set((state) => ({
      appState: { ...state.appState, ...appState },
      canvasData: {
        elements: state.elements,
        appState: { ...state.appState, ...appState },
        files: state.files,
      },
    }));
  },

  loadCanvasState: (state) => {
    const canvas = (state as { canvas?: CanvasData })?.canvas || (state as CanvasData);
    if (!canvas || !Array.isArray(canvas.elements)) return;

    set({
      canvasData: canvas,
      elements: canvas.elements || [],
      appState: { ...defaultAppState, ...(canvas.appState || {}) },
      files: canvas.files || null,
      isDirty: false,
    });
  },

  setExcalidrawAPI: (api: ExcalidrawAPI | null) => {
    set({
      excalidrawAPI: api,
      isExcalidrawReady: api !== null,
    });
  },

  setCanvasId: (id: string | null) => {
    set({ canvasId: id });
  },

  setCanvasTitle: (title: string) => {
    set({ canvasTitle: title });
  },

  setDirty: (dirty: boolean) => {
    set({ isDirty: dirty });
  },

  setLastSaved: (date: Date | null) => {
    set({ lastSaved: date });
  },

  resetCanvas: () => {
    set({
      canvasData: null,
      elements: [],
      appState: { ...defaultAppState },
      files: null,
      isDirty: false,
      canvasId: null,
      canvasTitle: 'Untitled Canvas',
    });
  },

  // === Selectors (these are synchronous getters) ===
  getSceneElements: () => {
    const api = get().excalidrawAPI;
    if (api) {
      return api.getSceneElements();
    }
    return get().elements;
  },

  getAppState: () => {
    const api = get().excalidrawAPI;
    if (api) {
      return api.getAppState();
    }
    return get().appState;
  },

  getSelectedElementIds: () => {
    const appState = get().getAppState();
    return Object.entries(appState.selectedElementIds || {})
      .filter(([_, selected]) => selected)
      .map(([id]) => id);
  },

  getSelectedElements: () => {
    const selectedIds = new Set(get().getSelectedElementIds());
    return get().getSceneElements().filter((el) => selectedIds.has(el.id));
  },

  getExcalidrawAPI: () => {
    return get().excalidrawAPI;
  },
});
