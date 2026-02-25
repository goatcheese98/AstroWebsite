import { nanoid } from "nanoid";
import type { SketchComplexity, SketchControls, SketchStyle } from "./types";

interface VectorizeOptions {
  controls: SketchControls;
  maxWidth?: number;
  maxHeight?: number;
  maxElements?: number;
}

export interface SketchVectorizationMetadata {
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
  outlineComponentsFound: number;
  outlineElementsCreated: number;
  processingMs: number;
}

export interface SketchVectorizationResult {
  elements: unknown[];
  metadata: SketchVectorizationMetadata;
  logs: string[];
}

type Point = [number, number];

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Component {
  area: number;
  pixels: number[];
}

const STYLE_ROUGHNESS: Record<SketchStyle, number> = {
  clean: 0,
  technical: 0,
  "hand-drawn": 1,
  organic: 2,
};

const BASE_SIZE_BY_COMPLEXITY: Record<SketchComplexity, number> = {
  low: 420,
  medium: 640,
  high: 860,
};

const MAX_ELEMENTS_BY_COMPLEXITY: Record<SketchComplexity, number> = {
  low: 320,
  medium: 760,
  high: 1400,
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

function brightness(color: RGB): number {
  return (color.r * 0.299) + (color.g * 0.587) + (color.b * 0.114);
}

function chroma(color: RGB): number {
  return Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
}

function colorDistanceSq(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return (dr * dr) + (dg * dg) + (db * db);
}

function pointEquals(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function pixelLuminance(r: number, g: number, b: number): number {
  return (r * 0.299) + (g * 0.587) + (b * 0.114);
}

function isNearWhitePixel(r: number, g: number, b: number): boolean {
  const lum = pixelLuminance(r, g, b);
  const ch = Math.max(r, g, b) - Math.min(r, g, b);
  return lum >= 246 && ch <= 10;
}

function detectSubjectBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (isNearWhitePixel(r, g, b)) {
        continue;
      }

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

async function decodeImageData(
  dataUrl: string,
  options: VectorizeOptions,
): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  dataUrl: string;
}> {
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  img.src = dataUrl;
  await img.decode();

  const base = Math.max(860, BASE_SIZE_BY_COMPLEXITY[options.controls.complexity]);
  const detailBoost = Math.round(clamp(options.controls.detailLevel, 0.2, 1) * 520);
  const targetMaxWidth = options.maxWidth ?? (base + detailBoost);
  const targetMaxHeight = options.maxHeight ?? (base + detailBoost);

  const scale = Math.min(targetMaxWidth / img.width, targetMaxHeight / img.height, 1);
  const width = Math.max(1, Math.floor(img.width * scale));
  const height = Math.max(1, Math.floor(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to create canvas context");
  }

  // Always flatten onto white so transparent/alpha backgrounds are deterministic.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  return {
    data: imageData.data,
    width,
    height,
    sourceWidth: img.width,
    sourceHeight: img.height,
    dataUrl: canvas.toDataURL("image/png"),
  };
}

function samplePixels(data: Uint8ClampedArray, maxSamples = 220_000): RGB[] {
  const totalPixels = Math.floor(data.length / 4);
  const stride = Math.max(1, Math.floor(totalPixels / maxSamples));
  const samples: RGB[] = [];

  for (let pixel = 0; pixel < totalPixels; pixel += stride) {
    const idx = pixel * 4;
    samples.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    });
  }

  if (samples.length === 0) {
    samples.push({ r: 255, g: 255, b: 255 });
  }

  return samples;
}

function initKMeansPlusPlus(samples: RGB[], k: number): RGB[] {
  const centers: RGB[] = [];
  centers.push(samples[Math.floor(Math.random() * samples.length)]);

  while (centers.length < k) {
    const distances = samples.map((sample) => {
      let best = Number.POSITIVE_INFINITY;
      for (const center of centers) {
        best = Math.min(best, colorDistanceSq(sample, center));
      }
      return best;
    });

    const sum = distances.reduce((acc, value) => acc + value, 0);
    if (!Number.isFinite(sum) || sum <= 0) {
      centers.push(samples[Math.floor(Math.random() * samples.length)]);
      continue;
    }

    let pick = Math.random() * sum;
    let chosen = samples[0];
    for (let i = 0; i < samples.length; i += 1) {
      pick -= distances[i];
      if (pick <= 0) {
        chosen = samples[i];
        break;
      }
    }
    centers.push(chosen);
  }

  return centers.map((center) => ({ ...center }));
}

