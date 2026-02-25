import {
  addMessage,
  createChat,
  createJob,
  getChat,
  getJob,
  listChats,
  listMessages,
  updateJob,
  updateMessage,
} from "./runtime-store";
import type {
  AssistantArtifact,
  AssistantExpert,
  AssistantGenerationConfig,
  AssistantJob,
  AssistantSendMessageInput,
  AssistantSendMessageResult,
} from "./types";
import {
  buildConversationPrompt,
  buildD2Prompt,
  buildMermaidPrompt,
  extractCodeBlock,
} from "./parsing";
import { convertD2ToExcalidrawElements } from "./d2-converter";
import { generateTextWithClaude } from "./claude";

export interface LocalAssistantRuntimeConfig {
  anthropicApiKey?: string;
  textModel?: string;
  background?: (promise: Promise<void>) => void;
  allowLocalWorkerGeneration?: boolean;
}

function trimForPreview(text: string): string {
  return text.trim().slice(0, 2400);
}

function expertFromGeneration(generation: AssistantGenerationConfig): AssistantExpert {
  if (
    generation.expert === "general" ||
    generation.expert === "mermaid" ||
    generation.expert === "d2" ||
    generation.expert === "visual"
  ) {
    return generation.expert;
  }

  if (generation.mode === "mermaid") return "mermaid";
  if (generation.mode === "d2") return "d2";
  if (generation.mode === "image" || generation.mode === "sketch") return "visual";
  return "general";
}

function modeFromGeneration(generation: AssistantGenerationConfig) {
  const mode = generation.mode;
  if (mode === "chat" || mode === "mermaid" || mode === "d2" || mode === "image" || mode === "sketch") {
    return mode;
  }

  const expert = expertFromGeneration(generation);
  if (expert === "mermaid") return "mermaid";
  if (expert === "d2") return "d2";
  if (expert === "visual") return "image";
  return "chat";
}

function buildSystemPrompt(generation: AssistantGenerationConfig): string {
  const mode = modeFromGeneration(generation);
  const base = [
    "You are a precise whiteboard assistant.",
    "Respond concisely with deterministic outputs.",
    "Prefer practical outputs that can be rendered in a diagram canvas.",
  ];

  if (mode === "sketch" && generation.sketch) {
    base.push(
      `Sketch style=${generation.sketch.style}, complexity=${generation.sketch.complexity}, palette=${generation.sketch.colorPalette}, detail=${generation.sketch.detailLevel}, edgeSensitivity=${generation.sketch.edgeSensitivity}.`,
    );
  }

  return base.join("\n");
}

function pickPendingText(mode: AssistantGenerationConfig["mode"]): string {
  switch (mode) {
    case "mermaid":
      return "Generating Mermaid diagram...";
    case "d2":
      return "Generating D2 diagram...";
    case "image":
      return "Submitting image generation job...";
    case "sketch":
      return "Submitting sketch generation job...";
    default:
      return "Processing...";
  }
}

async function generateDiagramArtifacts(
  input: AssistantSendMessageInput,
  config: LocalAssistantRuntimeConfig,
): Promise<AssistantArtifact[]> {
  const mode = modeFromGeneration(input.generation);

  if (mode === "d2") {
    let d2Code = extractCodeBlock(input.text, "d2") || input.text.trim();

    if (!extractCodeBlock(input.text, "d2") && config.anthropicApiKey) {
      const prompt = [buildD2Prompt(input.text)].join("\n\n");
      const generated = await generateTextWithClaude({
        apiKey: config.anthropicApiKey,
        prompt,
        system: buildSystemPrompt(input.generation),
        model: config.textModel,
      });
      d2Code = extractCodeBlock(generated, "d2") || generated.trim();
    }

    const elements = convertD2ToExcalidrawElements(d2Code);
    return [
      { type: "code", language: "d2", code: d2Code },
      { type: "canvas-elements", source: "d2", elements },
    ];
  }

  let mermaidCode = extractCodeBlock(input.text, "mermaid") || input.text.trim();

  if (!extractCodeBlock(input.text, "mermaid") && config.anthropicApiKey) {
    const prompt = [buildMermaidPrompt(input.text)].join("\n\n");
    const generated = await generateTextWithClaude({
      apiKey: config.anthropicApiKey,
      prompt,
      system: buildSystemPrompt(input.generation),
      model: config.textModel,
    });
    mermaidCode = extractCodeBlock(generated, "mermaid") || generated.trim();
  }

  return [{ type: "code", language: "mermaid", code: mermaidCode }];
}

