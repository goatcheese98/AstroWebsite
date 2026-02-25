import { defineMiddleware, sequence } from 'astro:middleware';
import { clerkMiddleware } from '@clerk/astro/server';

const DEPLOY_TARGET = process.env.DEPLOY_TARGET || 'full';

const canvasRouting = defineMiddleware(async (context, next) => {
  // Canvas-only deployment
  if (DEPLOY_TARGET === 'canvas') {
    const url = new URL(context.request.url);

    // Redirect /ai-canvas to / (root) - we want canvas at root
    if (url.pathname === '/ai-canvas') {
      return new Response(null, {
        status: 308, // Permanent Redirect
        headers: {
          'Location': '/',
        },
      });
    }

    // Allowed routes for canvas-only mode
    const allowedRoutes = ['/', '/login', '/signup', '/dashboard', '/api/', '/_image'];
    const isAllowed = allowedRoutes.some(route =>
      url.pathname === route || url.pathname.startsWith(route + '/')
    );

    // Also allow static assets
    const isStaticAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico|json|map)$/);

    if (!isAllowed && !isStaticAsset) {
      return new Response('Not Found', { status: 404 });
    }
  }
  return next();
});

const withClerk = sequence(clerkMiddleware(), canvasRouting);
const withoutClerk = sequence(canvasRouting);

export const onRequest = async (context: any, next: any) => {
  const pathname = new URL(context.request.url).pathname;

  // Avoid Clerk consuming request streams for assistant API payloads.
  if (pathname.startsWith('/api/assistant/')) {
    return withoutClerk(context, next);
  }

  return withClerk(context, next);
};
