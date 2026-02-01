## API Documentation
# AstroWeb API Reference

Complete API documentation for authentication, AI features, and canvas management.

---

## 📋 Table of Contents

1. [Authentication API](#authentication-api)
2. [AI API](#ai-api)
3. [Canvas API](#canvas-api)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication API

All auth endpoints are handled by Better Auth at `/api/auth/*`.

### **Sign Up**
Create a new user account.

```http
POST /api/auth/sign-up
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201)**:
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false
  },
  "session": {
    "token": "session_token_here"
  }
}
```

### **Sign In**
Login with email and password.

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200)**:
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "token": "session_token_here",
    "expiresAt": "2026-02-07T12:00:00.000Z"
  }
}
```

### **Sign Out**
Logout current session.

```http
POST /api/auth/sign-out
Cookie: session=...
```

**Response (200)**:
```json
{
  "success": true
}
```

### **Get Session**
Get current user session.

```http
GET /api/auth/session
Cookie: session=...
```

**Response (200)**:
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true
  },
  "session": {
    "id": "session_xyz",
    "expiresAt": "2026-02-07T12:00:00.000Z"
  }
}
```

### **OAuth Providers** (if configured)

Google:
```http
GET /api/auth/sign-in/google
```

GitHub:
```http
GET /api/auth/sign-in/github
```

---

## 🤖 AI API

### **Chat with Claude**
Generate Excalidraw diagrams using Claude AI.

```http
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Draw a simple flowchart for user login"
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "canvasState": {
    "description": "Canvas contains a header element at x:100, y:50"
  }
}
```

**Response (200)**:
```json
{
  "message": "I'll create a login flowchart.\n\n```json\n[...excalidraw elements...]\n```",
  "model": "claude-sonnet-4-20250514"
}
```

**Validation**:
- Max 50 messages per request
- Max 10,000 chars per message
- Max 50KB canvas state
- Model must be `claude-sonnet-4-20250514` or `claude-haiku-4-20250514`

### **Generate Image**
Generate images using Google Gemini.

```http
POST /api/generate-image
Content-Type: application/json

{
  "prompt": "A futuristic city skyline at sunset",
  "model": "gemini-2.5-flash-image"
}
```

**Response (200)**:
```json
{
  "success": true,
  "imageData": "base64_encoded_image_data",
  "mimeType": "image/png",
  "model": "gemini-2.5-flash-image"
}
```

**Validation**:
- Min 3 chars, max 2000 chars for prompt
- Model: `gemini-2.5-flash-image` or `gemini-3-pro-image-preview`

---

## 🎨 Canvas API

All canvas endpoints require authentication (except public/shared).

### **Create Canvas**
Save a new canvas.

```http
POST /api/canvas/create
Content-Type: application/json
Cookie: session=...

{
  "title": "My Architecture Diagram",
  "description": "System architecture overview",
  "canvasData": {
    "elements": [
      {
        "id": "elem_1",
        "type": "rectangle",
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 100
      }
    ],
    "appState": {},
    "files": {}
  },
  "isPublic": false,
  "thumbnailData": "data:image/png;base64,..."
}
```

**Response (201)**:
```json
{
  "id": "canvas_abc123",
  "userId": "user_abc123",
  "title": "My Architecture Diagram",
  "description": "System architecture overview",
  "thumbnailUrl": "canvases/user_abc123/canvas_abc123/thumbnail.png",
  "isPublic": false,
  "version": 1,
  "createdAt": 1738329600,
  "updatedAt": 1738329600,
  "canvasData": { ... }
}
```

**Validation**:
- Title: 1-200 chars (required)
- Description: max 1000 chars (optional)
- Canvas data: max 10MB
- Thumbnail: Base64 PNG (optional)

### **Get Canvas**
Retrieve a canvas by ID.

```http
GET /api/canvas/{canvas_id}
Cookie: session=... (optional if public)
```

**Response (200)**:
```json
{
  "id": "canvas_abc123",
  "userId": "user_abc123",
  "title": "My Architecture Diagram",
  "canvasData": {
    "elements": [...],
    "appState": {},
    "files": {}
  },
  ...
}
```

**Access Rules**:
- Owner can always view
- Non-owners can only view if `isPublic: true`

### **Update Canvas**
Update an existing canvas.

```http
PUT /api/canvas/{canvas_id}
Content-Type: application/json
Cookie: session=...

{
  "title": "Updated Title",
  "canvasData": { ... },
  "isPublic": true,
  "createVersion": true
}
```

**Response (200)**:
```json
{
  "id": "canvas_abc123",
  "version": 2,
  "updatedAt": 1738329700,
  ...
}
```

**Version Control**:
- Set `createVersion: true` to save current state as version before updating
- Version history is preserved

### **Delete Canvas**
Delete a canvas permanently.

```http
DELETE /api/canvas/{canvas_id}
Cookie: session=...
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Canvas deleted successfully"
}
```

**Note**: Deletes canvas from D1 database and all R2 files (data, versions, thumbnail).

### **List User's Canvases**
Get all canvases for the authenticated user.

