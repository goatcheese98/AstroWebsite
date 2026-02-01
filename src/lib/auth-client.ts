/**
 * Better Auth Client
 * For use in browser environments
 */

import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:4321/api/auth',
});

// Export convenient methods
export const { signIn, signOut, signUp, getSession } = authClient;
