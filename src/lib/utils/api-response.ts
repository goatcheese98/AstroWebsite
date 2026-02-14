/**
 * Standardized API Response Helpers
 * Provides consistent response formats across all API endpoints
 */

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
  timestamp: string;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  timestamp: string;
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      data,
      timestamp: new Date().toISOString(),
    } satisfies ApiSuccess<T>),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  statusCode: number,
  details?: string,
  code?: string
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details && { details }),
      ...(code && { code }),
      timestamp: new Date().toISOString(),
    } satisfies ApiError),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Common API error responses
 */
export const apiErrors = {
  notFound: (resource: string) =>
    errorResponse(`${resource} not found`, 404, undefined, 'NOT_FOUND'),

  unauthorized: (message = 'Authentication required') =>
    errorResponse(message, 401, undefined, 'UNAUTHORIZED'),

  forbidden: (message = 'Access denied') =>
    errorResponse(message, 403, undefined, 'FORBIDDEN'),

  badRequest: (message: string, details?: string) =>
    errorResponse(message, 400, details, 'BAD_REQUEST'),

  serverError: (message = 'Internal server error', details?: string) =>
    errorResponse(message, 500, details, 'SERVER_ERROR'),

  storageError: (details?: string) =>
    errorResponse('Storage not configured', 500, details, 'STORAGE_ERROR'),

  databaseError: (details?: string) =>
    errorResponse('Database not configured', 500, details, 'DATABASE_ERROR'),

  invalidJson: () =>
    errorResponse('Invalid JSON in request body', 400, undefined, 'INVALID_JSON'),

  validationError: (details: string) =>
    errorResponse('Validation failed', 400, details, 'VALIDATION_ERROR'),
};
