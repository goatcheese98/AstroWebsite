/**
 * API Configuration and Constants
 * Centralized configuration for AI API endpoints
 */

// ============================================================================
// Claude API Configuration
// ============================================================================

export const CLAUDE_CONFIG = {
  // Token limits
  MAX_TOKENS: 4096,

  // Model versions
  DEFAULT_MODEL: 'claude-sonnet-4-20250514',
  ALLOWED_MODELS: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250514'] as const,

  // Request limits
  MAX_MESSAGES: 50, // Maximum number of messages in conversation
  MAX_MESSAGE_LENGTH: 10000, // Maximum characters per message
  MAX_CANVAS_STATE_SIZE: 50000, // Maximum canvas state JSON size in characters
} as const;

// ============================================================================
// Gemini API Configuration
// ============================================================================

export const GEMINI_CONFIG = {
  // Generation parameters
  TEMPERATURE: 0.9,

  // Model versions
  DEFAULT_MODEL: 'gemini-2.5-flash-image',
  ALLOWED_MODELS: ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'] as const,

  // Request limits
  MAX_PROMPT_LENGTH: 2000, // Maximum characters for image generation prompt
  MIN_PROMPT_LENGTH: 3, // Minimum characters for valid prompt
} as const;

// ============================================================================
// Shared API Configuration
// ============================================================================

export const API_CONFIG = {
  // Request size limits
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB max request size

  // Timeouts (milliseconds)
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Error messages
  ERRORS: {
    API_KEY_MISSING: 'API key not configured',
    INVALID_JSON: 'Invalid JSON in request body',
    REQUEST_TOO_LARGE: 'Request payload too large',
    TIMEOUT: 'Request timed out',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  },
} as const;

// Type helpers
export type ClaudeModel = (typeof CLAUDE_CONFIG.ALLOWED_MODELS)[number];
export type GeminiModel = (typeof GEMINI_CONFIG.ALLOWED_MODELS)[number];

// Validation helpers
export function isValidClaudeModel(model: string): model is ClaudeModel {
  return CLAUDE_CONFIG.ALLOWED_MODELS.includes(model as ClaudeModel);
}

export function isValidGeminiModel(model: string): model is GeminiModel {
  return GEMINI_CONFIG.ALLOWED_MODELS.includes(model as GeminiModel);
}
