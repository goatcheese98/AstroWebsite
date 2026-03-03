import {
  addMessage,
  clearChats,
  createChat,
  deleteChat,
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
  AssistantMessage,
  AssistantSendMessageInput,
  AssistantSendMessageResult,
} from "./types";
import {
  buildConversationPrompt,
  buildD2Prompt,
  buildMermaidPrompt,
  extractCodeBlock,
} from "./parsing";
import { generateTextWithClaude } from "./claude";

export interface LocalAssistantRuntimeConfig {
  anthropicApiKey?: string;
  textModel?: string;
  geminiApiKey?: string;
  geminiImageModel?: string;
  background?: (promise: Promise<void>) => void;
}

function trimForPreview(text: string): string {
  return text.trim().slice(0, 2400);
}

function expertFromGeneration(generation: AssistantGenerationConfig): AssistantExpert {
  if (
    generation.expert === "general" ||
    generation.expert === "mermaid" ||
    generation.expert === "d2" ||
    generation.expert === "visual" ||
    generation.expert === "kanban"
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

function buildKanbanSystemPrompt(): string {
  return [
    "You are a Kanban board assistant embedded in a visual canvas tool.",
    "When asked to manipulate a Kanban board, respond with a JSON block wrapped in ```kanban-ops ... ``` fences.",
    "The JSON must be an array of operations. Supported operations:",
    '- {"op":"add_card","columnId":"<id>","card":{"title":"...","description":"...","priority":"low|medium|high","labels":["..."]}}',
    '- {"op":"update_card","cardId":"<id>","changes":{"title":"...","description":"...","priority":"..."}}',
    '- {"op":"delete_card","cardId":"<id>"}',
    '- {"op":"move_card","cardId":"<id>","toColumnId":"<id>","toIndex":0}',
    '- {"op":"add_column","column":{"title":"...","color":"#hexcolor"}}',
    '- {"op":"update_column","columnId":"<id>","changes":{"title":"..."}}',
    '- {"op":"delete_column","columnId":"<id>"}',
    '- {"op":"reorder_cards","columnId":"<id>","cardIds":["id1","id2",...]}',
    "Always use the exact IDs from the board context provided.",
    "After the JSON block, you may add a brief plain-text explanation.",
    "If no board context is available, explain that the user should select a kanban board as context.",
  ].join("\n");
}

function buildSystemPrompt(generation: AssistantGenerationConfig): string {
  const expert = expertFromGeneration(generation);
  if (expert === "kanban") {
    return buildKanbanSystemPrompt();
  }

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

    return [{ type: "code", language: "d2", code: d2Code }];
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

// --- Gemini image generation ---

async function geminiGenerateContent(
  apiKey: string,
  model: string,
  contents: unknown[],
  generationConfig: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents, generationConfig }),
    },
  );

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const err = (data?.error as Record<string, unknown>)?.message || `Gemini HTTP ${response.status}`;
    throw new Error(typeof err === "string" ? err : "Gemini request failed");
  }
  return data;
}

function firstGeminiInlineImage(data: unknown): { mimeType: string; base64: string } | null {
  const candidates = Array.isArray((data as Record<string, unknown>)?.candidates)
    ? ((data as Record<string, unknown>).candidates as unknown[])
    : [];
  for (const candidate of candidates) {
    const content = (candidate as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
    const parts = Array.isArray(content?.parts) ? (content.parts as unknown[]) : [];
    for (const part of parts) {
      const p = part as Record<string, unknown>;
      const inlineData = (p?.inlineData ?? p?.inline_data) as Record<string, string> | undefined;
      const mimeType = inlineData?.mimeType ?? inlineData?.mime_type;
      const base64 = inlineData?.data;
      if (typeof mimeType === "string" && typeof base64 === "string" && base64.length > 0) {
        return { mimeType, base64 };
      }
    }
  }
  return null;
}

function inferImageDimensions(mimeType: string, base64: string): { width: number; height: number } {
  try {
    const buffer = Buffer.from(base64, "base64");
    if (
      mimeType === "image/png" &&
      buffer.length >= 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50
    ) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset++; continue; }
        const marker = buffer[offset + 1];
        const segLen = buffer.readUInt16BE(offset + 2);
        const isSOF = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
        if (isSOF) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        if (!segLen || segLen < 2) break;
        offset += 2 + segLen;
      }
    }
  } catch { /* fall through */ }
  return { width: 1024, height: 1024 };
}

