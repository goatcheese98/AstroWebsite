/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      🛡️ auth-middleware.ts                                   ║
 * ║                    "The Session Sentry"                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔴 API Handler | 🔐 Security Layer | 🛰️ Request Interceptor      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the sentry standing guard at the entrance of our API routes. I check 
 * every incoming request for a valid session token. If I find one, I let the
 * request through with user details; if not, I either block it (requireAuth)
 * or let it pass quietly (optionalAuth).
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * I ensure that private resources (like a user's own canvases) are only accessible
 * to the rightful owner. I handle:
 * - Session verification via Better Auth
 * - Extraction of userId and user metadata from cookies
 * - Standardized 401 Unauthorized responses
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ API Routes  │◀─────│      ME      │─────▶│    Auth     │   │
 *      │   │ (Request)   │      │ (Middleware) │      │ (BetterAuth)│   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Logged-in users can't access their data; 401 errors even with session;
 *   public data becomes private.
 * - User Impact: Users are effectively locked out of their accounts.
 * - Quick Fix: Verify the DB binding in context.locals.runtime.
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-05: Added personified header.
 * 
 * @module middleware/auth-middleware
 */

import { createAuth } from '@/lib/auth';
import type { APIContext } from 'astro';

export interface AuthenticatedContext extends APIContext {
  userId: string;
  user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
}

/**
 * Verify user session and extract user info
 * Returns user data if authenticated, null otherwise
 */
export async function getSession(context: APIContext): Promise<{
  user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
  sessionId: string;
} | null> {
  try {
    const runtime = context.locals.runtime;

    if (!runtime?.env.DB) {
      console.error('Database binding not available');
      return null;
    }

    // Create auth instance
    const auth = createAuth(runtime.env.DB);

    // Get session from request
    const session = await auth.api.getSession({ headers: context.request.headers });

    if (!session || !session.user) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        avatarUrl: session.user.image || undefined,
      },
      sessionId: session.session.id,
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Middleware to require authentication
 * Returns error response if not authenticated
 */
export async function requireAuth(context: APIContext): Promise<{
  authenticated: true;
  userId: string;
  user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
} | {
  authenticated: false;
  response: Response;
}> {
  const session = await getSession(context);

  if (!session) {
    return {
      authenticated: false,
      response: new Response(
        JSON.stringify({
          error: 'Authentication required',
          details: 'You must be logged in to access this resource',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return {
    authenticated: true,
    userId: session.user.id,
    user: session.user,
  };
}

/**
 * Optional authentication
 * Returns user data if authenticated, continues without user if not
 */
export async function optionalAuth(context: APIContext): Promise<{
  userId?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
}> {
  const session = await getSession(context);

  if (!session) {
    return {};
  }

  return {
    userId: session.user.id,
    user: session.user,
  };
}
