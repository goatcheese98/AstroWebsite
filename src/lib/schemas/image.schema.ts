/**
 * Zod Schemas for Image Generation API
 * Provides runtime validation and TypeScript type inference
 */

import { z } from 'zod';
import { GEMINI_CONFIG } from '../api-config';

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
      GEMINI_CONFIG.MIN_PROMPT_LENGTH,
      `Prompt too short. Minimum ${GEMINI_CONFIG.MIN_PROMPT_LENGTH} characters`
    )
    .max(
      GEMINI_CONFIG.MAX_PROMPT_LENGTH,
      `Prompt too long. Maximum ${GEMINI_CONFIG.MAX_PROMPT_LENGTH} characters`
    )
    .transform((str) => str.trim()) // Auto-trim whitespace
    .refine((str) => str.length >= GEMINI_CONFIG.MIN_PROMPT_LENGTH, {
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
    .enum(GEMINI_CONFIG.ALLOWED_MODELS, {
      errorMap: () => ({
        message: `Invalid model. Allowed: ${GEMINI_CONFIG.ALLOWED_MODELS.join(', ')}`,
      }),
    })
    .optional()
    .default(GEMINI_CONFIG.DEFAULT_MODEL),
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
// Gemini API Response Type Schemas
// ============================================================================

/**
 * Gemini inline data schema (for type safety)
 */
export const GeminiInlineDataSchema = z.object({
  data: z.string(),
  mimeType: z.string(),
});

/**
 * Gemini part schema (can be text or inline data)
 */
export const GeminiPartSchema = z.object({
  inlineData: GeminiInlineDataSchema.optional(),
  text: z.string().optional(),
});

/**
 * Gemini content schema
 */
export const GeminiContentSchema = z.object({
  role: z.string(),
  parts: z.array(GeminiPartSchema),
});

/**
 * Gemini candidate schema
 */
export const GeminiCandidateSchema = z.object({
  content: GeminiContentSchema,
  finishReason: z.string().optional(),
  safetyRatings: z.array(z.unknown()).optional(),
});

/**
 * Gemini response schema
 */
export const GeminiResponseSchema = z.object({
  candidates: z.array(GeminiCandidateSchema).optional(),
});

// ============================================================================
// Type Exports (Inferred from Zod Schemas)
// ============================================================================

export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;
export type ImageGenerationResponse = z.infer<typeof ImageGenerationResponseSchema>;
export type ImageGenerationErrorResponse = z.infer<typeof ImageGenerationErrorResponseSchema>;
export type GeminiInlineData = z.infer<typeof GeminiInlineDataSchema>;
export type GeminiPart = z.infer<typeof GeminiPartSchema>;
export type GeminiContent = z.infer<typeof GeminiContentSchema>;
export type GeminiCandidate = z.infer<typeof GeminiCandidateSchema>;
export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

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