function parseDataUrl(dataUrl: unknown): { mimeType: string; base64: string } | null {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function buildImagePrompt(input: AssistantSendMessageInput, mode: string): string {
  const visual = input.generation?.visual;
  const sketch = input.generation?.sketch;
  const colorHint = visual?.colorMode === "bw" ? "black and white only (neutral grayscale)" : "full color";

  const lines = [
    "Generate a single whiteboard-friendly visual asset for composition inside Excalidraw.",
    "MANDATORY composition rules:",
    "- use a square 1:1 composition",
    "- keep subject centered and sized to occupy roughly 70-85% of the frame",
    "- preserve full subject silhouette within frame (no cut-off parts)",
    "MANDATORY background rules:",
    "- solid pure white background (#FFFFFF)",
    "- no checkerboard pattern, no transparency grid, no paper texture",
    "- no background objects, no sky, no room",
    "- no shadow plane, no glow halo, no border frame",
    "- keep the subject isolated and centered with consistent white padding",
    "MANDATORY rendering rules:",
    "- crisp silhouette and edges",
    "- high subject/background separation",
    "- no watermark, no text overlay unless explicitly requested",
    `- color mode: ${colorHint}`,
    `User request: ${input.text}`,
  ];

  if (mode === "sketch") {
    const style = sketch?.style || "clean";
    lines.push("Sketch-specific rules:");
    lines.push(
      `- style: ${style === "hand-drawn" ? "hand-drawn marker strokes, gentle wobble, human sketch character" : style === "technical" ? "technical drafting look, straight controlled lines" : "clean whiteboard illustration style with precise boundaries"}`,
    );
    const complexity = sketch?.complexity || "medium";
    lines.push(
      `- complexity: ${complexity === "low" ? "minimal detail, large simple shapes" : complexity === "high" ? "high detail, rich structure" : "balanced detail with clear hierarchy"}`,
    );
    lines.push("- strong dark linework for outer and inner contours");
    lines.push("- shapes should be segmentable for later vector conversion");
  } else {
    lines.push("Image-specific rules:");
    lines.push("- deliver a clean standalone subject for direct canvas placement");
    lines.push("- keep empty white margins around the subject");
  }

  const sourceImage = parseDataUrl(input.generation?.sourceImageDataUrl);
  if (sourceImage && Math.floor((sourceImage.base64.replace(/\s+/g, "").length * 3) / 4) <= 2_500_000) {
    lines.push(
      "Use the provided reference image for composition/content guidance while preserving all white-background constraints.",
    );
  }

  return lines.join("\n");
}

async function generateImageWithGemini(
  apiKey: string,
  imageModel: string,
  input: AssistantSendMessageInput,
  mode: string,
): Promise<{ mimeType: string; dataUrl: string; width: number; height: number }> {
  const sourceImage = parseDataUrl(input.generation?.sourceImageDataUrl);
  const includeReference =
    sourceImage &&
    Math.floor((sourceImage.base64.replace(/\s+/g, "").length * 3) / 4) <= 2_500_000;

  const prompt = buildImagePrompt(input, mode);
  const parts: unknown[] = [{ text: prompt }];
  if (includeReference) {
    parts.push({ inline_data: { mime_type: sourceImage.mimeType, data: sourceImage.base64 } });
  }

  const response = await geminiGenerateContent(
    apiKey,
    imageModel,
    [{ role: "user", parts }],
    { temperature: 0.35, responseModalities: ["TEXT", "IMAGE"] },
  );

  const image = firstGeminiInlineImage(response);
  if (!image) {
    throw new Error("Gemini did not return an image");
  }

  const size = inferImageDimensions(image.mimeType, image.base64);
  return {
    mimeType: image.mimeType,
    dataUrl: `data:${image.mimeType};base64,${image.base64}`,
    width: size.width,
    height: size.height,
  };
}

// --- End Gemini image generation ---

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

      if (!config.geminiApiKey) {
        throw new Error("Image/sketch generation requires GOOGLE_GEMINI_API_KEY to be configured.");
      }

      const imageModel = config.geminiImageModel || "gemini-3.1-flash-image-preview";
      const generated = await generateImageWithGemini(config.geminiApiKey, imageModel, input, mode);

      updateJob(ownerId, job.id, { progress: 90 });

      artifacts = [
        {
          type: "image-data",
          mimeType: generated.mimeType,
          dataUrl: generated.dataUrl,
          width: generated.width,
          height: generated.height,
          source: mode === "sketch" ? "sketch" : "image",
          ...(input.generation?.visual ? { visual: input.generation.visual } : {}),
          ...(mode === "sketch" && input.generation?.sketch
            ? { sketchControls: input.generation.sketch }
            : {}),
        } as AssistantArtifact,
      ];
      text = "Image asset is ready. Add it directly, or vectorize it into editable canvas shapes.";
      updateJob(ownerId, job.id, { progress: 100, status: "completed" });
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

export interface ChatStreamSession {
  userMessage: AssistantMessage;
  prompt: string;
  system: string;
  textModel: string;
  complete: (text: string) => AssistantMessage;
  fail: (errorText: string) => void;
}

export function prepareChatStreamSession(
  ownerId: string,
  chatId: string,
  input: AssistantSendMessageInput,
  config: Pick<LocalAssistantRuntimeConfig, "textModel">,
): ChatStreamSession {
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

  const history = listMessages(ownerId, chatId).slice(-20);
  const systemPrompt = buildSystemPrompt(input.generation);
  const prompt = [
    "Conversation:",
    buildConversationPrompt(history.map((item) => ({ role: item.role, text: item.text }))),
    "ASSISTANT:",
  ].join("\n\n");

  return {
    userMessage,
    prompt,
    system: systemPrompt,
    textModel: config.textModel || "claude-sonnet-4-20250514",
    complete(text: string): AssistantMessage {
      const artifacts: AssistantArtifact[] = [];
      const mermaidCode = extractCodeBlock(text, "mermaid");
      if (mermaidCode) artifacts.push({ type: "code", language: "mermaid", code: mermaidCode });
      const d2Code = extractCodeBlock(text, "d2");
      if (d2Code) artifacts.push({ type: "code", language: "d2", code: d2Code });
      const kanbanOpsJson = extractCodeBlock(text, "kanban-ops");
      if (kanbanOpsJson) {
        try {
          const ops = JSON.parse(kanbanOpsJson);
          if (Array.isArray(ops)) {
            artifacts.push({ type: "kanban-ops", source: "kanban", ops });
          }
        } catch { /* ignore malformed JSON */ }
      }
      return addMessage(ownerId, {
        chatId,
        role: "assistant",
        expert,
        text: trimForPreview(text),
        status: "complete",
        artifacts,
      });
    },
    fail(errorText: string) {
      addMessage(ownerId, {
        chatId,
        role: "assistant",
        expert,
        text: errorText,
        status: "failed",
        artifacts: [],
      });
    },
  };
}

export function listAssistantChats(ownerId: string) {
  return listChats(ownerId);
}

export function createAssistantChat(ownerId: string, title?: string) {
  return createChat(ownerId, title);
}

export function deleteAssistantChat(ownerId: string, chatId: string) {
  return deleteChat(ownerId, chatId);
}

export function clearAssistantChats(ownerId: string) {
  return clearChats(ownerId);
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
    }

    const kanbanOpsFromReply = extractCodeBlock(replyText, "kanban-ops");
    if (kanbanOpsFromReply) {
      try {
        const ops = JSON.parse(kanbanOpsFromReply);
        if (Array.isArray(ops)) {
          artifacts.push({ type: "kanban-ops", source: "kanban", ops });
        }
      } catch { /* ignore malformed JSON */ }
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
