/**
 * AI Chat Core Types
 * Pure TypeScript types - no React dependencies
 */

import type { Message } from "@/components/ai-chat/types";
import type { ExcalidrawAppState, ExcalidrawElement } from "@/stores";

export type AIProvider = "claude";

export type ContextMode = "all" | "selected";

export type ChatMessage = Message;

export interface CanvasState {
  elements: ExcalidrawElement[];
  appState: Partial<ExcalidrawAppState> & {
    scrollX: number;
    scrollY: number;
    zoom: { value: number };
  };
}

export interface SendMessageRequest {
  content: string;
  screenshotData?: string | null;
  selectedElements?: string[];
  canvasState: CanvasState | null;
  contextMode: ContextMode;
  provider: AIProvider;
  history: ChatMessage[];
  getSelectionContext?: () => string;
}

export interface ParsedResponse {
  displayMessage: string;
  drawingCommand?: ExcalidrawElement[];
  sourceCode?: string;
  embedUrl?: string;
}

export interface ChatError {
  message: string;
  code?: string;
  isOverloaded?: boolean;
  suggestedProvider?: AIProvider;
}
