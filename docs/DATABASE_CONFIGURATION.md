# Database Configuration Guide

Complete guide to your Cloudflare D1 database setup with Better Auth and Drizzle ORM.

---

## 📊 Database Architecture

### **Stack**
- **Database**: Cloudflare D1 (SQLite-compatible, edge-distributed)
- **ORM**: Drizzle ORM (type-safe SQL query builder)
- **Auth**: Better Auth (headless authentication library)
- **Sessions**: Cloudflare KV (key-value store)
- **Storage**: Cloudflare R2 (object storage for canvas files)

### **Database Schema** (7 Tables)

```sql
┌─────────────────────┐
│       users         │  ← User accounts (email/password + OAuth)
├─────────────────────┤
│ id                  │
│ email               │
│ email_verified      │
│ name                │
│ avatar_url          │
│ password_hash       │
│ created_at          │
│ updated_at          │
└─────────────────────┘
           │
           ├──────────────────────────────┐
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌─────────────────────┐
│      sessions       │      │      accounts       │
├─────────────────────┤      ├─────────────────────┤
│ id                  │      │ id                  │
│ user_id (FK)        │      │ user_id (FK)        │
│ expires_at          │      │ account_id          │
│ token               │      │ provider_id         │
│ ip_address          │      │ access_token        │
│ user_agent          │      │ refresh_token       │
│ created_at          │      │ id_token            │
│ updated_at          │      │ expires_at          │
└─────────────────────┘      │ password            │
                              │ created_at          │
                              │ updated_at          │
                              └─────────────────────┘
┌──────────────────────┐
│ verification_tokens  │  ← Email verification
├──────────────────────┤
│ id                   │
│ identifier           │
│ value                │
│ expires_at           │
│ created_at           │
│ updated_at           │
└──────────────────────┘

┌─────────────────────┐
│      canvases       │  ← Excalidraw canvas metadata
├─────────────────────┤
│ id                  │
│ user_id (FK)        │
│ title               │
│ description         │
│ r2_key              │  ← Points to R2 object
│ is_public           │
│ created_at          │
│ updated_at          │
└─────────────────────┘
           │
           ├──────────────────────────────┐
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌─────────────────────┐
│  canvas_versions    │      │   canvas_shares     │
├─────────────────────┤      ├─────────────────────┤
│ id                  │      │ id                  │
│ canvas_id (FK)      │      │ canvas_id (FK)      │
│ version_number      │      │ shared_with (FK)    │
│ r2_key              │      │ permission          │
│ created_at          │      │ created_at          │
│ created_by (FK)     │      └─────────────────────┘
└─────────────────────┘
```

---

## ✅ What's Configured

### **1. Cloudflare Resources**

| Resource | Binding Name | ID | Purpose |
|----------|-------------|-----|---------|
| D1 Database | `DB` | `1daa4434-4ec6-472d-8bf9-ab6e71c11dbf` | User data, sessions, canvas metadata |
| KV Namespace | `SESSION_KV` | `2e40b52270bb4622873e0ba5c545a922` | Session caching |
| KV Namespace | `RATE_LIMIT_KV` | `598df9d2488549df9929db888147772f` | API rate limiting |
| R2 Bucket | `CANVAS_STORAGE` | (pending) | Canvas JSON files |

### **2. Database Tables**

All 7 tables created via migration: `db/migrations/0001_initial_schema.sql`

Verify tables exist:
```bash
npx wrangler d1 execute astroweb-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected output:
```
users
sessions
accounts
verification_tokens
canvases
canvas_versions
canvas_shares
```

### **3. Drizzle ORM Schema**

Location: `src/lib/db/schema.ts`

- Type-safe database schema
- Matches SQL migration exactly
- Used by Better Auth for user management
- Used by your app for canvas operations

### **4. Better Auth Integration**

Location: `src/lib/auth.ts`

Features:
- ✅ Email/password authentication
- ✅ Google OAuth (when credentials provided)
- ✅ GitHub OAuth (when credentials provided)
- ✅ Session management (7-day expiry)
- ✅ Secure cookies (HTTPS in production)
- ⏳ Email verification (requires email service)
- ⏳ Password reset (requires email service)

### **5. API Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...all]` | ALL | Better Auth handler (signup, login, OAuth) |
| `/api/db-health` | GET | Database health check |
| `/api/canvas/create` | POST | Create new canvas |
| `/api/canvas/[id]` | GET | Get canvas by ID |
| `/api/canvas/[id]` | PUT | Update canvas |
| `/api/canvas/[id]` | DELETE | Delete canvas |
| `/api/canvas/list` | GET | List user's canvases |
| `/api/canvas/public` | GET | List public canvases |
| `/api/canvas/share` | POST | Share canvas with another user |

---

## 🧪 Testing the Configuration

