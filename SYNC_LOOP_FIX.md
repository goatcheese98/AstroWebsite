# Sync Loop & Missing Controls Fix

## Issues Fixed

### 1. Elements Disappearing (Sync Loop)

**Problem:**
- When drawing on a shared canvas, elements would appear then immediately disappear
- This was caused by a sync loop where:
  1. User draws element → onChange fires
  2. onChange sends update to PartyKit
  3. PartyKit broadcasts to all users
  4. Receiver applies update with `updateScene()`
  5. `updateScene()` triggers onChange again
  6. Goes back to step 2 (infinite loop)

**Solution:**
- Added `isApplyingRemoteUpdateRef` flag to track when we're applying remote updates
- When receiving updates from PartyKit, set flag to true
- In onChange handler, check flag before syncing
- Skip sync if flag is true (we're applying a remote update)
- Reset flag after update completes

**Code Changes:**
```typescript
// Added flag
const isApplyingRemoteUpdateRef = useRef<boolean>(false);

// Set flag when applying remote updates
ws.onmessage = (event) => {
  if (data.type === "canvas-update") {
    isApplyingRemoteUpdateRef.current = true;
    excalidrawAPI.updateScene({...});
    setTimeout(() => {
      isApplyingRemoteUpdateRef.current = false;
    }, 100);
  }
};

// Check flag before syncing
onChange={(elements, appState) => {
  if (isSharedMode && !isApplyingRemoteUpdateRef.current) {
    syncCanvasToPartyKit(elements, appState, files);
  }
}}
```

### 2. Missing Custom Controls

**Problem:**
- The share page (`/share/[roomId]`) was only rendering `ExcalidrawCanvas`
- Custom controls (AI Chat, Add Note, My Assets, Share buttons) were missing
- This made the shared canvas much less functional

**Solution:**
- Updated share page to match the structure of main canvas page
- Render both `ExcalidrawCanvas` and `CanvasApp` as siblings
- `CanvasApp` provides all the custom controls
- Only `ExcalidrawCanvas` has shared mode props

**Code Changes:**
```astro
<!-- Before (WRONG) -->
<ExcalidrawCanvas
  isSharedMode={true}
  shareRoomId={roomId}
/>

<!-- After (CORRECT) -->
<ExcalidrawCanvas
  isSharedMode={true}
  shareRoomId={roomId}
/>
<CanvasApp client:only="react" />
```

## How to Test

1. **Restart dev server**:
   ```bash
   npm run dev
   ```

2. **Open main canvas** at `localhost:4321/ai-canvas`

3. **Draw some elements** (rectangle, circle, etc.)

4. **Click "Share"** button

5. **Click "Start Collaborating"**
   - You'll be redirected to `/share/[roomId]`
   - All elements should be there
   - Controls should be visible on the right

6. **Open share URL in another tab**
   - Should see same elements
   - Banner shows "2 users online"

7. **Draw on one canvas**
   - Should appear instantly on the other
   - Element should NOT disappear
   - Both canvases stay in sync

8. **Test controls**
   - ✓ AI Chat button works
   - ✓ Add Note button works
   - ✓ My Assets button works
   - ✓ Menu button works

## Expected Behavior

### Drawing Elements
- Draw on Canvas A → appears on Canvas B instantly
- Draw on Canvas B → appears on Canvas A instantly
- Elements stay visible (don't disappear)
- No flickering or flashing

### Controls
- All buttons visible on right sidebar
- AI Chat opens/closes correctly
- Add Note creates markdown notes
- My Assets opens library
- Menu shows save/load/export options

### Sync Indicators
- Banner shows connection status
- User count updates when users join/leave
- "Auto-syncing" message displayed

## Troubleshooting

### Elements Still Disappearing

**Check console for:**
- "🔄 Applying canvas update from collaborator"
- Should NOT be followed by immediate sync back to PartyKit

**If you see sync loops:**
- Check that `isApplyingRemoteUpdateRef` is being set correctly
- Add more logging to track flag state

### Controls Still Missing

**Check that:**
- Both ExcalidrawCanvas and CanvasApp are rendered
- Share page matches structure of ai-canvas page
- No errors in console

**If controls missing:**
- Hard refresh (Cmd+Shift+R)
- Clear cache
- Check browser console for errors

### No Sync at All

**Check:**
- WebSocket connection established
- Console shows "✅ Connected to shared room"
- PartyKit URL in `.env` is correct
- Both users on same room ID

## Technical Details

### Sync Flow (After Fix)

```
User draws element
  ↓
onChange fires
  ↓
Check: isApplyingRemoteUpdateRef === false? ✓
  ↓
Send to PartyKit
  ↓
PartyKit broadcasts to other users (NOT sender)
  ↓
Other user receives update
  ↓
Set isApplyingRemoteUpdateRef = true
  ↓
Apply update with updateScene()
  ↓
onChange fires on receiving user
  ↓
Check: isApplyingRemoteUpdateRef === false? ✗
  ↓
Skip sync (prevents loop)
  ↓
Reset isApplyingRemoteUpdateRef = false
```

### Component Structure

```
Share Page (/share/[roomId])
  └─ BaseLayout
      └─ canvas-layout
          └─ canvas-container
              ├─ ExcalidrawCanvas (isSharedMode={true})
              │   └─ Handles WebSocket sync
              └─ CanvasApp
                  ├─ CanvasControls (buttons)
                  ├─ AIChatContainer
                  ├─ MyAssetsPanel
                  └─ ShareModal
```

## Files Modified

1. **ExcalidrawCanvas.tsx**
   - Added `isApplyingRemoteUpdateRef` flag
   - Updated WebSocket message handler to set flag
   - Updated onChange to check flag before syncing

2. **/share/[roomId].astro**
   - Changed to render both ExcalidrawCanvas and CanvasApp
   - Matches structure of ai-canvas page
   - Added proper styling

## Performance Notes

- Sync throttled to max 10 updates/second (100ms)
- Flag reset after 100ms timeout to prevent stale state
- No performance degradation from flag checks
- WebSocket broadcast excludes sender (server-side)

## Next Steps

After verifying the fix works:
1. Test with 3+ users simultaneously
2. Test rapid drawing (stress test)
3. Test with large canvases (100+ elements)
4. Monitor for any edge cases
5. Consider adding more sync telemetry

---

**Last Updated**: 2026-02-06 (after sync loop fix)
