export type AssistantRole = "user" | "assistant" | "system";

export type AssistantMode = "chat" | "mermaid" | "d2" | "image" | "sketch";
export type AssistantExpert = "general" | "mermaid" | "d2" | "visual";

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