function nearestCenterIndex(color: RGB, centers: RGB[]): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < centers.length; i += 1) {
    const dist = colorDistanceSq(color, centers[i]);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function runKMeans(samples: RGB[], requestedK: number, maxIterations = 18): RGB[] {
  const k = Math.max(2, Math.min(requestedK, samples.length));
  let centers = initKMeansPlusPlus(samples, k);
  const assignments = new Uint16Array(samples.length);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const sumsR = new Float64Array(k);
    const sumsG = new Float64Array(k);
    const sumsB = new Float64Array(k);
    const counts = new Uint32Array(k);

    for (let i = 0; i < samples.length; i += 1) {
      const idx = nearestCenterIndex(samples[i], centers);
      assignments[i] = idx;
      counts[idx] += 1;
      sumsR[idx] += samples[i].r;
      sumsG[idx] += samples[i].g;
      sumsB[idx] += samples[i].b;
    }

    let shift = 0;
    const nextCenters = centers.map((center, idx) => {
      if (counts[idx] === 0) {
        return center;
      }
      const next = {
        r: Math.round(sumsR[idx] / counts[idx]),
        g: Math.round(sumsG[idx] / counts[idx]),
        b: Math.round(sumsB[idx] / counts[idx]),
      };
      shift += colorDistanceSq(center, next);
      return next;
    });

    centers = nextCenters;
    if (shift / k < 1) {
      break;
    }
  }

  return centers;
}

interface BilateralOptions {
  radius: number;
  sigmaColor: number;
  sigmaSpace: number;
}

function applyBilateralFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: BilateralOptions,
): Uint8ClampedArray {
  const { radius, sigmaColor, sigmaSpace } = options;
  const diameter = (radius * 2) + 1;
  const out = new Uint8ClampedArray(data.length);

  const twoSigmaColorSq = 2 * sigmaColor * sigmaColor;
  const twoSigmaSpaceSq = 2 * sigmaSpace * sigmaSpace;
  const spatialKernel = new Float64Array(diameter * diameter);

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const spatialDistSq = (dx * dx) + (dy * dy);
      const kernelIdx = (dy + radius) * diameter + (dx + radius);
      spatialKernel[kernelIdx] = Math.exp(-(spatialDistSq / twoSigmaSpaceSq));
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const centerIdx = (y * width + x) * 4;
      const cr = data[centerIdx];
      const cg = data[centerIdx + 1];
      const cb = data[centerIdx + 2];

      let sumW = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;

      for (let dy = -radius; dy <= radius; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const idx = (yy * width + xx) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const colorDistSq = ((r - cr) * (r - cr))
            + ((g - cg) * (g - cg))
            + ((b - cb) * (b - cb));

          const colorWeight = Math.exp(-(colorDistSq / twoSigmaColorSq));
          const spatialWeight = spatialKernel[(dy + radius) * diameter + (dx + radius)];
          const weight = colorWeight * spatialWeight;

          sumW += weight;
          sumR += r * weight;
          sumG += g * weight;
          sumB += b * weight;
        }
      }

      if (sumW <= 0) {
        out[centerIdx] = cr;
        out[centerIdx + 1] = cg;
        out[centerIdx + 2] = cb;
        out[centerIdx + 3] = 255;
      } else {
        out[centerIdx] = Math.round(sumR / sumW);
        out[centerIdx + 1] = Math.round(sumG / sumW);
        out[centerIdx + 2] = Math.round(sumB / sumW);
        out[centerIdx + 3] = 255;
      }
    }
  }

  return out;
}

function assignLabels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  centers: RGB[],
): {
  labels: Uint16Array;
  counts: Uint32Array;
} {
  const total = width * height;
  const labels = new Uint16Array(total);
  const counts = new Uint32Array(centers.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const idx = pixel * 4;
      const label = nearestCenterIndex(
        {
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
        },
        centers,
      );
      labels[pixel] = label;
      counts[label] += 1;
    }
  }

  return { labels, counts };
}

