/**
 * API Type Definitions
 *
 * @deprecated This file is deprecated. Types are now derived from Zod schemas.
 * Import from '@/lib/schemas' instead for automatic type inference and validation.
 *
 * This file now re-exports types from schemas for backward compatibility.
 */

// Re-export all types from Zod schemas
export type {
  // Chat types
  ChatMessage,
  CanvasState,
  ChatRequest,
  ChatResponse,
  ChatErrorResponse,

  // Image generation types
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageGenerationErrorResponse,

  // Gemini API types
  GeminiInlineData,
  GeminiPart,
  GeminiContent,
  GeminiCandidate,
  GeminiResponse,
} from '@/lib/schemas';

// Shared API Error type
export interface APIError {
  error: string;
  details: string;
  statusCode?: number;
}
