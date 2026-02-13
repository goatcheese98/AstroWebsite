import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/auth';

export const prerender = false;

function getEnv(runtime: any) {
  if (runtime?.env?.BETTER_AUTH_SECRET) {
    return {
      BETTER_AUTH_SECRET: runtime.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: runtime.env.BETTER_AUTH_URL || 'http://localhost:4321',
      GOOGLE_CLIENT_ID: runtime.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: runtime.env.GOOGLE_CLIENT_SECRET,
    };
  }
  return {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:4321',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };
}

export const GET: APIRoute = async (ctx) => {
  try {
    const runtime = ctx.locals.runtime;
    const env = getEnv(runtime);
    
    if (!runtime?.env?.DB) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Use auth.api.getSession directly instead of handler
    const auth = createAuth(runtime.env.DB, env);
    const session = await auth.api.getSession({ headers: ctx.request.headers });
    
    return new Response(JSON.stringify(session || { user: null, session: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Session error:', error);
    return new Response(
      JSON.stringify({ error: 'Session error', details: error instanceof Error ? error.message : 'Unknown' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
