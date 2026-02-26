import { nanoid } from "nanoid";

export type D2RenderVariant = "default" | "sketch" | "ascii";

export interface MermaidRenderPayload {
  elements: unknown[];
  files: Record<string, any>;
}

export interface DiagramSvgRenderResult {
  svgMarkup: string;
  width: number;
  height: number;
}

type D2Engine = {
  compile: (input: any, options?: any) => Promise<{
    diagram: unknown;
    renderOptions: any;
  }>;
  render: (diagram: unknown, options?: unknown) => Promise<string>;
};

let d2EnginePromise: Promise<D2Engine> | undefined;

async function getD2Engine(): Promise<D2Engine> {
  if (!d2EnginePromise) {
    d2EnginePromise = import("@terrastruct/d2").then((mod) => {
      const engine = new mod.D2();
      return {
        compile: engine.compile.bind(engine) as unknown as D2Engine["compile"],
        render: engine.render.bind(engine) as D2Engine["render"],
      };
    });
  }

  try {
    return await d2EnginePromise;
  } catch (error) {
    d2EnginePromise = undefined;
    throw error;
  }
}

export async function fetchMermaidRenderPayload(code: string): Promise<MermaidRenderPayload> {
  const { convertMermaidToCanvas } = await import("@/lib/mermaid-converter");
  const result = await convertMermaidToCanvas(code);
  return {
    elements: result.elements || [],
    files: (result.files || {}) as Record<string, any>,
  };
}

function toSceneCompatibleElements(elements: unknown[]): any[] {
  return (elements as Array<Record<string, any>>).map((raw) => {
    const el = raw || {};
    const isText = el.type === "text";
    const textValue = typeof el.text === "string" ? el.text : "";
    const fontSize = typeof el.fontSize === "number" ? el.fontSize : 20;
    const fallbackTextWidth = Math.max(16, Math.round(textValue.length * Math.max(10, fontSize * 0.58)));
    const fallbackTextHeight = Math.max(16, Math.round(fontSize * 1.25));
    const width = typeof el.width === "number" && el.width > 0
      ? el.width
      : (isText ? fallbackTextWidth : 100);
    const height = typeof el.height === "number" && el.height > 0
      ? el.height
      : (isText ? fallbackTextHeight : 100);
    const normalized: Record<string, any> = {
      type: el.type || "rectangle",
      x: el.x ?? 0,
      y: el.y ?? 0,
      width,
      height,
      id: el.id || nanoid(),
      angle: el.angle ?? 0,
      strokeColor: el.strokeColor ?? (isText ? "#111827" : "#000000"),
      backgroundColor: el.backgroundColor ?? "transparent",
      fillStyle: el.fillStyle ?? (isText ? "solid" : "hachure"),
      strokeWidth: el.strokeWidth ?? 1,
      strokeStyle: el.strokeStyle ?? "solid",
      roughness: el.roughness ?? (isText ? 0 : 1),
      opacity: el.opacity ?? 100,
      roundness: el.roundness ?? null,
      seed: el.seed ?? Math.floor(Math.random() * 100000),
      version: el.version ?? 1,
      versionNonce: el.versionNonce ?? Date.now(),
      isDeleted: el.isDeleted ?? false,
      groupIds: Array.isArray(el.groupIds) ? el.groupIds : [],
      frameId: el.frameId ?? null,
      boundElements: el.boundElements ?? null,
      updated: el.updated ?? Date.now(),
      link: el.link ?? null,
      locked: el.locked ?? false,
    };

    if (isText) {
      normalized.text = textValue;
      normalized.originalText = typeof el.originalText === "string" ? el.originalText : textValue;
      normalized.fontSize = fontSize;
      normalized.fontFamily = typeof el.fontFamily === "number" ? el.fontFamily : 3;
      normalized.textAlign = el.textAlign ?? "left";
      normalized.verticalAlign = el.verticalAlign ?? "top";
      normalized.lineHeight = typeof el.lineHeight === "number" ? el.lineHeight : 1.25;
      normalized.baseline = typeof el.baseline === "number" ? el.baseline : Math.round(fontSize * 1.2);
      normalized.containerId = el.containerId ?? null;
    } else {
      if (typeof el.text === "string") normalized.text = el.text;
      if (typeof el.fontSize === "number") normalized.fontSize = el.fontSize;
      if (typeof el.fontFamily === "number") normalized.fontFamily = el.fontFamily;
    }
    if (Array.isArray(el.points)) normalized.points = el.points;
    if (typeof el.endArrowhead !== "undefined") normalized.endArrowhead = el.endArrowhead;
    if (typeof el.startArrowhead !== "undefined") normalized.startArrowhead = el.startArrowhead;
    if (typeof el.customData === "object" && el.customData !== null) normalized.customData = el.customData;

    return normalized;
  });
}

