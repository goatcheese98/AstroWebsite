/**
 * Input Sanitization and Validation Utilities for API Endpoints
 * Protects against malicious input, prompt injection, and excessive requests
 */

import { CLAUDE_CONFIG, GEMINI_CONFIG } from './api-config';
import type { ChatMessage, CanvasState } from '@/types/api';

// ============================================================================
// String Sanitization
// ============================================================================

/**
 * Sanitizes and truncates a string to a maximum length
 */
export function sanitizeString(input: string, maxLength: number): string {
  // Trim whitespace
  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Checks if a string contains potentially dangerous patterns
 * This is a basic check - not comprehensive
 */
export function containsSuspiciousPatterns(input: string): boolean {
  const suspiciousPatterns = [
    // Excessive repetition (potential DoS)
    /(.)\1{100,}/i, // Same character repeated 100+ times

    // Script injection attempts (basic check)
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,

    // Null byte injection
    /\0/,

    // Excessive newlines (potential formatting attack)
    /\n{50,}/,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

// ============================================================================
// Chat Message Sanitization
// ============================================================================

export interface SanitizationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Sanitizes and validates a chat message
 */
export function sanitizeChatMessage(message: ChatMessage): SanitizationResult<ChatMessage> {
  // Validate role
  if (message.role !== 'user' && message.role !== 'assistant') {
    return {
      success: false,
      error: 'Invalid message role. Must be "user" or "assistant"',
    };
  }

  // Validate content type
  if (typeof message.content !== 'string') {
    return {
      success: false,
      error: 'Message content must be a string',
    };
  }

  // Check length before sanitization
  if (message.content.length > CLAUDE_CONFIG.MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: `Message too long. Maximum ${CLAUDE_CONFIG.MAX_MESSAGE_LENGTH} characters`,
    };
  }

  // Sanitize content
  const sanitizedContent = sanitizeString(message.content, CLAUDE_CONFIG.MAX_MESSAGE_LENGTH);

  // Check for empty content after sanitization
  if (sanitizedContent.length === 0) {
    return {
      success: false,
      error: 'Message content cannot be empty',
    };
  }

  // Check for suspicious patterns
  if (containsSuspiciousPatterns(sanitizedContent)) {
    return {
      success: false,
      error: 'Message contains suspicious patterns',
    };
  }

  return {
    success: true,
    data: {
      role: message.role,
      content: sanitizedContent,
    },
  };
}

/**
 * Sanitizes and validates an array of chat messages
 */
export function sanitizeChatMessages(
  messages: ChatMessage[]
): SanitizationResult<ChatMessage[]> {
  // Check array length
  if (messages.length === 0) {
    return {
      success: false,
      error: 'Messages array cannot be empty',
    };
  }

  if (messages.length > CLAUDE_CONFIG.MAX_MESSAGES) {
    return {
      success: false,
      error: `Too many messages. Maximum ${CLAUDE_CONFIG.MAX_MESSAGES} messages allowed`,
    };
  }

  // Sanitize each message
  const sanitizedMessages: ChatMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const result = sanitizeChatMessage(messages[i]);

    if (!result.success) {
      return {
        success: false,
        error: `Message ${i + 1}: ${result.error}`,
      };
    }

    sanitizedMessages.push(result.data!);
  }

  return {
    success: true,
    data: sanitizedMessages,
  };
}

// ============================================================================
// Canvas State Sanitization
// ============================================================================

/**
 * Sanitizes and validates canvas state object
 */
export function sanitizeCanvasState(
  canvasState: unknown
): SanitizationResult<CanvasState | undefined> {
  // Canvas state is optional
  if (canvasState === undefined || canvasState === null) {
    return { success: true, data: undefined };
  }

  // Must be an object
  if (typeof canvasState !== 'object') {
    return {
      success: false,
      error: 'Canvas state must be an object',
    };
  }

  // Check JSON size (prevent massive payloads)
  const jsonString = JSON.stringify(canvasState);
  if (jsonString.length > CLAUDE_CONFIG.MAX_CANVAS_STATE_SIZE) {
    return {
      success: false,
      error: `Canvas state too large. Maximum ${CLAUDE_CONFIG.MAX_CANVAS_STATE_SIZE} characters`,
    };
  }

  // Sanitize description if present
  const state = canvasState as Partial<CanvasState>;

  if (state.description !== undefined) {
    if (typeof state.description !== 'string') {
      return {
        success: false,
        error: 'Canvas state description must be a string',
      };
    }

    // Sanitize description
    state.description = sanitizeString(state.description, 10000);
  }

  return {
    success: true,
    data: state as CanvasState,
  };
}

// ============================================================================
// Image Prompt Sanitization
// ============================================================================

/**
 * Sanitizes and validates an image generation prompt
 */
export function sanitizeImagePrompt(prompt: string): SanitizationResult<string> {
  // Type check
  if (typeof prompt !== 'string') {
    return {
      success: false,
      error: 'Prompt must be a string',
    };
  }

  // Sanitize
  const sanitized = sanitizeString(prompt, GEMINI_CONFIG.MAX_PROMPT_LENGTH);

  // Check minimum length
  if (sanitized.length < GEMINI_CONFIG.MIN_PROMPT_LENGTH) {
    return {
      success: false,
      error: `Prompt too short. Minimum ${GEMINI_CONFIG.MIN_PROMPT_LENGTH} characters`,
    };
  }

  // Check maximum length
  if (sanitized.length > GEMINI_CONFIG.MAX_PROMPT_LENGTH) {
    return {
      success: false,
      error: `Prompt too long. Maximum ${GEMINI_CONFIG.MAX_PROMPT_LENGTH} characters`,
    };
  }

  // Check for suspicious patterns
  if (containsSuspiciousPatterns(sanitized)) {
    return {
      success: false,
      error: 'Prompt contains suspicious patterns',
    };
  }

  return {
    success: true,
    data: sanitized,
  };
}

// ============================================================================
// Content Filtering (Optional)
// ============================================================================

/**
 * Basic content filtering for inappropriate content
 * NOTE: This is a very basic implementation. For production, consider using
 * a proper content moderation service (e.g., OpenAI Moderation API, Perspective API)
 */
export function containsProhibitedContent(input: string): boolean {
  // Convert to lowercase for case-insensitive matching
  const lower = input.toLowerCase();

  // Basic prohibited patterns (customize as needed)
  const prohibitedPatterns = [
    // Add specific patterns you want to block
    // Example: /\b(spam|viagra)\b/i
  ];

  return prohibitedPatterns.some((pattern) => pattern.test(lower));
}

/**
 * Validates content against prohibited patterns
 */
export function validateContent(input: string): SanitizationResult<string> {
  if (containsProhibitedContent(input)) {
    return {
      success: false,
      error: 'Content contains prohibited material',
    };
  }

  return {
    success: true,
    data: input,
  };
}
