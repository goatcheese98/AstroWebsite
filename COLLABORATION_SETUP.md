# Real-Time Collaboration Setup Guide

This guide explains how to set up and deploy the real-time collaborative canvas sharing feature using PartyKit.

## Overview

The collaboration feature allows multiple users to edit the same canvas in real-time. It uses:
- **Excalidraw's native collaboration support** - Built-in real-time sync
- **PartyKit** - Managed multiplayer backend (now free after Cloudflare acquisition)
- **WebSocket** - For instant bidirectional communication

## What Gets Synced?

✅ **Synced across all users:**
- Drawing elements (shapes, arrows, drawings)
- Markdown notes
- Generated images

🔒 **Local only (per user):**
- AI chat messages (private conversations)
- AI provider selection (Claude vs Kimi)
- Canvas view position and zoom

## Setup Instructions

### Step 1: Deploy PartyKit Server

The PartyKit server code is already written in `/partykit/server.ts`. To deploy it:

1. **Login to PartyKit** (first time only):
   ```bash
   npx partykit login
   ```

   This will open a browser window to authenticate with GitHub.

2. **Deploy the server**:
   ```bash
   npx partykit deploy
   ```

   This will:
   - Build your PartyKit server
   - Deploy it to Cloudflare's edge network
   - Give you a WebSocket URL like: `wss://astroweb-excalidraw.YOURUSERNAME.partykit.dev`

3. **Save the URL**:
   - Copy the WebSocket host from the deployment output
   - Add it to your `.env` file:
     ```
     PUBLIC_PARTYKIT_HOST=astroweb-excalidraw.YOURUSERNAME.partykit.dev
     ```
   - **Important**: Don't include `wss://` or `https://` - just the hostname

### Step 2: Test the Deployment

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Open the main canvas** at `http://localhost:4321/`

3. **Click the Share button** (purple icon in the right sidebar)

4. **Copy the share URL** and open it in:
   - Another browser tab
   - A different browser (Chrome, Firefox, Safari)
   - An incognito/private window

5. **Test real-time sync**:
   - Draw on one canvas → see it appear instantly on the other
   - Add a markdown note → see it sync
   - Generate an image → see it in both galleries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User A Browser                                             │
