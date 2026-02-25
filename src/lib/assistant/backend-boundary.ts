import type { APIContext } from "astro";
import {
  createAssistantChat,
  getAssistantJob,
  listAssistantChats,
  listAssistantMessages,
  sendAssistantMessage,
} from "./service";
import { exportOwnerState, hydrateOwnerState, type OwnerRuntimeSnapshot } from "./runtime-store";
import type {
  AssistantChat,
  AssistantJob,
  AssistantMessage,
  AssistantSendMessageInput,
  AssistantSendMessageResult,
} from "./types";
import {
  resolveAnthropicApiKey,
  resolveAssistantBackendConfig,
  resolveAssistantIdentity,
  resolveAssistantOwnerId,
} from "./auth";

export interface AssistantGateway {
  listChats(input: { clientId?: string }): Promise<AssistantChat[]>;
  createChat(input: { clientId?: string; title?: string }): Promise<AssistantChat>;
  listMessages(input: { clientId?: string; chatId: string }): Promise<AssistantMessage[]>;
  sendMessage(input: {
    clientId?: string;
    chatId: string;
    payload: AssistantSendMessageInput;
  }): Promise<AssistantSendMessageResult>;
  getJob(input: { clientId?: string; jobId: string }): Promise<AssistantJob | null>;
}

interface RemoteConfig {
  baseUrl: string;
  apiKey?: string;
}

type MaybeKVNamespace = {
  get: (key: string, type?: "text" | "json") => Promise<string | unknown | null>;
  put: (key: string, value: string) => Promise<void>;
};

function jsonHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}

async function buildIdentityHeaders(
  context: APIContext,
  clientId?: string,
): Promise<HeadersInit> {
  const auth = resolveAssistantIdentity(context);
  const headers: Record<string, string> = {};

  if (clientId) {
    headers["x-assistant-client-id"] = clientId;
  }

  if (auth.userId) {
    headers["x-assistant-user-id"] = auth.userId;
  }

  return headers;
}

function createRemoteGateway(
  context: APIContext,
  remote: RemoteConfig,
): AssistantGateway {
  async function remoteRequest<T>(
    method: "GET" | "POST",
    path: string,
    clientId?: string,
    body?: unknown,
  ): Promise<T> {
    const identityHeaders = await buildIdentityHeaders(context, clientId);
    const authHeaders: Record<string, string> = {};

    if (remote.apiKey) {
      authHeaders.Authorization = `Bearer ${remote.apiKey}`;
    }

    const response = await fetch(`${remote.baseUrl}${path}`, {
      method,
      headers: jsonHeaders({ ...identityHeaders, ...authHeaders }),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = (data && (data.details || data.error)) || `Remote backend returned HTTP ${response.status}`;
      throw new Error(typeof details === "string" ? details : "Remote backend request failed");
    }

    return data as T;
  }

  return {
    async listChats({ clientId }) {
      const data = await remoteRequest<{ chats: AssistantChat[] }>(
        "GET",
        `/v1/assistant/chats?clientId=${encodeURIComponent(clientId || "")}`,
        clientId,
      );
      return data.chats || [];
    },

    async createChat({ clientId, title }) {
      const data = await remoteRequest<{ chat: AssistantChat }>(
        "POST",
        "/v1/assistant/chats",
        clientId,
        { clientId, title },
      );
      return data.chat;
    },

    async listMessages({ clientId, chatId }) {
      const data = await remoteRequest<{ messages: AssistantMessage[] }>(
        "GET",
        `/v1/assistant/chats/${encodeURIComponent(chatId)}/messages?clientId=${encodeURIComponent(clientId || "")}`,
        clientId,
      );
      return data.messages || [];
    },

    async sendMessage({ clientId, chatId, payload }) {
      return remoteRequest<AssistantSendMessageResult>(
        "POST",
        `/v1/assistant/chats/${encodeURIComponent(chatId)}/messages`,
        clientId,
        {
          clientId,
          payload,
          ...payload,
        },
      );
    },

    async getJob({ clientId, jobId }) {
      const data = await remoteRequest<{ job: AssistantJob | null }>(
        "GET",
        `/v1/assistant/jobs/${encodeURIComponent(jobId)}?clientId=${encodeURIComponent(clientId || "")}`,
        clientId,
      );
      return data.job || null;
    },
  };
}

function createLocalGateway(context: APIContext): AssistantGateway {
  const runtime = (context.locals as any).runtime as {
    env?: { CANVAS_KV?: MaybeKVNamespace };
    ctx?: { waitUntil?: (promise: Promise<void>) => void };
  } | undefined;

  const kv = runtime?.env?.CANVAS_KV;

  function keyForOwner(ownerId: string): string {
    return `assistant-state:${ownerId}`;
  }

  async function ensureHydrated(ownerId: string): Promise<void> {
    if (!kv) return;
    const raw = await kv.get(keyForOwner(ownerId));
    if (!raw || typeof raw !== "string") return;

    try {
      const parsed = JSON.parse(raw) as OwnerRuntimeSnapshot;
      if (
        parsed &&
        Array.isArray(parsed.chats) &&
        typeof parsed.messagesByChat === "object" &&
        Array.isArray(parsed.jobs)
      ) {
        hydrateOwnerState(ownerId, parsed);
      }
    } catch {
      // Ignore malformed snapshots and continue with in-memory state.
    }
  }

  async function persist(ownerId: string): Promise<void> {
    if (!kv) return;
    const snapshot = exportOwnerState(ownerId);
    await kv.put(keyForOwner(ownerId), JSON.stringify(snapshot));
  }

  return {
    async listChats({ clientId }) {
      const ownerId = await resolveAssistantOwnerId(context, clientId);
      await ensureHydrated(ownerId);
      return listAssistantChats(ownerId);
    },

    async createChat({ clientId, title }) {
      const ownerId = await resolveAssistantOwnerId(context, clientId);
      await ensureHydrated(ownerId);
      const chat = createAssistantChat(ownerId, title);
      await persist(ownerId);
      return chat;
    },

    async listMessages({ clientId, chatId }) {
      const ownerId = await resolveAssistantOwnerId(context, clientId);
      await ensureHydrated(ownerId);
      return listAssistantMessages(ownerId, chatId);
    },

    async sendMessage({ clientId, chatId, payload }) {
      const ownerId = await resolveAssistantOwnerId(context, clientId);
      await ensureHydrated(ownerId);
      const anthropicApiKey = resolveAnthropicApiKey(context);
      const result = await sendAssistantMessage(ownerId, chatId, payload, {
        anthropicApiKey,
        textModel: "claude-sonnet-4-20250514",
        background: (promise) => {
          const withPersist = promise.then(() => persist(ownerId));
          runtime?.ctx?.waitUntil?.(withPersist);
        },
      });
      await persist(ownerId);
      return result;
    },

    async getJob({ clientId, jobId }) {
      const ownerId = await resolveAssistantOwnerId(context, clientId);
      await ensureHydrated(ownerId);
      return getAssistantJob(ownerId, jobId);
    },
  };
}

export function createAssistantGateway(context: APIContext): AssistantGateway {
  const remote = resolveAssistantBackendConfig(context);
  if (remote.baseUrl) {
    return createRemoteGateway(context, {
      baseUrl: remote.baseUrl,
      apiKey: remote.apiKey,
    });
  }

  return createLocalGateway(context);
}
