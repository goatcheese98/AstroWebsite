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
    // Base URL for authentication (required for OAuth redirects)
    baseURL: authUrl,

    // Secret for signing tokens (required)
    secret: authSecret || 'fallback-secret-for-development-only',

    // Database adapter for Cloudflare D1 via Drizzle
    database: drizzleAdapter(drizzleDb, {
      provider: 'sqlite',
      usePlural: false, // Tables are singular: 'users', not 'user'
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
      cookiePrefix: 'astroweb',
      useSecureCookies: authUrl.startsWith('https'),
      crossSubDomainCookies: {
        enabled: false,
      },
    },

    // User schema
    user: {
      fields: {
        email: 'email',
        emailVerified: 'email_verified',
        name: 'name',
        image: 'avatar_url',
      },
      additionalFields: {
        // Add any custom fields here
      },
    },
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