async function exportElementsToSvgMarkup(
  elements: unknown[],
  files?: Record<string, any>,
): Promise<string> {
  const { exportToSvg, convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  const normalized = convertToExcalidrawElements(toSceneCompatibleElements(elements) as any);

  if (normalized.length === 0) {
    throw new Error("No drawable elements were generated");
  }

  const svg = await exportToSvg({
    elements: normalized,
    appState: {
      exportBackground: true,
      exportWithDarkMode: false,
      viewBackgroundColor: "#ffffff",
    } as any,
    files: files || {},
  });

  if (!svg?.outerHTML) {
    throw new Error("Failed to render SVG");
  }

  return svg.outerHTML;
}

function escapeSvgText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function asciiFromD2(source: string): string {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const nodes = new Map<string, string>();
  const edges: Array<{ from: string; to: string; label?: string }> = [];

  for (const line of lines) {
    const edgeMatch = line.match(/^([a-zA-Z0-9_-]+)\s*->\s*([a-zA-Z0-9_-]+)(?:\s*:\s*(.+))?$/);
    if (edgeMatch) {
      const from = edgeMatch[1];
      const to = edgeMatch[2];
      const label = edgeMatch[3]?.replace(/^"|"$/g, "").trim();
      if (!nodes.has(from)) nodes.set(from, from);
      if (!nodes.has(to)) nodes.set(to, to);
      edges.push({ from, to, label });
      continue;
    }

    const nodeMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
    if (nodeMatch) {
      const id = nodeMatch[1];
      const label = nodeMatch[2].replace(/^"|"$/g, "").trim();
      nodes.set(id, label || id);
    }
  }

  const out: string[] = ["D2 ASCII Render", "==============", ""];
  if (nodes.size > 0) {
    out.push("Nodes:");
    for (const [id, label] of nodes.entries()) {
      out.push(`- ${id}: ${label}`);
    }
    out.push("");
  }

  if (edges.length > 0) {
    out.push("Edges:");
    for (const edge of edges) {
      out.push(`- ${edge.from} -> ${edge.to}${edge.label ? ` : ${edge.label}` : ""}`);
    }
  } else {
    out.push("No edges parsed.");
  }

  return out.join("\n");
}

export function asciiToSvg(ascii: string): string {
  const lines = ascii.split("\n");
  const maxChars = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const fontSize = 14;
  const lineHeight = 20;
  const padding = 16;
  const width = Math.max(280, maxChars * 8 + padding * 2);
  const height = Math.max(180, lines.length * lineHeight + padding * 2);

  const tspans = lines
    .map((line, index) => `<tspan x="${padding}" y="${padding + fontSize + index * lineHeight}">${escapeSvgText(line)}</tspan>`)
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<text font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${fontSize}" fill="#0f172a">${tspans}</text>`,
    "</svg>",
  ].join("");
}

async function renderD2WithEngine(
  source: string,
  variant: D2RenderVariant,
): Promise<string> {
  const d2 = await getD2Engine();
  const compileOptions = {
    layout: "dagre",
    sketch: variant === "sketch",
    ascii: variant === "ascii",
    asciiMode: "extended",
    themeID: 0,
  } as const;

  const result = await d2.compile(
    {
      fs: { "index.d2": source },
      inputPath: "index.d2",
      options: compileOptions,
    },
  );

  const renderOutput = await d2.render(result.diagram, result.renderOptions);
  if (variant === "ascii") {
    return asciiToSvg(renderOutput);
  }
  return renderOutput;
}

