# API Keys and Setup Configuration

This document contains all essential API keys, environment variables, and infrastructure setup requirements for the AstroWeb project.

---

## 🔐 Environment Variables (.dev.vars / Production)

### Required Variables

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET=your_better_auth_secret_here
BETTER_AUTH_URL=http://localhost:4321

# AI API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here
MOONSHOT_API_KEY=your_moonshot_api_key_here

# Email Service
RESEND_API_KEY=your_resend_api_key_here

# OAuth Providers (Google)
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456

# OAuth Providers (GitHub)
GITHUB_CLIENT_ID=Iv1.your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# API Internal Security (Optional)
ENABLE_API_AUTH=true
API_SECRET_KEY=your_generated_key_here_32_characters_long
```

---

## 🗄️ Database Environment (Cloudflare D1)

### Database IDs

- **astroweb-db**: `1daa4434-4ec6-472d-8bf9-ab6e71c11dbf`

### Core Table Schemas (Better Auth Required)

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

-- Verification tokens table (Required for OAuth)
CREATE TABLE verification_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Canvases table
CREATE TABLE canvases (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_public INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

## 📦 Infrastructure (KV & R2)

### KV Namespaces

- **SESSION_KV**: `2e40b52270bb4622873e0ba5c545a922`
- **RATE_LIMIT_KV**: `598df9d2488549df9929db888147772f`

### R2 Buckets

```bash
# Create production bucket
npx wrangler r2 bucket create astroweb-canvases

# Create preview bucket
npx wrangler r2 bucket create astroweb-canvases-preview
```

---

## 🛠️ Key Setup Commands

### Generate Auth Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Apply Migrations

```bash
# Local
npx wrangler d1 execute astroweb-db --local --file=./migrations/schema.sql

# Remote
npx wrangler d1 execute astroweb-db --remote --file=./migrations/schema.sql
```

---

## 🔐 OAuth Callbacks

- **Google**: `http://localhost:4321/api/auth/callback/google`
- **GitHub**: `http://localhost:4321/api/auth/callback/github`
