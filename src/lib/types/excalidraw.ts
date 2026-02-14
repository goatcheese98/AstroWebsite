/**
 * Proper TypeScript types for Excalidraw canvas data
 * Replaces `any[]` and `any` usage throughout the codebase
 */
import type {
  ExcalidrawElement,
  AppState,
  BinaryFiles,
} from '@excalidraw/excalidraw/types';

// Re-export core Excalidraw types for convenience
export type { ExcalidrawElement, AppState, BinaryFiles };

/**
 * Custom element types we add on top of Excalidraw
 */
export type CustomElementType = 'markdown' | 'web-embed' | 'lexical';

/**
 * Extended Excalidraw element with our custom data
 */
export interface CustomExcalidrawElement extends ExcalidrawElement {
  customData?: {
    type?: CustomElementType;
    content?: string;
    url?: string;
    [key: string]: unknown;
  };
}

/**
 * Core canvas data structure as stored in R2
 */
export interface CanvasData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles | null;
}

/**
 * Canvas metadata stored in D1 metadata column
 */
export interface CanvasMetadata {
  tags?: string[];
  isFavorite?: boolean;
  collaborators?: string[];
  description?: string;
  [key: string]: unknown; // Allow additional custom metadata
}

/**
 * Complete canvas information (DB record + metadata)
 * Used for API responses
 */
export interface CanvasWithMetadata {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  version: number;
  createdAt: number; // Unix timestamp (seconds)
  updatedAt: number; // Unix timestamp (seconds)
  metadata: CanvasMetadata;
  sizeBytes: number;
}

/**
 * Canvas list item (for library view)
 */
export interface CanvasListItem {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
  metadata: CanvasMetadata;
  sizeBytes: number;
  isFavorite?: boolean; // Computed from favorites table
  tags?: string[]; // Computed from tags table
}

/**
 * Canvas version information
 */
export interface CanvasVersionInfo {
  id: string;
  canvasId: string;
  version: number;
  r2Key: string;
  createdAt: number;
}

/**
 * Canvas share information
 */
export interface CanvasShareInfo {
  id: string;
  canvasId: string;
  shareToken: string;
  expiresAt: number | null;
  createdAt: number;
}

/**
 * Type guard to check if data is valid CanvasData
 */
export function isCanvasData(data: unknown): data is CanvasData {
  if (!data || typeof data !== 'object') return false;

  const d = data as any;
  return (
    Array.isArray(d.elements) &&
    typeof d.appState === 'object' &&
    (d.files === null || typeof d.files === 'object')
  );
}

/**
 * Parse metadata JSON safely
 */
export function parseCanvasMetadata(metadataJson: string | null): CanvasMetadata {
  if (!metadataJson) return {};

  try {
    const parsed = JSON.parse(metadataJson);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
