export type AssistantRole = "user" | "assistant" | "system";

export type AssistantMode = "chat" | "mermaid" | "d2" | "image" | "sketch";
export type AssistantExpert = "general" | "mermaid" | "d2" | "visual" | "kanban";

export type VisualColorMode = "color" | "bw";

export interface VisualGenerationOptions {
  colorMode: VisualColorMode;
}

export type SketchStyle = "clean" | "hand-drawn" | "technical" | "organic";
export type SketchComplexity = "low" | "medium" | "high";

export interface SketchControls {
  style: SketchStyle;
  complexity: SketchComplexity;
  colorPalette: number;
  detailLevel: number;
  edgeSensitivity: number;
}

export interface AssistantGenerationConfig {
  expert?: AssistantExpert;
  mode?: AssistantMode;
  sourceImageDataUrl?: string;
  visual?: VisualGenerationOptions;
  sketch?: SketchControls;
}

export type KanbanOperation =
  | { op: 'add_card'; columnId: string; card: Record<string, unknown> }
  | { op: 'update_card'; cardId: string; changes: Record<string, unknown> }
  | { op: 'delete_card'; cardId: string }
  | { op: 'move_card'; cardId: string; toColumnId: string; toIndex?: number }
  | { op: 'add_column'; column: Record<string, unknown> }
  | { op: 'update_column'; columnId: string; changes: Record<string, unknown> }
  | { op: 'delete_column'; columnId: string }
  | { op: 'reorder_cards'; columnId: string; cardIds: string[] };

export type AssistantArtifact =
  | {
      type: "code";
      language: "mermaid" | "d2";
      code: string;
    }
  | {
      type: "image-data";
      mimeType: string;
      dataUrl: string;
      width: number;
      height: number;
      source: "image" | "sketch";
      visual?: VisualGenerationOptions;
      sketchControls?: SketchControls;
    }
  | {
      type: "canvas-elements";
      source: "mermaid" | "d2" | "sketch";
      elements: unknown[];
    }
  | {
      type: "kanban-ops";
      source: "kanban";
      ops: KanbanOperation[];
    };

export interface AssistantMessage {
  id: string;
  chatId: string;
  role: AssistantRole;
  expert?: AssistantExpert;
  text: string;
  status: "pending" | "complete" | "failed";
  createdAt: number;
  updatedAt: number;
  jobId?: string;
  artifacts: AssistantArtifact[];
}

export interface AssistantChat {
  id: string;
  ownerId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview?: string;
}

export type AssistantJobType = "diagram" | "image" | "sketch";

export interface AssistantJob {
  id: string;
  ownerId: string;
  chatId: string;
  assistantMessageId: string;
  type: AssistantJobType;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AssistantSendMessageInput {
  text: string;
  generation: AssistantGenerationConfig;
}

export interface AssistantSendMessageResult {
  userMessage: AssistantMessage;
  assistantMessage: AssistantMessage;
  pendingJobIds: string[];
}