│  ┌──────────────────────────────────────┐                  │
│  │ ExcalidrawCanvas                      │                  │
│  │ - isSharedMode={true}                 │                  │
│  │ - shareRoomId="abc123"                │                  │
│  └──────────────┬───────────────────────┘                  │
│                 │ WebSocket (wss://)                        │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  PartyKit Server   │
         │  (Cloudflare)      │
         │  - Broadcasts msgs │
         │  - Stores state    │
         └────────┬───────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ User B  │ │ User C  │ │ User D  │
└─────────┘ └─────────┘ └─────────┘
```

## File Structure

```
AstroWeb/
├── partykit/
│   └── server.ts                    # PartyKit server (Party class)
├── partykit.json                    # PartyKit configuration
├── src/
│   ├── components/
│   │   └── islands/
│   │       ├── ExcalidrawCanvas.tsx # Extended with WebSocket sync
│   │       ├── ShareModal.tsx       # Share UI component
│   │       ├── CanvasControls.tsx   # Added Share button
│   │       └── CanvasApp.tsx        # Wired Share modal
│   └── pages/
│       └── share/
│           └── [roomId].astro       # Public share route
└── .env.example                     # Environment variable template
```

## How It Works

### Creating a Share

1. User clicks "Share" button
2. `ShareModal` generates unique room ID (10 characters)
3. Modal displays shareable URL: `https://yourdomain.com/share/abc123`
4. User copies and shares the link

### Joining a Share

1. User opens share URL: `/share/abc123`
2. `ExcalidrawCanvas` renders with `isSharedMode={true}` and `shareRoomId="abc123"`
3. WebSocket connects to: `wss://your-partykit-host/parties/main/abc123`
4. PartyKit sends initial state to new user
5. All changes broadcast in real-time

### Data Flow

1. **User draws/edits** → `ExcalidrawCanvas.onChange()` fires
2. **Throttled sync** → Send update to PartyKit (max 10/sec)
3. **PartyKit broadcasts** → All other users receive update
4. **Update applied** → `excalidrawAPI.updateScene()` updates canvas

## Troubleshooting

### WebSocket Connection Failed

**Problem**: Console shows "WebSocket error" or "Failed to connect"

**Solutions**:
1. Check that `PUBLIC_PARTYKIT_HOST` is set correctly in `.env`
2. Verify PartyKit deployment is active:
   ```bash
   npx partykit list
   ```
3. Check browser console for CORS or network errors
4. Try redeploying:
   ```bash
   npx partykit deploy
   ```

### Changes Not Syncing

**Problem**: Drawing on one canvas doesn't appear on others

**Solutions**:
1. Check that both users are in the same room (same room ID in URL)
2. Look for errors in browser console
3. Verify WebSocket is connected (look for banner showing "Live collaboration • X users online")
4. Check that throttling isn't too aggressive (100ms default in code)

### "Connecting..." Never Completes

**Problem**: Banner shows "Connecting..." forever

**Solutions**:
1. PartyKit server might not be deployed - run `npx partykit deploy`
2. Check `.env` for correct `PUBLIC_PARTYKIT_HOST`
3. Verify firewall/network allows WebSocket connections
4. Try in incognito mode (browser extensions might block)

## Cost & Limits

### PartyKit Pricing (Post-Cloudflare Acquisition)

- **Free tier**: Generous limits for development and small projects
- **Costs**: Only pay for underlying Cloudflare resources (Durable Objects)
- **Typical usage**: For most use cases, this will be **essentially free**

### Performance

- **Latency**: < 100ms for updates (edge network)
- **Concurrent users**: Supports 100+ users per room
- **Persistence**: State stored in Durable Objects (never expires)

## Security Considerations

⚠️ **Important**: This implementation is for **public collaboration** with no authentication.

### Current Security Model

- ✅ Anyone with link can view and edit
- ❌ No ownership or permissions
- ❌ No authentication required
- ❌ Rooms never expire

### For Production Use

Consider adding:
1. **Authentication**: Require login to create/join rooms
2. **Permissions**: Owner can set view-only or edit access
3. **Expiration**: Auto-delete rooms after X days
4. **Rate limiting**: Prevent spam/abuse
5. **Room passwords**: Optional password protection

## Advanced Configuration

### Throttling Updates

In `ExcalidrawCanvas.tsx`, adjust sync frequency:

```typescript
const SYNC_THROTTLE_MS = 100; // Default: 100ms (10 updates/sec)
```

Lower = more responsive but higher bandwidth
Higher = less responsive but lower bandwidth

### Custom PartyKit Server Logic

Edit `/partykit/server.ts` to add:
- Authentication checks
- Rate limiting
- Custom event types
- Data validation
- Logging/analytics

### Environment Variables

```bash
# Required
PUBLIC_PARTYKIT_HOST=astroweb-excalidraw.yourusername.partykit.dev

# Optional (future enhancements)
PUBLIC_MAX_ROOM_USERS=50
PUBLIC_ROOM_EXPIRY_DAYS=30
```

## Development vs Production

### Development

- Use `npm run dev` and test locally
- PartyKit server deployed to edge network
- WebSocket works across localhost and deployed server

### Production

1. Deploy your Astro app to production
2. Update `PUBLIC_PARTYKIT_HOST` in production environment
3. Test with production URLs
4. Monitor PartyKit dashboard for usage

## Monitoring & Debugging

### Browser Console Logs

The implementation includes detailed logging:

```javascript
// Connection events
✅ Connected to shared room: abc123
🔌 Disconnected from shared room

// Sync events
📥 Received message: canvas-update
🔄 Applying canvas update from collaborator
📝 Applying markdown update from collaborator

// User events
👋 User joined: user-xyz
👋 User left: user-xyz
```

### PartyKit Dashboard

View real-time metrics:
1. Go to [partykit.io](https://partykit.io)
2. Login with GitHub
3. View active connections, rooms, and usage

## Next Steps (Future Enhancements)

1. **User Avatars**: Show who's actively editing
2. **Cursors**: Real-time cursor positions
3. **Chat**: Text chat alongside canvas
4. **Permissions**: Password protection, view-only mode
5. **Expiration**: Optional time-limited shares
6. **Analytics**: Track popular shared canvases
7. **Export**: Save shared canvas to personal library

## Support

For issues or questions:
- Check browser console for errors
- Review PartyKit logs in dashboard
- Verify environment variables are set
- Test with simple canvas (few elements)

## Resources

- [PartyKit Documentation](https://docs.partykit.io/)
- [Excalidraw Collaboration Docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
