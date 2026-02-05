/**
 * API Authentication Middleware
 *
 * This module provides authentication for API endpoints.
 * Currently configured for simple API key auth. JWT support is 
 * present as a placeholder for future implementation.
 *
 * USAGE:
 * 1. Set ENABLE_API_AUTH=true in environment variables to enable auth
 * 2. Set API_SECRET_KEY in environment variables
 * 3. Clients must send X-API-Key header with requests
 */

export interface AuthResult {
  authenticated: boolean;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const AUTH_ENABLED = import.meta.env.ENABLE_API_AUTH === 'true' ||
  process.env.ENABLE_API_AUTH === 'true';

const API_SECRET_KEY = import.meta.env.API_SECRET_KEY ||
  process.env.API_SECRET_KEY;

// ============================================================================
// Authentication Strategies
// ============================================================================

/**
 * Simple API Key Authentication
 * Checks for X-API-Key header matching the secret
 */
function authenticateWithApiKey(request: Request): AuthResult {
  const apiKey = request.headers.get('X-API-Key');

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Missing X-API-Key header',
    };
  }

  if (apiKey !== API_SECRET_KEY) {
    return {
      authenticated: false,
      error: 'Invalid API key',
    };
  }

  return { authenticated: true };
}

/**
 * JWT Authentication (Placeholder)
 * Implement if you want to use JWT tokens
 */
function authenticateWithJWT(request: Request): AuthResult {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Missing or invalid Authorization header',
    };
  }

  const token = authHeader.substring(7);

  // TODO: Implement JWT verification
  // Example with jsonwebtoken:
  // try {
  //   const decoded = jwt.verify(token, JWT_SECRET);
  //   return { authenticated: true, user: decoded };
  // } catch (error) {
  //   return { authenticated: false, error: 'Invalid token' };
  // }

  // For now, just return not authenticated
  return {
    authenticated: false,
    error: 'JWT authentication not implemented',
  };
}

// ============================================================================
// Main Authentication Function
// ============================================================================

/**
 * Authenticates a request based on configured strategy
 * Returns authentication result
 */
export function authenticateRequest(request: Request): AuthResult {
  // If auth is disabled, allow all requests
  if (!AUTH_ENABLED) {
    return { authenticated: true };
  }

  // Check if API secret key is configured
  if (!API_SECRET_KEY) {
    console.warn('⚠️ API_SECRET_KEY not configured. Authentication disabled.');
    return { authenticated: true };
  }

  // Use API key authentication by default
  // You can switch to JWT or other methods here
  return authenticateWithApiKey(request);
}

/**
 * Middleware helper to check authentication and return error response if needed
 * Returns null if authenticated, or Response object if authentication failed
 */
export function checkAuthentication(request: Request): Response | null {
  const authResult = authenticateRequest(request);

  if (!authResult.authenticated) {
    return new Response(
      JSON.stringify({
        error: 'Authentication required',
        details: authResult.error || 'Invalid or missing credentials',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="API"', // Standard auth header
        },
      }
    );
  }

  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a random API key (for initial setup)
 * Run this once to generate a key, then store it in environment variables
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 32;
  let result = '';

  // Use crypto.getRandomValues for secure random generation
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

/**
 * Checks if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return AUTH_ENABLED && !!API_SECRET_KEY;
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// In your API endpoint (chat.ts or generate-image.ts):

import { checkAuthentication } from '@/lib/api-auth';

export const POST: APIRoute = async ({ request }) => {
  // Check authentication first
  const authError = checkAuthentication(request);
  if (authError) return authError;

  // ... rest of your API logic
};
*/

/*
// To generate an API key (run this once):

import { generateApiKey } from '@/lib/api-auth';
console.log('Generated API Key:', generateApiKey());

// Then add to your .env:
// ENABLE_API_AUTH=true
// API_SECRET_KEY=your_generated_key_here
*/
