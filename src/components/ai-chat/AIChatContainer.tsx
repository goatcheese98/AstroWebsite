import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { captureScreenshot, useUnifiedCanvasStore } from "@/stores";
import type {
  AssistantArtifact,
  AssistantChat,
  AssistantExpert,
  AssistantMessage,
  SketchControls,
  VisualColorMode,
} from "@/lib/assistant/types";
import {
  normalizeSketchImageDataUrl,
  vectorizeImageToSketch,
} from "@/lib/assistant/sketch-vectorizer";
import {
  downloadBlob,
  fetchMermaidRenderPayload,
  renderCodeArtifactToSvg,
  svgToDataUrl,
  svgToPngBlob,
  type D2RenderVariant,
} from "@/lib/assistant/diagram-renderer";

export interface AIChatContainerProps {
  isOpen: boolean;
  initialWidth?: number;
}

type VectorizeComplexity = "low" | "medium" | "high";

interface VisualGenerationControls {
  colorMode: VisualColorMode;
}

interface VectorizeControls {
  paletteDepth: number;
  complexity: VectorizeComplexity;
  edgeFidelity: number;
}

const DEFAULT_VISUAL_GENERATION_CONTROLS: VisualGenerationControls = {
  colorMode: "color",
};

const DEFAULT_VECTORIZER_CONTROLS: VectorizeControls = {
  paletteDepth: 16,
  complexity: "medium",
  edgeFidelity: 30,
};

const MAX_REFERENCE_IMAGE_BYTES = 2_500_000;

function sketchControlsFromVectorizeControls(
  controls: VectorizeControls,
  visual: VisualGenerationControls,
): SketchControls {
  const detailByComplexity: Record<VectorizeComplexity, number> = {
    low: 0.55,
    medium: 0.78,
    high: 0.95,
  };

  return {
    style: "clean",
    complexity: controls.complexity,
    colorPalette:
      visual.colorMode === "bw"
        ? Math.max(2, Math.min(12, controls.paletteDepth))
        : controls.paletteDepth,
    detailLevel: detailByComplexity[controls.complexity],
    edgeSensitivity: controls.edgeFidelity,
  };
}

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

function expertLabel(expert: AssistantExpert): string {
  if (expert === "mermaid") return "Mermaid Expert";
  if (expert === "d2") return "D2 Expert";
  if (expert === "visual") return "Visual Expert";
  return "General Expert";
}

function modelLabel(expert: AssistantExpert): string {
  if (expert === "visual") {
    return "Gemini 2.5 Flash Image";
  }
  return "Claude Sonnet 4.6";
}

function expertFromMessage(message: AssistantMessage): AssistantExpert {
  if (
    message.expert === "general" ||
    message.expert === "mermaid" ||
    message.expert === "d2" ||
    message.expert === "visual"
  ) {
    return message.expert;
  }
  return "general";
}

function expertTheme(expert: AssistantExpert) {
  if (expert === "mermaid") {
    return {
      background: "rgba(239,246,255,0.9)",
      border: "1px solid rgba(147,197,253,0.95)",
      badgeBg: "#dbeafe",
      badgeFg: "#1e3a8a",
    };
  }

  if (expert === "d2") {
    return {
      background: "rgba(236,253,245,0.9)",
      border: "1px solid rgba(110,231,183,0.95)",
      badgeBg: "#d1fae5",
      badgeFg: "#065f46",
    };
  }

  if (expert === "visual") {
    return {
      background: "rgba(254,242,242,0.9)",
      border: "1px solid rgba(252,165,165,0.95)",
      badgeBg: "#fee2e2",
      badgeFg: "#991b1b",
    };
  }

  return {
    background: "rgba(248,250,252,0.9)",
    border: "1px solid rgba(226,232,240,0.95)",
    badgeBg: "#e2e8f0",
    badgeFg: "#334155",
  };
}

function ArtifactPreviewImage({
  artifact,
}: {
  artifact: Extract<AssistantArtifact, { type: "image-data" }>;
}) {
  const [src, setSrc] = useState(artifact.dataUrl);

  useEffect(() => {
    let isActive = true;

    void normalizeSketchImageDataUrl(artifact.dataUrl)
      .then((normalized) => {
        if (isActive) {
          setSrc(normalized);
        }
      })
      .catch(() => {
        if (isActive) {
          setSrc(artifact.dataUrl);
        }
      });

    return () => {
      isActive = false;
    };
  }, [artifact.dataUrl]);

  return (
    <img
      src={src}
      alt="Generated"
      style={{
        maxWidth: "100%",
        borderRadius: 8,
        border: "1px solid #d1d5db",
        background: "#ffffff",
      }}
    />
  );
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    .trim();
}

function chatMonogram(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "•";
  return trimmed.charAt(0).toUpperCase();
}

async function resolveImageDimensions(
  imageDataUrl: string,
  fallback: { width: number; height: number },
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const naturalWidth = Math.max(
        1,
        Math.round(img.naturalWidth || img.width || fallback.width),
      );
      const naturalHeight = Math.max(
        1,
        Math.round(img.naturalHeight || img.height || fallback.height),
      );
      resolve({ width: naturalWidth, height: naturalHeight });
    };
    img.onerror = () => {
      resolve({
        width: Math.max(1, Math.round(fallback.width)),
        height: Math.max(1, Math.round(fallback.height)),
      });
    };
    img.src = imageDataUrl;
  });
}

