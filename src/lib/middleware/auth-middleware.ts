/**
 * Authentication Middleware
 * Validates user sessions and protects routes
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
        name: session.user.name,
        avatarUrl: session.user.image,
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
