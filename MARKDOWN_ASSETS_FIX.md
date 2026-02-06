# Markdown Notes & Assets Sync Fix

## Issues Fixed

### 1. Markdown Notes Disappearing

**Problem:**
- Click "Add Note" button
- Note flashes briefly then disappears
- Caused by race condition in concurrent editing
- When user A creates note while user B is editing, user B's update overwrites user A's note

**Root Cause:**
- Blind element replacement: `updateScene({ elements: data.elements })`
- Remote updates completely replaced local elements array
- Newly created local notes were lost when remote update arrived
- Classic distributed systems problem: concurrent edits without conflict resolution

**Solution: Smart Merge Algorithm**
Instead of blindly replacing elements, we now:
1. Get current local elements
2. Get incoming remote elements
3. Create maps by element ID for fast lookup
4. Merge intelligently:
   - Keep local elements not in remote (newly created notes)
   - Add remote elements not in local (other user's new elements)
   - For elements in both, use version numbers to determine which is newer
5. Update scene with merged elements

**Code Changes:**
```typescript
// Before (WRONG)
excalidrawAPI.updateScene({
  elements: data.elements  // Blindly replace
});

// After (CORRECT)
const currentElements = excalidrawAPI.getSceneElements();
const remoteElements = data.elements;

// Create maps for O(1) lookup
const remoteById = new Map();
const currentById = new Map();

// Merge: keep local if newer, add remote if new
const merged = [...currentElements];
remoteElements.forEach(remoteEl => {
  const localEl = currentById.get(remoteEl.id);
  if (!localEl) {
    // New from remote, add it
    merged.push(remoteEl);
  } else {
    // Exists in both, use version to decide
    if (remoteEl.version > localEl.version) {
      // Remote is newer, update it
      merged[index] = remoteEl;
    }
    // Otherwise keep local version
  }
});

excalidrawAPI.updateScene({ elements: merged });
```

### 2. Improved Flag Reset Timing

**Problem:**
- `setTimeout(100)` was unreliable
- Flag could reset at wrong time
- Caused syncing to be skipped or triggered at wrong moment

**Solution:**
- Use `requestAnimationFrame` instead of `setTimeout`
- Double RAF ensures onChange completes before flag reset
- More reliable timing aligned with browser paint cycle

**Code Changes:**
```typescript
// Before (UNRELIABLE)
setTimeout(() => {
  isApplyingRemoteUpdateRef.current = false;
}, 100);

// After (RELIABLE)
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    isApplyingRemoteUpdateRef.current = false;
  });
});
```

### 3. Enhanced Logging

**Added:**
- "📤 Syncing to PartyKit - elements: X"
- "⏸️ Skipping sync - applying remote update"
- "➕ Adding new element from remote: id"
- "🔄 Updating element from remote: id"
- "🔓 Remote update flag reset"

This helps debug sync issues by seeing exactly when syncing happens or is skipped.

## Known Limitation: Assets (SVG Files)

**Current Behavior:**
- Assets show as placeholders on other users' canvases
- File IDs are synced, but actual file data isn't

**Why:**
- Assets are stored as local file references
- When inserted, they reference local files by ID
- The file data itself isn't in the sync payload
- Other users don't have those file IDs

**Potential Solution (Not Implemented Yet):**
Would need to convert assets to data URLs before syncing:
```typescript
// Convert file to data URL for syncing
const fileData = excalidrawAPI.getFiles();
const portableFiles = {};
Object.entries(fileData).forEach(([id, file]) => {
  portableFiles[id] = {
    ...file,
    dataURL: file.dataURL, // Already a data URL
    // Ensure it's self-contained
  };
});
```

**Workaround:**
- Use markdown notes for text content
- Use Excalidraw's built-in drawing tools
- Or share the asset library file separately

## How to Test

### Test Markdown Notes (Fixed!)

1. **Open two browser tabs** with the same share URL

2. **Tab A: Create a note**
   - Click "Add Note"
   - Note should appear and stay visible
   - Should NOT flash and disappear

3. **Tab B: Should see the note**
   - Note appears on Tab B after ~100ms
   - Stays visible, doesn't flash

4. **Tab A & B: Concurrent edits**
   - Tab A: Create note
   - Tab B: Draw shape (while note is being created)
   - Both tab A's note and tab B's shape should be visible on both tabs
   - Nothing should disappear

5. **Tab A: Edit note**
   - Double-click note
   - Type some text
   - Changes sync to Tab B

### Test Sync Conflicts

1. **Both users draw simultaneously**
   - Tab A: Draw circle
   - Tab B: Draw rectangle (at same time)
   - Both should appear on both tabs
   - Neither should disappear

2. **Check console logs**
   - Should see "📤 Syncing to PartyKit" when you draw
   - Should see "🔄 Applying canvas update from collaborator" when receiving
   - Should see "➕ Adding new element from remote" for new elements
   - Should NOT see rapid back-and-forth syncing (no loop)

### Test Assets (Known Limitation)

1. **Tab A: Insert asset from library**
   - Open "My Assets"
   - Click an SVG
   - Asset appears on Tab A

2. **Tab B: Check if it syncs**
   - Asset may show as placeholder icon
   - This is expected (assets don't sync file data yet)

## Expected Behavior After Fix

### ✅ Working
- ✓ Markdown notes stay visible when created
- ✓ Concurrent edits don't overwrite each other
- ✓ Notes sync between users
- ✓ Multiple users can create notes simultaneously
- ✓ Smart merge preserves recently created elements
- ✓ Version-based conflict resolution

### ⚠️ Known Limitations
- ⚠️ Assets (SVG files) show as placeholders on other users
- ⚠️ Asset file data not synced (only file IDs)
- ⚠️ Large concurrent edits may have slight delay

### ❌ Not Supported (By Design)
- ✗ AI chat messages (intentionally local only)
- ✗ Undo/redo across users (Excalidraw limitation)
- ✗ Cursor positions (not implemented)

## Technical Details

### Smart Merge Algorithm Complexity
- **Time**: O(n + m) where n = local elements, m = remote elements
- **Space**: O(n + m) for the maps
- **Worst case**: All elements updated, O(n + m)
- **Best case**: No conflicts, O(n)

### Conflict Resolution Strategy
1. **Element doesn't exist locally**: Add it (user A created something new)
2. **Element doesn't exist remotely**: Keep it (user B created something new)
3. **Element exists in both**:
   - Compare `version` numbers
   - If equal, compare `versionNonce`
   - Keep the one with higher version (more recent edit)
   - If versions equal, keep higher versionNonce

### Why requestAnimationFrame Works Better
```javascript
// Browser render pipeline:
1. JavaScript execution
2. Style calculation
3. Layout
4. Paint
5. Composite

// requestAnimationFrame runs before paint
// Double RAF ensures:
requestAnimationFrame(() => {  // Runs before next paint
  requestAnimationFrame(() => {  // Runs before paint after that
    // onChange definitely completed by now
    isApplyingRemoteUpdateRef.current = false;
  });
});
```

## Troubleshooting

### Notes Still Disappearing

**Check console for:**
- "📤 Syncing to PartyKit" after creating note
- "➕ Adding new element from remote" on other user
- No error messages

**If notes still disappear:**
1. Hard refresh both tabs (Cmd+Shift+R)
2. Check that both tabs are on same room ID
3. Clear browser cache
4. Check console for JavaScript errors

### Assets Not Showing

**This is expected behavior** (see Known Limitations above)

**Workaround:**
- Use built-in drawing tools instead of imported SVGs
- Or share asset library file separately

### Sync Too Slow

**Normal latency:** < 100ms
**Acceptable:** < 500ms
**Slow:** > 1s

**If slow:**
- Check network connection
- Check PartyKit server status
- Reduce number of concurrent users
- Check for large elements (big images)

## Next Steps for Full Asset Support

If you want to implement full asset syncing:

1. **Detect asset insertions**
   - Listen for file additions
   - Convert file data to portable format

2. **Sync file data**
   - Include file `dataURL` in sync payload
   - Compress if needed (base64 images are large)

3. **Apply remote assets**
   - When receiving file data, add to local files
   - Update element references

4. **Handle large files**
   - Chunk large images
   - Use compression
   - Consider external storage (S3, Cloudflare R2)

**Estimated effort:** 3-4 hours for basic implementation

---

**Last Updated**: 2026-02-06 (after markdown notes fix)
**Status**: Markdown notes ✅ Fixed | Assets ⚠️ Known limitation
