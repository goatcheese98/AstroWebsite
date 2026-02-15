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
 * Verify user session and extract user info using Clerk
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
    const { userId, sessionId } = context.locals.auth();

    if (!userId || !sessionId) {
      return null;
    }

    // Use efficient currentUser() helper which handles caching
    const user = await context.locals.currentUser();

    if (!user) {
      return null;
    }

    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses[0]?.emailAddress || '';

    return {
      user: {
        id: user.id,
        email: email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || undefined,
        avatarUrl: user.imageUrl,
      },
      sessionId: sessionId,
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
