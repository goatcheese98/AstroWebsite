/**
 * Barrel export for all Zod schemas
 * Provides clean imports throughout the application
 */

// Chat schemas
export {
  ChatMessageSchema,
  CanvasStateSchema,
  ChatRequestSchema,
  ChatResponseSchema,
  ChatErrorResponseSchema,
  validateChatRequest,
  type ChatMessage,
  type CanvasState,
  type ChatRequest,
  type ChatResponse,
  type ChatErrorResponse,
} from './chat.schema';

// Image generation schemas
export {
  ImageGenerationRequestSchema,
  ImageGenerationResponseSchema,
  ImageGenerationErrorResponseSchema,
  GeminiInlineDataSchema,
  GeminiPartSchema,
  GeminiContentSchema,
  GeminiCandidateSchema,
  GeminiResponseSchema,
  validateImageRequest,
  type ImageGenerationRequest,
  type ImageGenerationResponse,
  type ImageGenerationErrorResponse,
  type GeminiInlineData,
  type GeminiPart,
  type GeminiContent,
  type GeminiCandidate,
  type GeminiResponse,
} from './image.schema';
