import React, { useCallback, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { captureScreenshot, useUnifiedCanvasStore } from "@/stores";
import type {
  AssistantArtifact,
  AssistantChat,
  AssistantMessage,
  AssistantMode,
  SketchControls,
} from "@/lib/assistant/types";
import { convertD2ToExcalidrawElements } from "@/lib/assistant/d2-converter";
import { vectorizeImageToSketchElements } from "@/lib/assistant/sketch-vectorizer";

export interface AIChatContainerProps {
  isOpen: boolean;
  onClose: () => void;
  initialWidth?: number;
}

const DEFAULT_SKETCH_CONTROLS: SketchControls = {
  style: "clean",
  complexity: "medium",
  colorPalette: 8,
  detailLevel: 0.75,
  edgeSensitivity: 18,
};

function getAssistantClientId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const key = "aw:assistant:client-id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const next = nanoid();
  window.localStorage.setItem(key, next);
  return next;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modeLabel(mode: AssistantMode): string {
  switch (mode) {
    case "mermaid":
      return "Mermaid";
    case "d2":
      return "D2";
    case "image":
      return "Image";
    case "sketch":
      return "Sketch";
    default:
      return "Chat";
  }
}

function modelLabel(mode: AssistantMode): string {
  if (mode === "image" || mode === "sketch") {
    return "Gemini 2.5 Flash Image";
  }
  return "Claude Sonnet 4";
}

async function fetchMermaidElements(code: string): Promise<unknown[]> {
  const { convertMermaidToCanvas } = await import("@/lib/mermaid-converter");
  const result = await convertMermaidToCanvas(code);
  return result.elements || [];
}

function MinimizedButton({
  onExpand,
  onClose,
}: {
  onExpand: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onExpand}
      style={{
        position: "fixed",
        right: 80,
        bottom: 20,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        zIndex: 1000,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
        Assistant
      </span>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        style={{
          border: "none",
          background: "transparent",
          color: "#6b7280",
          cursor: "pointer",
        }}
        title="Close"
      >
        ✕
      </button>
    </div>
  );
}

export default function AIChatContainer({
  isOpen,
  onClose,
  initialWidth = 940,
}: AIChatContainerProps) {
  const store = useUnifiedCanvasStore();
  const {
    isChatMinimized,
    setChatMinimized,
    dispatchCommand,
    addToast,
    getExcalidrawAPI,
  } = store;

  const [clientId] = useState(() => getAssistantClientId());
  const [chats, setChats] = useState<AssistantChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AssistantMode>("chat");
  const [sketchControls, setSketchControls] = useState<SketchControls>(
    DEFAULT_SKETCH_CONTROLS,
  );
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<string[]>([]);
  const [includeCanvasReference, setIncludeCanvasReference] = useState(true);

  const requestHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-assistant-client-id": clientId,
    }),
    [clientId],
  );

  const createChat = useCallback(async (): Promise<string> => {
    const response = await fetch("/api/assistant/chats", {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({ clientId, title: "New chat" }),
    });

    const data = await response.json();
    if (!response.ok || !data.chat?.id) {
      throw new Error(data.details || data.error || "Failed to create chat");
    }

    setChats((prev) => [data.chat, ...prev]);
    return data.chat.id as string;
  }, [clientId, requestHeaders]);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/assistant/chats?clientId=${encodeURIComponent(clientId)}`,
        { headers: requestHeaders },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to load chats");
      }

      const nextChats = (data.chats || []) as AssistantChat[];
      setChats(nextChats);

      if (nextChats.length === 0) {
        const newChatId = await createChat();
        setActiveChatId(newChatId);
      } else if (!activeChatId || !nextChats.find((chat) => chat.id === activeChatId)) {
        setActiveChatId(nextChats[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load chats");
    } finally {
      setLoadingChats(false);
    }
  }, [activeChatId, clientId, createChat, requestHeaders]);

  const loadMessages = useCallback(
    async (chatId: string) => {
      setLoadingMessages(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/assistant/chats/${chatId}/messages?clientId=${encodeURIComponent(clientId)}`,
          { headers: requestHeaders },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.details || data.error || "Failed to load messages");
        }

        setMessages((data.messages || []) as AssistantMessage[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    },
    [clientId, requestHeaders],
  );

  useEffect(() => {
    if (!isOpen || isChatMinimized) {
      return;
    }

    void loadChats();
  }, [isOpen, isChatMinimized, loadChats]);

  useEffect(() => {
    if (!isOpen || isChatMinimized || !activeChatId) {
      return;
    }
    void loadMessages(activeChatId);
  }, [activeChatId, isOpen, isChatMinimized, loadMessages]);

  useEffect(() => {
    const handleSetMode = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: AssistantMode }>;
      if (customEvent.detail?.mode) {
        setMode(customEvent.detail.mode);
      }
    };

    window.addEventListener("assistant:set-mode", handleSetMode);
    return () => window.removeEventListener("assistant:set-mode", handleSetMode);
  }, []);

  useEffect(() => {
    if (pendingJobs.length === 0) {
      return;
    }

    const timer = window.setInterval(async () => {
      const statuses = await Promise.all(
        pendingJobs.map(async (jobId) => {
          try {
            const response = await fetch(
              `/api/assistant/jobs/${jobId}?clientId=${encodeURIComponent(clientId)}`,
              { headers: requestHeaders },
            );
            const data = await response.json();
            if (!response.ok) {
              return { jobId, status: "failed" };
            }
            return { jobId, status: data.job?.status as string };
          } catch {
            return { jobId, status: "failed" };
          }
        }),
      );

      const unresolved = statuses
        .filter((entry) => entry.status === "queued" || entry.status === "running")
        .map((entry) => entry.jobId);

      if (unresolved.length !== pendingJobs.length && activeChatId) {
        await loadMessages(activeChatId);
      }

      setPendingJobs(unresolved);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [activeChatId, clientId, loadMessages, pendingJobs, requestHeaders]);

  const buildSourceImage = useCallback(async () => {
    if (!includeCanvasReference || (mode !== "image" && mode !== "sketch")) {
      return undefined;
    }

    const api = getExcalidrawAPI();
    if (!api) {
      return undefined;
    }

    const selectedIds = Object.entries(api.getAppState().selectedElementIds || {})
      .filter(([, selected]) => Boolean(selected))
      .map(([id]) => id);

    try {
      const screenshot = await captureScreenshot(api, {
        quality: "high",
        elementIds: selectedIds.length > 0 ? selectedIds : undefined,
      });
      return screenshot.dataUrl;
    } catch {
      return undefined;
    }
  }, [getExcalidrawAPI, includeCanvasReference, mode]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) {
      return;
    }

    let chatId = activeChatId;
    try {
      setSending(true);
      setError(null);

      if (!chatId) {
        chatId = await createChat();
        setActiveChatId(chatId);
      }

      const sourceImageDataUrl = await buildSourceImage();

      const response = await fetch(`/api/assistant/chats/${chatId}/messages`, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          clientId,
          text: input,
          generation: {
            mode,
            sourceImageDataUrl,
            sketch: sketchControls,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to send message");
      }

      setInput("");
      setPendingJobs((prev) => [...new Set([...prev, ...(data.pendingJobIds || [])])]);
      await loadMessages(chatId);
      await loadChats();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [
    activeChatId,
    buildSourceImage,
    clientId,
    createChat,
    input,
    loadChats,
    loadMessages,
    mode,
    requestHeaders,
    sending,
    sketchControls,
  ]);

  const handleAddImageToCanvas = useCallback(
    async (artifact: Extract<AssistantArtifact, { type: "image-data" }>) => {
      try {
        await dispatchCommand("insertImage", {
          imageData: artifact.dataUrl,
          type: artifact.mimeType.includes("png") ? "png" : "jpeg",
          width: artifact.width,
          height: artifact.height,
        });
        addToast("Image added to canvas", "success");
      } catch (canvasError) {
        addToast(
          `Failed to add image: ${canvasError instanceof Error ? canvasError.message : "Unknown error"}`,
          "error",
        );
      }
    },
    [addToast, dispatchCommand],
  );

  const handleVectorizeSketch = useCallback(
    async (artifact: Extract<AssistantArtifact, { type: "image-data" }>) => {
      try {
        const elements = await vectorizeImageToSketchElements(artifact.dataUrl, {
          controls: artifact.sketchControls || sketchControls,
        });

        await dispatchCommand("drawElements", {
          elements,
          isModification: false,
        });

        addToast(`Sketch vectorized: ${elements.length} elements`, "success", 4500);
      } catch (vectorizeError) {
        addToast(
          `Vectorization failed: ${vectorizeError instanceof Error ? vectorizeError.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [addToast, dispatchCommand, sketchControls],
  );

  const handleApplyCodeArtifact = useCallback(
    async (artifact: Extract<AssistantArtifact, { type: "code" }>) => {
      try {
        const elements = artifact.language === "mermaid"
          ? await fetchMermaidElements(artifact.code)
          : convertD2ToExcalidrawElements(artifact.code);

        if (!elements || elements.length === 0) {
          addToast("No drawable elements were generated", "info");
          return;
        }

        await dispatchCommand("drawElements", {
          elements,
          isModification: false,
        });
        addToast(`Added ${artifact.language.toUpperCase()} diagram to canvas`, "success");
      } catch (applyError) {
        addToast(
          `Failed to add diagram: ${applyError instanceof Error ? applyError.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [addToast, dispatchCommand],
  );

  const handleApplyElementArtifact = useCallback(
    async (artifact: Extract<AssistantArtifact, { type: "canvas-elements" }>) => {
      try {
        await dispatchCommand("drawElements", {
          elements: artifact.elements,
          isModification: false,
        });
        addToast("Elements added to canvas", "success");
      } catch (applyError) {
        addToast(
          `Failed to add elements: ${applyError instanceof Error ? applyError.message : "Unknown error"}`,
          "error",
        );
      }
    },
    [addToast, dispatchCommand],
  );

  if (!isOpen) {
    return null;
  }

  if (isChatMinimized) {
    return (
      <MinimizedButton
        onExpand={() => setChatMinimized(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 88,
        bottom: 20,
        width: `min(${initialWidth}px, calc(100vw - 104px))`,
        height: "min(760px, calc(100vh - 36px))",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        boxShadow: "0 16px 36px rgba(0, 0, 0, 0.14)",
        zIndex: 999,
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        overflow: "hidden",
      }}
    >
      <aside style={{ borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: 14, borderBottom: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              void createChat().then((chatId) => {
                setActiveChatId(chatId);
                setMessages([]);
              });
            }}
            style={{
              flex: 1,
              border: "1px solid #d1d5db",
              background: "#f8fafc",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New Chat
          </button>
          <button
            onClick={() => setChatMinimized(true)}
            title="Minimize"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6b7280" }}
          >
            _
          </button>
          <button
            onClick={onClose}
            title="Close"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6b7280" }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "10px 12px", fontSize: 11, color: "#6b7280" }}>
          {loadingChats ? "Loading chats..." : `${chats.length} chat${chats.length === 1 ? "" : "s"}`}
        </div>

        <div style={{ overflowY: "auto", padding: 8, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              style={{
                textAlign: "left",
                borderRadius: 8,
                border: activeChatId === chat.id ? "1px solid #60a5fa" : "1px solid #e5e7eb",
                background: activeChatId === chat.id ? "#eff6ff" : "#ffffff",
                padding: "10px 8px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {chat.title || "Untitled"}
              </div>
              {chat.lastMessagePreview ? (
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {chat.lastMessagePreview}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </aside>

      <section style={{ display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: 0 }}>
        <header style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: 13, color: "#111827" }}>Unified Assistant</strong>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Model: {modelLabel(mode)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 11, color: "#4b5563" }}>Mode</label>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as AssistantMode)}
              style={{ border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, padding: "4px 8px" }}
            >
              <option value="chat">Chat</option>
              <option value="mermaid">Mermaid</option>
              <option value="d2">D2</option>
              <option value="image">Image</option>
              <option value="sketch">Sketch</option>
            </select>
          </div>
        </header>

        <div style={{ overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {loadingMessages ? <div style={{ fontSize: 12, color: "#6b7280" }}>Loading messages...</div> : null}
          {!loadingMessages && messages.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Start a new chat and generate diagrams, sketches, and image assets directly in this window.
            </div>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                  background: isUser ? "#1f2937" : "#f8fafc",
                  color: isUser ? "#ffffff" : "#111827",
                  border: isUser ? "none" : "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                  {isUser ? "You" : "Assistant"} • {formatTime(message.createdAt)}
                  {!isUser ? ` • ${message.status}` : ""}
                </div>

                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{message.text}</div>

                {message.artifacts?.map((artifact, artifactIndex) => (
                  <div key={`${message.id}-${artifactIndex}`} style={{ marginTop: 10 }}>
                    {artifact.type === "code" ? (
                      <details>
                        <summary style={{ fontSize: 12, cursor: "pointer", color: "#2563eb" }}>
                          {artifact.language.toUpperCase()} source
                        </summary>
                        <pre
                          style={{
                            marginTop: 8,
                            fontSize: 11,
                            background: "#111827",
                            color: "#e5e7eb",
                            padding: 10,
                            borderRadius: 8,
                            overflowX: "auto",
                          }}
                        >
                          {artifact.code}
                        </pre>
                        <button
                          onClick={() => {
                            void handleApplyCodeArtifact(artifact);
                          }}
                          style={{
                            marginTop: 8,
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            borderRadius: 8,
                            padding: "6px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Add to Canvas
                        </button>
                      </details>
                    ) : null}

                    {artifact.type === "image-data" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <img
                          src={artifact.dataUrl}
                          alt="Generated"
                          style={{
                            maxWidth: "100%",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => {
                              void handleAddImageToCanvas(artifact);
                            }}
                            style={{
                              border: "1px solid #d1d5db",
                              background: "#ffffff",
                              borderRadius: 8,
                              padding: "6px 10px",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Add Image
                          </button>
                          {artifact.source === "sketch" ? (
                            <button
                              onClick={() => {
                                void handleVectorizeSketch(artifact);
                              }}
                              style={{
                                border: "1px solid #0f766e",
                                background: "#14b8a6",
                                color: "#ffffff",
                                borderRadius: 8,
                                padding: "6px 10px",
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              Vectorize to Canvas
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {artifact.type === "canvas-elements" ? (
                      <button
                        onClick={() => {
                          void handleApplyElementArtifact(artifact);
                        }}
                        style={{
                          border: "1px solid #d1d5db",
                          background: "#ffffff",
                          borderRadius: 8,
                          padding: "6px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Add Generated Elements
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            );
          })}

          {pendingJobs.length > 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {pendingJobs.length} background job{pendingJobs.length === 1 ? "" : "s"} running...
            </div>
          ) : null}

          {error ? (
            <div style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px" }}>
              {error}
            </div>
          ) : null}
        </div>

        <footer style={{ borderTop: "1px solid #f3f4f6", padding: 12, display: "grid", gap: 10 }}>
          {(mode === "image" || mode === "sketch") ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <label style={{ fontSize: 11, color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={includeCanvasReference}
                  onChange={(event) => setIncludeCanvasReference(event.target.checked)}
                />
                Use selected canvas content as reference
              </label>

              {mode === "sketch" ? (
                <>
                  <select
                    value={sketchControls.style}
                    onChange={(event) => {
                      setSketchControls((prev) => ({
                        ...prev,
                        style: event.target.value as SketchControls["style"],
                      }));
                    }}
                    style={{ border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, padding: "4px 8px" }}
                  >
                    <option value="clean">Clean</option>
                    <option value="hand-drawn">Hand-drawn</option>
                    <option value="technical">Technical</option>
                    <option value="organic">Organic</option>
                  </select>

                  <select
                    value={sketchControls.complexity}
                    onChange={(event) => {
                      setSketchControls((prev) => ({
                        ...prev,
                        complexity: event.target.value as SketchControls["complexity"],
                      }));
                    }}
                    style={{ border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, padding: "4px 8px" }}
                  >
                    <option value="low">Low detail</option>
                    <option value="medium">Medium detail</option>
                    <option value="high">High detail</option>
                  </select>

                  <label style={{ fontSize: 11, color: "#4b5563", display: "flex", alignItems: "center", gap: 6 }}>
                    Detail
                    <input
                      type="range"
                      min={0.2}
                      max={1}
                      step={0.05}
                      value={sketchControls.detailLevel}
                      onChange={(event) => {
                        setSketchControls((prev) => ({
                          ...prev,
                          detailLevel: Number(event.target.value),
                        }));
                      }}
                    />
                  </label>
                </>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={`(${modeLabel(mode)}) Ask assistant...`}
              style={{
                flex: 1,
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
              }}
            />
            <button
              onClick={() => {
                void handleSend();
              }}
              disabled={sending || !input.trim()}
              style={{
                border: "1px solid #0f172a",
                background: sending ? "#cbd5e1" : "#111827",
                color: "#ffffff",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