### **1. Health Check Endpoint**

Test that database is connected and tables exist:

```bash
# Local dev (if running)
curl http://localhost:4321/api/db-health

# Production (after deployment)
curl https://your-domain.pages.dev/api/db-health
```

Expected response (healthy):
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T...",
  "database": {
    "connected": true,
    "tables": {
      "found": ["users", "sessions", "accounts", ...],
      "missing": [],
      "counts": {
        "users": 0,
        "sessions": 0,
        "canvases": 0
      }
    }
  },
  "bindings": {
    "kv": {
      "SESSION_KV": true,
      "RATE_LIMIT_KV": true
    },
    "r2": {
      "CANVAS_STORAGE": true
    }
  },
  "environment": {
    "BETTER_AUTH_SECRET": true,
    "BETTER_AUTH_URL": true,
    ...
  },
  "warnings": []
}
```

### **2. Query Database Directly**

```bash
# List all users
npx wrangler d1 execute astroweb-db --remote --command "SELECT * FROM users"

# List all sessions
npx wrangler d1 execute astroweb-db --remote --command "SELECT * FROM sessions"

# Count canvases
npx wrangler d1 execute astroweb-db --remote --command "SELECT COUNT(*) as total FROM canvases"

# Check a specific user by email
npx wrangler d1 execute astroweb-db --remote --command "SELECT * FROM users WHERE email='test@example.com'"
```

### **3. Test Authentication Flow**

Once you start the dev server:

```bash
npm run dev
```

1. **Signup**: Visit `http://localhost:4321/signup`
   - Fill in name, email, password
   - Submit form
   - Check database: `SELECT * FROM users`

2. **Login**: Visit `http://localhost:4321/login`
   - Use the email/password from signup
   - Should create a session
   - Check database: `SELECT * FROM sessions`

3. **OAuth** (when configured):
   - Click "Continue with Google"
   - Complete OAuth flow
   - Check database: `SELECT * FROM accounts`

---

## 🔧 Configuration Files

### **1. `wrangler.jsonc`**

Bindings configured:
```jsonc
{
  "d1_databases": [{
    "binding": "DB",
    "database_name": "astroweb-db",
    "database_id": "1daa4434-4ec6-472d-8bf9-ab6e71c11dbf"
  }],
  "kv_namespaces": [{
    "binding": "SESSION_KV",
    "id": "2e40b52270bb4622873e0ba5c545a922"
  }, {
    "binding": "RATE_LIMIT_KV",
    "id": "598df9d2488549df9929db888147772f"
  }],
  "r2_buckets": [{
    "binding": "CANVAS_STORAGE",
    "bucket_name": "astroweb-canvases",
    "preview_bucket_name": "astroweb-canvases-preview"
  }]
}
```

### **2. `.dev.vars`** (Local Development)

```bash
# Required for auth to work
BETTER_AUTH_SECRET=5e1ca4b4c9209a458349ab3852ae80e5bcc22eaa9a8ca460cb917b02d0f32f25
BETTER_AUTH_URL=http://localhost:4321

# Your API keys (add actual values)
ANTHROPIC_API_KEY=sk-ant-api03-your-key
GOOGLE_GEMINI_API_KEY=your-key

# OAuth (when ready)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret
```

### **3. `src/env.d.ts`** (TypeScript Types)

Defines all Cloudflare bindings and environment variables for type safety.

### **4. `src/lib/db/schema.ts`** (Drizzle Schema)

Type-safe schema matching your D1 database tables.

### **5. `src/lib/db/index.ts`** (Database Utilities)

Helper functions for common database operations:
- `getUserById()`, `getUserByEmail()`
- `createCanvas()`, `getCanvasById()`, `updateCanvas()`, `deleteCanvas()`
- `getUserCanvases()`, `getPublicCanvases()`
- `createCanvasVersion()`, `getCanvasVersions()`
- `createCanvasShare()`, `getCanvasShare()`

---

## 🔐 Environment Variables

### **Required**

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `BETTER_AUTH_SECRET` | JWT signing key | Generated (32 bytes hex) |
| `BETTER_AUTH_URL` | Base URL for OAuth | Your domain |

### **Optional (Auth Features)**

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google Cloud Console |
| `GITHUB_CLIENT_ID` | GitHub OAuth | GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | GitHub Developer Settings |

### **Optional (API Features)**

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `ANTHROPIC_API_KEY` | Claude AI chat | Anthropic Console |
| `GOOGLE_GEMINI_API_KEY` | Gemini image gen | Google AI Studio |

---

## 🚀 Local Development

### **Start Dev Server**

```bash
npm run dev
```

This starts Astro with Cloudflare adapter in dev mode. The `.dev.vars` file is automatically loaded.

### **Test with Wrangler**

