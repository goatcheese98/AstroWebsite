/**
 * Zod Schemas for Image Generation API
 * Provides runtime validation and TypeScript type inference
 */

import { z } from 'zod';
import { IMAGE_WORKER_CONFIG } from '../api-config';

// ============================================================================
// Image Generation Request Schema
// ============================================================================

/**
 * Image generation request schema
 * Validates prompt and model selection
 */
export const ImageGenerationRequestSchema = z.object({
  prompt: z
    .string({
      required_error: 'Prompt is required',
      invalid_type_error: 'Prompt must be a string',
    })
    .min(
      IMAGE_WORKER_CONFIG.MIN_PROMPT_LENGTH,
      `Prompt too short. Minimum ${IMAGE_WORKER_CONFIG.MIN_PROMPT_LENGTH} characters`
    )
    .max(
      IMAGE_WORKER_CONFIG.MAX_PROMPT_LENGTH,
      `Prompt too long. Maximum ${IMAGE_WORKER_CONFIG.MAX_PROMPT_LENGTH} characters`
    )
    .transform((str) => str.trim()) // Auto-trim whitespace
    .refine((str) => str.length >= IMAGE_WORKER_CONFIG.MIN_PROMPT_LENGTH, {
      message: 'Prompt cannot be only whitespace',
    })
    // Reject null bytes
    .refine((str) => !str.includes('\0'), {
      message: 'Prompt contains invalid characters (null bytes)',
    })
    // Reject excessive repetition (potential DoS)
    .refine((str) => !/(.)\1{100,}/.test(str), {
      message: 'Prompt contains suspicious patterns (excessive repetition)',
    })
    // Reject excessive newlines
    .refine((str) => !/\n{50,}/.test(str), {
      message: 'Prompt contains too many consecutive newlines',
    }),
  model: z
    .enum(IMAGE_WORKER_CONFIG.ALLOWED_MODELS, {
      errorMap: () => ({
        message: `Invalid model. Allowed: ${IMAGE_WORKER_CONFIG.ALLOWED_MODELS.join(', ')}`,
      }),
    })
    .optional()
    .default(IMAGE_WORKER_CONFIG.DEFAULT_MODEL),
});

// ============================================================================
// Image Generation Response Schemas
// ============================================================================

/**
 * Successful image generation response schema
 */
export const ImageGenerationResponseSchema = z.object({
  success: z.literal(true),
  imageData: z.string(), // Base64 encoded image
  mimeType: z.string(),
  model: z.string(),
});

/**
 * Error response schema
 */
export const ImageGenerationErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string(),
});

// ============================================================================
// Model API Response Type Schemas
// ============================================================================

/**
 * Inline data schema (for type safety)
 */
export const ModelInlineDataSchema = z.object({
  data: z.string(),
  mimeType: z.string(),
});

/**
 * Part schema (can be text or inline data)
 */
export const ModelPartSchema = z.object({
  inlineData: ModelInlineDataSchema.optional(),
  text: z.string().optional(),
});

/**
 * Content schema
 */
export const ModelContentSchema = z.object({
  role: z.string(),
  parts: z.array(ModelPartSchema),
});

/**
 * Candidate schema
 */
export const ModelCandidateSchema = z.object({
  content: ModelContentSchema,
  finishReason: z.string().optional(),
  safetyRatings: z.array(z.unknown()).optional(),
});

/**
 * Response schema
 */
export const ModelResponseSchema = z.object({
  candidates: z.array(ModelCandidateSchema).optional(),
});

// ============================================================================
// Type Exports (Inferred from Zod Schemas)
// ============================================================================

export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;
export type ImageGenerationResponse = z.infer<typeof ImageGenerationResponseSchema>;
export type ImageGenerationErrorResponse = z.infer<typeof ImageGenerationErrorResponseSchema>;
export type ModelInlineData = z.infer<typeof ModelInlineDataSchema>;
export type ModelPart = z.infer<typeof ModelPartSchema>;
export type ModelContent = z.infer<typeof ModelContentSchema>;
export type ModelCandidate = z.infer<typeof ModelCandidateSchema>;
export type ModelResponse = z.infer<typeof ModelResponseSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Parse and validate image generation request with detailed error handling
 * Returns either success with data or error response
 */
export function validateImageRequest(body: unknown): {
  success: true;
  data: ImageGenerationRequest;
} | {
  success: false;
  error: string;
  details: string;
  statusCode: number;
} {
  const result = ImageGenerationRequestSchema.safeParse(body);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  // Format Zod errors into readable message
  const firstError = result.error.errors[0];
  const path = firstError.path.join('.');
  const message = firstError.message;

  return {
    success: false,
    error: path ? `Invalid ${path}` : 'Validation error',
    details: message,
    statusCode: 400,
  };
}
