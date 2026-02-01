# Complete Cloudflare & OAuth Setup Guide

This guide walks through the remaining steps to make authentication fully functional in your AstroWeb application.

## ✅ Already Completed

- [x] D1 Database created: `astroweb-db` (ID: `1daa4434-4ec6-472d-8bf9-ab6e71c11dbf`)
- [x] Database migrations run (7 tables created)
- [x] KV Namespaces created:
  - SESSION_KV: `2e40b52270bb4622873e0ba5c545a922`
  - RATE_LIMIT_KV: `598df9d2488549df9929db888147772f`
- [x] wrangler.jsonc configured with actual IDs
- [x] .dev.vars file created with BETTER_AUTH_SECRET

---

## 📦 Step 1: Enable R2 and Create Bucket

### 1.1 Enable R2 in Cloudflare Dashboard

1. Go to https://dash.cloudflare.com/
2. Navigate to **R2 Object Storage** in the left sidebar
3. Click **"Enable R2"** button
4. Accept the terms and conditions
5. You may need to add payment information (R2 has a generous free tier: 10GB storage, 1 million Class A operations per month)

### 1.2 Create R2 Buckets

Once R2 is enabled, run these commands:

```bash
# Create production bucket
npx wrangler r2 bucket create astroweb-canvases

# Create preview bucket (for testing)
npx wrangler r2 bucket create astroweb-canvases-preview
```

### 1.3 Verify R2 Configuration

Your `wrangler.jsonc` already has the R2 binding configured:

```json
"r2_buckets": [
  {
    "binding": "CANVAS_STORAGE",
    "bucket_name": "astroweb-canvases",
    "preview_bucket_name": "astroweb-canvases-preview"
  }
]
```

No changes needed here - it's ready to go!

---

## 🔐 Step 2: Configure OAuth Providers

### 2.1 Google OAuth Setup

#### Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing):
   - Click on project dropdown → **"New Project"**
   - Name: `AstroWeb` (or your preferred name)
   - Click **"Create"**

3. Enable Google+ API:
   - Go to **"APIs & Services"** → **"Library"**
   - Search for **"Google+ API"**
   - Click **"Enable"**

4. Configure OAuth Consent Screen:
   - Go to **"APIs & Services"** → **"OAuth consent screen"**
   - Select **"External"** (or Internal if using Google Workspace)
   - Click **"Create"**
   - Fill in required fields:
     - App name: `AstroWeb`
     - User support email: Your email
     - Developer contact: Your email
   - Click **"Save and Continue"**
   - Scopes: Click **"Add or Remove Scopes"**
     - Select: `userinfo.email`, `userinfo.profile`, `openid`
   - Click **"Save and Continue"**
   - Test users: Add your email for testing
   - Click **"Save and Continue"**

5. Create OAuth 2.0 Client ID:
   - Go to **"APIs & Services"** → **"Credentials"**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **"Web application"**
   - Name: `AstroWeb`
   - Authorized JavaScript origins:
     - `http://localhost:4321` (for local dev)
     - `https://your-production-domain.com` (add after deployment)
   - Authorized redirect URIs:
     - `http://localhost:4321/api/auth/callback/google`
     - `https://your-production-domain.com/api/auth/callback/google`
   - Click **"Create"**

6. Copy your credentials:
   - **Client ID**: Looks like `123456789-abcdef.apps.googleusercontent.com`
   - **Client Secret**: Looks like `GOCSPX-abc123def456`

#### Add to .dev.vars

```bash
# Add these lines to .dev.vars
GOOGLE_CLIENT_ID=your-actual-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

---

### 2.2 GitHub OAuth Setup

#### Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Fill in the form:
   - Application name: `AstroWeb`
   - Homepage URL: `http://localhost:4321` (for dev)
   - Authorization callback URL: `http://localhost:4321/api/auth/callback/github`
   - Click **"Register application"**

