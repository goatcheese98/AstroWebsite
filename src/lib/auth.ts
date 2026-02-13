/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        🔑 auth.ts                                            ║
 * ║                    "The Auth Gatekeeper"                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔴 API Handler | 🟢 State Manager | 🏗️ Architecture Root        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the gatekeeper of the application. I manage user identities, sessions,
 * and authentication flows. I use Better Auth as my brain, Drizzle as my pen,
 * and Cloudflare D1 as my ledger.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * I ensure that users can securely log in, stay logged in across devices,
 * and that their private data (like canvases) stays private. I handle:
 * - Credentials (Email/Password)
 * - OAuth (Google/GitHub)
 * - Session Persistence
 * - Link sending (Reset/Verify)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ Middleware  │─────▶│      ME      │─────▶│  D1 / DB    │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                  [Auth Events & Sessions]                      │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Users can't log in; sessions expire instantly; 401 errors everywhere.
 * - **User Impact:** High. The application becomes a static viewer with no save/edit functionality.
 * - **Quick Fix:** Check BETTER_AUTH_SECRET and BETTER_AUTH_URL in Cloudflare dashboard.
 * 
 * 🔑 KEY CONCEPTS:
 * - Better Auth + Drizzle Adapter
 * - Password hashing and email logic (placeholders for now)
 * - Cross-subdomain and Secure cookie settings
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-05: Standardized header; fixed TypeScript 'any' type errors on callbacks.
 * 
 * @module auth
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
      sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
        // Log reset link for development; integrate email service (Resend/SendGrid) for production
        console.log(`Password reset for ${user.email}: ${url}`);
      },
      sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
        // Log verification link for development; integrate email service (Resend/SendGrid) for production
        console.log(`Email verification for ${user.email}: ${url}`);
      },
    },

    // OAuth Providers — Google only
    socialProviders: googleClientId && googleClientSecret ? {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
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
      useSecureCookies: false, // Disable for localhost (both http and https)
      crossSubDomainCookies: {
        enabled: false,
      },
    },
    
    // Cookie configuration for session persistence
    cookies: {
      sessionToken: {
        name: 'astroweb_session',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          secure: false, // Allow http on localhost
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        },
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