function detectBackgroundLabels(
  centers: RGB[],
  counts: Uint32Array,
): { backgroundLabel: number; backgroundLabels: Set<number> } {
  const backgroundLabels = new Set<number>();
  let mainIndex = 0;
  for (let i = 1; i < counts.length; i += 1) {
    if (counts[i] > counts[mainIndex]) {
      mainIndex = i;
    }
  }
  backgroundLabels.add(mainIndex);

  for (let i = 0; i < centers.length; i += 1) {
    if (i === mainIndex) continue;
    const color = centers[i];
    const isLikelyBgNeighbor =
      brightness(color) > 220 &&
      chroma(color) < 24 &&
      colorDistanceSq(color, centers[mainIndex]) < (24 * 24);
    if (isLikelyBgNeighbor) {
      backgroundLabels.add(i);
    }
  }

  return { backgroundLabel: mainIndex, backgroundLabels };
}

function binaryMaskForLabel(labels: Uint16Array, width: number, height: number, label: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < labels.length; i += 1) {
    mask[i] = labels[i] === label ? 1 : 0;
  }
  return mask;
}

function morphErode(mask: Uint8Array, width: number, height: number, kernelSize: number): Uint8Array {
  const out = new Uint8Array(width * height);
  const half = Math.floor(kernelSize / 2);
  const start = -half;
  const end = kernelSize - half - 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      let keep = true;
      for (let ky = start; ky <= end && keep; ky += 1) {
        for (let kx = start; kx <= end; kx += 1) {
          const xx = x + kx;
          const yy = y + ky;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height || mask[yy * width + xx] === 0) {
            keep = false;
            break;
          }
        }
      }
      if (keep) {
        out[y * width + x] = 1;
      }
    }
  }

  return out;
}

function morphDilate(mask: Uint8Array, width: number, height: number, kernelSize: number): Uint8Array {
  const out = new Uint8Array(width * height);
  const half = Math.floor(kernelSize / 2);
  const start = -half;
  const end = kernelSize - half - 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      for (let ky = start; ky <= end; ky += 1) {
        for (let kx = start; kx <= end; kx += 1) {
          const xx = x + kx;
          const yy = y + ky;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          out[yy * width + xx] = 1;
        }
      }
    }
  }

  return out;
}

function morphOpen(mask: Uint8Array, width: number, height: number, kernelSize = 4): Uint8Array {
  return morphDilate(morphErode(mask, width, height, kernelSize), width, height, kernelSize);
}

function morphClose(mask: Uint8Array, width: number, height: number, kernelSize = 2): Uint8Array {
  return morphErode(morphDilate(mask, width, height, kernelSize), width, height, kernelSize);
}

function extractComponents(mask: Uint8Array, width: number, height: number): Component[] {
  const visited = new Uint8Array(width * height);
  const components: Component[] = [];
  const queue = new Int32Array(width * height);
  const offsets = [1, -1, width, -width];

  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 0 || visited[i] === 1) continue;

    let qStart = 0;
    let qEnd = 0;
    queue[qEnd++] = i;
    visited[i] = 1;
    const pixels: number[] = [];

    while (qStart < qEnd) {
      const current = queue[qStart++];
      pixels.push(current);
      const x = current % width;
      const y = Math.floor(current / width);

      for (const offset of offsets) {
        const next = current + offset;
        if (next < 0 || next >= mask.length) continue;
        const nx = next % width;
        const ny = Math.floor(next / width);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
        if (mask[next] === 0 || visited[next] === 1) continue;
        visited[next] = 1;
        queue[qEnd++] = next;
      }
    }

    components.push({
      area: pixels.length,
      pixels,
    });
  }

  return components;
}

interface Edge {
  start: Point;
  end: Point;
}

function edgeKey(point: Point): string {
  return `${point[0]},${point[1]}`;
}

function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += (x1 * y2) - (x2 * y1);
  }
  return area / 2;
}