For more accurate Cloudflare simulation:

```bash
npm run build
npx wrangler pages dev dist
```

This runs your built app in Cloudflare's local runtime.

---

## 🌐 Production Deployment

### **1. Deploy to Cloudflare Pages**

```bash
npm run build
npx wrangler pages deploy dist
```

### **2. Configure Environment Variables**

In Cloudflare Dashboard → Pages → Your Project → Settings → Environment Variables:

Add all variables from `.dev.vars` (with production values):

```
BETTER_AUTH_SECRET=<generate-new-secret-for-production>
BETTER_AUTH_URL=https://your-domain.pages.dev
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Generate production secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **3. Bind Resources to Pages**

In Cloudflare Dashboard → Pages → Your Project → Settings → Functions → Bindings:

Add:
- **D1 Database**: Variable name `DB`, select `astroweb-db`
- **KV Namespace**: Variable name `SESSION_KV`, select `SESSION_KV`
- **KV Namespace**: Variable name `RATE_LIMIT_KV`, select `RATE_LIMIT_KV`
- **R2 Bucket**: Variable name `CANVAS_STORAGE`, select `astroweb-canvases`

### **4. Update OAuth Redirect URLs**

Update your OAuth apps with production URLs:

**Google Cloud Console:**
- Add: `https://your-domain.pages.dev/api/auth/callback/google`

**GitHub OAuth App:**
- Add: `https://your-domain.pages.dev/api/auth/callback/github`

---

## 🐛 Troubleshooting

### **"Database not configured" Error**

**Cause**: D1 binding not available

**Fix**:
1. Check `wrangler.jsonc` has correct database ID
2. In production, verify bindings in Pages dashboard
3. Restart dev server: `npm run dev`

### **"Invalid binding `SESSION`" Warning**

**Cause**: Astro's Cloudflare adapter expects `SESSION` binding for its own sessions

**Fix**: Safe to ignore - we're using Better Auth's session management, not Astro's

### **Tables Missing**

**Cause**: Migration not run

**Fix**:
```bash
npx wrangler d1 execute astroweb-db --remote --file=./db/migrations/0001_initial_schema.sql
```

### **OAuth Redirect Mismatch**

**Cause**: Redirect URI doesn't match configured URL

**Fix**:
1. Check `BETTER_AUTH_URL` matches your domain
2. Update OAuth app redirect URIs to match exactly
3. No trailing slashes in URLs

### **Session Not Persisting**

**Cause**: Missing `SESSION_KV` binding or `BETTER_AUTH_SECRET`

**Fix**:
1. Verify KV binding exists: check `/api/db-health`
2. Ensure `BETTER_AUTH_SECRET` is set
3. Check browser cookies are enabled

---

## 📊 Database Monitoring

### **Check Database Size**

```bash
npx wrangler d1 execute astroweb-db --remote --command "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
```

### **Monitor Query Performance**

Every query returns metadata:
```json
{
  "meta": {
    "duration": 12.5,  // milliseconds
    "rows_read": 1,
    "rows_written": 0
  }
}
```

### **Cloudflare Dashboard Metrics**

View in dashboard:
- Total queries per day
- P50/P99 query latency
- Storage usage
- Read/write ratios

---

## 🔒 Security Checklist

- ✅ `.dev.vars` in `.gitignore`
- ✅ Unique `BETTER_AUTH_SECRET` for production
- ✅ HTTPS enforced in production (auto by Cloudflare)
- ✅ SQL injection protected (prepared statements)
- ✅ CSRF protection (Better Auth built-in)
- ✅ Session expiry (7 days)
- ✅ Secure cookies in production
- ⏳ Email verification (when service added)
- ⏳ Rate limiting (KV namespace ready, needs implementation)

---

## 📈 Next Steps

### **Immediate**
1. ✅ Database configured and tested
2. ⏳ Test authentication locally
3. ⏳ Add OAuth credentials
4. ⏳ Enable R2 for canvas storage

### **Soon**
1. Add email service (Resend, SendGrid, etc.)
2. Enable email verification
3. Implement rate limiting
4. Add canvas save/load functionality
5. Deploy to production

### **Later**
1. Add 2FA/MFA support
2. Implement password strength requirements
3. Add user profile management
4. Canvas collaboration features
5. Analytics and monitoring

---

## 📚 References

- **Cloudflare D1 Docs**: https://developers.cloudflare.com/d1/
- **Drizzle ORM Docs**: https://orm.drizzle.team/
- **Better Auth Docs**: https://www.better-auth.com/docs
- **Cloudflare KV Docs**: https://developers.cloudflare.com/kv/
- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/

---

**Your database is fully configured and ready to use!** 🎉

Test the health check endpoint to verify everything is working, then proceed with adding OAuth credentials and testing authentication.
