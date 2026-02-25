/**
 * Central exports for store hooks, async helpers, and store types.
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
// Compatibility Alias
// ============================================================================

import { useStore } from './store';

export const useUnifiedCanvasStore = useStore;
