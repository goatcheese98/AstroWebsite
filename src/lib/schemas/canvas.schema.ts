/**
 * Zod Schemas for Canvas API
 * Provides runtime validation for canvas operations
 */

import { z } from 'zod';

// ============================================================================
// Canvas Data Schema
// ============================================================================

/**
 * Excalidraw element schema (simplified)
 */
export const ExcalidrawElementSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  // Allow additional properties
}).passthrough();

/**
 * Canvas data schema (Excalidraw format)
 */
export const CanvasDataSchema = z.object({
  elements: z.array(ExcalidrawElementSchema),
  appState: z.record(z.unknown()).optional(),
  files: z.record(z.unknown()).optional(),
});

// ============================================================================
// Canvas Request Schemas
// ============================================================================

/**
 * Create canvas request
 */
export const CreateCanvasRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
    .transform((s) => s.trim()),
  description: z
    .string()
    .max(1000, 'Description too long (max 1000 characters)')
    .transform((s) => s.trim())
    .optional(),
  canvasData: CanvasDataSchema,
  isPublic: z.boolean().optional().default(false),
  thumbnailData: z.string().optional(), // Base64 PNG
});

/**
 * Update canvas request
 */
export const UpdateCanvasRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .transform((s) => s.trim())
    .optional(),
  description: z
    .string()
    .max(1000, 'Description too long')
    .transform((s) => s.trim())
    .optional(),
  canvasData: CanvasDataSchema.optional(),
  isPublic: z.boolean().optional(),
  thumbnailData: z.string().optional(),
  createVersion: z.boolean().optional().default(false), // Save as new version
});

/**
 * List canvases query parameters
 */
export const ListCanvasesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sort: z.enum(['created', 'updated', 'title']).optional().default('updated'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Create share link request
 */
export const CreateShareRequestSchema = z.object({
  expiresInDays: z.number().min(1).max(365).optional(),
});

// ============================================================================
// Canvas Response Schemas
// ============================================================================

/**
 * Canvas metadata response
 */
export const CanvasMetadataResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  isPublic: z.boolean(),
  version: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.record(z.any()).optional(),
  sizeBytes: z.number().optional(),
});

/**
 * Full canvas response (includes data)
 */
export const CanvasResponseSchema = CanvasMetadataResponseSchema.extend({
  canvasData: CanvasDataSchema,
});

/**
 * Canvas list response
 */
export const CanvasListResponseSchema = z.object({
  canvases: z.array(CanvasMetadataResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

/**
 * Share link response
 */
export const ShareLinkResponseSchema = z.object({
  shareToken: z.string(),
  shareUrl: z.string(),
  expiresAt: z.number().nullable(),
});

/**
 * Canvas version response
 */
export const CanvasVersionResponseSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  version: z.number(),
  createdAt: z.number(),
  canvasData: CanvasDataSchema,
});

// ============================================================================
// Error Response Schema
// ============================================================================

export const CanvasErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CanvasData = z.infer<typeof CanvasDataSchema>;
export type CreateCanvasRequest = z.infer<typeof CreateCanvasRequestSchema>;
export type UpdateCanvasRequest = z.infer<typeof UpdateCanvasRequestSchema>;
export type ListCanvasesQuery = z.infer<typeof ListCanvasesQuerySchema>;
export type CreateShareRequest = z.infer<typeof CreateShareRequestSchema>;
export type CanvasMetadataResponse = z.infer<typeof CanvasMetadataResponseSchema>;
export type CanvasResponse = z.infer<typeof CanvasResponseSchema>;
export type CanvasListResponse = z.infer<typeof CanvasListResponseSchema>;
export type ShareLinkResponse = z.infer<typeof ShareLinkResponseSchema>;
export type CanvasVersionResponse = z.infer<typeof CanvasVersionResponseSchema>;
export type CanvasErrorResponse = z.infer<typeof CanvasErrorResponseSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateCreateCanvasRequest(body: unknown) {
  const result = CreateCanvasRequestSchema.safeParse(body);

  if (result.success) {
    return { success: true as const, data: result.data };
  }

  const firstError = result.error.errors[0];
  return {
    success: false as const,
    error: firstError.path.join('.') || 'Validation error',
    details: firstError.message,
  };
}

export function validateUpdateCanvasRequest(body: unknown) {
  const result = UpdateCanvasRequestSchema.safeParse(body);

  if (result.success) {
    return { success: true as const, data: result.data };
  }

  const firstError = result.error.errors[0];
  return {
    success: false as const,
    error: firstError.path.join('.') || 'Validation error',
    details: firstError.message,
  };
}

export function validateListCanvasesQuery(query: unknown) {
  const result = ListCanvasesQuerySchema.safeParse(query);

  if (result.success) {
    return { success: true as const, data: result.data };
  }

  const firstError = result.error.errors[0];
  return {
    success: false as const,
    error: firstError.path.join('.') || 'Validation error',
    details: firstError.message,
  };
}

/**
 * Validate canvas data structure
 * Use this for runtime validation of canvas data from storage or API
 */
export function validateCanvasData(data: unknown): data is CanvasData {
  return CanvasDataSchema.safeParse(data).success;
}

/**
 * Parse and validate canvas data, throwing on error
 * Use this when you want strict validation with error messages
 */
export function parseCanvasData(data: unknown): CanvasData {
  return CanvasDataSchema.parse(data);
}