function buildBoundaryLoops(
  component: Component,
  mask: Uint8Array,
  width: number,
  height: number,
): Point[][] {
  const edges: Edge[] = [];

  for (const pixel of component.pixels) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);

    const topOutside = y === 0 || mask[(y - 1) * width + x] === 0;
    const rightOutside = x === width - 1 || mask[y * width + (x + 1)] === 0;
    const bottomOutside = y === height - 1 || mask[(y + 1) * width + x] === 0;
    const leftOutside = x === 0 || mask[y * width + (x - 1)] === 0;

    if (topOutside) edges.push({ start: [x, y], end: [x + 1, y] });
    if (rightOutside) edges.push({ start: [x + 1, y], end: [x + 1, y + 1] });
    if (bottomOutside) edges.push({ start: [x + 1, y + 1], end: [x, y + 1] });
    if (leftOutside) edges.push({ start: [x, y + 1], end: [x, y] });
  }

  if (edges.length === 0) return [];

  const adjacency = new Map<string, number[]>();
  const used = new Uint8Array(edges.length);
  for (let i = 0; i < edges.length; i += 1) {
    const key = edgeKey(edges[i].start);
    const arr = adjacency.get(key) || [];
    arr.push(i);
    adjacency.set(key, arr);
  }

  const loops: Point[][] = [];

  function takeEdgeFrom(start: Point): number | null {
    const key = edgeKey(start);
    const list = adjacency.get(key);
    if (!list || list.length === 0) return null;
    for (const idx of list) {
      if (used[idx] === 0) return idx;
    }
    return null;
  }

  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
    if (used[edgeIndex] === 1) continue;

    const loop: Point[] = [];
    let current = edgeIndex;
    const start = edges[current].start;
    loop.push(start);

    while (current !== null) {
      used[current] = 1;
      const nextPoint = edges[current].end;
      loop.push(nextPoint);

      if (pointEquals(nextPoint, start)) {
        break;
      }

      const nextEdge = takeEdgeFrom(nextPoint);
      if (nextEdge === null) {
        break;
      }
      current = nextEdge;
    }

    if (loop.length >= 4 && pointEquals(loop[0], loop[loop.length - 1])) {
      loops.push(loop);
    }
  }

  return loops;
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }
  const t = clamp(((x - x1) * dx + (y - y1) * dy) / ((dx * dx) + (dy * dy)), 0, 1);
  const px = x1 + (t * dx);
  const py = y1 + (t * dy);
  return Math.hypot(x - px, y - py);
}

function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i += 1) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDistance) {
      maxDistance = dist;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}

function simplifyClosedPolygon(points: Point[], epsilon: number): Point[] {
  if (points.length < 4) return points;
  const ring = pointEquals(points[0], points[points.length - 1])
    ? points.slice(0, -1)
    : points.slice();
  if (ring.length < 3) return points;
  const simplified = rdp(ring, epsilon);
  if (simplified.length < 3) {
    return [];
  }
  if (!pointEquals(simplified[0], simplified[simplified.length - 1])) {
    simplified.push(simplified[0]);
  }
  return simplified;
}

function chaikinSmoothClosed(points: Point[], iterations = 1): Point[] {
  if (points.length < 4 || iterations <= 0) {
    return points;
  }

  let ring = pointEquals(points[0], points[points.length - 1])
    ? points.slice(0, -1)
    : points.slice();

  if (ring.length < 3) {
    return points;
  }

  for (let iter = 0; iter < iterations; iter += 1) {
    const next: Point[] = [];
    for (let i = 0; i < ring.length; i += 1) {
      const p0 = ring[i];
      const p1 = ring[(i + 1) % ring.length];
      const q: Point = [((0.75 * p0[0]) + (0.25 * p1[0])), ((0.75 * p0[1]) + (0.25 * p1[1]))];
      const r: Point = [((0.25 * p0[0]) + (0.75 * p1[0])), ((0.25 * p0[1]) + (0.75 * p1[1]))];
      next.push(q, r);
    }
    ring = next;
    if (ring.length > 2400) {
      break;
    }
  }

  if (!pointEquals(ring[0], ring[ring.length - 1])) {
    ring.push(ring[0]);
  }

  return ring;
}

interface SketchElementResult {
  area: number;
  element: unknown;
}

interface ElementOverrides {
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  roughness?: number;
}

