import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCanvasSafeImagePrompt,
  buildPromptRefinerInput,
} from "./prompts/visual-prompts.mjs";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
  const separator = normalized.indexOf("=");
  if (separator <= 0) return null;

  const key = normalized.slice(0, separator).trim();
  if (!key) return null;

  let value = normalized.slice(separator + 1).trim();
  if (
    value.length >= 2 &&
    ((value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFromFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (typeof process.env[parsed.key] === "undefined") {
      process.env[parsed.key] = parsed.value;
    }
  }
}

function loadEnvironment() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = new Set([
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".dev.vars"),
    resolve(here, ".env"),
    resolve(here, ".dev.vars"),
    resolve(here, "../../.env"),
    resolve(here, "../../.dev.vars"),
  ]);

  for (const path of candidates) {
    loadEnvFromFile(path);
  }
}

loadEnvironment();

const PORT = Number(process.env.PORT || 8788);
const BACKEND_API_KEY = process.env.AI_BACKEND_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
const GEMINI_PROMPT_MODEL = process.env.GEMINI_PROMPT_MODEL || process.env.GEMINI_TEXT_MODEL || "gemini-3-flash-preview";
const ENABLE_PROMPT_REFINER = process.env.ASSISTANT_ENABLE_PROMPT_REFINER === "true";
const MAX_REQUEST_BODY_BYTES = Number(process.env.ASSISTANT_MAX_BODY_BYTES || 15_000_000);

const state = {
  chatsByOwner: new Map(), // ownerId -> Map(chatId, chat)
  messagesByChat: new Map(), // chatId -> message[]
  jobsByOwner: new Map(), // ownerId -> Map(jobId, job)
  workerQueue: [],
};

function now() {
  return Date.now();
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    let tooLarge = false;

    req.on("data", (chunk) => {
      if (tooLarge) {
        return;
      }

      data += chunk;
      if (data.length > MAX_REQUEST_BODY_BYTES) {
        tooLarge = true;
      }
    });

    req.on("end", () => {
      if (tooLarge) {
        resolve({ __parseError: "too_large" });
        return;
      }

      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });

    req.on("error", () => {
      resolve(null);
    });
  });
}

function authOk(req) {
  if (!BACKEND_API_KEY) {
    return true;
  }

  const auth = req.headers.authorization || "";
  return auth === `Bearer ${BACKEND_API_KEY}`;
}

function ownerId(req, url) {
  const userId = req.headers["x-assistant-user-id"];
  if (typeof userId === "string" && userId.trim()) {
    return `user:${userId.trim()}`;
  }

  const headerClient = req.headers["x-assistant-client-id"];
  const queryClient = url.searchParams.get("clientId") || undefined;

  const clientId = (typeof headerClient === "string" ? headerClient : undefined) || queryClient;
  if (!clientId || !clientId.trim()) {
    return null;
  }

  return `anon:${clientId.trim()}`;
}

function ownerChats(owner) {
  const map = state.chatsByOwner.get(owner) || new Map();
  state.chatsByOwner.set(owner, map);
  return map;
}

function ownerJobs(owner) {
  const map = state.jobsByOwner.get(owner) || new Map();
  state.jobsByOwner.set(owner, map);
  return map;
}

function chatMessages(chatId) {
  const list = state.messagesByChat.get(chatId) || [];
  state.messagesByChat.set(chatId, list);
  return list;
}

function deleteOwnerChat(owner, chatId) {
  const chats = ownerChats(owner);
  if (!chats.has(chatId)) {
    return false;
  }

  chats.delete(chatId);
  state.messagesByChat.delete(chatId);

  const jobs = ownerJobs(owner);
  for (const [jobId, job] of jobs.entries()) {
    if (job.chatId === chatId) {
      jobs.delete(jobId);
    }
  }

  state.workerQueue = state.workerQueue.filter(
    (task) => !(task.owner === owner && task.chatId === chatId),
  );

  return true;
}

