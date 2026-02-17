/**
 * AI Chat Core Types
 * Pure TypeScript types - no React dependencies
 */

export type AIProvider = "kimi" | "claude";

export type ContextMode = "all" | "selected";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; url: string }
    | { type: "code"; code: string; language: string }
  >;
  metadata: {
    timestamp: Date;
    model?: string;
    provider?: AIProvider;
    canvasContext?: {
      elementCount: number;
      selectedElementIds: string[];
      viewport: {
        scrollX: number;
        scrollY: number;
        zoom: number;
      };
    };
  };
  reactions: Array<{
    emoji: string;
    userId: string;
    timestamp: Date;
  }>;
  status: "sending" | "sent" | "error" | "editing";
  drawingCommand?: any[];
  sourceCode?: string;
}

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
