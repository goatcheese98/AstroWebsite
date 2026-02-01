## Cloudflare Setup Guide

# Setting up D1, KV, and R2 for AstroWeb

This guide walks you through setting up the Cloudflare infrastructure for authentication and canvas storage.

---

## 📋 Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npx wrangler` works)
- Project deployed to Cloudflare Pages (or ready to deploy)

---

## 🗄️ Step 1: Create D1 Database

### **1.1 Create the database**

```bash
npx wrangler d1 create astroweb-db
```

**Output will look like:**

```
✅ Successfully created DB 'astroweb-db'

[[d1_databases]]
binding = "DB"
database_name = "astroweb-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### **1.2 Update wrangler.jsonc**

Copy the `database_id` from the output and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "astroweb-db",
    "database_id": "PASTE_YOUR_DATABASE_ID_HERE" // ← Replace this
  }
]
```

### **1.3 Run migrations**

```bash
# Apply migrations to production
npx wrangler d1 execute astroweb-db --remote --file=./db/migrations/0001_initial_schema.sql

# For local development (optional)
npx wrangler d1 execute astroweb-db --local --file=./db/migrations/0001_initial_schema.sql
```

### **1.4 Verify tables**

```bash
# Check production database
npx wrangler d1 execute astroweb-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"

# Should see: users, sessions, accounts, verification_tokens, canvases, canvas_versions, canvas_shares
```

---

## 🔑 Step 2: Create KV Namespaces

### **2.1 Create SESSION_KV**

```bash
npx wrangler kv:namespace create SESSION_KV
```

**Output:**

```
✅ Add the following to your wrangler.toml/wrangler.jsonc:

kv_namespaces = [
  { binding = "SESSION_KV", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
]
```

### **2.2 Create RATE_LIMIT_KV**

```bash
npx wrangler kv:namespace create RATE_LIMIT_KV
```

**Output:**

```
kv_namespaces = [
  { binding = "RATE_LIMIT_KV", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
]
```

### **2.3 Create preview namespaces** (for local dev)

```bash
npx wrangler kv:namespace create SESSION_KV --preview
npx wrangler kv:namespace create RATE_LIMIT_KV --preview
```

### **2.4 Update wrangler.jsonc**

Replace the placeholder IDs with your actual IDs:

```jsonc
"kv_namespaces": [
  {
    "binding": "SESSION_KV",
    "id": "YOUR_SESSION_KV_ID_HERE",
    "preview_id": "YOUR_SESSION_KV_PREVIEW_ID_HERE"
  },
  {
    "binding": "RATE_LIMIT_KV",
    "id": "YOUR_RATE_LIMIT_KV_ID_HERE",
    "preview_id": "YOUR_RATE_LIMIT_KV_PREVIEW_ID_HERE"
  }
]
```

---

## 📦 Step 3: Create R2 Bucket

### **3.1 Create production bucket**

```bash
npx wrangler r2 bucket create astroweb-canvases
```

**Output:**

```
✅ Created bucket 'astroweb-canvases'
```

### **3.2 Create preview bucket** (for local dev)

```bash
npx wrangler r2 bucket create astroweb-canvases-preview
```

### **3.3 Configure CORS** (for direct uploads if needed)

```bash
# Create cors.json
cat > cors.json << 'EOF'
[
  {
    "AllowedOrigins": ["https://rohanjasani.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
EOF

# Apply CORS
npx wrangler r2 bucket cors put astroweb-canvases --config cors.json
```

---

## 🔐 Step 4: Set Environment Variables

### **4.1 For Cloudflare Pages** (Production)

Go to Cloudflare Dashboard → Pages → Your Project → Settings → Environment Variables

Add these variables:

```bash
# Auth Configuration
BETTER_AUTH_SECRET=<generate-random-32-char-string>
BETTER_AUTH_URL=https://rohanjasani.com

# Existing API Keys
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GEMINI_API_KEY=...

# OAuth (Optional - if using Google/GitHub login)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# API Auth (Optional)
ENABLE_API_AUTH=false
API_SECRET_KEY=...
```

### **4.2 For Local Development**

