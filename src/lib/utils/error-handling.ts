/**
 * Error Handling Utilities
 * Provides consistent error handling patterns across the application
 */

/**
 * Custom application error class
 * Use this for expected errors that should be returned to the client
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace?.(this, AppError);
  }
}

/**
 * Specific error types for common scenarios
 */
export class NotFoundError extends AppError {
  constructor(resource: string, details?: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: string) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', details?: string) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class StorageError extends AppError {
  constructor(message = 'Storage operation failed', details?: string) {
    super(message, 'STORAGE_ERROR', 500, details);
    this.name = 'StorageError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details?: string) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * Wraps an async operation with error handling
 * Converts unexpected errors to AppError instances
 *
 * @param operation - The async function to execute
 * @param context - Context string for logging (e.g., "GetCanvas", "CreateCanvas")
 * @returns The result of the operation
 * @throws AppError for expected errors, or converted AppError for unexpected errors
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      console.error(`[${context}] AppError:`, error.message, error.details);
      throw error;
    }

    // For unexpected errors, log and convert to generic AppError
    console.error(`[${context}] Unexpected error:`, error);

    throw new AppError(
      'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Safe error logging that doesn't expose sensitive information
 * Use this instead of console.error for production logging
 */
export function logError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  const errorInfo = {
    context,
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : String(error),
    ...metadata,
  };

  console.error(JSON.stringify(errorInfo, null, 2));
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
