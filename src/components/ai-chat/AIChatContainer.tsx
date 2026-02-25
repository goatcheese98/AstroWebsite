import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { convertD2ToExcalidrawElements } from "@/lib/assistant/d2-converter";
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
    colorPalette: visual.colorMode === "bw"
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
  return "Claude Sonnet 4";
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

export default function AIChatContainer({
  isOpen,
  initialWidth = 940,
}: AIChatContainerProps) {
  const store = useUnifiedCanvasStore();
  const {
    isChatMinimized,
    dispatchCommand,
    addToast,
    getExcalidrawAPI,
  } = store;

  const [clientId] = useState(() => getAssistantClientId());
  const [chats, setChats] = useState<AssistantChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedExpert, setSelectedExpert] = useState<AssistantExpert>("general");
  const [visualGenerationControls, setVisualGenerationControls] = useState<VisualGenerationControls>(
    DEFAULT_VISUAL_GENERATION_CONTROLS,
  );
  const [vectorizeControls, setVectorizeControls] = useState<VectorizeControls>(
    DEFAULT_VECTORIZER_CONTROLS,
  );
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<string[]>([]);
  const [includeCanvasReference, setIncludeCanvasReference] = useState(true);
  const [sketchMetadataByArtifact, setSketchMetadataByArtifact] = useState<Record<string, {
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
  }>>({});
  const [sketchLogsByArtifact, setSketchLogsByArtifact] = useState<Record<string, string[]>>({});
  const [vectorizeSettingsByArtifact, setVectorizeSettingsByArtifact] = useState<Record<string, {
    paletteDepth: number;
    complexity: VectorizeComplexity;
    edgeFidelity: number;
  }>>({});
  const [vectorizeSummaryByArtifact, setVectorizeSummaryByArtifact] = useState<Record<string, string>>({});
  const [d2RenderVariantByArtifact, setD2RenderVariantByArtifact] = useState<Record<string, D2RenderVariant>>({});
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

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

  const handleCreateNewChat = useCallback(() => {
    void createChat().then((chatId) => {
      setActiveChatId(chatId);
      setMessages([]);
    });
  }, [createChat]);

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

      if (customEvent.detail.mode === "image" || customEvent.detail.mode === "sketch") {
        setSelectedExpert("visual");
        return;
      }

      setSelectedExpert("general");
    };

    const handleSetExpert = (event: Event) => {
      const customEvent = event as CustomEvent<{ expert?: AssistantExpert }>;
      const expert = customEvent.detail?.expert;
      if (expert === "general" || expert === "mermaid" || expert === "d2" || expert === "visual") {
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
    if (!includeCanvasReference || selectedExpert !== "visual") {
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
        quality: "preview",
        elementIds: selectedIds.length > 0 ? selectedIds : undefined,
      });

      const base64Payload = screenshot.dataUrl.split(",")[1] || "";
      const approxBytes = Math.floor((base64Payload.length * 3) / 4);
      if (approxBytes > MAX_REFERENCE_IMAGE_BYTES) {
        addToast("Canvas reference skipped because selection is too large. Select fewer elements or disable reference.", "info", 4500);
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
            expert: selectedExpert,
            sourceImageDataUrl,
            visual: visualGenerationControls,
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
        downloadBlob(new Blob([svgMarkup], { type: "image/svg+xml" }), "visual-asset.svg");
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

        const width = Math.max(1, Math.round(artifact.width || image.naturalWidth || image.width || 1024));
        const height = Math.max(1, Math.round(artifact.height || image.naturalHeight || image.height || 1024));
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
          colorMode: artifact.visual?.colorMode || visualGenerationControls.colorMode,
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
          const message = dispatchError instanceof Error ? dispatchError.message : String(dispatchError);
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

        addToast(`Vectorized to canvas: ${elements.length} shapes`, "success", 4500);
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
        const elements = artifact.language === "mermaid"
          ? (await fetchMermaidRenderPayload(artifact.code)).elements
          : convertD2ToExcalidrawElements(artifact.code);

        if (!elements || elements.length === 0) {
          addToast("No drawable elements were generated", "info");
          return;
        }

        if (artifact.language === "d2") {
          addToast("Editable D2 conversion is beta and may not match playground layout exactly.", "info", 5000);
        }

        await dispatchCommand("drawElements", {
          elements,
          isModification: false,
        });
        addToast(
          artifact.language === "d2"
            ? "Added editable D2 diagram (beta)"
            : `Added ${artifact.language.toUpperCase()} diagram to canvas`,
          "success",
        );
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
        const d2Variant = artifact.language === "d2"
          ? (d2RenderVariantByArtifact[artifactKey] || "default")
          : "default";
        const { svgMarkup, width, height } = await buildCodeArtifactSvg(artifact, d2Variant);

        await dispatchCommand("insertImage", {
          imageData: svgToDataUrl(svgMarkup),
          type: "svg",
          width,
          height,
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
    [addToast, buildCodeArtifactSvg, d2RenderVariantByArtifact, dispatchCommand],
  );

  const handleDownloadCodeArtifactSvg = useCallback(
    async (
      artifact: Extract<AssistantArtifact, { type: "code" }>,
      artifactKey: string,
    ) => {
      try {
        const d2Variant = artifact.language === "d2"
          ? (d2RenderVariantByArtifact[artifactKey] || "default")
          : "default";
        const { svgMarkup } = await buildCodeArtifactSvg(artifact, d2Variant);
        const variantSuffix = artifact.language === "d2" ? `-${d2Variant}` : "";
        downloadBlob(new Blob([svgMarkup], { type: "image/svg+xml" }), `${artifact.language}-diagram${variantSuffix}.svg`);
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
        const d2Variant = artifact.language === "d2"
          ? (d2RenderVariantByArtifact[artifactKey] || "default")
          : "default";
        const { svgMarkup, width, height } = await buildCodeArtifactSvg(artifact, d2Variant);
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
    async (artifact: Extract<AssistantArtifact, { type: "canvas-elements" }>) => {
      try {
        if (artifact.source === "d2") {
          addToast("Editable D2 conversion is beta and may not match playground layout exactly.", "info", 5000);
        }
        await dispatchCommand("drawElements", {
          elements: artifact.elements,
          isModification: false,
        });
        addToast(
          artifact.source === "d2" ? "Added editable D2 diagram (beta)" : "Elements added to canvas",
          "success",
        );
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
        right: 88,
        bottom: 20,
        width: `min(${initialWidth}px, calc(100vw - 104px))`,
        height: "min(760px, calc(100vh - 36px))",
        background: "linear-gradient(135deg, rgba(255,255,255,0.42), rgba(248,250,252,0.34))",
        border: "1px solid rgba(203,213,225,0.52)",
        borderRadius: 18,
        boxShadow: "0 22px 44px rgba(15,23,42,0.12)",
        backdropFilter: "blur(22px) saturate(1.08) brightness(1.04)",
        WebkitBackdropFilter: "blur(22px) saturate(1.08) brightness(1.04)",
        zIndex: 999,
        display: "grid",
        gridTemplateColumns: isHistoryCollapsed ? "72px 1fr" : "280px 1fr",
        overflow: "hidden",
        transition: "grid-template-columns 0.2s ease",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid rgba(226,232,240,0.66)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          background: "rgba(255,255,255,0.2)",
        }}
      >
        {isHistoryCollapsed ? (
          <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: 0, height: "100%" }}>
            <div style={{ padding: 10, borderBottom: "1px solid rgba(226,232,240,0.66)", display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setIsHistoryCollapsed(false)}
                title="Expand chat history"
                style={{
                  border: "1px solid rgba(203,213,225,0.9)",
                  background: "rgba(255,255,255,0.72)",
                  color: "#334155",
                  borderRadius: 8,
                  width: 34,
                  height: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Expand chat history"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2.2" />
                  <line x1="6.1" y1="2.8" x2="6.1" y2="13.2" />
                </svg>
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 6px", minHeight: 0, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  title={chat.title || "Untitled"}
                  style={{
                    width: 48,
                    minHeight: 44,
                    borderRadius: 10,
                    border: activeChatId === chat.id ? "1px solid #60a5fa" : "1px solid rgba(226,232,240,0.95)",
                    background: activeChatId === chat.id ? "rgba(219,234,254,0.86)" : "rgba(255,255,255,0.78)",
                    color: "#0f172a",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                  }}
                >
                  {chatMonogram(chat.title || "Untitled")}
                </button>
              ))}
            </div>
            <div style={{ padding: 8, borderTop: "1px solid rgba(226,232,240,0.66)", display: "flex", justifyContent: "center" }}>
              <button
                onClick={handleCreateNewChat}
                title="New chat"
                style={{
                  width: 46,
                  height: 36,
                  border: "1px solid rgba(148,163,184,0.42)",
                  background: "rgba(241,245,249,0.82)",
                  borderRadius: 10,
                  fontSize: 20,
                  lineHeight: 1,
                  fontWeight: 500,
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: 14, borderBottom: "1px solid rgba(226,232,240,0.66)", display: "flex", gap: 8 }}>
              <button
                onClick={() => setIsHistoryCollapsed(true)}
                title="Collapse chat history"
                style={{
                  border: "1px solid rgba(203,213,225,0.9)",
                  background: "rgba(255,255,255,0.72)",
                  color: "#334155",
                  borderRadius: 8,
                  width: 34,
                  height: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Collapse chat history"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2.2" />
                  <line x1="6.1" y1="2.8" x2="6.1" y2="13.2" />
                </svg>
              </button>
              <button
                onClick={handleCreateNewChat}
                style={{
                  flex: 1,
                  border: "1px solid rgba(148,163,184,0.42)",
                  background: "rgba(241,245,249,0.85)",
                  borderRadius: 10,
                  padding: "9px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                + New Chat
              </button>
            </div>

            <div style={{ padding: "10px 12px", fontSize: 11, color: "#64748b" }}>
              {loadingChats ? "Loading chats..." : `${chats.length} chat${chats.length === 1 ? "" : "s"}`}
            </div>

            <div style={{ overflowY: "auto", padding: 8, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 10,
                    border: activeChatId === chat.id ? "1px solid #60a5fa" : "1px solid rgba(226,232,240,0.95)",
                    background: activeChatId === chat.id ? "rgba(219,234,254,0.86)" : "rgba(255,255,255,0.86)",
                    padding: "10px 9px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {chat.title || "Untitled"}
                  </div>
                  {chat.lastMessagePreview ? (
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {chat.lastMessagePreview}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      <section style={{ display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: 0, background: "rgba(255,255,255,0.14)" }}>
        <header style={{ padding: "12px 14px", borderBottom: "1px solid rgba(226,232,240,0.9)", display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "grid", gap: 1 }}>
              <strong style={{ fontSize: 13, color: "#0f172a" }}>Canvas Assistant</strong>
              <span style={{ fontSize: 11, color: "#64748b" }}>Model: {modelLabel(selectedExpert)}</span>
            </div>
          </div>
        </header>

        <div style={{ overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {loadingMessages ? <div style={{ fontSize: 12, color: "#64748b" }}>Loading messages...</div> : null}
          {!loadingMessages && messages.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Start a new chat and generate diagrams and visual assets directly in this window.
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
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
                      <span>{formatTime(message.createdAt)} • {message.status}</span>
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{message.text}</div>
                {!isUser && messageExpert === "general" ? (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => {
                        void copyToClipboard(markdownToPlainText(message.text), "Copied plain text");
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
                  <div key={`${message.id}-${artifactIndex}`} style={{ marginTop: 10 }}>
                    {(() => {
                      const artifactKey = `${message.id}-${artifactIndex}`;
                      const sketchMetadata = sketchMetadataByArtifact[artifactKey];
                      const sketchLogs = sketchLogsByArtifact[artifactKey] || [];
                      const vectorizedWith = vectorizeSettingsByArtifact[artifactKey];
                      const vectorizeSummary = vectorizeSummaryByArtifact[artifactKey];

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
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                          {artifact.language.toUpperCase()} Artifact
                        </div>

                        {artifact.language === "d2" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <label style={{ fontSize: 11, color: "#475569" }}>Render</label>
                            <select
                              value={d2RenderVariantByArtifact[artifactKey] || "default"}
                              onChange={(event) => {
                                setD2RenderVariantByArtifact((prev) => ({
                                  ...prev,
                                  [artifactKey]: event.target.value as D2RenderVariant,
                                }));
                              }}
                              style={{ border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11, padding: "4px 6px" }}
                            >
                              <option value="default">Default</option>
                              <option value="sketch">Sketch</option>
                              <option value="ascii">ASCII</option>
                            </select>
                          </div>
                        ) : null}

                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            onClick={() => {
                              void copyToClipboard(artifact.code, "Copied source code");
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
                              void handleAddCodeArtifactSvgToCanvas(artifact, artifactKey);
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
                              void handleDownloadCodeArtifactSvg(artifact, artifactKey);
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
                              void handleDownloadCodeArtifactPng(artifact, artifactKey);
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
                          <button
                            onClick={() => {
                              void handleApplyCodeArtifact(artifact);
                            }}
                            style={{
                              border: "1px solid #0f766e",
                              background: artifact.language === "mermaid" ? "#0f766e" : "#1e3a8a",
                              color: "#ffffff",
                              borderRadius: 8,
                              padding: "5px 9px",
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            {artifact.language === "mermaid" ? "Add Native Sketch" : "Add Editable Diagram (Beta)"}
                          </button>
                        </div>

                        <details>
                          <summary style={{ fontSize: 11, cursor: "pointer", color: "#2563eb" }}>
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <ArtifactPreviewImage artifact={artifact} />
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
                          <button
                            onClick={() => {
                              void handleVectorizeImage(artifact, artifactKey);
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
                              void handleDownloadImageArtifactSvg(artifact);
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
                              void handleDownloadImageArtifactPng(artifact);
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
                              color: vectorizeSummary === "Vectorization failed"
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
                            <summary style={{ fontSize: 12, cursor: "pointer", color: "#2563eb" }}>
                              Vectorization metadata
                            </summary>
                            <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5 }}>
                              <div>
                                Source: {sketchMetadata.sourceWidth}x{sketchMetadata.sourceHeight}
                                {" • "}Working: {sketchMetadata.workingWidth}x{sketchMetadata.workingHeight}
                              </div>
                              <div>
                                Colors: requested {sketchMetadata.numColorsRequested}, used {sketchMetadata.numColorsUsed}
                                {" • "}Background label: {sketchMetadata.backgroundLabel}
                              </div>
                              <div>
                                Vector settings: palette {vectorizedWith?.paletteDepth ?? vectorizeControls.paletteDepth}
                                {" • "}complexity {vectorizedWith?.complexity ?? vectorizeControls.complexity}
                                {" • "}edge {vectorizedWith?.edgeFidelity ?? vectorizeControls.edgeFidelity}
                              </div>
                              <div>
                                Epsilon: {sketchMetadata.epsilon.toFixed(2)}
                                {" • "}Kernel: {sketchMetadata.morphologyKernelSize}x{sketchMetadata.morphologyKernelSize}
                                {" • "}Min area: {sketchMetadata.minArea}
                              </div>
                              <div>
                                Components: {sketchMetadata.componentsFound}
                                {" • "}Filtered: {sketchMetadata.componentsFiltered}
                                {" • "}Elements: {sketchMetadata.elementsCreated} (emitted {sketchMetadata.elementsEmitted})
                              </div>
                              {(typeof sketchMetadata.outlineComponentsFound === "number"
                                || typeof sketchMetadata.outlineElementsCreated === "number") ? (
                                <div>
                                  Outline components: {sketchMetadata.outlineComponentsFound ?? 0}
                                  {" • "}Outline elements: {sketchMetadata.outlineElementsCreated ?? 0}
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
                        {artifact.source === "d2" ? "Add Editable Diagram (Beta)" : "Add Generated Elements"}
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

          {pendingJobs.length > 0 ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {pendingJobs.length} background job{pendingJobs.length === 1 ? "" : "s"} running...
            </div>
          ) : null}

          {error ? (
            <div style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px" }}>
              {error}
            </div>
          ) : null}
        </div>

        <footer style={{ borderTop: "1px solid rgba(226,232,240,0.9)", padding: 12, display: "grid", gap: 10, background: "rgba(255,255,255,0.24)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label style={{ fontSize: 11, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={includeCanvasReference}
                    onChange={(event) => setIncludeCanvasReference(event.target.checked)}
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
                    `Color` controls the generated image mode (`Color` or `Black & White`). `Palette` controls how many dominant colors are kept during vectorization. `Complexity` trades speed for detail (`Low` simpler, `High` richer). `Edge fidelity` increases contour retention but can add extra small shapes.
                  </div>
                </details>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Generation</span>

                <label style={{ fontSize: 11, color: "#475569" }}>Color</label>
                <select
                  value={visualGenerationControls.colorMode}
                  onChange={(event) => {
                    setVisualGenerationControls((prev) => ({
                      ...prev,
                      colorMode: event.target.value as VisualColorMode,
                    }));
                  }}
                  style={{ border: "1px solid rgba(203,213,225,0.95)", borderRadius: 8, fontSize: 12, padding: "4px 8px" }}
                >
                  <option value="color">Color</option>
                  <option value="bw">Black & White</option>
                </select>

              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Vectorization</span>

                <label style={{ fontSize: 11, color: "#475569" }}>Palette</label>
                <select
                  value={vectorizeControls.paletteDepth}
                  onChange={(event) => {
                    setVectorizeControls((prev) => ({
                      ...prev,
                      paletteDepth: Number(event.target.value),
                    }));
                  }}
                  style={{ border: "1px solid rgba(203,213,225,0.95)", borderRadius: 8, fontSize: 12, padding: "4px 8px" }}
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                  <option value={24}>24</option>
                  <option value={32}>32</option>
                </select>

                <label style={{ fontSize: 11, color: "#475569" }}>Complexity</label>
                <select
                  value={vectorizeControls.complexity}
                  onChange={(event) => {
                    setVectorizeControls((prev) => ({
                      ...prev,
                      complexity: event.target.value as VectorizeComplexity,
                    }));
                  }}
                  style={{ border: "1px solid rgba(203,213,225,0.95)", borderRadius: 8, fontSize: 12, padding: "4px 8px" }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <label style={{ fontSize: 11, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
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
              placeholder={`(${expertLabel(selectedExpert)}) Ask assistant...`}
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