function clearOwnerChats(owner) {
  const chats = ownerChats(owner);
  const chatIds = new Set(chats.keys());
  const count = chatIds.size;
  if (count === 0) {
    return 0;
  }

  chats.clear();

  for (const chatId of chatIds) {
    state.messagesByChat.delete(chatId);
  }

  const jobs = ownerJobs(owner);
  for (const [jobId, job] of jobs.entries()) {
    if (chatIds.has(job.chatId)) {
      jobs.delete(jobId);
    }
  }

  state.workerQueue = state.workerQueue.filter(
    (task) => !(task.owner === owner && chatIds.has(task.chatId)),
  );

  return count;
}

async function claudeText(system, prompt) {
  if (!ANTHROPIC_API_KEY) {
    return "Claude unavailable: ANTHROPIC_API_KEY not configured";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Claude HTTP ${response.status}`);
  }

  const block = Array.isArray(data.content)
    ? data.content.find((item) => item?.type === "text")
    : null;

  return block?.text || "";
}

async function geminiText(system, prompt) {
  const response = await geminiGenerateContent({
    model: GEMINI_PROMPT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${system}\n\n${prompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 2000,
    },
  });

  const text = firstGeminiText(response);
  if (!text) {
    throw new Error("Gemini returned no text");
  }
  return text;
}

function extractCodeBlock(text, language) {
  const pattern = new RegExp("```" + language + "\\s*\\n([\\s\\S]*?)\\n```", "i");
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

function resolveExpert(payload) {
  const expert = payload?.generation?.expert;
  if (expert === "general" || expert === "mermaid" || expert === "d2" || expert === "visual") {
    return expert;
  }

  const mode = payload?.generation?.mode;
  if (mode === "mermaid") return "mermaid";
  if (mode === "d2") return "d2";
  if (mode === "image" || mode === "sketch") return "visual";
  return "general";
}

function resolveMode(payload) {
  const mode = payload?.generation?.mode;
  if (mode === "chat" || mode === "mermaid" || mode === "d2" || mode === "image" || mode === "sketch") {
    return mode;
  }

  const expert = resolveExpert(payload);
  if (expert === "mermaid") return "mermaid";
  if (expert === "d2") return "d2";
  if (expert === "visual") return "image";
  return "chat";
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function bytesFromBase64(base64) {
  const sanitized = base64.replace(/\s+/g, "");
  return Math.floor((sanitized.length * 3) / 4);
}

async function geminiGenerateContent({ model, contents, generationConfig }) {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GOOGLE_GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig,
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.error || `Gemini HTTP ${response.status}`;
    throw new Error(typeof detail === "string" ? detail : "Gemini request failed");
  }

  return data;
}

function firstGeminiText(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }
  return "";
}

function firstGeminiInlineImage(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      const inlineData = part?.inlineData || part?.inline_data;
      const mimeType = inlineData?.mimeType || inlineData?.mime_type;
      const base64 = inlineData?.data;
      if (typeof mimeType === "string" && typeof base64 === "string" && base64.length > 0) {
        return { mimeType, base64 };
      }
    }
  }
  return null;
}

function inferImageDimensions(mimeType, base64) {
  try {
    const buffer = Buffer.from(base64, "base64");

    // PNG width/height at bytes 16..24.
    if (
      mimeType === "image/png" &&
      buffer.length >= 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }

    // Basic JPEG SOF parser for width/height.
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }

        const marker = buffer[offset + 1];
        const segmentLength = buffer.readUInt16BE(offset + 2);
        const isSOF = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

        if (isSOF && offset + 9 < buffer.length) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }

        if (!segmentLength || segmentLength < 2) break;
        offset += 2 + segmentLength;
      }
    }
  } catch {
    // Fall through to default size.
  }

  return { width: 1024, height: 1024 };
}

async function refineCanvasPrompt(prompt, mode) {
  const response = await geminiGenerateContent({
    model: GEMINI_PROMPT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildPromptRefinerInput(prompt, mode),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 700,
    },
  });

  const refined = firstGeminiText(response);
  return refined || prompt;
}

async function generateCanvasImageWithGemini(payload, mode) {
  const sourceImage = parseDataUrl(payload?.generation?.sourceImageDataUrl);
  const includeReference = sourceImage && bytesFromBase64(sourceImage.base64) <= 2_500_000;

  let prompt = buildCanvasSafeImagePrompt({
    mode,
    text: payload?.text || "",
    sketch: payload?.generation?.sketch,
    visual: payload?.generation?.visual,
    hasReferenceImage: !!includeReference,
  });

  if (ENABLE_PROMPT_REFINER) {
    try {
      prompt = await refineCanvasPrompt(prompt, mode);
    } catch {
      // Keep base prompt if prompt refiner model is unavailable.
    }
  }

  const parts = [{ text: prompt }];
  if (includeReference) {
    parts.push({
      inline_data: {
        mime_type: sourceImage.mimeType,
        data: sourceImage.base64,
      },
    });
  }

  const response = await geminiGenerateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.35,
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const image = firstGeminiInlineImage(response);
  if (!image) {
    const text = firstGeminiText(response);
    throw new Error(text || "Gemini did not return an image");
  }

  const size = inferImageDimensions(image.mimeType, image.base64);
  return {
    prompt,
    mimeType: image.mimeType,
    dataUrl: `data:${image.mimeType};base64,${image.base64}`,
    width: size.width,
    height: size.height,
  };
}

function enqueueJob({ owner, jobId, chatId, messageId, payload }) {
  state.workerQueue.push({ owner, jobId, chatId, messageId, payload });
}

async function runWorkerTask(task) {
  const jobs = ownerJobs(task.owner);
  const job = jobs.get(task.jobId);
  if (!job) return;

  job.status = "running";
  job.progress = 20;
  job.updatedAt = now();

  const messages = chatMessages(task.chatId);
  const assistant = messages.find((item) => item.id === task.messageId);

  try {
    const mode = resolveMode(task.payload);
    let text = "";
    let artifacts = [];

    if (mode === "mermaid" || mode === "d2") {
      const syntaxPrompt = mode === "mermaid"
        ? [
            "Return only Mermaid code in a single mermaid code block.",
            "Prefer flowchart TD unless otherwise requested.",
            `Request: ${task.payload.text}`,
          ].join("\n")
        : [
            "Return only D2 code in a single d2 code block.",
            "Keep identifiers short and deterministic.",
            `Request: ${task.payload.text}`,
          ].join("\n");

      const generated = await claudeText("You are a precise whiteboard diagram assistant.", syntaxPrompt);
      const code = extractCodeBlock(generated, mode) || generated.trim();

      artifacts.push({ type: "code", language: mode, code });
      text = `${mode.toUpperCase()} diagram is ready.`;
    } else if (mode === "image" || mode === "sketch") {
      job.progress = 40;
      job.updatedAt = now();

      const generated = await generateCanvasImageWithGemini(task.payload, mode);

      job.progress = 90;
      job.updatedAt = now();

      artifacts.push({
        type: "image-data",
        mimeType: generated.mimeType,
        dataUrl: generated.dataUrl,
        width: generated.width,
        height: generated.height,
        source: "image",
        ...(task.payload?.generation?.visual
          ? { visual: task.payload.generation.visual }
          : {}),
        ...(mode === "sketch" && task.payload?.generation?.sketch
          ? { sketchControls: task.payload.generation.sketch }
          : {}),
      });

      text = "Image asset is ready. Add it directly, or vectorize it into editable canvas shapes.";
    } else {
      throw new Error(`Unsupported generation mode: ${mode || "unknown"}`);
    }

    if (assistant) {
      assistant.status = "complete";
      assistant.text = text;
      assistant.artifacts = artifacts;
      assistant.updatedAt = now();
    }

    job.status = "completed";
    job.progress = 100;
    job.updatedAt = now();
  } catch (error) {
    if (assistant) {
      assistant.status = "failed";
      assistant.text = `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      assistant.artifacts = [];
      assistant.updatedAt = now();
    }

    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown error";
    job.progress = 100;
    job.updatedAt = now();
  }
}

