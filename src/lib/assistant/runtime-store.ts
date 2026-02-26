import { nanoid } from "nanoid";
import type { AssistantChat, AssistantJob, AssistantMessage } from "./types";

interface OwnerRuntimeState {
  chats: Map<string, AssistantChat>;
  messagesByChat: Map<string, AssistantMessage[]>;
  jobs: Map<string, AssistantJob>;
}

export interface OwnerRuntimeSnapshot {
  chats: AssistantChat[];
  messagesByChat: Record<string, AssistantMessage[]>;
  jobs: AssistantJob[];
}

const runtimeByOwner = new Map<string, OwnerRuntimeState>();

function getOwnerState(ownerId: string): OwnerRuntimeState {
  const existing = runtimeByOwner.get(ownerId);
  if (existing) {
    return existing;
  }

  const state: OwnerRuntimeState = {
    chats: new Map(),
    messagesByChat: new Map(),
    jobs: new Map(),
  };
  runtimeByOwner.set(ownerId, state);
  return state;
}

function now(): number {
  return Date.now();
}

export function hydrateOwnerState(ownerId: string, snapshot: OwnerRuntimeSnapshot): void {
  const state: OwnerRuntimeState = {
    chats: new Map(snapshot.chats.map((chat) => [chat.id, chat])),
    messagesByChat: new Map(
      Object.entries(snapshot.messagesByChat || {}).map(([chatId, messages]) => [
        chatId,
        [...messages].sort((a, b) => a.createdAt - b.createdAt),
      ]),
    ),
    jobs: new Map(snapshot.jobs.map((job) => [job.id, job])),
  };

  runtimeByOwner.set(ownerId, state);
}

export function exportOwnerState(ownerId: string): OwnerRuntimeSnapshot {
  const state = getOwnerState(ownerId);

  const messagesByChat: Record<string, AssistantMessage[]> = {};
  for (const [chatId, messages] of state.messagesByChat.entries()) {
    messagesByChat[chatId] = [...messages].sort((a, b) => a.createdAt - b.createdAt);
  }

  return {
    chats: Array.from(state.chats.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    messagesByChat,
    jobs: Array.from(state.jobs.values()).sort((a, b) => b.updatedAt - a.updatedAt),
  };
}

export function listChats(ownerId: string): AssistantChat[] {
  const state = getOwnerState(ownerId);
  return Array.from(state.chats.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createChat(ownerId: string, title?: string): AssistantChat {
  const state = getOwnerState(ownerId);
  const id = nanoid();
  const created = now();
  const chat: AssistantChat = {
    id,
    ownerId,
    title: title?.trim() || "New chat",
    createdAt: created,
    updatedAt: created,
    lastMessagePreview: "",
  };
  state.chats.set(id, chat);
  state.messagesByChat.set(id, []);
  return chat;
}

export function getChat(ownerId: string, chatId: string): AssistantChat | null {
  const state = getOwnerState(ownerId);
  return state.chats.get(chatId) ?? null;
}

export function deleteChat(ownerId: string, chatId: string): boolean {
  const state = getOwnerState(ownerId);
  if (!state.chats.has(chatId)) {
    return false;
  }

  state.chats.delete(chatId);
  state.messagesByChat.delete(chatId);

  for (const [jobId, job] of state.jobs.entries()) {
    if (job.chatId === chatId) {
      state.jobs.delete(jobId);
    }
  }

  return true;
}

export function clearChats(ownerId: string): number {
  const state = getOwnerState(ownerId);
  const removed = state.chats.size;
  if (removed === 0) {
    return 0;
  }

  state.chats.clear();
  state.messagesByChat.clear();
  state.jobs.clear();
  return removed;
}

export function listMessages(ownerId: string, chatId: string): AssistantMessage[] {
  const state = getOwnerState(ownerId);
  return [...(state.messagesByChat.get(chatId) ?? [])].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
}

export function addMessage(ownerId: string, message: Omit<AssistantMessage, "id" | "createdAt" | "updatedAt">): AssistantMessage {
  const state = getOwnerState(ownerId);
  const chat = state.chats.get(message.chatId);
  if (!chat) {
    throw new Error("Chat not found");
  }

  const created = now();
  const saved: AssistantMessage = {
    ...message,
    id: nanoid(),
    createdAt: created,
    updatedAt: created,
  };

  const current = state.messagesByChat.get(message.chatId) ?? [];
  current.push(saved);
  state.messagesByChat.set(message.chatId, current);

  chat.updatedAt = created;
  chat.lastMessagePreview = saved.text.slice(0, 120);
  if (chat.title === "New chat" && saved.role === "user") {
    chat.title = saved.text.slice(0, 40) || "New chat";
  }

  return saved;
}

export function updateMessage(
  ownerId: string,
  chatId: string,
  messageId: string,
  patch: Partial<AssistantMessage>,
): AssistantMessage | null {
  const state = getOwnerState(ownerId);
  const messages = state.messagesByChat.get(chatId);
  if (!messages) return null;

  const index = messages.findIndex((msg) => msg.id === messageId);
  if (index < 0) return null;

  const next: AssistantMessage = {
    ...messages[index],
    ...patch,
    updatedAt: now(),
  };
  messages[index] = next;

  const chat = state.chats.get(chatId);
  if (chat) {
    chat.updatedAt = next.updatedAt;
    chat.lastMessagePreview = next.text.slice(0, 120);
  }

  return next;
}

export function createJob(
  ownerId: string,
  input: Omit<AssistantJob, "id" | "createdAt" | "updatedAt" | "ownerId">,
): AssistantJob {
  const state = getOwnerState(ownerId);
  const created = now();
  const job: AssistantJob = {
    ...input,
    id: nanoid(),
    ownerId,
    createdAt: created,
    updatedAt: created,
  };
  state.jobs.set(job.id, job);
  return job;
}

export function getJob(ownerId: string, jobId: string): AssistantJob | null {
  const state = getOwnerState(ownerId);
  return state.jobs.get(jobId) ?? null;
}

export function updateJob(
  ownerId: string,
  jobId: string,
  patch: Partial<AssistantJob>,
): AssistantJob | null {
  const state = getOwnerState(ownerId);
  const current = state.jobs.get(jobId);
  if (!current) return null;

  const next: AssistantJob = {
    ...current,
    ...patch,
    updatedAt: now(),
  };

  state.jobs.set(jobId, next);
  return next;
}
