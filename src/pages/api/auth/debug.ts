/**
 * Auth Debug Endpoint
 * Returns current session info for debugging
 */

import type { APIRoute } from 'astro';
import { getSession } from '@/lib/middleware/auth-middleware';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const session = await getSession(context);
    const cookies = context.request.headers.get('cookie') || 'No cookies';
    
    return new Response(
      JSON.stringify({
        authenticated: !!session,
        session: session ? {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.name,
        } : null,
        cookies: cookies.split(';').map(c => c.trim()),
        timestamp: new Date().toISOString(),
      }, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Debug error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