Create `.dev.vars` file (gitignored):

```bash
cat > .dev.vars << 'EOF'
BETTER_AUTH_SECRET=your-dev-secret-here
BETTER_AUTH_URL=http://localhost:4321
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GEMINI_API_KEY=...
EOF
```

### **4.3 Generate BETTER_AUTH_SECRET**

```bash
# Generate random secret
openssl rand -hex 32
```

---

## 🔄 Step 5: Deploy to Cloudflare Pages

### **5.1 Build and deploy**

```bash
# Build the project
npm run build

# Deploy (if using GitHub integration, just push to main)
git add .
git commit -m "Add authentication and canvas storage"
git push origin main
```

### **5.2 Verify deployment**

Check that your Cloudflare Pages deployment includes:

- ✅ D1 binding shows in Functions → Bindings
- ✅ KV namespaces show in Functions → Bindings
- ✅ R2 bucket shows in Functions → Bindings

---

## 🧪 Step 6: Test the Setup

### **6.1 Test D1 Database**

```bash
# Query users table
npx wrangler d1 execute astroweb-db --remote --command="SELECT COUNT(*) FROM users;"
```

### **6.2 Test Auth Endpoint**

```bash
# Test signup
curl -X POST https://rohanjasani.com/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

### **6.3 Test Session**

```bash
# Get current session (should return null if not logged in)
curl https://rohanjasani.com/api/auth/session
```

---

## 📊 Monitoring & Debugging

### **Check D1 Usage**

```bash
# View database stats
npx wrangler d1 execute astroweb-db --remote --command="SELECT name, COUNT(*) as count FROM (
  SELECT 'users' as name UNION ALL
  SELECT 'canvases' UNION ALL
  SELECT 'sessions'
) CROSS JOIN (
  SELECT * FROM users LIMIT 1000
);"
```

### **Check KV Usage**

```bash
# List all keys in SESSION_KV
npx wrangler kv:key list --namespace-id=YOUR_SESSION_KV_ID
```

### **Check R2 Usage**

```bash
# List objects in bucket
npx wrangler r2 object list astroweb-canvases
```

### **View Logs**

```bash
# Tail production logs
npx wrangler pages deployment tail
```

---

## 🚨 Common Issues

### **Issue: "Binding not found"**

- Ensure bindings are added in Cloudflare Pages dashboard
- Redeploy after adding bindings

### **Issue: "Database not found"**

- Check `database_id` in wrangler.jsonc matches actual ID
- Run migrations: `npx wrangler d1 execute astroweb-db --remote --file=./db/migrations/0001_initial_schema.sql`

### **Issue: "CORS error"**

- Configure R2 CORS settings
- Check allowed origins match your domain

---

## 📈 Cost Estimates

All Cloudflare services have generous free tiers:

| Service | Free Tier | Cost After Free Tier |
|---------|-----------|---------------------|
| **D1** | 5GB storage, 100k reads/day, 50k writes/day | $0.75/GB, $0.001/1000 reads |
| **KV** | 100k reads/day, 1k writes/day, 1GB storage | $0.50/million reads, $5/million writes |
| **R2** | 10GB storage/month, 1M reads, 1M writes | $0.015/GB, $0.36/million reads |
| **Pages** | Unlimited requests | Free (part of Pages) |

**Estimated monthly cost for ~1000 users**: **$0-5/month** 🎉

---

## ✅ Checklist

Before moving to the next step, ensure:

- [ ] D1 database created and migrations run
- [ ] KV namespaces created (SESSION_KV, RATE_LIMIT_KV)
- [ ] R2 bucket created (astroweb-canvases)
- [ ] wrangler.jsonc updated with actual IDs
- [ ] Environment variables set in Cloudflare Pages
- [ ] Project deployed successfully
- [ ] Auth endpoint tested

---

## 🚀 Next Steps

Once infrastructure is set up, we'll create:

1. Canvas CRUD API endpoints
2. UI components for login/signup
3. Canvas dashboard
4. Rate limiting middleware

Ready to proceed? Let me know when you've completed the Cloudflare setup!