function elementFromPolygon(
  polygon: Point[],
  color: RGB,
  area: number,
  controls: SketchControls,
  overrides?: ElementOverrides,
): SketchElementResult | null {
  if (polygon.length < 4) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 1 || height <= 1) {
    return null;
  }

  const points = polygon.map(([x, y]) => [x - minX, y - minY] as Point);
  if (!pointEquals(points[0], points[points.length - 1])) {
    points.push(points[0]);
  }

  const baseColor = rgbToHex(color.r, color.g, color.b);
  const stroke = overrides?.strokeColor || baseColor;
  const background = overrides?.backgroundColor || baseColor;
  const strokeWidth = overrides?.strokeWidth ?? clamp(controls.edgeSensitivity / 24, 0.8, 2.5);
  const roughness = overrides?.roughness ?? STYLE_ROUGHNESS[controls.style];

  return {
    area,
    element: {
      id: nanoid(),
      type: "line",
      x: minX,
      y: minY,
      width,
      height,
      angle: 0,
      strokeColor: stroke,
      backgroundColor: background,
      fillStyle: controls.style === "technical" ? "solid" : "solid",
      strokeWidth,
      strokeStyle: "solid",
      roughness,
      opacity: 100,
      groupIds: [],
      roundness: null,
      seed: Math.floor(Math.random() * 1_000_000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 1_000_000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      points,
      pressures: [],
      simulatePressure: false,
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: null,
    },
  };
}

function sanitizeCheckerboardBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  // Convert neutral light edge-connected regions to white to avoid checkerboard artifacts.
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);

  function isNearNeutralLight(r: number, g: number, b: number): boolean {
    const br = (r * 0.299) + (g * 0.587) + (b * 0.114);
    const ch = Math.max(r, g, b) - Math.min(r, g, b);
    return br > 165 && ch < 30;
  }

  function enqueueIfCandidate(pixel: number, endRef: { value: number }): void {
    if (visited[pixel] === 1) return;
    const idx = pixel * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (!isNearNeutralLight(r, g, b)) return;
    visited[pixel] = 1;
    queue[endRef.value++] = pixel;
  }

  const qEnd = { value: 0 };
  for (let x = 0; x < width; x += 1) {
    enqueueIfCandidate(x, qEnd);
    enqueueIfCandidate((height - 1) * width + x, qEnd);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueueIfCandidate(y * width, qEnd);
    enqueueIfCandidate(y * width + (width - 1), qEnd);
  }

  let qStart = 0;
  while (qStart < qEnd.value) {
    const current = queue[qStart++];
    const x = current % width;
    const y = Math.floor(current / width);
    const idx = current * 4;
    data[idx] = 255;
    data[idx + 1] = 255;
    data[idx + 2] = 255;
    data[idx + 3] = 255;

    if (x > 0) enqueueIfCandidate(current - 1, qEnd);
    if (x < width - 1) enqueueIfCandidate(current + 1, qEnd);
    if (y > 0) enqueueIfCandidate(current - width, qEnd);
    if (y < height - 1) enqueueIfCandidate(current + width, qEnd);
  }
}

function buildOutlineMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  edgeSensitivity: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const gradientThreshold = clamp(58 - (edgeSensitivity * 0.9), 20, 48);
  const darkThreshold = clamp(138 - (edgeSensitivity * 1.5), 72, 132);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const idx = pixel * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = pixelLuminance(r, g, b);

      const rightIdx = (y * width + Math.min(width - 1, x + 1)) * 4;
      const downIdx = (Math.min(height - 1, y + 1) * width + x) * 4;

      const lumRight = pixelLuminance(data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]);
      const lumDown = pixelLuminance(data[downIdx], data[downIdx + 1], data[downIdx + 2]);
      const gradient = Math.max(Math.abs(lum - lumRight), Math.abs(lum - lumDown));

      const isDarkLine = lum <= darkThreshold && (gradient >= gradientThreshold || lum <= (darkThreshold - 18));
      if (isDarkLine) {
        mask[pixel] = 1;
      }
    }
  }

  const closed = morphClose(mask, width, height, 2);
  return morphOpen(closed, width, height, 2);
}

