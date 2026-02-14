/**
 * Canvas Components - Consolidated Architecture
 * 
 * This module provides a unified, simplified canvas experience:
 * - Single entry point: CanvasContainer
 * - No duplicate components
 * - No eventBus (direct store communication)
 * - No Provider wrapper needed
 * 
 * Migration from old components:
 * - CanvasRoot + ExcalidrawCanvas + CanvasApp → CanvasContainer
 * - Manual state management → Unified Zustand store
 * - eventBus events → Direct store actions
 */

// Main container component
export { default as CanvasContainer } from './CanvasContainer';
export { default as CanvasCore } from './CanvasCore';
export { default as CanvasUI } from './CanvasUI';
export { default as CanvasCollaborationLayer } from './CanvasCollaborationLayer';
export { default as CanvasNotesLayer } from './CanvasNotesLayer';

// Hooks for advanced use cases
export { useExcalidrawLoader } from './hooks/useExcalidrawLoader';
export { useCanvasPersistence } from './hooks/useCanvasPersistence';
export { useCanvasCollaboration } from './hooks/useCanvasCollaboration';
