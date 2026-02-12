/**
 * Canvas Storage Utilities
 * Handles saving and loading canvas data from Cloudflare R2
 */

import type { R2Bucket } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

// ============================================================================
// Canvas Data Types
// ============================================================================

export interface CanvasData {
  elements: any[]; // Excalidraw elements
  appState?: {
    viewBackgroundColor?: string;
    currentItemStrokeColor?: string;
    currentItemBackgroundColor?: string;
    [key: string]: any;
  };
  files?: Record<string, any>; // Excalidraw files (images, etc.)
}

// ============================================================================
// Storage Functions
// ============================================================================

/**
 * Generate a unique R2 key for canvas storage
 */
export function generateCanvasKey(userId: string, canvasId: string): string {
  return `canvases/${userId}/${canvasId}/canvas.json`;
}

/**
 * Generate a unique R2 key for canvas version storage
 */
export function generateCanvasVersionKey(
  userId: string,
  canvasId: string,
  version: number
): string {
  return `canvases/${userId}/${canvasId}/versions/v${version}.json`;
}

/**
 * Generate a unique R2 key for canvas thumbnail
 */
export function generateThumbnailKey(userId: string, canvasId: string): string {
  return `canvases/${userId}/${canvasId}/thumbnail.png`;
}

/**
 * Save canvas data to R2
 */
export async function saveCanvasToR2(
  bucket: R2Bucket,
  r2Key: string,
  canvasData: CanvasData
): Promise<void> {
  const jsonString = JSON.stringify(canvasData);

  await bucket.put(r2Key, jsonString, {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    },
    customMetadata: {
      savedAt: new Date().toISOString(),
    },
  });
}

/**
 * Load canvas data from R2
 */
export async function loadCanvasFromR2(
  bucket: R2Bucket,
  r2Key: string
): Promise<CanvasData | null> {
  const object = await bucket.get(r2Key);

  if (!object) {
    return null;
  }

  const jsonString = await object.text();
  return JSON.parse(jsonString) as CanvasData;
}

/**
 * Delete canvas data from R2
 */
export async function deleteCanvasFromR2(
  bucket: R2Bucket,
  r2Key: string
): Promise<void> {
  await bucket.delete(r2Key);
}

/**
 * Save canvas thumbnail to R2
 */
export async function saveThumbnailToR2(
  bucket: R2Bucket,
  r2Key: string,
  imageData: ArrayBuffer | string
): Promise<void> {
  await bucket.put(r2Key, imageData, {
    httpMetadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
  });
}

/**
 * Load canvas thumbnail from R2
 */
export async function loadThumbnailFromR2(
  bucket: R2Bucket,
  r2Key: string
): Promise<ArrayBuffer | null> {
  const object = await bucket.get(r2Key);

  if (!object) {
    return null;
  }

  return object.arrayBuffer();
}

/**
 * List all canvas files for a user
 */
export async function listUserCanvases(
  bucket: R2Bucket,
  userId: string
): Promise<string[]> {
  const prefix = `canvases/${userId}/`;
  const result = await bucket.list({ prefix });

  return result.objects.map((obj) => obj.key);
}

/**
 * Delete all canvas files for a specific canvas
 * (includes main canvas, versions, and thumbnail)
 */
export async function deleteAllCanvasFiles(
  bucket: R2Bucket,
  userId: string,
  canvasId: string
): Promise<void> {
  const prefix = `canvases/${userId}/${canvasId}/`;
  const result = await bucket.list({ prefix });

  const keysToDelete = result.objects.map((obj) => obj.key);

  if (keysToDelete.length > 0) {
    await bucket.delete(keysToDelete);
  }
}

/**
 * Validate canvas data structure
 */
export function validateCanvasData(data: unknown): data is CanvasData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const canvas = data as Partial<CanvasData>;

  // Must have elements array
  if (!Array.isArray(canvas.elements)) {
    return false;
  }

  // appState is optional but must be object if present
  if (canvas.appState !== undefined && typeof canvas.appState !== 'object') {
    return false;
  }

  // files is optional but must be object if present
  if (canvas.files !== undefined && typeof canvas.files !== 'object') {
    return false;
  }

  return true;
}

// ============================================================================
// Compressed Storage Functions (gzip)
// ============================================================================

/**
 * Gzip compress a string to ArrayBuffer using CompressionStream
 */
async function gzipCompress(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });
  const compressed = stream.pipeThrough(new CompressionStream('gzip'));
  const reader = compressed.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.length;
  }
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}

/**
 * Gzip decompress an ArrayBuffer to string using DecompressionStream
 */
async function gzipDecompress(data: ArrayBuffer): Promise<string> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(data));
      controller.close();
    },
  });
  const decompressed = stream.pipeThrough(new DecompressionStream('gzip'));
  const reader = decompressed.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

/**
 * Check if data is gzip compressed (magic bytes 0x1f 0x8b)
 */
function isGzipped(data: ArrayBuffer): boolean {
  const view = new Uint8Array(data);
  return view.length >= 2 && view[0] === 0x1f && view[1] === 0x8b;
}

/**
 * Save canvas data to R2 with gzip compression
 */
export async function saveCanvasToR2Compressed(
  bucket: R2Bucket,
  r2Key: string,
  canvasData: CanvasData
): Promise<number> {
  const jsonString = JSON.stringify(canvasData);
  const compressed = await gzipCompress(jsonString);

  await bucket.put(r2Key, compressed, {
    httpMetadata: {
      contentType: 'application/json',
      contentEncoding: 'gzip',
      cacheControl: 'public, max-age=31536000',
    },
    customMetadata: {
      savedAt: new Date().toISOString(),
      compressed: 'gzip',
      originalSize: jsonString.length.toString(),
    },
  });

  return compressed.byteLength;
}

/**
 * Load canvas data from R2 with auto-detection of gzip
 */
export async function loadCanvasFromR2Compressed(
  bucket: R2Bucket,
  r2Key: string
): Promise<CanvasData | null> {
  const object = await bucket.get(r2Key);
  if (!object) return null;

  const buffer = await object.arrayBuffer();

  let jsonString: string;
  if (isGzipped(buffer)) {
    jsonString = await gzipDecompress(buffer);
  } else {
    jsonString = new TextDecoder().decode(buffer);
  }

  return JSON.parse(jsonString) as CanvasData;
}

/**
 * Calculate storage size for canvas data
 */
export function getCanvasDataSize(canvasData: CanvasData): number {
  return new TextEncoder().encode(JSON.stringify(canvasData)).length;
}

/**
 * Check if canvas data exceeds size limit (10MB default)
 */
export function isCanvasTooLarge(
  canvasData: CanvasData,
  maxSizeBytes: number = 10 * 1024 * 1024
): boolean {
  return getCanvasDataSize(canvasData) > maxSizeBytes;
}
