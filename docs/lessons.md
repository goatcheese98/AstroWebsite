# Lessons Learned - Better Auth + Astro + Cloudflare

This document captures key lessons learned from integrating Better Auth with Astro and Cloudflare D1. Refer to this when setting up Better Auth in future projects.

---

## Table of Contents

1. [Drizzle Schema Requirements](#drizzle-schema-requirements)
2. [Better Auth Endpoints](#better-auth-endpoints)
3. [Catch-All Route Setup](#catch-all-route-setup)
4. [Auth Configuration](#auth-configuration)
5. [Frontend Integration](#frontend-integration)
6. [Database Migrations](#database-migrations)
7. [Testing Commands](#testing-commands)
8. [Common Errors & Solutions](#common-errors--solutions)

---

## Drizzle Schema Requirements

### Critical: Property Names vs Database Columns

Better Auth expects specific **TypeScript property names** in the Drizzle schema. The database column names can be different (snake_case), but the property names must match Better Auth's expectations.

### Users Table

```typescript
export const users = sqliteTable('users', {
  id: text('id').primaryKey().notNull(),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  name: text('name'),
  image: text('avatar_url'),        // Better Auth uses 'image', DB uses 'avatar_url'
  password: text('password_hash'),  // Better Auth uses 'password', DB uses 'password_hash'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

**Key Mappings:**
- `image` → `avatar_url` column
- `password` → `password_hash` column

### Sessions Table (CRITICAL - Must Have ALL Fields)

```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),    // REQUIRED by Better Auth
  userAgent: text('user_agent'),    // REQUIRED by Better Auth
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),  // REQUIRED
});
```

**Required Fields:** `ipAddress`, `userAgent`, `createdAt`, `updatedAt`

### Accounts Table (CRITICAL - Field Names Matter)

```typescript
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('provider_account_id').notNull(),  // Better Auth uses 'accountId'
  providerId: text('provider').notNull(),            // Better Auth uses 'providerId'
  password: text('password_hash'),                   // For email/password auth
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

**CRITICAL Field Names:**
- Use `accountId` (not `providerAccountId` or `account_id`)
- Use `providerId` (not `provider` as property name)

### Verification Tokens Table

```typescript
export const verificationTokens = sqliteTable('verification_tokens', {
  id: text('id').primaryKey().notNull(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

---

## Better Auth Endpoints

### Standard Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-up/email` | POST | Register with email/password |
| `/api/auth/sign-in/email` | POST | Login with email/password |
| `/api/auth/sign-out` | POST | Logout user |
| `/api/auth/get-session` | GET | Get current session |

### OAuth Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/auth/sign-in/google` | Sign in with Google |
| `/api/auth/sign-in/github` | Sign in with GitHub |

**Note:** The session endpoint is `/api/auth/get-session`, NOT `/api/auth/session`.

---

## Catch-All Route Setup

### File Location

Create: `src/pages/api/auth/[...all].ts`

### Implementation

```typescript
import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/auth';

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  try {
    const runtime = ctx.locals.runtime;
    
    if (!runtime?.env?.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create auth instance with runtime bindings
    const auth = createAuth(runtime.env.DB, {
      BETTER_AUTH_SECRET: runtime.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: runtime.env.BETTER_AUTH_URL,
      GOOGLE_CLIENT_ID: runtime.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: runtime.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: runtime.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: runtime.env.GITHUB_CLIENT_SECRET,
    });

    // Pass request directly to Better Auth handler
    return await auth.handler(ctx.request);
  } catch (error) {
    console.error('[Better Auth] Handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Authentication error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Key Points

1. **Filename**: Use `[...all].ts` (not `[...path].ts`)
2. **Export**: Use `ALL` for all HTTP methods
3. **Request handling**: Pass `ctx.request` directly - don't transform the URL
4. **Runtime access**: Access D1 and env vars via `ctx.locals.runtime`

---

## Auth Configuration

### `src/lib/auth.ts`

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './db/schema';

export function createAuth(db: D1Database, env?: AuthEnv) {
  const drizzleDb = drizzle(db, { schema });
  
  const authSecret = env?.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  const authUrl = env?.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:4321';

  return betterAuth({
    // Base URL must include /api/auth path
    baseURL: `${authUrl}/api/auth`,
    
    secret: authSecret,
    
    database: drizzleAdapter(drizzleDb, {
      provider: 'sqlite',
      schema: {
        ...schema,
        user: schema.users,              // Map 'user' to 'users' table
        session: schema.sessions,        // Map 'session' to 'sessions' table
        account: schema.accounts,        // Map 'account' to 'accounts' table
        verification: schema.verificationTokens,
      },
    }),
    
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    
    socialProviders: {
      google: {
        clientId: env?.GOOGLE_CLIENT_ID,
        clientSecret: env?.GOOGLE_CLIENT_SECRET,
      },
      github: {
        clientId: env?.GITHUB_CLIENT_ID,
        clientSecret: env?.GITHUB_CLIENT_SECRET,
      },
    },
    
    advanced: {
      generateId: () => crypto.randomUUID(),
      cookiePrefix: 'astroweb',
      useSecureCookies: authUrl.startsWith('https'),
    },
  });
}
```

### Key Configuration Points

1. **baseURL**: Must include `/api/auth` path: `http://localhost:4321/api/auth`
2. **schema mapping**: Map singular names (`user`, `session`, `account`) to plural table names
3. **Per-request auth instance**: Create auth instance inside the handler (D1 binding only available at runtime)

---

## Frontend Integration

### Sign Up

```typescript
const response = await fetch('/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ 
    name: 'User Name',
    email: 'user@example.com',
    password: 'SecurePass123!'
  }),
});
```

### Sign In

```typescript
const response = await fetch('/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ 
    email: 'user@example.com',
    password: 'SecurePass123!',
    rememberMe: true
  }),
});
```

### Get Session

```typescript
const response = await fetch('/api/auth/get-session', {
  credentials: 'include',
});
const data = await response.json();
// data.user - user info
// data.session - session info
```

### Sign Out

```typescript
await fetch('/api/auth/sign-out', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({}),
});
```

### OAuth Sign In

```typescript
// Redirect to OAuth provider
window.location.href = '/api/auth/sign-in/google';
// or
window.location.href = '/api/auth/sign-in/github';
```

---

## Database Migrations

### Initial Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0 NOT NULL,
  name TEXT,
  avatar_url TEXT,
  password_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Accounts table
CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  password_hash TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Verification tokens table
CREATE TABLE verification_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### Apply Migrations

```bash
# Local
npx wrangler d1 execute DB_NAME --local --file=./migrations/schema.sql

# Remote
npx wrangler d1 execute DB_NAME --remote --file=./migrations/schema.sql
```

---

## Testing Commands

### Quick Test Script

```bash
#!/bin/bash

BASE_URL="http://localhost:4321"
COOKIE_JAR="/tmp/better-auth-test-cookies.txt"

# Clean up
rm -f $COOKIE_JAR

# Generate random email
EMAIL="test$(date +%s)@example.com"

echo "=== 1. Sign Up ==="
curl -s -c $COOKIE_JAR -X POST "$BASE_URL/api/auth/sign-up/email" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Test User\",\"email\":\"$EMAIL\",\"password\":\"SecurePass123!\"}"

echo -e "\n\n=== 2. Get Session ==="
curl -s -b $COOKIE_JAR "$BASE_URL/api/auth/get-session"

echo -e "\n\n=== 3. Sign Out ==="
curl -s -b $COOKIE_JAR -X POST "$BASE_URL/api/auth/sign-out" \
  -H 'Content-Type: application/json' \
  -H "Origin: $BASE_URL" \
  -d '{}'

echo -e "\n\n=== 4. Session After Signout ==="
curl -s -b $COOKIE_JAR "$BASE_URL/api/auth/get-session"
```

---

## Common Errors & Solutions

### Error: "The field 'accountId' does not exist in the 'account' Drizzle schema"

**Cause:** Property name in Drizzle schema doesn't match Better Auth's expected field name.

**Fix:** Change property name to `accountId` (not `providerAccountId` or `account_id`):
```typescript
// ❌ Wrong
providerAccountId: text('provider_account_id')

// ✅ Correct
accountId: text('provider_account_id')
```

### Error: "The field 'updatedAt' does not exist in the 'session' Drizzle schema"

**Cause:** Missing required field in sessions table.

**Fix:** Add `updatedAt` field to sessions schema:
```typescript
updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
```

### Error: "The field 'ipAddress' does not exist in the 'session' Drizzle schema"

**Cause:** Missing required field in sessions table.

**Fix:** Add `ipAddress` and `userAgent` fields:
```typescript
ipAddress: text('ip_address'),
userAgent: text('user_agent'),
```

### Error: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"

**Cause:** Email already registered.

**Fix:** Use a different email or handle this error in your UI.

### Error: "Password is too short"

**Cause:** Password doesn't meet minimum length (default: 8 characters).

**Fix:** Enforce minimum 8 character passwords in your form validation.

### Error: "MISSING_OR_NULL_ORIGIN"

**Cause:** Sign-out request missing Origin header.

**Fix:** Include Origin header:
```typescript
fetch('/api/auth/sign-out', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Origin': window.location.origin
  },
  credentials: 'include',
  body: JSON.stringify({})
})
```

### Error: 404 on `/api/auth/session`

**Cause:** Wrong endpoint path.

**Fix:** Use `/api/auth/get-session` not `/api/auth/session`.

---

## Environment Variables

### Required Variables (`.dev.vars`)

```bash
# Required
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:4321

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Generate Secret

```bash
# Generate a random 32-byte secret
openssl rand -hex 32
```

---

## Quick Start Checklist

- [ ] Install packages: `npm install better-auth drizzle-orm`
- [ ] Create Drizzle schema with correct property names
- [ ] Create database tables with migrations
- [ ] Create `src/lib/auth.ts` configuration
- [ ] Create `src/pages/api/auth/[...all].ts` catch-all handler
- [ ] Set environment variables in `.dev.vars`
- [ ] Update frontend components to use Better Auth endpoints
- [ ] Test sign-up, sign-in, session, and sign-out flows

---

## References

- [Better Auth Documentation](https://www.better-auth.com/)
- [Better Auth Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle)
- [Better Auth Astro Integration](https://www.better-auth.com/docs/integrations/astro)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
