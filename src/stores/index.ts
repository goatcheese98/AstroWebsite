/**
 * Stores Index - Unified State Management
 * 
 * All canvas state is now managed through the unified store.
 * 
 * Usage:
 *   import { useUnifiedCanvasStore, useExcalidrawAPI } from '@/stores';
 *   
 *   const store = useUnifiedCanvasStore();
 *   const api = useExcalidrawAPI();
 * 
 * The unified store replaces:
 *   - canvasStore.ts (consolidated)
 *   - eventBus.ts (replaced with direct actions)
 *   - ExcalidrawContext.tsx (API now in store)
 */

// === Unified Store (Single Source of Truth) ===
export { 
  useUnifiedCanvasStore,
  useExcalidrawAPI,
  useExcalidrawAPISafe,
  useExcalidrawReady,
  useSetExcalidrawAPI,
  useCanvasCommand,
} from './unifiedCanvasStore';

export type { 
  UnifiedCanvasStore,
  AIProvider,
  ContextMode,
  Toast,
  CanvasData,
  ExcalidrawAPI,
  ExcalidrawElement,
  ExcalidrawAppState,
  CanvasCommand,
} from './unifiedCanvasStore';

// === Backward Compatibility Aliases ===
/** @deprecated Use useUnifiedCanvasStore instead */
export const useCanvasStore = useUnifiedCanvasStore;