export function parseSvgDimensions(svgMarkup: string): { width: number; height: number } {
  function finiteSize(width: number, height: number): { width: number; height: number } | null {
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
    return null;
  }

  // Browser path: parse the root <svg> element attributes only.
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
      const svg = doc.documentElement;
      if (svg?.tagName?.toLowerCase() === "svg") {
        const viewBox = svg.getAttribute("viewBox");
        if (viewBox) {
          const parts = viewBox.trim().split(/[\s,]+/).map((part) => Number(part));
          if (parts.length === 4) {
            const byViewBox = finiteSize(parts[2], parts[3]);
            if (byViewBox) return byViewBox;
          }
        }

        const widthAttr = svg.getAttribute("width");
        const heightAttr = svg.getAttribute("height");
        const width = widthAttr ? Number.parseFloat(widthAttr) : NaN;
        const height = heightAttr ? Number.parseFloat(heightAttr) : NaN;
        const bySize = finiteSize(width, height);
        if (bySize) return bySize;
      }
    } catch {
      // Fall through to regex parser.
    }
  }

  // Fallback parser: restrict matching to the opening <svg ...> tag.
  const svgTagMatch = svgMarkup.match(/<svg\b[^>]*>/i);
  if (svgTagMatch) {
    const svgTag = svgTagMatch[0];
    const viewBoxMatch = svgTag.match(/viewBox=(["'])([^"']+)\1/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[2].trim().split(/[\s,]+/).map((part) => Number(part));
      if (parts.length === 4) {
        const byViewBox = finiteSize(parts[2], parts[3]);
        if (byViewBox) return byViewBox;
      }
    }

    const widthMatch = svgTag.match(/\bwidth=(["'])([^"']+)\1/i);
    const heightMatch = svgTag.match(/\bheight=(["'])([^"']+)\1/i);
    const width = widthMatch ? Number.parseFloat(widthMatch[2]) : NaN;
    const height = heightMatch ? Number.parseFloat(heightMatch[2]) : NaN;
    const bySize = finiteSize(width, height);
    if (bySize) return bySize;
  }

  return { width: 1200, height: 900 };
}

export async function renderCodeArtifactToSvg(input: {
  language: "mermaid" | "d2";
  code: string;
  d2Variant?: D2RenderVariant;
}): Promise<DiagramSvgRenderResult> {
  if (input.language === "mermaid") {
    const payload = await fetchMermaidRenderPayload(input.code);
    const svgMarkup = await exportElementsToSvgMarkup(payload.elements, payload.files);
    const dimensions = parseSvgDimensions(svgMarkup);
    return { svgMarkup, ...dimensions };
  }

  const d2Variant = input.d2Variant || "default";
  try {
    const svgMarkup = await renderD2WithEngine(input.code, d2Variant);
    const dimensions = parseSvgDimensions(svgMarkup);
    return { svgMarkup, ...dimensions };
  } catch (error) {
    if (d2Variant === "ascii") {
      const ascii = asciiFromD2(input.code);
      const svgMarkup = asciiToSvg(ascii);
      const dimensions = parseSvgDimensions(svgMarkup);
      return { svgMarkup, ...dimensions };
    }
    throw (error instanceof Error ? error : new Error("D2 render failed"));
  }
}

function encodeSvgToBase64(svgMarkup: string): string | null {
  if (typeof btoa !== "function" || typeof TextEncoder === "undefined") {
    return null;
  }

  try {
    const bytes = new TextEncoder().encode(svgMarkup);
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

export function svgToDataUrl(svgMarkup: string): string {
  const base64 = encodeSvgToBase64(svgMarkup);
  if (base64) {
    return `data:image/svg+xml;base64,${base64}`;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

export async function svgToPngBlob(svgMarkup: string, width: number, height: number): Promise<Blob> {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load SVG for PNG conversion"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is unavailable");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      throw new Error("Failed to convert SVG to PNG");
    }

    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