function TypingDots() {
  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        alignItems: "center",
        padding: "4px 2px",
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#94a3b8",
            animation: `typingBounce 1.4s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function AIChatContainer({
  isOpen,
  initialWidth = 352,
}: AIChatContainerProps) {
  const store = useUnifiedCanvasStore();
  const {
    isChatMinimized,
    setChatOpen,
    dispatchCommand,
    addToast,
    getExcalidrawAPI,
  } = store;

  const [clientId] = useState(() => getAssistantClientId());
  const [chats, setChats] = useState<AssistantChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedExpert, setSelectedExpert] =
    useState<AssistantExpert>("general");
  const [visualGenerationControls, setVisualGenerationControls] =
    useState<VisualGenerationControls>(DEFAULT_VISUAL_GENERATION_CONTROLS);
  const [vectorizeControls, setVectorizeControls] = useState<VectorizeControls>(
    DEFAULT_VECTORIZER_CONTROLS,
  );
  const [sending, setSending] = useState(false);
  const [optimisticInput, setOptimisticInput] = useState<string>("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [includeCanvasReference, setIncludeCanvasReference] = useState(true);
  const [sketchMetadataByArtifact, setSketchMetadataByArtifact] = useState<
    Record<
      string,
      {
        sourceWidth: number;
        sourceHeight: number;
        workingWidth: number;
        workingHeight: number;
        numColorsRequested: number;
        numColorsUsed: number;
        backgroundLabel: number;
        morphologyKernelSize: number;
        epsilon: number;
        minArea: number;
        componentsFound: number;
        componentsFiltered: number;
        elementsCreated: number;
        elementsEmitted: number;
        outlineComponentsFound?: number;
        outlineElementsCreated?: number;
        processingMs: number;
      }
    >
  >({});
  const [sketchLogsByArtifact, setSketchLogsByArtifact] = useState<
    Record<string, string[]>
  >({});
  const [vectorizeSettingsByArtifact, setVectorizeSettingsByArtifact] =
    useState<
      Record<
        string,
        {
          paletteDepth: number;
          complexity: VectorizeComplexity;
          edgeFidelity: number;
        }
      >
    >({});
  const [vectorizeSummaryByArtifact, setVectorizeSummaryByArtifact] = useState<
    Record<string, string>
  >({});
  const [d2RenderVariantByArtifact, setD2RenderVariantByArtifact] = useState<
    Record<string, D2RenderVariant>
  >({});
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const historyExpandedWidth = 268;
  const historyCollapsedWidth = 74;
  const chatContentWidth = Math.max(300, Math.min(initialWidth, 494));
  const historyWidth = isHistoryCollapsed
    ? historyCollapsedWidth
    : historyExpandedWidth;
  const panelWidth = `min(${chatContentWidth + historyWidth}px, calc(100vw - 96px))`;
  const historyTextDelay = isHistoryCollapsed ? "0ms" : "92ms";
  const historyTextTransition = `opacity 180ms ease ${historyTextDelay}, transform 180ms ease ${historyTextDelay}`;
  const historyIconTransition = "opacity 110ms ease, transform 110ms ease";

  const requestHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-assistant-client-id": clientId,
    }),
    [clientId],
  );

  useEffect(() => {
    if (isHistoryCollapsed) {
      setHoveredChatId(null);
    }
  }, [isHistoryCollapsed]);

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

  const handleCreateNewChat = useCallback(() => {
    void createChat().then((chatId) => {
      setActiveChatId(chatId);
      setMessages([]);
    });
  }, [createChat]);

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Delete this chat from history?");
        if (!confirmed) {
          return;
        }
      }

      void (async () => {
        try {
          setError(null);
          const response = await fetch(
            `/api/assistant/chats/${encodeURIComponent(chatId)}?clientId=${encodeURIComponent(clientId)}`,
            {
              method: "DELETE",
              headers: requestHeaders,
            },
          );
          const data = await response
            .json()
            .catch(() => ({}) as Record<string, unknown>);
          if (!response.ok) {
            throw new Error(
              (typeof data.details === "string" && data.details) ||
                (typeof data.error === "string" && data.error) ||
                "Failed to delete chat",
            );
          }

          const remainingChats = chats.filter((chat) => chat.id !== chatId);
          setChats(remainingChats);

          if (activeChatId === chatId) {
            setMessages([]);
            if (remainingChats.length > 0) {
              setActiveChatId(remainingChats[0].id);
              return;
            }

            const newChatId = await createChat();
            setActiveChatId(newChatId);
          }
        } catch (deleteError) {
          setError(
            deleteError instanceof Error
              ? deleteError.message
              : "Failed to delete chat",
          );
        }
      })();
    },
    [activeChatId, chats, clientId, createChat, requestHeaders],
  );

  const handleClearChatHistory = useCallback(() => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Clear all chats in history?");
      if (!confirmed) {
        return;
      }
    }

    void (async () => {
      try {
        setError(null);
        const response = await fetch(
          `/api/assistant/chats?clientId=${encodeURIComponent(clientId)}`,
          {
            method: "DELETE",
            headers: requestHeaders,
            body: JSON.stringify({ clientId }),
          },
        );
        const data = await response
          .json()
          .catch(() => ({}) as Record<string, unknown>);
        if (!response.ok) {
          throw new Error(
            (typeof data.details === "string" && data.details) ||
              (typeof data.error === "string" && data.error) ||
              "Failed to clear chat history",
          );
        }

        setChats([]);
        setMessages([]);
        setPendingJobs([]);
        setActiveChatId(null);
        const newChatId = await createChat();
        setActiveChatId(newChatId);
        addToast("Chat history cleared", "success");
      } catch (clearError) {
        setError(
          clearError instanceof Error
            ? clearError.message
            : "Failed to clear chat history",
        );
      }
    })();
  }, [addToast, clientId, createChat, requestHeaders]);

  const loadChats = useCallback(async () => {
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
      } else if (
        !activeChatId ||
        !nextChats.find((chat) => chat.id === activeChatId)
      ) {
        setActiveChatId(nextChats[0].id);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load chats",
      );
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
          throw new Error(
            data.details || data.error || "Failed to load messages",
          );
        }

        setMessages((data.messages || []) as AssistantMessage[]);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load messages",
        );
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

  // Auto-scroll to bottom when messages load or sending state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  // Auto-scroll while streaming text arrives
  useEffect(() => {
    if (streamingText !== null) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
      });
    }
  }, [streamingText]);

  useEffect(() => {
    const handleSetMode = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: string }>;
      if (!customEvent.detail?.mode) {
        return;
      }

      if (customEvent.detail.mode === "mermaid") {
        setSelectedExpert("mermaid");
        return;
      }

      if (customEvent.detail.mode === "d2") {
        setSelectedExpert("d2");
        return;
      }

      if (
        customEvent.detail.mode === "image" ||
        customEvent.detail.mode === "sketch"
      ) {
        setSelectedExpert("visual");
        return;
      }

      setSelectedExpert("general");
    };

    const handleSetExpert = (event: Event) => {
      const customEvent = event as CustomEvent<{ expert?: AssistantExpert }>;
      const expert = customEvent.detail?.expert;
      if (
        expert === "general" ||
        expert === "mermaid" ||
        expert === "d2" ||
        expert === "visual"
      ) {
        setSelectedExpert(expert);
      }
    };

    window.addEventListener("assistant:set-mode", handleSetMode);
    window.addEventListener("assistant:set-expert", handleSetExpert);
    return () => {
      window.removeEventListener("assistant:set-mode", handleSetMode);
      window.removeEventListener("assistant:set-expert", handleSetExpert);
    };
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
        .filter(
          (entry) => entry.status === "queued" || entry.status === "running",
        )
        .map((entry) => entry.jobId);

      if (unresolved.length !== pendingJobs.length && activeChatId) {
        await loadMessages(activeChatId);
      }

      setPendingJobs(unresolved);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [activeChatId, clientId, loadMessages, pendingJobs, requestHeaders]);

  const buildSourceImage = useCallback(async () => {
    if (!includeCanvasReference || selectedExpert !== "visual") {
      return undefined;
    }

    const api = getExcalidrawAPI();
    if (!api) {
      return undefined;
    }

    const selectedIds = Object.entries(
      api.getAppState().selectedElementIds || {},
    )
      .filter(([, selected]) => Boolean(selected))
      .map(([id]) => id);

    try {
      const screenshot = await captureScreenshot(api, {
        quality: "preview",
        elementIds: selectedIds.length > 0 ? selectedIds : undefined,
      });

      const base64Payload = screenshot.dataUrl.split(",")[1] || "";
      const approxBytes = Math.floor((base64Payload.length * 3) / 4);
      if (approxBytes > MAX_REFERENCE_IMAGE_BYTES) {
        addToast(
          "Canvas reference skipped because selection is too large. Select fewer elements or disable reference.",
          "info",
          4500,
        );
        return undefined;
      }

      return screenshot.dataUrl;
    } catch {
      return undefined;
    }
  }, [addToast, getExcalidrawAPI, includeCanvasReference, selectedExpert]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) {
      return;
    }

    const messageText = input.trim();
    let chatId = activeChatId;

    try {
      setSending(true);
      setOptimisticInput(messageText);
      setInput("");
      setError(null);

      if (!chatId) {
        chatId = await createChat();
        setActiveChatId(chatId);
      }

      if (selectedExpert === "general") {
        setStreamingText("");

        const response = await fetch(
          `/api/assistant/chats/${chatId}/messages?stream=true`,
          {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify({
              clientId,
              text: messageText,
              generation: { expert: selectedExpert },
            }),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            (data as any).details ||
              (data as any).error ||
              "Failed to send message",
          );
        }

        const contentType = response.headers.get("Content-Type") || "";
        if (contentType.includes("text/event-stream") && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split("\n\n");
              buffer = parts.pop() ?? "";
              for (const part of parts) {
                for (const line of part.split("\n")) {
                  if (!line.startsWith("data: ")) continue;
                  let event: { type: string; text?: string; error?: string };
                  try {
                    event = JSON.parse(line.slice(6));
                  } catch {
                    continue;
                  }
                  if (
                    event.type === "text_delta" &&
                    typeof event.text === "string"
                  ) {
                    setStreamingText((prev) => (prev ?? "") + event.text!);
                  } else if (event.type === "error") {
                    throw new Error(event.error || "Stream error");
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        } else {
          // JSON fallback (remote backend doesn't stream)
          const data = await response.json();
          setPendingJobs((prev) => [
            ...new Set([...prev, ...(data.pendingJobIds || [])]),
          ]);
        }
      } else {
        const sourceImageDataUrl = await buildSourceImage();

        const response = await fetch(
          `/api/assistant/chats/${chatId}/messages`,
          {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify({
              clientId,
              text: messageText,
              generation: {
                expert: selectedExpert,
                sourceImageDataUrl,
                visual: visualGenerationControls,
              },
            }),
          },
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.details || data.error || "Failed to send message",
          );
        }

        setPendingJobs((prev) => [
          ...new Set([...prev, ...(data.pendingJobIds || [])]),
        ]);
      }

      await loadMessages(chatId);
      await loadChats();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to send message",
      );
    } finally {
      setSending(false);
      setOptimisticInput("");
      setStreamingText(null);
    }
  }, [
    activeChatId,
    buildSourceImage,
    clientId,
    createChat,
    input,
    loadChats,
    loadMessages,
    selectedExpert,
    requestHeaders,
    sending,
    visualGenerationControls,
  ]);

  const handleAddImageToCanvas = useCallback(
    async (artifact: Extract<AssistantArtifact, { type: "image-data" }>) => {
      try {
        const imageData = await normalizeSketchImageDataUrl(artifact.dataUrl);

        await dispatchCommand("insertImage", {
          imageData,
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

  const handleDownloadImageArtifactSvg = useCallback(
    async (artifact: Extract<AssistantArtifact, { type: "image-data" }>) => {
      try {
        const imageData = await normalizeSketchImageDataUrl(artifact.dataUrl);
        const width = Math.max(1, Math.round(artifact.width || 1024));
        const height = Math.max(1, Math.round(artifact.height || 1024));
        const safeHref = imageData
          .replaceAll("&", "&amp;")
          .replaceAll('"', "&quot;");
        const svgMarkup = [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
          `<rect width="100%" height="100%" fill="#ffffff"/>`,
          `<image href="${safeHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`,
          "</svg>",
        ].join("");
        downloadBlob(
          new Blob([svgMarkup], { type: "image/svg+xml" }),
          "visual-asset.svg",
        );
        addToast("SVG downloaded", "success");
      } catch (error) {
        addToast(
          `Failed to download SVG: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [addToast],
  );

  const handleDownloadImageArtifactPng = useCallback(
    async (artifact: Extract<AssistantArtifact, { type: "image-data" }>) => {
      try {
        const imageData = await normalizeSketchImageDataUrl(artifact.dataUrl);
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Failed to decode image"));
          img.src = imageData;
        });

        const width = Math.max(
          1,
          Math.round(
            artifact.width || image.naturalWidth || image.width || 1024,
          ),
        );
        const height = Math.max(
          1,
          Math.round(
            artifact.height || image.naturalHeight || image.height || 1024,
          ),
        );
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Canvas context is unavailable");
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const pngBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/png");
        });
        if (!pngBlob) {
          throw new Error("Failed to convert image to PNG");
        }

        downloadBlob(pngBlob, "visual-asset.png");
        addToast("PNG downloaded", "success");
      } catch (error) {
        addToast(
          `Failed to download PNG: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [addToast],
  );

  const handleVectorizeImage = useCallback(
    async (
      artifact: Extract<AssistantArtifact, { type: "image-data" }>,
      artifactKey: string,
    ) => {
      setVectorizeSummaryByArtifact((prev) => ({
        ...prev,
        [artifactKey]: "Vectorizing...",
      }));
      try {
        const effectiveVisual: VisualGenerationControls = {
          colorMode:
            artifact.visual?.colorMode || visualGenerationControls.colorMode,
        };
        const effectiveSketchControls = sketchControlsFromVectorizeControls(
          vectorizeControls,
          effectiveVisual,
        );

        const result = await vectorizeImageToSketch(artifact.dataUrl, {
          controls: artifact.sketchControls || effectiveSketchControls,
        });

        const elements = result.elements;

        const drawPayload = {
          elements,
          isModification: false,
        };
        try {
          await dispatchCommand("drawElements", drawPayload);
        } catch (dispatchError) {
          const message =
            dispatchError instanceof Error
              ? dispatchError.message
              : String(dispatchError);
          if (!message.includes("Another command is already pending")) {
            throw dispatchError;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 90));
          await dispatchCommand("drawElements", drawPayload);
        }

        setSketchMetadataByArtifact((prev) => ({
          ...prev,
          [artifactKey]: result.metadata,
        }));
        setSketchLogsByArtifact((prev) => ({
          ...prev,
          [artifactKey]: result.logs,
        }));
        setVectorizeSettingsByArtifact((prev) => ({
          ...prev,
          [artifactKey]: {
            paletteDepth: vectorizeControls.paletteDepth,
            complexity: vectorizeControls.complexity,
            edgeFidelity: vectorizeControls.edgeFidelity,
          },
        }));
        setVectorizeSummaryByArtifact((prev) => ({
          ...prev,
          [artifactKey]: `${elements.length} shapes created`,
        }));

        addToast(
          `Vectorized to canvas: ${elements.length} shapes`,
          "success",
          4500,
        );
      } catch (vectorizeError) {
        setVectorizeSummaryByArtifact((prev) => ({
          ...prev,
          [artifactKey]: "Vectorization failed",
        }));
        addToast(
          `Vectorization failed: ${vectorizeError instanceof Error ? vectorizeError.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [addToast, dispatchCommand, vectorizeControls, visualGenerationControls],
  );

  const handleApplyCodeArtifact = useCallback(
    async (artifact: Extract<AssistantArtifact, { type: "code" }>) => {
      try {
        if (artifact.language !== "mermaid") {
          addToast(
            "Editable D2 diagrams are disabled for now. Use Add SVG to Canvas instead.",
            "info",
            4500,
          );
          return;
        }
        const elements = (await fetchMermaidRenderPayload(artifact.code))
          .elements;

        if (!elements || elements.length === 0) {
          addToast("No drawable elements were generated", "info");
          return;
        }

        await dispatchCommand("drawElements", {
          elements,
          isModification: false,
        });
        addToast("Added MERMAID diagram to canvas", "success");
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

  const copyToClipboard = useCallback(
    async (text: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(text);
        addToast(successMessage, "success");
      } catch (error) {
        addToast(
          `Copy failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [addToast],
  );

  const handleAddAssistantTextAsMarkdownNote = useCallback(
    async (markdown: string) => {
      try {
        await dispatchCommand("drawElements", {
          elements: [
            {
              type: "rectangle",
              x: 0,
              y: 0,
              width: 560,
              height: 360,
              backgroundColor: "#ffffff",
              strokeColor: "transparent",
              strokeWidth: 0,
              roughness: 0,
              opacity: 100,
              fillStyle: "solid",
              customData: {
                type: "markdown",
                content: markdown || "# New Note",
              },
            },
          ],
          isModification: false,
        });
        addToast("Added markdown note to canvas", "success");
      } catch (error) {
        addToast(
          `Failed to add markdown note: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
        );
      }
    },
    [addToast, dispatchCommand],
  );

  const buildCodeArtifactSvg = useCallback(
    async (
      artifact: Extract<AssistantArtifact, { type: "code" }>,
      d2Variant: D2RenderVariant,
    ): Promise<{ svgMarkup: string; width: number; height: number }> => {
      return renderCodeArtifactToSvg({
        language: artifact.language,
        code: artifact.code,
        d2Variant,
      });
    },
    [],
  );

  const handleAddCodeArtifactSvgToCanvas = useCallback(
    async (
      artifact: Extract<AssistantArtifact, { type: "code" }>,
      artifactKey: string,
    ) => {
      try {
        const d2Variant =
          artifact.language === "d2"
            ? d2RenderVariantByArtifact[artifactKey] || "default"
            : "default";
        const { svgMarkup, width, height } = await buildCodeArtifactSvg(
          artifact,
          d2Variant,
        );
        const imageData = svgToDataUrl(svgMarkup);
        const naturalDimensions = await resolveImageDimensions(imageData, {
          width,
          height,
        });

        await dispatchCommand("insertImage", {
          imageData,
          type: "svg",
          width: naturalDimensions.width,
          height: naturalDimensions.height,
        });

        addToast("SVG added to canvas", "success");
      } catch (error) {
        addToast(
          `Failed to add SVG: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [
      addToast,
      buildCodeArtifactSvg,
      d2RenderVariantByArtifact,
      dispatchCommand,
    ],
  );

  const handleDownloadCodeArtifactSvg = useCallback(
    async (
      artifact: Extract<AssistantArtifact, { type: "code" }>,
      artifactKey: string,
    ) => {
      try {
        const d2Variant =
          artifact.language === "d2"
            ? d2RenderVariantByArtifact[artifactKey] || "default"
            : "default";
        const { svgMarkup } = await buildCodeArtifactSvg(artifact, d2Variant);
        const variantSuffix = artifact.language === "d2" ? `-${d2Variant}` : "";
        downloadBlob(
          new Blob([svgMarkup], { type: "image/svg+xml" }),
          `${artifact.language}-diagram${variantSuffix}.svg`,
        );
        addToast("SVG downloaded", "success");
      } catch (error) {
        addToast(
          `Failed to download SVG: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [addToast, buildCodeArtifactSvg, d2RenderVariantByArtifact],
  );

  const handleDownloadCodeArtifactPng = useCallback(
    async (
      artifact: Extract<AssistantArtifact, { type: "code" }>,
      artifactKey: string,
    ) => {
      try {
        const d2Variant =
          artifact.language === "d2"
            ? d2RenderVariantByArtifact[artifactKey] || "default"
            : "default";
        const { svgMarkup, width, height } = await buildCodeArtifactSvg(
          artifact,
          d2Variant,
        );
        const png = await svgToPngBlob(svgMarkup, width, height);
        const variantSuffix = artifact.language === "d2" ? `-${d2Variant}` : "";
        downloadBlob(png, `${artifact.language}-diagram${variantSuffix}.png`);
        addToast("PNG downloaded", "success");
      } catch (error) {
        addToast(
          `Failed to download PNG: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
          4500,
        );
      }
    },
    [addToast, buildCodeArtifactSvg, d2RenderVariantByArtifact],
  );

  const handleApplyElementArtifact = useCallback(
    async (
      artifact: Extract<AssistantArtifact, { type: "canvas-elements" }>,
    ) => {
      try {
        if (artifact.source === "d2") {
          addToast(
            "Editable D2 diagrams are disabled for now. Use Add SVG to Canvas instead.",
            "info",
            4500,
          );
          return;
        }
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
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 54,
        bottom: 20,
        width: panelWidth,
        height: "min(744px, calc(100vh - 34px))",
        background:
          "linear-gradient(130deg, rgba(255,255,255,0.52), rgba(248,250,252,0.4))",
        border: "1px solid rgba(203,213,225,0.58)",
        borderRadius: 16,
        boxShadow: "0 18px 42px rgba(15,23,42,0.13)",
        backdropFilter: "blur(22px) saturate(1.08) brightness(1.04)",
        WebkitBackdropFilter: "blur(22px) saturate(1.08) brightness(1.04)",
        zIndex: 999,
        display: "grid",
        gridTemplateColumns: `${historyWidth}px minmax(0, 1fr)`,
        overflow: "hidden",
        transition:
          "width 0.3s cubic-bezier(0.22, 1, 0.36, 1), grid-template-columns 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "width, grid-template-columns",
        fontFamily: "var(--font-body, var(--font-ui, sans-serif))",
        color: "#0f172a",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid rgba(226,232,240,0.82)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          background: "rgba(255,255,255,0.44)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr",
            minHeight: 0,
            height: "100%",
          }}
        >
          <div
            style={{
              padding: "13px 8px",
              borderBottom: "1px solid rgba(226,232,240,0.78)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: isHistoryCollapsed ? "center" : "space-between",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#64748b",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                maxWidth: isHistoryCollapsed ? 0 : 120,
                opacity: isHistoryCollapsed ? 0 : 1,
                transform: isHistoryCollapsed
                  ? "translateX(-6px)"
                  : "translateX(0)",
                transition: `max-width 220ms ease ${historyTextDelay}, ${historyTextTransition}`,
                pointerEvents: "none",
              }}
            >
              Chat history
            </span>
            <button
              onClick={() => setIsHistoryCollapsed((prev) => !prev)}
              title={
                isHistoryCollapsed
                  ? "Expand chat history"
                  : "Collapse chat history"
              }
              style={{
                border: "none",
                background: "transparent",
                color: "#334155",
                borderRadius: 10,
                width: 40,
                height: 40,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "color 0.16s ease",
              }}
              aria-label={
                isHistoryCollapsed
                  ? "Expand chat history"
                  : "Collapse chat history"
              }
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2.2" />
                <line x1="6.1" y1="2.8" x2="6.1" y2="13.2" />
              </svg>
            </button>
          </div>

          <div
            style={{
              overflowY: "auto",
              padding: "8px",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "stretch",
              transition: "padding 220ms ease",
            }}
          >
            {chats.map((chat) => (
              <div
                key={chat.id}
                style={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                }}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                <button
                  onClick={() => setActiveChatId(chat.id)}
                  title={
                    isHistoryCollapsed ? chat.title || "Untitled" : undefined
                  }
                  style={{
                    width: isHistoryCollapsed ? 44 : "100%",
                    minHeight: isHistoryCollapsed ? 44 : 56,
                    textAlign: "left",
                    borderRadius: isHistoryCollapsed ? "50%" : 10,
                    border: isHistoryCollapsed
                      ? activeChatId === chat.id
                        ? "2px solid #60a5fa"
                        : "1px solid rgba(226,232,240,0.95)"
                      : "none",
                    background:
                      activeChatId === chat.id
                        ? isHistoryCollapsed
                          ? "rgba(219,234,254,0.9)"
                          : "rgba(219,234,254,0.6)"
                        : isHistoryCollapsed
                          ? "rgba(255,255,255,0.88)"
                          : "transparent",
                    padding: isHistoryCollapsed ? 0 : "10px 34px 10px 14px",
                    cursor: "pointer",
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: isHistoryCollapsed ? "center" : "flex-start",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow:
                      isHistoryCollapsed && activeChatId === chat.id
                        ? "0 0 0 2px rgba(96,165,250,0.25)"
                        : "none",
                    transition:
                      "width 240ms cubic-bezier(0.22, 1, 0.36, 1), padding 220ms ease, background 140ms ease, border-radius 220ms ease, border-color 140ms ease, box-shadow 140ms ease",
                  }}
                >
                  {/* Left accent bar for active state - only in expanded view */}
                  {!isHistoryCollapsed && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        bottom: "20%",
                        width: 3,
                        borderRadius: "0 4px 4px 0",
                        background: "#3b82f6",
                        opacity: activeChatId === chat.id ? 1 : 0,
                        transform:
                          activeChatId === chat.id ? "scaleY(1)" : "scaleY(0)",
                        transition: "opacity 140ms ease, transform 140ms ease",
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      minHeight: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isHistoryCollapsed
                        ? "center"
                        : "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: activeChatId === chat.id ? 600 : 400,
                        color: activeChatId === chat.id ? "#1d4ed8" : "#475569",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        opacity: isHistoryCollapsed ? 0 : 1,
                        transform: isHistoryCollapsed
                          ? "translateY(-3px)"
                          : "translateY(0)",
                        transition: historyTextTransition,
                      }}
                    >
                      {chat.title || "Untitled"}
                    </span>
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        color: activeChatId === chat.id ? "#2563eb" : "#94a3b8",
                        opacity: isHistoryCollapsed ? 1 : 0,
                        transform: isHistoryCollapsed
                          ? "translateY(0)"
                          : "translateY(3px)",
                        transition: historyIconTransition,
                      }}
                    >
                      {chatMonogram(chat.title || "Untitled")}
                    </span>
                  </div>
                  {chat.lastMessagePreview ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: activeChatId === chat.id ? "#64748b" : "#94a3b8",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: isHistoryCollapsed ? 0 : 3,
                        maxHeight: isHistoryCollapsed ? 0 : 18,
                        opacity: isHistoryCollapsed ? 0 : 1,
                        transition: `max-height 180ms ease ${historyTextDelay}, margin-top 180ms ease ${historyTextDelay}, opacity 160ms ease ${historyTextDelay}`,
                      }}
                    >
                      {chat.lastMessagePreview}
                    </div>
                  ) : null}
                </button>

                <button
                  onClick={() => handleDeleteChat(chat.id)}
                  title="Delete chat"
                  aria-label="Delete chat"
                  style={{
                    width: 26,
                    height: 26,
                    border: "1px solid rgba(226,232,240,0.95)",
                    background: "rgba(255,255,255,0.86)",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "#64748b",
                    fontSize: 14,
                    lineHeight: 1,
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: `translateY(-50%) ${!isHistoryCollapsed && hoveredChatId === chat.id ? "scale(1)" : "scale(0.9)"}`,
                    opacity:
                      !isHistoryCollapsed && hoveredChatId === chat.id ? 1 : 0,
                    pointerEvents:
                      !isHistoryCollapsed && hoveredChatId === chat.id
                        ? "auto"
                        : "none",
                    transition: "opacity 0.16s ease, transform 0.16s ease",
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            <div
              style={{
                width: "calc(100% + 16px)",
                marginLeft: "-8px",
                marginTop: 2,
                paddingTop: 8,
                paddingLeft: 8,
                paddingRight: 8,
                borderTop: "1px solid rgba(226,232,240,0.66)",
                display: "grid",
                gap: 6,
                justifyItems: isHistoryCollapsed ? "center" : "stretch",
                boxSizing: "border-box",
              }}
            >
              <button
                onClick={handleCreateNewChat}
                title="New chat"
                style={{
                  width: isHistoryCollapsed ? 40 : "100%",
                  height: 40,
                  border: "none",
                  background: "transparent",
                  borderRadius: 10,
                  padding: isHistoryCollapsed ? 0 : "0 12px",
                  lineHeight: 1,
                  fontWeight: 600,
                  color: "#0f172a",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: isHistoryCollapsed ? "center" : "flex-start",
                  position: "relative",
                  overflow: "hidden",
                  transition:
                    "width 240ms cubic-bezier(0.22, 1, 0.36, 1), padding 220ms ease, color 0.16s ease",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    opacity: isHistoryCollapsed ? 1 : 0,
                    transform: isHistoryCollapsed
                      ? "translateY(0)"
                      : "translateY(3px)",
                    transition: historyIconTransition,
                  }}
                >
                  +
                </span>
                <span
                  style={{
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    opacity: isHistoryCollapsed ? 0 : 1,
                    transform: isHistoryCollapsed
                      ? "translateY(-3px)"
                      : "translateY(0)",
                    transition: historyTextTransition,
                  }}
                >
                  + New chat
                </span>
              </button>
              <button
                onClick={handleClearChatHistory}
                title="Clear chat history"
                aria-label="Clear chat history"
                style={{
                  width: isHistoryCollapsed ? 40 : "100%",
                  height: 40,
                  border: "none",
                  background: "transparent",
                  borderRadius: 10,
                  padding: isHistoryCollapsed ? 0 : "0 10px",
                  fontWeight: 600,
                  color: "#64748b",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                  transition:
                    "width 240ms cubic-bezier(0.22, 1, 0.36, 1), padding 220ms ease, color 0.16s ease",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isHistoryCollapsed ? 1 : 0,
                    transform: isHistoryCollapsed
                      ? "translateY(0)"
                      : "translateY(3px)",
                    transition: historyIconTransition,
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M2.8 4.4h10.4" />
                    <path d="M6 4.4V3.2h4v1.2" />
                    <path d="M4.8 4.4l.6 8h5.2l.6-8" />
                  </svg>
                </span>
                <span
                  style={{
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    opacity: isHistoryCollapsed ? 0 : 1,
                    transform: isHistoryCollapsed
                      ? "translateY(-3px)"
                      : "translateY(0)",
                    transition: historyTextTransition,
                  }}
                >
                  Clear
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          minHeight: 0,
          background: "rgba(255,255,255,0.22)",
        }}
      >
        <header
          style={{
            padding: "13px 16px",
            borderBottom: "1px solid rgba(226,232,240,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "grid", gap: 1 }}>
              <strong
                style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}
              >
                Canvas Assistant
              </strong>
            </div>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            title="Close assistant"
            aria-label="Close assistant"
            style={{
              border: "none",
              background: "transparent",
              borderRadius: 10,
              width: 40,
              height: 40,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              cursor: "pointer",
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        <div
          style={{
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 0,
          }}
        >
          {loadingMessages ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Loading messages...
            </div>
          ) : null}
          {!loadingMessages && messages.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              Start a new chat and generate diagrams and visual assets directly
              in this window.
            </div>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const messageExpert = expertFromMessage(message);
            const theme = expertTheme(messageExpert);
            return (
              <div
                key={message.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                  background: isUser ? "#0f172a" : theme.background,
                  color: isUser ? "#ffffff" : "#111827",
                  border: isUser ? "none" : theme.border,
                  borderRadius: 14,
                  padding: "10px 12px",
                  boxShadow: isUser ? "none" : "0 2px 12px rgba(15,23,42,0.06)",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.84, marginBottom: 6 }}>
                  {isUser ? (
                    `You • ${formatTime(message.createdAt)}`
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 999,
                          background: theme.badgeBg,
                          color: theme.badgeFg,
                        }}
                      >
                        {expertLabel(messageExpert)}
                      </span>
                      <span>
                        {formatTime(message.createdAt)} • {message.status}
                      </span>
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.text}
                </div>
                {!isUser && messageExpert === "general" ? (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => {
                        void copyToClipboard(
                          markdownToPlainText(message.text),
                          "Copied plain text",
                        );
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        borderRadius: 8,
                        padding: "5px 9px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Copy Plain Text
                    </button>
                    <button
                      onClick={() => {
                        void copyToClipboard(message.text, "Copied markdown");
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        borderRadius: 8,
                        padding: "5px 9px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Copy Markdown
                    </button>
                    <button
                      onClick={() => {
                        void handleAddAssistantTextAsMarkdownNote(message.text);
                      }}
                      style={{
                        border: "1px solid #0f766e",
                        background: "#14b8a6",
                        color: "#ffffff",
                        borderRadius: 8,
                        padding: "5px 9px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Add as Markdown Note
                    </button>
                  </div>
                ) : null}

                {message.artifacts?.map((artifact, artifactIndex) => (
                  <div
                    key={`${message.id}-${artifactIndex}`}
                    style={{ marginTop: 10 }}
                  >
                    {(() => {
                      const artifactKey = `${message.id}-${artifactIndex}`;
                      const sketchMetadata =
                        sketchMetadataByArtifact[artifactKey];
                      const sketchLogs =
                        sketchLogsByArtifact[artifactKey] || [];
                      const vectorizedWith =
                        vectorizeSettingsByArtifact[artifactKey];
                      const vectorizeSummary =
                        vectorizeSummaryByArtifact[artifactKey];

                      return (
                        <>
                          {artifact.type === "code" ? (
                            <div
                              style={{
                                border: "1px solid rgba(203,213,225,0.9)",
                                borderRadius: 10,
                                background: "rgba(255,255,255,0.75)",
                                padding: 8,
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#334155",
                                }}
                              >
                                {artifact.language.toUpperCase()} Artifact
                              </div>

                              {artifact.language === "d2" ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <label
                                    style={{ fontSize: 11, color: "#475569" }}
                                  >
                                    Render
                                  </label>
                                  <select
                                    value={
                                      d2RenderVariantByArtifact[artifactKey] ||
                                      "default"
                                    }
                                    onChange={(event) => {
                                      setD2RenderVariantByArtifact((prev) => ({
                                        ...prev,
                                        [artifactKey]: event.target
                                          .value as D2RenderVariant,
                                      }));
                                    }}
                                    style={{
                                      border: "1px solid #cbd5e1",
                                      borderRadius: 8,
                                      fontSize: 11,
                                      padding: "4px 6px",
                                    }}
                                  >
                                    <option value="default">Default</option>
                                    <option value="sketch">Sketch</option>
                                    <option value="ascii">ASCII</option>
                                  </select>
                                </div>
                              ) : null}

                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  onClick={() => {
                                    void copyToClipboard(
                                      artifact.code,
                                      "Copied source code",
                                    );
                                  }}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    borderRadius: 8,
                                    padding: "5px 9px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  Copy Code
                                </button>
                                <button
                                  onClick={() => {
                                    void handleAddCodeArtifactSvgToCanvas(
                                      artifact,
                                      artifactKey,
                                    );
                                  }}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    borderRadius: 8,
                                    padding: "5px 9px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  Add SVG to Canvas
                                </button>
                                <button
                                  onClick={() => {
                                    void handleDownloadCodeArtifactSvg(
                                      artifact,
                                      artifactKey,
                                    );
                                  }}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    borderRadius: 8,
                                    padding: "5px 9px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  Download SVG
                                </button>
                                <button
                                  onClick={() => {
                                    void handleDownloadCodeArtifactPng(
                                      artifact,
                                      artifactKey,
                                    );
                                  }}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    borderRadius: 8,
                                    padding: "5px 9px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  Download PNG
                                </button>
                                {artifact.language === "mermaid" ? (
                                  <button
                                    onClick={() => {
                                      void handleApplyCodeArtifact(artifact);
                                    }}
                                    style={{
                                      border: "1px solid #0f766e",
                                      background: "#0f766e",
                                      color: "#ffffff",
                                      borderRadius: 8,
                                      padding: "5px 9px",
                                      fontSize: 11,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Add Native Sketch
                                  </button>
                                ) : null}
                              </div>

                              <details>
                                <summary
                                  style={{
                                    fontSize: 11,
                                    cursor: "pointer",
                                    color: "#2563eb",
                                  }}
                                >
                                  Show source code
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
                                    maxHeight: 220,
                                  }}
                                >
                                  {artifact.code}
                                </pre>
                              </details>
                            </div>
                          ) : null}

                          {artifact.type === "image-data" ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              <ArtifactPreviewImage artifact={artifact} />
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
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
                                <button
                                  onClick={() => {
                                    void handleVectorizeImage(
                                      artifact,
                                      artifactKey,
                                    );
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
                                <button
                                  onClick={() => {
                                    void handleDownloadImageArtifactSvg(
                                      artifact,
                                    );
                                  }}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    borderRadius: 8,
                                    padding: "6px 10px",
                                    fontSize: 12,
                                    cursor: "pointer",
                                  }}
                                >
                                  Download SVG
                                </button>
                                <button
                                  onClick={() => {
                                    void handleDownloadImageArtifactPng(
                                      artifact,
                                    );
                                  }}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    borderRadius: 8,
                                    padding: "6px 10px",
                                    fontSize: 12,
                                    cursor: "pointer",
                                  }}
                                >
                                  Download PNG
                                </button>
                              </div>
                              {vectorizeSummary ? (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color:
                                      vectorizeSummary ===
                                      "Vectorization failed"
                                        ? "#b91c1c"
                                        : vectorizeSummary === "Vectorizing..."
                                          ? "#475569"
                                          : "#065f46",
                                    fontWeight: 600,
                                  }}
                                >
                                  {vectorizeSummary}
                                </div>
                              ) : null}
                              {sketchMetadata ? (
                                <details>
                                  <summary
                                    style={{
                                      fontSize: 12,
                                      cursor: "pointer",
                                      color: "#2563eb",
                                    }}
                                  >
                                    Vectorization metadata
                                  </summary>
                                  <div
                                    style={{
                                      marginTop: 8,
                                      fontSize: 11,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    <div>
                                      Source: {sketchMetadata.sourceWidth}x
                                      {sketchMetadata.sourceHeight}
                                      {" • "}Working:{" "}
                                      {sketchMetadata.workingWidth}x
                                      {sketchMetadata.workingHeight}
                                    </div>
                                    <div>
                                      Colors: requested{" "}
                                      {sketchMetadata.numColorsRequested}, used{" "}
                                      {sketchMetadata.numColorsUsed}
                                      {" • "}Background label:{" "}
                                      {sketchMetadata.backgroundLabel}
                                    </div>
                                    <div>
                                      Vector settings: palette{" "}
                                      {vectorizedWith?.paletteDepth ??
                                        vectorizeControls.paletteDepth}
                                      {" • "}complexity{" "}
                                      {vectorizedWith?.complexity ??
                                        vectorizeControls.complexity}
                                      {" • "}edge{" "}
                                      {vectorizedWith?.edgeFidelity ??
                                        vectorizeControls.edgeFidelity}
                                    </div>
                                    <div>
                                      Epsilon:{" "}
                                      {sketchMetadata.epsilon.toFixed(2)}
                                      {" • "}Kernel:{" "}
                                      {sketchMetadata.morphologyKernelSize}x
                                      {sketchMetadata.morphologyKernelSize}
                                      {" • "}Min area: {sketchMetadata.minArea}
                                    </div>
                                    <div>
                                      Components:{" "}
                                      {sketchMetadata.componentsFound}
                                      {" • "}Filtered:{" "}
                                      {sketchMetadata.componentsFiltered}
                                      {" • "}Elements:{" "}
                                      {sketchMetadata.elementsCreated} (emitted{" "}
                                      {sketchMetadata.elementsEmitted})
                                    </div>
                                    {typeof sketchMetadata.outlineComponentsFound ===
                                      "number" ||
                                    typeof sketchMetadata.outlineElementsCreated ===
                                      "number" ? (
                                      <div>
                                        Outline components:{" "}
                                        {sketchMetadata.outlineComponentsFound ??
                                          0}
                                        {" • "}Outline elements:{" "}
                                        {sketchMetadata.outlineElementsCreated ??
                                          0}
                                      </div>
                                    ) : null}
                                    <div>
                                      Runtime: {sketchMetadata.processingMs} ms
                                    </div>
                                  </div>
                                  {sketchLogs.length > 0 ? (
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
                                      {sketchLogs.join("\n")}
                                    </pre>
                                  ) : null}
                                </details>
                              ) : null}
                            </div>
                          ) : null}

                          {artifact.type === "canvas-elements" &&
                          artifact.source !== "d2" ? (
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
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            );
          })}

          {sending && optimisticInput ? (
            <>
              {/* Optimistic user message */}
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "90%",
                  background: "#0f172a",
                  color: "#ffffff",
                  borderRadius: 14,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.84, marginBottom: 6 }}>
                  You • now
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {optimisticInput}
                </div>
              </div>

              {/* AI typing / streaming bubble */}
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "90%",
                  background: expertTheme(selectedExpert).background,
                  border: expertTheme(selectedExpert).border,
                  borderRadius: 14,
                  padding: "10px 12px",
                  boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.84, marginBottom: 6 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: expertTheme(selectedExpert).badgeBg,
                        color: expertTheme(selectedExpert).badgeFg,
                      }}
                    >
                      {expertLabel(selectedExpert)}
                    </span>
                  </span>
                </div>
                {streamingText !== null && streamingText.length > 0 ? (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {streamingText}
                    <span
                      style={{
                        animation: "blink 0.9s ease-in-out infinite",
                        display: "inline-block",
                        marginLeft: 1,
                      }}
                    >
                      ▊
                    </span>
                  </div>
                ) : (
                  <TypingDots />
                )}
              </div>
            </>
          ) : null}

          <div ref={messagesEndRef} />

          {pendingJobs.length > 0 ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {pendingJobs.length} background job
              {pendingJobs.length === 1 ? "" : "s"} running...
            </div>
          ) : null}

          {error ? (
            <div
              style={{
                fontSize: 12,
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        <footer
          style={{
            borderTop: "1px solid rgba(226,232,240,0.9)",
            padding: 12,
            display: "grid",
            gap: 10,
            background: "rgba(255,255,255,0.24)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <label style={{ fontSize: 11, color: "#475569" }}>Expert</label>
            <select
              value={selectedExpert}
              onChange={(event) => {
                setSelectedExpert(event.target.value as AssistantExpert);
              }}
              style={{
                border: "1px solid rgba(203,213,225,0.9)",
                background: "rgba(255,255,255,0.8)",
                color: "#0f172a",
                borderRadius: 8,
                fontSize: 12,
                padding: "5px 8px",
              }}
            >
              <option value="general">General Expert</option>
              <option value="mermaid">Mermaid Expert</option>
              <option value="d2">D2 Expert</option>
              <option value="visual">Visual Expert</option>
            </select>
          </div>
          {selectedExpert === "visual" ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <label
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeCanvasReference}
                    onChange={(event) =>
                      setIncludeCanvasReference(event.target.checked)
                    }
                  />
                  Use selected canvas content as reference
                </label>
                <details>
                  <summary
                    style={{
                      listStyle: "none",
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      border: "1px solid #94a3b8",
                      color: "#475569",
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    title="Visual mode control help"
                  >
                    ?
                  </summary>
                  <div
                    style={{
                      marginTop: 8,
                      maxWidth: 420,
                      border: "1px solid rgba(203,213,225,0.95)",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.94)",
                      fontSize: 11,
                      color: "#334155",
                      lineHeight: 1.45,
                    }}
                  >
                    `Color` controls the generated image mode (`Color` or `Black
                    & White`). `Palette` controls how many dominant colors are
                    kept during vectorization. `Complexity` trades speed for
                    detail (`Low` simpler, `High` richer). `Edge fidelity`
                    increases contour retention but can add extra small shapes.
                  </div>
                </details>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}
                >
                  Generation
                </span>

                <label style={{ fontSize: 11, color: "#475569" }}>Color</label>
                <select
                  value={visualGenerationControls.colorMode}
                  onChange={(event) => {
                    setVisualGenerationControls((prev) => ({
                      ...prev,
                      colorMode: event.target.value as VisualColorMode,
                    }));
                  }}
                  style={{
                    border: "1px solid rgba(203,213,225,0.95)",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "4px 8px",
                  }}
                >
                  <option value="color">Color</option>
                  <option value="bw">Black & White</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}
                >
                  Vectorization
                </span>

                <label style={{ fontSize: 11, color: "#475569" }}>
                  Palette
                </label>
                <select
                  value={vectorizeControls.paletteDepth}
                  onChange={(event) => {
                    setVectorizeControls((prev) => ({
                      ...prev,
                      paletteDepth: Number(event.target.value),
                    }));
                  }}
                  style={{
                    border: "1px solid rgba(203,213,225,0.95)",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "4px 8px",
                  }}
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                  <option value={24}>24</option>
                  <option value={32}>32</option>
                </select>

                <label style={{ fontSize: 11, color: "#475569" }}>
                  Complexity
                </label>
                <select
                  value={vectorizeControls.complexity}
                  onChange={(event) => {
                    setVectorizeControls((prev) => ({
                      ...prev,
                      complexity: event.target.value as VectorizeComplexity,
                    }));
                  }}
                  style={{
                    border: "1px solid rgba(203,213,225,0.95)",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "4px 8px",
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <label
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Edge fidelity
                  <input
                    type="range"
                    min={12}
                    max={48}
                    step={1}
                    value={vectorizeControls.edgeFidelity}
                    onChange={(event) => {
                      setVectorizeControls((prev) => ({
                        ...prev,
                        edgeFidelity: Number(event.target.value),
                      }));
                    }}
                  />
                </label>
              </div>
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
              placeholder="Ask assistant..."
              style={{
                flex: 1,
                border: "1px solid rgba(203,213,225,0.95)",
                background: "rgba(255,255,255,0.86)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                color: "#0f172a",
              }}
            />
            <button
              onClick={() => {
                void handleSend();
              }}
              disabled={sending || !input.trim()}
              aria-label={sending ? "Sending message" : "Send message"}
              style={{
                border: "1px solid #0f172a",
                background: sending ? "#cbd5e1" : "#111827",
                color: "#ffffff",
                borderRadius: 10,
                width: 40,
                height: 40,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? (
                <span style={{ fontSize: 16, lineHeight: 1 }}>…</span>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M2 8h9" />
                  <path d="M8.5 4.8L12 8l-3.5 3.2" />
                </svg>
              )}
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", textAlign: "right" }}>
            Model: {modelLabel(selectedExpert)}
          </div>
        </footer>
      </section>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
