/**
 * Better Auth Client
 * For use in browser environments
 */

import { createAuthClient } from 'better-auth/client';

function getBaseURL(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api/auth';
  }
  // SSR fallback
  const envUrl = import.meta.env.BETTER_AUTH_URL || import.meta.env.PUBLIC_SITE_URL;
  return (envUrl || 'http://localhost:4321') + '/api/auth';
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

// Export convenient methods
export const { signIn, signOut, signUp, getSession } = authClient;
