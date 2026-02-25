import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 8788);
const BACKEND_API_KEY = process.env.AI_BACKEND_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

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
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        req.destroy();
      }
    });
    req.on("end", () => {
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

function extractCodeBlock(text, language) {
  const pattern = new RegExp("```" + language + "\\s*\\n([\\s\\S]*?)\\n```", "i");
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
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
    const mode = task.payload.generation?.mode;
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
    } else {
      // Stub for worker image/sketch generation; replace with actual model + vector pipeline.
      throw new Error("Image/sketch worker not configured yet. Connect your model pipeline here.");
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

    if (!authOk(req)) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/") {
      json(res, 200, {
        service: "assistant-backend",
        status: "ok",
        version: 1,
        hint: "Use /v1/assistant/chats?clientId=dev-local or call via Astro proxy.",
      });
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
        const payload = body && typeof body === "object" && typeof body.payload === "object"
          ? body.payload
          : body;

        if (!payload || typeof payload.text !== "string" || !payload.text.trim()) {
          json(res, 400, { error: "text is required" });
          return;
        }

        const text = payload.text.trim();
        const mode = payload.generation?.mode || "chat";

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

          try {
            reply = await claudeText(
              "You are a concise and practical whiteboard assistant.",
              `Conversation:\n\n${history}\n\nASSISTANT:`,
            );

            const mermaid = extractCodeBlock(reply, "mermaid");
            if (mermaid) artifacts.push({ type: "code", language: "mermaid", code: mermaid });
            const d2 = extractCodeBlock(reply, "d2");
            if (d2) artifacts.push({ type: "code", language: "d2", code: d2 });
          } catch (error) {
            status = "failed";
            reply = `Claude request failed: ${error instanceof Error ? error.message : "Unknown error"}`;
          }

          const assistantMessage = {
            id: randomUUID(),
            chatId,
            role: "assistant",
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
          type: mode === "image" ? "image" : mode === "sketch" ? "sketch" : "diagram",
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
});
