/**
 * Excalidraw Context - REMOVED
 * 
 * This module has been removed. The unified store now holds the Excalidraw API reference.
 * 
 * Before:
 *   import { 
 *     ExcalidrawProvider,
 *     useExcalidrawAPI, 
 *     useExcalidrawAPISafe,
 *     useSetExcalidrawAPI 
 *   } from '@/context';
 *   <ExcalidrawProvider>...</ExcalidrawProvider>
 * 
 * After:
 *   import { 
 *     useExcalidrawAPI,
 *     useExcalidrawAPISafe,
 *     useSetExcalidrawAPI 
 *   } from '@/stores';
 *   // No Provider needed!
 */

// All exports now come from the unified store
export { 
  useExcalidrawAPI,
  useExcalidrawAPISafe,
  useExcalidrawReady,
  useSetExcalidrawAPI,
} from '@/stores/unifiedCanvasStore';

export type { 
  ExcalidrawAPI, 
  ExcalidrawElement, 
  ExcalidrawAppState 
} from '@/stores/unifiedCanvasStore';

// Stub for backward compatibility - no longer needed but won't break
export const ExcalidrawProvider = ({ children }: { children: React.ReactNode }) => children;
