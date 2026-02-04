import { defineMiddleware } from 'astro:middleware';

const DEPLOY_TARGET = process.env.DEPLOY_TARGET || 'full';

export const onRequest = defineMiddleware((context, next) => {
  // Canvas-only deployment: block non-canvas routes
  if (DEPLOY_TARGET === 'canvas') {
    const url = new URL(context.request.url);
    
    // Allowed routes for canvas-only mode
    const allowedRoutes = ['/', '/ai-canvas', '/login', '/signup', '/api/', '/_image'];
    const isAllowed = allowedRoutes.some(route => 
      url.pathname === route || url.pathname.startsWith(route + '/')
    );
    
    // Also allow static assets
    const isStaticAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)$/);
    
    if (!isAllowed && !isStaticAsset) {
      return new Response('Not Found', { status: 404 });
    }
  }
  
  return next();
});