async function processJob(
  ownerId: string,
  job: AssistantJob,
  input: AssistantSendMessageInput,
  config: LocalAssistantRuntimeConfig,
): Promise<void> {
  const mode = modeFromGeneration(input.generation);
  updateJob(ownerId, job.id, { status: "running", progress: 12 });

  try {
    let text = "";
    let artifacts: AssistantArtifact[] = [];

    if (mode === "mermaid" || mode === "d2") {
      artifacts = await generateDiagramArtifacts(input, config);
      text = mode === "mermaid"
        ? "Mermaid diagram is ready. Add it to canvas or edit the source."
        : "D2 diagram is ready. Add it to canvas or edit the source.";
      updateJob(ownerId, job.id, { progress: 100, status: "completed" });
    } else {
      updateJob(ownerId, job.id, { progress: 30 });

      if (!config.allowLocalWorkerGeneration) {
        throw new Error(
          "Image/sketch generation is handled by the independent worker backend. Configure AI_BACKEND_BASE_URL.",
        );
      }

      throw new Error("Local worker generation scaffold exists but no local worker is configured.");
    }

    updateMessage(ownerId, job.chatId, job.assistantMessageId, {
      text,
      artifacts,
      status: "complete",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed";

    updateJob(ownerId, job.id, {
      status: "failed",
      error: message,
      progress: 100,
    });

    updateMessage(ownerId, job.chatId, job.assistantMessageId, {
      text: `Generation failed: ${message}`,
      status: "failed",
      artifacts: [],
    });
  }
}

export function listAssistantChats(ownerId: string) {
  return listChats(ownerId);
}

export function createAssistantChat(ownerId: string, title?: string) {
  return createChat(ownerId, title);
}

export function listAssistantMessages(ownerId: string, chatId: string) {
  return listMessages(ownerId, chatId);
}

export function getAssistantJob(ownerId: string, jobId: string) {
  return getJob(ownerId, jobId);
}

export async function sendAssistantMessage(
  ownerId: string,
  chatId: string,
  input: AssistantSendMessageInput,
  config: LocalAssistantRuntimeConfig,
): Promise<AssistantSendMessageResult> {
  const mode = modeFromGeneration(input.generation);
  const expert = expertFromGeneration(input.generation);
  const chat = getChat(ownerId, chatId);
  if (!chat) {
    throw new Error("Chat not found");
  }

  const userMessage = addMessage(ownerId, {
    chatId,
    role: "user",
    text: trimForPreview(input.text),
    status: "complete",
    artifacts: [],
  });

  if (mode === "chat") {
    const history = listMessages(ownerId, chatId).slice(-20);
    const systemPrompt = buildSystemPrompt(input.generation);

    let replyText = "";
    let assistantStatus: "complete" | "failed" = "complete";
    if (config.anthropicApiKey) {
      try {
        replyText = await generateTextWithClaude({
          apiKey: config.anthropicApiKey,
          model: config.textModel,
          system: systemPrompt,
          prompt: [
            "Conversation:",
            buildConversationPrompt(
              history.map((item) => ({ role: item.role, text: item.text })),
            ),
            "ASSISTANT:",
          ].join("\n\n"),
        });
      } catch (error) {
        assistantStatus = "failed";
        replyText = `Claude request failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    } else {
      assistantStatus = "failed";
      replyText = "Claude response unavailable because ANTHROPIC_API_KEY is not configured.";
    }

    const artifacts: AssistantArtifact[] = [];

    const mermaidFromReply = extractCodeBlock(replyText, "mermaid");
    if (mermaidFromReply) {
      artifacts.push({ type: "code", language: "mermaid", code: mermaidFromReply });
    }

    const d2FromReply = extractCodeBlock(replyText, "d2");
    if (d2FromReply) {
      artifacts.push({ type: "code", language: "d2", code: d2FromReply });
      artifacts.push({
        type: "canvas-elements",
        source: "d2",
        elements: convertD2ToExcalidrawElements(d2FromReply),
      });
    }

    const assistantMessage = addMessage(ownerId, {
      chatId,
      role: "assistant",
      expert,
      text: trimForPreview(replyText),
      status: assistantStatus,
      artifacts,
    });

    return {
      userMessage,
      assistantMessage,
      pendingJobIds: [],
    };
  }

  const assistantMessage = addMessage(ownerId, {
    chatId,
    role: "assistant",
    expert,
    text: pickPendingText(mode),
    status: "pending",
    artifacts: [],
  });

  const job = createJob(ownerId, {
    chatId,
    assistantMessageId: assistantMessage.id,
    type:
      mode === "image"
        ? "image"
        : mode === "sketch"
          ? "sketch"
          : "diagram",
    status: "queued",
    progress: 0,
  });

  updateMessage(ownerId, chatId, assistantMessage.id, { jobId: job.id });

  const backgroundTask = processJob(ownerId, job, input, config);
  if (config.background) {
    config.background(backgroundTask);
  } else {
    void backgroundTask;
  }

  const latestAssistant =
    updateMessage(ownerId, chatId, assistantMessage.id, {}) || assistantMessage;

  return {
    userMessage,
    assistantMessage: latestAssistant,
    pendingJobIds: [job.id],
  };
}
