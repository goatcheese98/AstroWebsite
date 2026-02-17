/**
 * Screenshot Async Helper
 * 
 * Replaces the event-based screenshot system with direct async functions.
 * 
 * Usage:
 *   const dataUrl = await captureScreenshot(api, { quality: 'high', elementIds: ['id1'] });
 */

import type { ExcalidrawAPI } from '../types';

export interface ScreenshotOptions {
  /** Element IDs to capture (undefined = full canvas) */
  elementIds?: string[];
  /** Quality preset */
  quality?: 'low' | 'high' | 'preview';
  /** Background color override */
  backgroundColor?: string;
  /** Padding around elements in pixels */
  padding?: number;
}

export interface ScreenshotResult {
  dataUrl: string;
  width: number;
  height: number;
  elementCount: number;
}

/**
 * Capture a screenshot of the canvas or selected elements
 * 
 * This is a pure async function - no events, no side effects.
 * Returns a promise that resolves with the screenshot data URL.
 */
export async function captureScreenshot(
  api: ExcalidrawAPI,
  options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
  const { elementIds, quality = 'high', backgroundColor, padding = 10 } = options;

  // Get current scene
  const elements = api.getSceneElements();
  const appState = api.getAppState();

  // Filter elements if specific IDs provided
  let targetElements = elements;
  if (elementIds && elementIds.length > 0) {
    const idSet = new Set(elementIds);
    targetElements = elements.filter((el) => idSet.has(el.id));
  }

  if (targetElements.length === 0) {
    throw new Error('No elements to capture');
  }

  // Calculate bounds
  const bounds = calculateBounds(targetElements, padding);

  // Determine scale based on quality
  const scale = quality === 'low' ? 0.5 : quality === 'preview' ? 0.75 : 1;

  // Create canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(bounds.width * scale);
  canvas.height = Math.floor(bounds.height * scale);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Fill background
  ctx.fillStyle = backgroundColor || (appState.viewBackgroundColor as string) || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Scale context
  ctx.scale(scale, scale);
  ctx.translate(-bounds.minX, -bounds.minY);

  // Export using Excalidraw's export utilities if available
  // Otherwise, render elements manually
  try {
    // Try to use Excalidraw's exportToCanvas if available
    const exportResult = await exportToCanvas(api, targetElements, bounds, scale, backgroundColor);
    
    return {
      dataUrl: exportResult,
      width: canvas.width,
      height: canvas.height,
      elementCount: targetElements.length,
    };
  } catch (error) {
    // Fallback: use html2canvas on the canvas container
    return fallbackScreenshot(api, targetElements, bounds, scale, backgroundColor);
  }
}

/**
 * Export to canvas using Excalidraw utilities
 */
async function exportToCanvas(
  api: ExcalidrawAPI,
  elements: any[],
  bounds: Bounds,
  scale: number,
  backgroundColor?: string
): Promise<string> {
  // Try to dynamically import Excalidraw's export utilities
  try {
    const excalidrawModule = await import('@excalidraw/excalidraw');
    const exportToCanvas = excalidrawModule.exportToCanvas;

    if (!exportToCanvas) {
      throw new Error('exportToCanvas not available');
    }

    const canvas = await exportToCanvas({
      elements,
      appState: {
        ...api.getAppState(),
        exportBackground: true,
        viewBackgroundColor: backgroundColor || '#ffffff',
      },
      files: api.getFiles(),
      exportPadding: 10,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('Excalidraw export failed, using fallback:', error);
    throw error;
  }
}

/**
 * Fallback screenshot using html2canvas
 */
async function fallbackScreenshot(
  api: ExcalidrawAPI,
  elements: any[],
  bounds: Bounds,
  scale: number,
  backgroundColor?: string
): Promise<ScreenshotResult> {
  // Find the Excalidraw canvas element
  const canvasElement = document.querySelector('.excalidraw__canvas') as HTMLCanvasElement;
  
  if (!canvasElement) {
    throw new Error('Canvas element not found');
  }

  // Use html2canvas if available
  try {
    const html2canvas = (await import('html2canvas')).default;
    
    const result = await html2canvas(canvasElement, {
      backgroundColor: backgroundColor || '#ffffff',
      scale,
      logging: false,
    });

    return {
      dataUrl: result.toDataURL('image/png'),
      width: result.width,
      height: result.height,
      elementCount: elements.length,
    };
  } catch (error) {
    throw new Error(`Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

function calculateBounds(elements: any[], padding: number): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const x = el.x || 0;
    const y = el.y || 0;
    const width = el.width || 0;
    const height = el.height || 0;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Capture screenshot for chat context (low quality, fast)
 */
export function captureForChat(api: ExcalidrawAPI, elementIds?: string[]): Promise<ScreenshotResult> {
  return captureScreenshot(api, { quality: 'low', elementIds });
}

/**
 * Capture screenshot for image generation (high quality)
 */
export function captureForGeneration(
  api: ExcalidrawAPI,
  elementIds: string[],
  backgroundColor?: string
): Promise<ScreenshotResult> {
  return captureScreenshot(api, {
    quality: 'high',
    elementIds,
    backgroundColor,
  });
}

/**
 * Capture screenshot for preview (medium quality)
 */
export function captureForPreview(api: ExcalidrawAPI, elementIds: string[]): Promise<ScreenshotResult> {
  return captureScreenshot(api, {
    quality: 'preview',
    elementIds,
    padding: 20,
  });
}
