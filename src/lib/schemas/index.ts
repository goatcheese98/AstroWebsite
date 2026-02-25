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
  ModelInlineDataSchema,
  ModelPartSchema,
  ModelContentSchema,
  ModelCandidateSchema,
  ModelResponseSchema,
  validateImageRequest,
  type ImageGenerationRequest,
  type ImageGenerationResponse,
  type ImageGenerationErrorResponse,
  type ModelInlineData,
  type ModelPart,
  type ModelContent,
  type ModelCandidate,
  type ModelResponse,
} from './image.schema';