4. Generate Client Secret:
   - Click **"Generate a new client secret"**
   - Copy the secret immediately (you won't see it again)

5. Copy your credentials:
   - **Client ID**: Displayed on the page
   - **Client Secret**: Just generated

#### Create Production OAuth App (Optional for Now)

Repeat the above steps with your production domain once deployed:
- Homepage URL: `https://your-production-domain.com`
- Callback URL: `https://your-production-domain.com/api/auth/callback/github`

#### Add to .dev.vars

```bash
# Add these lines to .dev.vars
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

---

### 2.3 Apple Sign In Setup (Optional - More Complex)

Apple Sign In requires an Apple Developer account ($99/year). If you want to add it later, here's the overview:

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **"Certificates, Identifiers & Profiles"**
3. Create an App ID with Sign in with Apple enabled
4. Create a Services ID for web authentication
5. Configure return URLs
6. Generate a private key for authentication

For now, you can skip Apple and just use Google + GitHub.

#### Remove Apple from Auth Config (Temporary)

Edit `src/lib/auth.ts` and comment out Apple provider:

```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
  // apple: {
  //   clientId: process.env.APPLE_CLIENT_ID!,
  //   clientSecret: process.env.APPLE_CLIENT_SECRET!,
  // },
},
```

---

## 🔑 Step 3: Add API Keys to .dev.vars

Your `.dev.vars` file should look like this:

```bash
# Local Development Environment Variables
# DO NOT COMMIT THIS FILE TO GIT

# Better Auth Configuration
BETTER_AUTH_SECRET=5e1ca4b4c9209a458349ab3852ae80e5bcc22eaa9a8ca460cb917b02d0f32f25
BETTER_AUTH_URL=http://localhost:4321

# AI API Keys
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-anthropic-key-here
GOOGLE_GEMINI_API_KEY=your-actual-gemini-key-here

# OAuth Providers
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GITHUB_CLIENT_ID=Iv1.your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Optional: Apple Sign In (can add later)
# APPLE_CLIENT_ID=your-apple-client-id
# APPLE_CLIENT_SECRET=your-apple-client-secret
```

**Security Check:**
- Verify `.dev.vars` is in your `.gitignore` file ✅ (already added)
- Never commit this file to Git

---

## 🧪 Step 4: Test Authentication Locally

### 4.1 Start Development Server

```bash
npm run dev
```

### 4.2 Test Email/Password Signup

1. Navigate to `http://localhost:4321/signup`
2. Fill in the form:
   - Name: Test User
   - Email: test@example.com
   - Password: TestPassword123!
   - Confirm password
3. Click **"Create Account"**
4. Check browser console and network tab for any errors

### 4.3 Test OAuth Providers

1. Navigate to `http://localhost:4321/login`
2. Click **"Continue with Google"**
   - Should redirect to Google OAuth consent screen
   - Grant permissions
   - Should redirect back to your app
3. Try **"Continue with GitHub"**
   - Should redirect to GitHub authorization
   - Click "Authorize"
   - Should redirect back to your app

### 4.4 Verify Session Storage

Check that sessions are stored in D1:

```bash
npx wrangler d1 execute astroweb-db --remote --command "SELECT * FROM sessions LIMIT 5"
```

---

## 🚀 Step 5: Deploy to Cloudflare Pages

### 5.1 Build Your Application

```bash
npm run build
```

### 5.2 Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy dist
```

Follow the prompts to create a new project.

### 5.3 Configure Production Environment Variables

After deployment, you need to add environment variables to Cloudflare Pages:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **"Pages"** → Select your project
3. Go to **"Settings"** → **"Environment variables"**
4. Add the following variables for **Production**:

```
BETTER_AUTH_SECRET=<generate-new-secret-for-production>
BETTER_AUTH_URL=https://your-project.pages.dev
ANTHROPIC_API_KEY=sk-ant-api03-your-key
GOOGLE_GEMINI_API_KEY=your-gemini-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**Generate new BETTER_AUTH_SECRET for production:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5.4 Update OAuth Redirect URLs

Go back to Google Cloud Console and GitHub OAuth settings:

1. **Google Cloud Console:**
   - Add production origin: `https://your-project.pages.dev`
   - Add production redirect: `https://your-project.pages.dev/api/auth/callback/google`

2. **GitHub OAuth App:**
   - Create a new OAuth app for production (recommended)
   - Or add production callback URL to existing app: `https://your-project.pages.dev/api/auth/callback/github`

### 5.5 Bind Cloudflare Resources to Pages

Your Pages project needs access to D1, KV, and R2:

