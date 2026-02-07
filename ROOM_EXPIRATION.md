# Room Expiration - 90 Day Inactivity Policy

## Overview

Collaborative canvas rooms now automatically expire after **90 days of inactivity** to prevent storage bloat and manage costs.

---

## How It Works

### Activity Tracking

**Last Activity is updated when:**
- ✅ User connects to the room
- ✅ Canvas elements are updated (drawing, dragging, etc.)
- ✅ Markdown notes are edited
- ✅ Images are generated

**Last Activity is NOT updated when:**
- ❌ Just viewing the room (connect counts as activity though)
- ❌ WebSocket messages that don't modify state

### Expiration Logic

```
Room created: Jan 1, 2026
Last activity: Jan 15, 2026

User visits: May 1, 2026 (106 days later)
  ↓
Check: 106 days > 90 days? ✓ Expired!
  ↓
Action:
  1. Delete room state from storage
  2. Show notification to user
  3. User starts with blank canvas
```

---

## Implementation Details

### PartyKit Server (`partykit/server.ts`)

**Constants:**
```typescript
const EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
```

**State Structure:**
```typescript
interface SharedState {
  elements: any[];
  appState: any;
  files: any;
  markdownNotes: any[];
  imageHistory: any[];
  lastActivity: number;    // ← New: Timestamp of last activity
  createdAt: number;       // ← New: Room creation timestamp
}
```

**On Connect:**
```typescript
async onConnect() {
  let state = await this.room.storage.get("canvasState");

  // Check expiration
  if (state && state.lastActivity) {
    const inactiveTime = Date.now() - state.lastActivity;
    if (inactiveTime > EXPIRATION_MS) {
      // Delete expired room
      await this.room.storage.delete("canvasState");
      state = null;

      // Notify user
      conn.send(encode({
        type: "room-expired",
        message: "This room expired after 90 days of inactivity",
        inactiveDays: Math.floor(inactiveTime / (24 * 60 * 60 * 1000))
      }));
    }
  }

  // Update last activity
  if (state) {
    state.lastActivity = Date.now();
    await this.room.storage.put("canvasState", state);
  }
}
```

**On Message:**
```typescript
async onMessage() {
  const now = Date.now();

  // Update timestamps on every change
  await this.room.storage.put("canvasState", {
    ...currentState,
    elements: data.elements,
    lastActivity: now,
    createdAt: currentState.createdAt || now,
  });
}
```

### Client (`ExcalidrawCanvas.tsx`)

**Handle Expiration:**
```typescript
} else if (data.type === "room-expired") {
  console.log("⏰ Room expired:", data.message);
  alert(`⏰ ${data.message}\n\nThis room was inactive for ${data.inactiveDays} days and has been cleared.`);
}
```

---

## User Experience

### Scenario 1: Room Still Active

```
User A creates room: March 1, 2026
User B collaborates: March 15, 2026
User A visits again: May 1, 2026 (47 days later)

Result: ✅ Room loads normally (< 90 days)
```

### Scenario 2: Room Expired

```
User A creates room: January 1, 2026
User B collaborates: January 5, 2026
Nobody visits for 90 days...
User C visits: May 15, 2026 (130 days later)

Result:
  1. ⏰ Alert: "This room expired after 90 days of inactivity"
  2. 🗑️ Canvas is blank (state deleted)
  3. ✅ Can start collaborating fresh
```

### Scenario 3: Keep Alive by Visiting

```
User A creates room: January 1, 2026
User A visits every month: Jan, Feb, Mar, Apr...

Result: ✅ Room never expires (activity resets the clock)
```

---

## Storage Lifecycle

### Before Expiration

```
Room: RxebDQUKE2
Storage:
  ├─ canvasState
  │   ├─ elements: [...]
  │   ├─ appState: {...}
  │   ├─ files: {...}
  │   ├─ lastActivity: 1704067200000
  │   └─ createdAt: 1704067200000
  └─ Size: ~100 KB
```

### After Expiration

```
Room: RxebDQUKE2
Storage:
  └─ (empty)
Size: 0 KB
```

---

## Cost Impact

### Storage Costs

**Before (No Expiration):**
- 10,000 rooms created
- Average 100 KB each
- Total: 1 GB storage
- Cost: Free (within Cloudflare free tier)

**After (90-Day Expiration):**
- 10,000 rooms created
- ~30% expire (abandoned)
- Active rooms: 7,000
- Total: ~700 MB storage
- Cost: Free
- **Savings:** 30% storage reduction

### Cost Comparison

| Scenario | Rooms | Storage | Monthly Cost |
|----------|-------|---------|--------------|
| No expiration | 100K | 10 GB | ~$2 |
| 90-day expiration | 100K (70K active) | 7 GB | ~$1.40 |
| **Savings** | - | 30% | **$0.60/mo** |

