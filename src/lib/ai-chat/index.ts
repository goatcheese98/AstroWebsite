/**
 * AI Chat Core Library
 * Pure TypeScript - no React dependencies
 * 
 * This module contains all business logic for AI chat,
 * extracted from React hooks for better testability and reusability.
 */

// Chat coordination
export { ChatCoordinator, createChatCoordinator } from "./ChatCoordinator";
export type { ChatCoordinatorOptions } from "./ChatCoordinator";

// Image generation
export {
  generateImage,
  copyImageToClipboard,
  buildGenerationPrompt,
  getGenerationModel,
  processGeneratedImage,
  validateGenerationResponse,
} from "./ImageGenerationCoordinator";
export type {
  ImageGenerationResult,
  ImageGenerationError,
  ImageGenerationCallbacks,
} from "./ImageGenerationCoordinator";

// Canvas commands
export {
  CanvasCommandProcessor,
  createCanvasCommandProcessor,
  getCurrentCanvasState,
  getSelectedElementIds,
  getElementCounts,
  getCanvasDescription,
  drawElements,
  updateElements,
  insertImage,
  insertSvg,
} from "./CanvasCommandProcessor";
export type {
  CanvasState,
  CanvasElementCounts,
} from "./CanvasCommandProcessor";

// Core types
export type {
  AIProvider,
  ContextMode,
  ChatMessage,
  CanvasState as ChatCanvasState,
  SendMessageRequest,
  ParsedResponse,
  ChatError,
} from "./types";