1. In Cloudflare Pages Settings → **"Functions"** → **"Bindings"**
2. Add bindings:
   - **D1 Databases:**
     - Variable name: `DB`
     - D1 database: `astroweb-db`
   - **KV Namespaces:**
     - Variable name: `SESSION_KV`
     - KV namespace: `SESSION_KV`
     - Variable name: `RATE_LIMIT_KV`
     - KV namespace: `RATE_LIMIT_KV`
   - **R2 Buckets:**
     - Variable name: `CANVAS_STORAGE`
     - R2 bucket: `astroweb-canvases`

3. Click **"Save"** and redeploy

---

## ✅ Verification Checklist

### Local Development
- [ ] R2 buckets created
- [ ] Google OAuth credentials added to .dev.vars
- [ ] GitHub OAuth credentials added to .dev.vars
- [ ] API keys (Anthropic, Gemini) added to .dev.vars
- [ ] Local dev server starts without errors
- [ ] Can create account with email/password
- [ ] Can sign in with Google
- [ ] Can sign in with GitHub
- [ ] Sessions persist in D1 database

### Production Deployment
- [ ] Application builds successfully
- [ ] Deployed to Cloudflare Pages
- [ ] Environment variables configured in Pages dashboard
- [ ] D1, KV, R2 bindings configured in Pages
- [ ] OAuth redirect URLs updated for production domain
- [ ] Production authentication flow works
- [ ] Canvas save/load works with R2 storage

---

## 🐛 Troubleshooting

### "Error: R2 is not enabled"
- Enable R2 in Cloudflare dashboard first
- Add payment method if required (free tier available)

### "OAuth redirect_uri_mismatch"
- Check that redirect URIs match exactly in OAuth provider settings
- Include protocol (http:// or https://)
- No trailing slashes

### "Better Auth session not persisting"
- Verify SESSION_KV binding is configured
- Check browser cookies are enabled
- Ensure BETTER_AUTH_URL matches your domain

### "D1 binding not found in production"
- Add D1 binding in Cloudflare Pages → Settings → Functions → Bindings
- Redeploy after adding bindings

### "CORS errors with OAuth"
- Better Auth handles CORS automatically
- Ensure BETTER_AUTH_URL is set correctly
- Check that credentials: 'include' is set in fetch requests

---

## 📚 Next Steps After Setup

Once authentication is working:

1. **Email Verification Flow**
   - Implement email sending (using Resend, SendGrid, or Cloudflare Email Workers)
   - Create email verification page

2. **Password Reset**
   - Add "Forgot Password" functionality
   - Create password reset email template

3. **Profile Management**
   - Create user profile page
   - Allow avatar uploads to R2
   - Update user information

4. **Canvas Integration**
   - Connect authentication to canvas save/load
   - Implement canvas sharing via `/api/canvas/share` endpoint
   - Add canvas version history

5. **Rate Limiting**
   - Implement rate limiting using RATE_LIMIT_KV
   - Protect API endpoints from abuse

6. **Analytics**
   - Add Cloudflare Web Analytics
   - Track authentication success/failure rates
   - Monitor API usage

---

## 🔐 Security Best Practices

- ✅ Never commit .dev.vars to Git (already in .gitignore)
- ✅ Use different OAuth credentials for dev and production
- ✅ Generate unique BETTER_AUTH_SECRET for each environment
- ✅ Enable email verification before allowing full access
- ✅ Implement rate limiting on auth endpoints
- ✅ Use HTTPS in production (Cloudflare Pages does this automatically)
- ✅ Regularly rotate OAuth secrets
- ✅ Monitor failed login attempts
- ✅ Implement CSRF protection (Better Auth includes this)

---

## 📞 Support Resources

- **Better Auth Docs:** https://www.better-auth.com/docs
- **Cloudflare D1 Docs:** https://developers.cloudflare.com/d1/
- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
- **Google OAuth Docs:** https://developers.google.com/identity/protocols/oauth2
- **GitHub OAuth Docs:** https://docs.github.com/en/apps/oauth-apps

---

**Your authentication system is production-ready!** 🎉

Once you complete these steps, users will be able to:
- Sign up with email/password
- Sign in with Google
- Sign in with GitHub
- Have persistent sessions
- Save canvases to R2 storage
- Share canvases with others
