/**
 * Zod Schemas for Chat API
 * Provides runtime validation and TypeScript type inference
 */

import { z } from 'zod';
import { CLAUDE_CONFIG } from '../api-config';

// ============================================================================
// Chat Message Schema
// ============================================================================

/**
 * Individual chat message schema
 * Validates role and content with automatic sanitization
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant'], {
    errorMap: () => ({ message: 'Role must be either "user" or "assistant"' }),
  }),
  content: z
    .string({
      required_error: 'Message content is required',
      invalid_type_error: 'Message content must be a string',
    })
    .min(1, 'Message content cannot be empty')
    .max(
      CLAUDE_CONFIG.MAX_MESSAGE_LENGTH,
      `Message too long. Maximum ${CLAUDE_CONFIG.MAX_MESSAGE_LENGTH} characters`
    )
    .transform((str) => str.trim()) // Auto-trim whitespace
    .refine((str) => str.length > 0, {
      message: 'Message cannot be only whitespace',
    })
    // Reject null bytes
    .refine((str) => !str.includes('\0'), {
      message: 'Message contains invalid characters (null bytes)',
    })
    // Reject excessive repetition (potential DoS)
    .refine((str) => !/(.)\\1{100,}/.test(str), {
      message: 'Message contains suspicious patterns (excessive repetition)',
    })
    // Reject excessive newlines
    .refine((str) => !/\n{50,}/.test(str), {
      message: 'Message contains too many consecutive newlines',
    }),
});

// ============================================================================
// Canvas State Schema
// ============================================================================

/**
 * Canvas state schema (optional field in chat requests)
 */
export const CanvasStateSchema = z
  .object({
    description: z.string().max(10000).optional(),
    elements: z.array(z.unknown()).optional(), // Excalidraw elements
    isModifyingElements: z.boolean().optional(), // Whether user is modifying existing elements
    spatialLayout: z
      .object({
        emptySpaces: z
          .array(
            z.object({
              rightX: z.number().optional(),
              rightY: z.number().optional(),
              belowX: z.number().optional(),
              belowY: z.number().optional(),
            })
          )
          .optional(),
        viewportCenter: z
          .object({
            x: z.number(),
            y: z.number(),
          })
          .optional(),
      })
      .optional(),
  })
  .optional()
  // Validate total JSON size
  .refine(
    (state) => {
      if (!state) return true;
      const jsonSize = JSON.stringify(state).length;
      return jsonSize <= CLAUDE_CONFIG.MAX_CANVAS_STATE_SIZE;
    },
    {
      message: `Canvas state too large. Maximum ${CLAUDE_CONFIG.MAX_CANVAS_STATE_SIZE} characters`,
    }
  );

// ============================================================================
// Chat Request Schema
// ============================================================================

/**
 * Complete chat request schema
 * Validates the entire request body
 */
export const ChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema, {
      required_error: 'Messages array is required',
      invalid_type_error: 'Messages must be an array',
    })
    .min(1, 'At least one message is required')
    .max(
      CLAUDE_CONFIG.MAX_MESSAGES,
      `Too many messages. Maximum ${CLAUDE_CONFIG.MAX_MESSAGES} allowed`
    ),
  model: z
    .enum(CLAUDE_CONFIG.ALLOWED_MODELS, {
      errorMap: () => ({
        message: `Invalid model. Allowed: ${CLAUDE_CONFIG.ALLOWED_MODELS.join(', ')}`,
      }),
    })
    .optional()
    .default(CLAUDE_CONFIG.DEFAULT_MODEL),
  canvasState: CanvasStateSchema,
});

// ============================================================================
// Chat Response Schema
// ============================================================================

/**
 * Successful chat response schema
 */
export const ChatResponseSchema = z.object({
  message: z.string(),
  model: z.string(),
});

/**
 * Error response schema
 */
export const ChatErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string(),
});

// ============================================================================
// Type Exports (Inferred from Zod Schemas)
// ============================================================================

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type CanvasState = z.infer<typeof CanvasStateSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ChatErrorResponse = z.infer<typeof ChatErrorResponseSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Parse and validate chat request with detailed error handling
 * Returns either success with data or error response
 */
export function validateChatRequest(body: unknown): {
  success: true;
  data: ChatRequest;
} | {
  success: false;
  error: string;
  details: string;
  statusCode: number;
} {
  const result = ChatRequestSchema.safeParse(body);

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