function runContourVectorization(
  imageData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  controls: SketchControls,
  maxElements: number,
): SketchVectorizationResult {
  const started = performance.now();
  const k = clamp(Math.round(controls.colorPalette || 8), 2, 24);
  const logs: string[] = [];

  logs.push("Applying edge-preserving Bilateral Filter to smooth noise but keep shape edges crisp...");
  const bilateralRadius = controls.detailLevel > 0.75 ? 2 : 1;
  const filteredImage = applyBilateralFilter(imageData, width, height, {
    radius: bilateralRadius,
    sigmaColor: 45,
    sigmaSpace: 2,
  });

  logs.push("Applying K-Means clustering to simplify colors...");
  const centers = runKMeans(samplePixels(filteredImage), k);
  const { labels, counts } = assignLabels(filteredImage, width, height, centers);
  const { backgroundLabel, backgroundLabels } = detectBackgroundLabels(centers, counts);
  logs.push(`Found ${k} main color clusters. Extracting colored vector paths...`);

  const epsilon = clamp(2.45 - (controls.detailLevel * 1.35), 0.85, 2.25);
  const minArea = Math.max(18, Math.round(48 - (controls.detailLevel * 32)));
  const kernelSize = controls.detailLevel >= 0.85 ? 3 : 4;
  const colorElementsWithArea: SketchElementResult[] = [];
  const outlineElementsWithArea: SketchElementResult[] = [];
  let componentsFound = 0;
  let componentsFiltered = 0;

  for (let label = 0; label < centers.length; label += 1) {
    if (backgroundLabels.has(label)) {
      continue;
    }

    const mask = binaryMaskForLabel(labels, width, height, label);
    const closed = morphClose(mask, width, height, 2);
    const opened = morphOpen(closed, width, height, kernelSize);
    const components = extractComponents(opened, width, height);
    componentsFound += components.length;

    for (const component of components) {
      if (component.area < minArea) {
        componentsFiltered += 1;
        continue;
      }

      const loops = buildBoundaryLoops(component, opened, width, height);
      if (loops.length === 0) {
        continue;
      }

      // RETR_EXTERNAL-like behavior: keep only the largest outer loop.
      let chosen = loops[0];
      let chosenArea = Math.abs(polygonArea(chosen));
      for (let i = 1; i < loops.length; i += 1) {
        const area = Math.abs(polygonArea(loops[i]));
        if (area > chosenArea) {
          chosen = loops[i];
          chosenArea = area;
        }
      }

      const smoothed = chaikinSmoothClosed(chosen, controls.detailLevel >= 0.8 ? 1 : 0);
      const simplified = simplifyClosedPolygon(smoothed, epsilon);
      if (simplified.length < 4) {
        continue;
      }

      const result = elementFromPolygon(simplified, centers[label], component.area, controls);
      if (result) {
        colorElementsWithArea.push(result);
      }
    }
  }

  logs.push("Extracting dark outline paths...");
  const outlineMask = buildOutlineMask(filteredImage, width, height, controls.edgeSensitivity);
  const outlineComponents = extractComponents(outlineMask, width, height);
  const minOutlineArea = Math.max(10, Math.round(minArea * 0.45));

  for (const component of outlineComponents) {
    if (component.area < minOutlineArea) {
      continue;
    }

    const loops = buildBoundaryLoops(component, outlineMask, width, height);
    if (loops.length === 0) {
      continue;
    }

    let chosen = loops[0];
    let chosenArea = Math.abs(polygonArea(chosen));
    for (let i = 1; i < loops.length; i += 1) {
      const area = Math.abs(polygonArea(loops[i]));
      if (area > chosenArea) {
        chosen = loops[i];
        chosenArea = area;
      }
    }

    const smoothed = chaikinSmoothClosed(chosen, 1);
    const simplified = simplifyClosedPolygon(smoothed, clamp(epsilon * 0.65, 0.6, 1.6));
    if (simplified.length < 4) {
      continue;
    }

    const outlineResult = elementFromPolygon(
      simplified,
      { r: 0, g: 0, b: 0 },
      component.area,
      controls,
      {
        strokeColor: "#050505",
        backgroundColor: "#050505",
        strokeWidth: clamp(controls.edgeSensitivity / 20, 1.15, 2.7),
        roughness: 0,
      },
    );

    if (outlineResult) {
      outlineElementsWithArea.push(outlineResult);
    }
  }

  colorElementsWithArea.sort((a, b) => b.area - a.area);
  outlineElementsWithArea.sort((a, b) => b.area - a.area);

  const reservedForOutlines = Math.min(
    outlineElementsWithArea.length,
    Math.max(12, Math.floor(maxElements * 0.3)),
  );
  const colorBudget = Math.max(0, maxElements - reservedForOutlines);
  const emittedColor = colorElementsWithArea.slice(0, colorBudget);
  const emittedOutline = outlineElementsWithArea.slice(0, maxElements - emittedColor.length);
  const emitted = [...emittedColor, ...emittedOutline].map((entry) => entry.element);

  logs.push(`Total colored shape elements created: ${colorElementsWithArea.length}`);
  logs.push(`Outline components found: ${outlineComponents.length}`);
  logs.push(`Outline shape elements created: ${outlineElementsWithArea.length}`);

  return {
    elements: emitted,
    logs,
    metadata: {
      sourceWidth,
      sourceHeight,
      workingWidth: width,
      workingHeight: height,
      numColorsRequested: k,
      numColorsUsed: centers.length,
      backgroundLabel,
      morphologyKernelSize: kernelSize,
      epsilon,
      minArea,
      componentsFound,
      componentsFiltered,
      elementsCreated: colorElementsWithArea.length + outlineElementsWithArea.length,
      elementsEmitted: emitted.length,
      outlineComponentsFound: outlineComponents.length,
      outlineElementsCreated: outlineElementsWithArea.length,
      processingMs: Math.round(performance.now() - started),
    },
  };
}

