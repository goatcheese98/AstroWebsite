/**
 * Stores Index - New Architecture
 * 
 * This is the new unified store architecture that replaces:
 * - unifiedCanvasStore.ts (old monolithic store)
 * - eventBus/eventEmitter (replaced with commands and async functions)
 * - ExcalidrawContext (replaced with store slices)
 * 
 * Migration Guide:
 *   Before: import { useUnifiedCanvasStore } from '@/stores';
 *   After:  import { useStore, useCanvas, usePanels } from '@/stores';
 * 
 *   Before: canvasEvents.emit('excalidraw:insert-image', data);
 *   After:  const { insertImage } = useCanvasCommands();
 *           await insertImage(data.imageData, data.width, data.height);
 * 
 *   Before: canvasEvents.on('excalidraw:screenshot-captured', cb);
 *   After:  const { capture } = useScreenshotCapture();
 *           const result = await capture({ quality: 'high' });
 */

// ============================================================================
// Main Store
// ============================================================================

export { useStore } from './store';

// ============================================================================
// Selector Hooks
// ============================================================================

export {
  useExcalidrawAPI,
  useExcalidrawReady,
  useSetExcalidrawAPI,
  useExcalidrawAPISafe,
  useCanvasData,
  useCanvasDirty,
  useCanvasCommand,
  useToasts,
  useChat,
  usePanels,
  useAsyncOperation,
} from './store';

// ============================================================================
// Custom Hooks
// ============================================================================

export { 
  useScreenshotCapture, 
  useCanvasCommands,
  useCommandSubscriber,
  useCommandExecutor,
} from './hooks';

// ============================================================================
// Async Helpers
// ============================================================================

export {
  captureScreenshot,
  captureForChat,
  captureForGeneration,
  captureForPreview,
} from './async/screenshot';

// ============================================================================
// Types
// ============================================================================

export type {
  StoreState,
  CanvasSlice,
  UISlice,
  ChatSlice,
  CommandSlice,
  AsyncSlice,
  // Base types
  AIProvider,
  ContextMode,
  Toast,
  // Canvas types
  ExcalidrawElement,
  ExcalidrawAppState,
  ExcalidrawAPI,
  CanvasData,
  // Chat types
  Message,
  MessageContent,
  // Command types
  CommandType,
  CommandPayload,
  PendingCommand,
  // Async types
  AsyncOperation,
  AsyncOperationStatus,
} from './types';

// ============================================================================
// Backward Compatibility (deprecated)
// ============================================================================

import { useStore } from './store';

/**
 * @deprecated Use useStore or specific selector hooks instead
 * This is kept for backward compatibility during migration
 */
export const useUnifiedCanvasStore = useStore;

/**
 * @deprecated Use useStore instead
 * Alias for backward compatibility
 */
export const useCanvasStore = useStore;
