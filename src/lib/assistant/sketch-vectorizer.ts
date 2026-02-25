import { nanoid } from "nanoid";
import type { SketchComplexity, SketchControls, SketchStyle } from "./types";

interface VectorizeOptions {
  controls: SketchControls;
  maxWidth?: number;
  maxHeight?: number;
  maxElements?: number;
}

const CELL_SIZE_BY_COMPLEXITY: Record<SketchComplexity, number> = {
  low: 18,
  medium: 12,
  high: 8,
};

const STYLE_ROUGHNESS: Record<SketchStyle, number> = {
  clean: 0,
  technical: 0,
  "hand-drawn": 1,
  organic: 2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function channelChroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function averageColor(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  cellSize: number,
): { r: number; g: number; b: number; a: number; brightness: number; chroma: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let count = 0;

  for (let yy = y; yy < y + cellSize; yy += 1) {
    for (let xx = x; xx < x + cellSize; xx += 1) {
      if (xx >= width) continue;

      const idx = (yy * width + xx) * 4;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      a += data[idx + 3];
      count += 1;
    }
  }

  if (count === 0) {
    return { r: 255, g: 255, b: 255, a: 0, brightness: 255, chroma: 0 };
  }

  const avgR = Math.round(r / count);
  const avgG = Math.round(g / count);
  const avgB = Math.round(b / count);
  const avgA = Math.round(a / count);
  const brightness = (avgR * 0.299) + (avgG * 0.587) + (avgB * 0.114);
  const chroma = channelChroma(avgR, avgG, avgB);

  return {
    r: avgR,
    g: avgG,
    b: avgB,
    a: avgA,
    brightness,
    chroma,
  };
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  img.src = dataUrl;

  await img.decode();
  return img;
}

export async function vectorizeImageToSketchElements(
  imageDataUrl: string,
  options: VectorizeOptions,
): Promise<unknown[]> {
  const img = await loadImage(imageDataUrl);

  const maxWidth = options.maxWidth ?? 1200;
  const maxHeight = options.maxHeight ?? 900;
  const maxElements = options.maxElements ?? 2400;

  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const width = Math.max(1, Math.floor(img.width * scale));
  const height = Math.max(1, Math.floor(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to create canvas context");
  }

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const controls = options.controls;
  const cellSize = CELL_SIZE_BY_COMPLEXITY[controls.complexity];
  const roughness = STYLE_ROUGHNESS[controls.style];
  const fillStyle = controls.style === "technical" ? "solid" : "hachure";
  const strokeWidth = clamp(controls.edgeSensitivity / 30, 0.5, 2.5);

  const elements: unknown[] = [];

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      if (elements.length >= maxElements) {
        break;
      }

      const color = averageColor(imageData.data, width, x, y, cellSize);
      if (color.a < 24) {
        continue;
      }

      // Ignore white/near-white paper backgrounds from generated assets.
      if (color.brightness > 245 && color.chroma < 12) {
        continue;
      }

      // Skip near-white background regions to keep the output lean.
      if (color.brightness > 246 && controls.detailLevel < 0.6) {
        continue;
      }

      const hex = rgbToHex(color.r, color.g, color.b);
      const opacity = clamp(Math.round((color.a / 255) * 100), 15, 100);

      elements.push({
        id: nanoid(),
        type: "rectangle",
        x,
        y,
        width: Math.min(cellSize, width - x),
        height: Math.min(cellSize, height - y),
        strokeColor: hex,
        backgroundColor: hex,
        fillStyle,
        strokeWidth,
        roughness,
        opacity,
      });
    }
  }

  return elements;
}