```http
GET /api/canvas/list?limit=50&offset=0&sort=updated&order=desc
Cookie: session=...
```

**Query Parameters**:
- `limit`: Max results (1-100, default: 50)
- `offset`: Pagination offset (default: 0)
- `sort`: Sort field - `created`, `updated`, `title` (default: `updated`)
- `order`: Sort order - `asc`, `desc` (default: `desc`)

**Response (200)**:
```json
{
  "canvases": [
    {
      "id": "canvas_abc123",
      "title": "My Canvas",
      "description": "...",
      "thumbnailUrl": "...",
      "isPublic": false,
      "version": 1,
      "createdAt": 1738329600,
      "updatedAt": 1738329600
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

**Note**: Returns metadata only (no `canvasData` to save bandwidth).

### **List Public Canvases**
Get public canvases (no auth required).

```http
GET /api/canvas/public?limit=20&offset=0
```

**Response (200)**:
```json
{
  "canvases": [
    {
      "id": "canvas_xyz",
      "title": "Public Architecture",
      "isPublic": true,
      ...
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

**Caching**: Response cached for 60 seconds.

### **Create Share Link**
Generate a public share link for a canvas.

```http
POST /api/canvas/{canvas_id}/share
Content-Type: application/json
Cookie: session=...

{
  "expiresInDays": 7
}
```

**Response (201)**:
```json
{
  "shareToken": "share_abc123xyz",
  "shareUrl": "https://your-domain.com/canvas/shared/share_abc123xyz",
  "expiresAt": 1738934400
}
```

**Expiration**:
- `expiresInDays`: 1-365 days (optional)
- If not provided, link never expires

### **Get Shared Canvas**
Access a canvas via share link (no auth required).

```http
GET /api/canvas/shared/{share_token}
```

**Response (200)**:
```json
{
  "id": "canvas_abc123",
  "title": "Shared Canvas",
  "canvasData": { ... },
  ...
}
```

**Access Rules**:
- Anyone with the share token can view
- Returns 404 if token is invalid or expired

---

## ❌ Error Handling

All errors follow this format:

```json
{
  "error": "Error title",
  "details": "Detailed error message"
}
```

### **Common HTTP Status Codes**

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Authentication required or invalid |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server-side error |

### **Example Error Responses**

**Validation Error (400)**:
```json
{
  "error": "Invalid title",
  "details": "Title too long. Maximum 200 characters"
}
```

**Authentication Error (401)**:
```json
{
  "error": "Authentication required",
  "details": "You must be logged in to access this resource"
}
```

**Not Found (404)**:
```json
{
  "error": "Canvas not found",
  "details": "The requested canvas does not exist"
}
```

---

## 🚦 Rate Limiting

Rate limiting is enforced per-user (authenticated) or per-IP (anonymous).

### **Limits**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 10 requests | 1 minute |
| `/api/chat` | 20 requests | 1 minute |
| `/api/generate-image` | 5 requests | 1 minute |
| `/api/canvas/*` | 100 requests | 1 minute |

### **Rate Limit Headers**

Responses include rate limit headers:

```http
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1738329660
```

### **Rate Limit Exceeded (429)**

```json
{
  "error": "Rate limit exceeded",
  "details": "Too many requests. Please try again later."
}
```

---

## 🧪 Testing Examples

### **cURL Examples**

**Sign up**:
```bash
curl -X POST https://your-domain.com/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

**Create canvas**:
```bash
curl -X POST https://your-domain.com/api/canvas/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_token" \
  -d '{
    "title": "Test Canvas",
    "canvasData": {
      "elements": [],
      "appState": {},
      "files": {}
    }
  }'
```

**Get canvas**:
```bash
curl https://your-domain.com/api/canvas/canvas_abc123 \
  -H "Cookie: session=your_session_token"
```

### **JavaScript/Fetch Examples**

**Sign in**:
```javascript
const response = await fetch('/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123!'
  })
});

const data = await response.json();
console.log('Logged in:', data.user);
```

**Create canvas**:
```javascript
const response = await fetch('/api/canvas/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    title: 'My Canvas',
    canvasData: {
      elements: [],
      appState: {},
      files: {}
    },
    isPublic: false
  })
});

const canvas = await response.json();
console.log('Canvas created:', canvas.id);
```

---

## 📊 API Summary

| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| **Auth** | 5+ endpoints | No (for login/signup) |
| **AI** | 2 endpoints | Optional |
| **Canvas** | 7 endpoints | Yes (except public/shared) |
| **Total** | 14+ endpoints | Mixed |

---

## 🔄 Changelog

### v1.0.0 (2026-01-31)
- Initial API release
- Better Auth integration
- Canvas CRUD operations
- AI chat and image generation
- Public sharing and version control

---

## 📞 Support

For issues or questions:
- Check the [setup guide](./CLOUDFLARE_SETUP_GUIDE.md)
- Review [implementation progress](./IMPLEMENTATION_PROGRESS.md)
- Open an issue on GitHub

---

**Happy building!** 🚀