setInterval(() => {
  const task = state.workerQueue.shift();
  if (!task) return;
  void runWorkerTask(task);
}, 250);

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      json(res, 400, { error: "Invalid request" });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/") {
      json(res, 200, {
        service: "assistant-backend",
        status: "ok",
        version: 1,
        authRequired: !!BACKEND_API_KEY,
        hint: "Use /v1/assistant/chats?clientId=dev-local or call via Astro proxy.",
      });
      return;
    }

    if (!authOk(req)) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    const owner = ownerId(req, url);

    if (!owner) {
      json(res, 400, { error: "Missing client identity" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/assistant/chats") {
      const chats = Array.from(ownerChats(owner).values()).sort((a, b) => b.updatedAt - a.updatedAt);
      json(res, 200, { chats });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/assistant/chats") {
      const body = await parseBody(req);
      if (body && body.__parseError === "too_large") {
        json(res, 413, {
          error: `Request body too large (limit ${MAX_REQUEST_BODY_BYTES} bytes)`,
        });
        return;
      }

      if (!body) {
        json(res, 400, { error: "Invalid JSON" });
        return;
      }

      const id = randomUUID();
      const createdAt = now();
      const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "New chat";
      const chat = {
        id,
        ownerId: owner,
        title,
        createdAt,
        updatedAt: createdAt,
        lastMessagePreview: "",
      };

      ownerChats(owner).set(id, chat);
      state.messagesByChat.set(id, []);

      json(res, 201, { chat });
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/v1/assistant/chats") {
      const cleared = clearOwnerChats(owner);
      json(res, 200, { cleared });
      return;
    }

    const chatPath = url.pathname.match(/^\/v1\/assistant\/chats\/([^/]+)$/);
    if (req.method === "DELETE" && chatPath) {
      const chatId = decodeURIComponent(chatPath[1]);
      const deleted = deleteOwnerChat(owner, chatId);
      if (!deleted) {
        json(res, 404, { error: "Chat not found" });
        return;
      }
      json(res, 200, { deleted: true });
      return;
    }

    const messagesPath = url.pathname.match(/^\/v1\/assistant\/chats\/([^/]+)\/messages$/);
    if (messagesPath) {
      const chatId = decodeURIComponent(messagesPath[1]);
      const chat = ownerChats(owner).get(chatId);
      if (!chat) {
        json(res, 404, { error: "Chat not found" });
        return;
      }

      if (req.method === "GET") {
        const messages = [...chatMessages(chatId)].sort((a, b) => a.createdAt - b.createdAt);
        json(res, 200, { messages });
        return;
      }

      if (req.method === "POST") {
        const body = await parseBody(req);
        if (body && body.__parseError === "too_large") {
          json(res, 413, {
            error: `Request body too large (limit ${MAX_REQUEST_BODY_BYTES} bytes). Try disabling canvas reference or selecting fewer elements.`,
          });
          return;
        }

        const payload = body && typeof body === "object" && typeof body.payload === "object"
          ? body.payload
          : body;

        if (!payload || typeof payload.text !== "string" || !payload.text.trim()) {
          json(res, 400, { error: "text is required" });
          return;
        }

        const text = payload.text.trim();
        const mode = resolveMode(payload);
        const expert = resolveExpert(payload);

        const userMessage = {
          id: randomUUID(),
          chatId,
          role: "user",
          text,
          status: "complete",
          createdAt: now(),
          updatedAt: now(),
          artifacts: [],
        };

        const messages = chatMessages(chatId);
        messages.push(userMessage);

        chat.updatedAt = now();
        chat.lastMessagePreview = text.slice(0, 120);
        if (chat.title === "New chat") {
          chat.title = text.slice(0, 40) || "New chat";
        }

        if (mode === "chat") {
          const history = messages.slice(-20).map((m) => `${m.role.toUpperCase()}: ${m.text}`).join("\n\n");
          let reply = "";
          let status = "complete";
          const artifacts = [];
          let modelUsed = "claude";

          try {
            reply = await claudeText(
              "You are a concise and practical whiteboard assistant.",
              `Conversation:\n\n${history}\n\nASSISTANT:`,
            );
          } catch (error) {
            if (GOOGLE_GEMINI_API_KEY) {
              try {
                reply = await geminiText(
                  "You are a concise and practical whiteboard assistant.",
                  `Conversation:\n\n${history}\n\nASSISTANT:`,
                );
                modelUsed = "gemini-fallback";
              } catch (fallbackError) {
                status = "failed";
                reply =
                  `Claude request failed: ${error instanceof Error ? error.message : "Unknown error"}\n` +
                  `Gemini fallback failed: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`;
              }
            } else {
              status = "failed";
              reply = `Claude request failed: ${error instanceof Error ? error.message : "Unknown error"}`;
            }
          }

          if (status === "complete" && modelUsed === "gemini-fallback") {
            reply = `${reply.trim()}\n\n(Generated via Gemini fallback because Claude was unavailable.)`;
          }

          const mermaid = extractCodeBlock(reply, "mermaid");
          if (mermaid) artifacts.push({ type: "code", language: "mermaid", code: mermaid });
          const d2 = extractCodeBlock(reply, "d2");
          if (d2) artifacts.push({ type: "code", language: "d2", code: d2 });

          const assistantMessage = {
            id: randomUUID(),
            chatId,
            role: "assistant",
            expert,
            text: reply.trim(),
            status,
            createdAt: now(),
            updatedAt: now(),
            artifacts,
          };
          messages.push(assistantMessage);

          json(res, 200, {
            userMessage,
            assistantMessage,
            pendingJobIds: [],
          });
          return;
        }

        const assistantMessage = {
          id: randomUUID(),
          chatId,
          role: "assistant",
          expert,
          text: "Queued generation job...",
          status: "pending",
          createdAt: now(),
          updatedAt: now(),
          artifacts: [],
        };
        messages.push(assistantMessage);

        const jobId = randomUUID();
        const job = {
          id: jobId,
          ownerId: owner,
          chatId,
          assistantMessageId: assistantMessage.id,
          type: mode === "image" || mode === "sketch" ? "image" : "diagram",
          status: "queued",
          progress: 0,
          createdAt: now(),
          updatedAt: now(),
        };

        ownerJobs(owner).set(jobId, job);
        assistantMessage.jobId = jobId;

        enqueueJob({ owner, jobId, chatId, messageId: assistantMessage.id, payload });

        json(res, 200, {
          userMessage,
          assistantMessage,
          pendingJobIds: [jobId],
        });
        return;
      }
    }

    const jobPath = url.pathname.match(/^\/v1\/assistant\/jobs\/([^/]+)$/);
    if (req.method === "GET" && jobPath) {
      const jobId = decodeURIComponent(jobPath[1]);
      const job = ownerJobs(owner).get(jobId);
      if (!job) {
        json(res, 404, { error: "Job not found" });
        return;
      }

      json(res, 200, { job });
      return;
    }

    json(res, 404, { error: "Not found" });
  } catch (error) {
    json(res, 500, {
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`assistant-backend listening on http://localhost:${PORT}`);
  console.log(
    `assistant-backend env: ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY ? "set" : "missing"}, GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY ? "set" : "missing"}, AI_BACKEND_API_KEY=${BACKEND_API_KEY ? "set" : "missing"}`,
  );
  console.log(
    `assistant-backend models: CLAUDE_MODEL=${CLAUDE_MODEL}, GEMINI_IMAGE_MODEL=${GEMINI_IMAGE_MODEL}, GEMINI_PROMPT_MODEL=${GEMINI_PROMPT_MODEL}`,
  );
});
