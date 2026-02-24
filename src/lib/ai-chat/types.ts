/**
 * AI Chat Core Types
 * Pure TypeScript types - no React dependencies
 */

import type { Message } from "@/components/ai-chat/types";

export type AIProvider = "kimi" | "claude";

export type ContextMode = "all" | "selected";

export type ChatMessage = Message;

export interface CanvasState {
  elements: any[];
  appState: {
    scrollX: number;
    scrollY: number;
    zoom: { value: number };
    [key: string]: any;
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
  drawingCommand?: any[];
  sourceCode?: string;
  embedUrl?: string;
}

export interface ChatError {
  message: string;
  code?: string;
  isOverloaded?: boolean;
  suggestedProvider?: AIProvider;
}
