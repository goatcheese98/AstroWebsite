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
 * Create Better Auth instance with Drizzle + D1 adapter
 * This function must be called with the D1 database binding
 */
export function createAuth(db: D1Database) {
  // Initialize Drizzle with D1 database
  const drizzleDb = drizzle(db, { schema });

  return betterAuth({
    // Database adapter for Cloudflare D1 via Drizzle
    database: drizzleAdapter(drizzleDb, {
      provider: 'sqlite',
      usePlural: false, // Tables are singular: 'users', not 'user'
    }),

    // Email & Password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true, // Require email verification before login
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
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      },
    },

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
      useSecureCookies: process.env.NODE_ENV === 'production',
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