For most users: **Still free** (Cloudflare's 1GB free tier)

---

## Edge Cases

### What if user is actively using the room when it expires?

**Answer:** They won't see expiration!
- Expiration check only happens on **new connects**
- If users are already connected and collaborating, they can continue
- State is saved normally
- `lastActivity` is updated → room no longer expired

### What if room has valuable work and expires?

**Answer:** It's gone (by design)
- This is intentional cleanup
- Users should save important work using the "Save" button (exports .rj file)
- Expiration notification suggests this

**Recommendation:** Add a warning in the UI:
```
⚠️ Shared rooms expire after 90 days of inactivity.
Save your work using the "Save" button to keep it permanently.
```

### Can users extend expiration?

**Answer:** Yes, automatically!
- Just visit the room → resets `lastActivity`
- Draw anything → resets `lastActivity`
- Expiration clock resets to 0

---

## Monitoring & Debugging

### Server Logs

When room expires:
```
[RxebDQUKE2] Room expired after 130 days of inactivity
```

### Client Logs

```javascript
// Normal connect
📥 Received message: init
📂 Loading initial shared state

// Expired room
📥 Received message: room-expired
⏰ Room expired: This room expired after 90 days of inactivity
```

### Console Commands (for debugging)

**Check room age:**
```javascript
// In browser console
const state = await fetch('/api/room-info/RxebDQUKE2').then(r => r.json());
console.log('Last activity:', new Date(state.lastActivity));
console.log('Days inactive:', (Date.now() - state.lastActivity) / (24*60*60*1000));
```

**Manually set expiration (testing):**
```typescript
// In PartyKit server (temporarily)
const EXPIRATION_MS = 60 * 1000; // 1 minute (for testing)
```

---

## Future Enhancements (Optional)

### 1. Warning Before Expiration

Send email/notification 7 days before expiration:
```
Subject: Your canvas room will expire soon

Your room "RxebDQUKE2" will expire in 7 days due to inactivity.
Visit the room to keep it active, or save your work.
```

### 2. Graduated Expiration

Different expiration based on usage:
```typescript
const EXPIRATION_TIERS = {
  light: 30 * 24 * 60 * 60 * 1000,   // 30 days (< 10 elements)
  normal: 90 * 24 * 60 * 60 * 1000,  // 90 days (10-100 elements)
  heavy: 180 * 24 * 60 * 60 * 1000,  // 180 days (> 100 elements)
};
```

### 3. User-Controlled Expiration

Let users set their own expiration:
```
Expiration options:
○ 30 days
● 90 days (recommended)
○ 180 days
○ Never (requires account)
```

### 4. Soft Delete (Recycle Bin)

Instead of immediate deletion:
```typescript
// Mark as deleted, actually delete after 30 more days
state.softDeletedAt = Date.now();

// Can restore within 30 days
if (Date.now() - state.softDeletedAt > 30 * 24 * 60 * 60 * 1000) {
  await this.room.storage.delete("canvasState");
}
```

---

## Configuration

### Change Expiration Duration

**In `partykit/server.ts`:**
```typescript
// Change from 90 to 60 days
const EXPIRATION_MS = 60 * 24 * 60 * 60 * 1000;

// Change to 1 year
const EXPIRATION_MS = 365 * 24 * 60 * 60 * 1000;

// Disable expiration
const EXPIRATION_MS = Infinity;
```

**Then redeploy:**
```bash
npx partykit deploy
```

---

## Testing

### Test Expired Room

**1. Create test room with old timestamp:**
```typescript
// In PartyKit server
await this.room.storage.put("canvasState", {
  elements: [/* ... */],
  lastActivity: Date.now() - (100 * 24 * 60 * 60 * 1000), // 100 days ago
  createdAt: Date.now() - (110 * 24 * 60 * 60 * 1000),
});
```

**2. Connect to room:**
```
Visit: https://canvas.rohanjasani.com/share/TEST123
Expected: Alert showing room expired
```

**3. Verify deletion:**
```
Canvas should be blank
Storage should be cleared
```

---

## Summary

✅ **Implemented:**
- 90-day inactivity expiration
- Automatic cleanup
- User notification
- Activity tracking

✅ **Benefits:**
- Prevents storage bloat
- Reduces costs
- Cleans up abandoned rooms
- Keeps active rooms indefinitely

✅ **User-Friendly:**
- Visiting room extends expiration
- Clear notification when expired
- Can start fresh immediately

---

**Last Updated:** 2026-02-06
**Status:** ✅ Deployed
**PartyKit Server:** https://astroweb-excalidraw.goatcheese98.partykit.dev