export async function normalizeSketchImageDataUrl(imageDataUrl: string): Promise<string> {
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  img.src = imageDataUrl;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to create canvas context");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  sanitizeCheckerboardBackground(imageData.data, canvas.width, canvas.height);
  ctx.putImageData(imageData, 0, 0);

  const bounds = detectSubjectBounds(imageData.data, canvas.width, canvas.height);
  if (!bounds) {
    return canvas.toDataURL("image/png");
  }

  const subjectWidth = (bounds.maxX - bounds.minX) + 1;
  const subjectHeight = (bounds.maxY - bounds.minY) + 1;
  const subjectSize = Math.max(subjectWidth, subjectHeight);
  const padding = Math.max(18, Math.round(subjectSize * 0.1));
  const squareSize = Math.max(subjectSize + (padding * 2), 256);

  const squareCanvas = document.createElement("canvas");
  squareCanvas.width = squareSize;
  squareCanvas.height = squareSize;
  const squareCtx = squareCanvas.getContext("2d");
  if (!squareCtx) {
    return canvas.toDataURL("image/png");
  }

  squareCtx.fillStyle = "#ffffff";
  squareCtx.fillRect(0, 0, squareSize, squareSize);

  const drawWidth = subjectWidth;
  const drawHeight = subjectHeight;
  const dx = Math.floor((squareSize - drawWidth) / 2);
  const dy = Math.floor((squareSize - drawHeight) / 2);
  squareCtx.drawImage(
    canvas,
    bounds.minX,
    bounds.minY,
    subjectWidth,
    subjectHeight,
    dx,
    dy,
    drawWidth,
    drawHeight,
  );

  return squareCanvas.toDataURL("image/png");
}

export async function vectorizeImageToSketchElements(
  imageDataUrl: string,
  options: VectorizeOptions,
): Promise<unknown[]> {
  const result = await vectorizeImageToSketch(imageDataUrl, options);
  return result.elements;
}

export async function vectorizeImageToSketch(
  imageDataUrl: string,
  options: VectorizeOptions,
): Promise<SketchVectorizationResult> {
  const normalizedDataUrl = await normalizeSketchImageDataUrl(imageDataUrl);
  const decoded = await decodeImageData(normalizedDataUrl, options);
  sanitizeCheckerboardBackground(decoded.data, decoded.width, decoded.height);

  const maxElements = options.maxElements
    ?? MAX_ELEMENTS_BY_COMPLEXITY[options.controls.complexity];

  return runContourVectorization(
    decoded.data,
    decoded.sourceWidth,
    decoded.sourceHeight,
    decoded.width,
    decoded.height,
    options.controls,
    maxElements,
  );
}
