/**
 * Better Auth Configuration
 * Centralized authentication setup with Drizzle + D1 database adapter
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './db/schema';

/**
 * Environment variables interface
 * Matches the Env interface in env.d.ts
 */
interface AuthEnv {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

/**
 * Create Better Auth instance with Drizzle + D1 adapter
 * This function must be called with the D1 database binding and environment variables
 */
export function createAuth(db: D1Database, env?: AuthEnv) {
  // Initialize Drizzle with D1 database
  const drizzleDb = drizzle(db, { schema });

  // Get environment variables (fallback to process.env for local dev)
  const authSecret = env?.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  const authUrl = env?.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:4321';
  const googleClientId = env?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = env?.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const githubClientId = env?.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = env?.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;

  return betterAuth({
    // Base URL must point to where the Better Auth handler is mounted
    // In our case: http://localhost:4321/api/auth (local) or https://yourdomain.com/api/auth (production)
    baseURL: `${authUrl}/api/auth`,

    // Secret for signing tokens (required)
    secret: authSecret || 'fallback-secret-for-development-only',

    // Database adapter for Cloudflare D1 via Drizzle
    // Map our custom table names to Better Auth's expected names
    database: drizzleAdapter(drizzleDb, {
      provider: 'sqlite',
      schema: {
        ...schema,
        user: schema.users,          // Map 'user' to 'users' table
        session: schema.sessions,    // Map 'session' to 'sessions' table
        account: schema.accounts,    // Map 'account' to 'accounts' table
        verification: schema.verificationTokens, // Map 'verification' to 'verification_tokens' table
      },
    }),

    // Email & Password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Disabled for now (enable when email service is set up)
      sendResetPassword: async ({ user, url }) => {
        // TODO: Implement email sending (e.g., via Resend, SendGrid, etc.)
        console.log(`Password reset for ${user.email}: ${url}`);
        // For now, just log. Implement actual email sending later.
      },
      sendVerificationEmail: async ({ user, url }) => {
        // TODO: Implement email verification sending
        console.log(`Email verification for ${user.email}: ${url}`);
        // For now, just log. Implement actual email sending later.
      },
    },

    // OAuth Providers (optional - configure with env variables)
    socialProviders: googleClientId && googleClientSecret ? {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
      ...(githubClientId && githubClientSecret ? {
        github: {
          clientId: githubClientId,
          clientSecret: githubClientSecret,
        },
      } : {}),
    } : undefined,

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },

    // Security settings
    advanced: {
      generateId: () => crypto.randomUUID(),
      cookiePrefix: 'astroweb',
      useSecureCookies: authUrl.startsWith('https'),
      crossSubDomainCookies: {
        enabled: false,
      },
    },

    // User schema (fields already match Better Auth expectations via Drizzle schema)
    // No custom field mapping needed - Drizzle schema handles the column name mapping
  });
}

/**
 * Auth instance type for better TypeScript support
 */
export type Auth = ReturnType<typeof createAuth>;

/**
 * Session data structure
 */
export interface SessionData {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    avatarUrl?: string;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
}
