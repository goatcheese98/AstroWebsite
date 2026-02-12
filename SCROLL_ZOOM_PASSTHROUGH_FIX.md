# Scroll/Zoom Pass-Through Fix (Complete)

## Problem

When Markdown notes or Web embeds were selected (showing purple/blue outline), hovering over them would block scroll wheel and pinch-to-zoom gestures from affecting the canvas. Users expected to be able to pan and zoom the canvas even when hovering over selected overlays.

## Root Causes Identified

### Issue #1: Wheel Event Interception

MarkdownNote had a `handleGlobalWheel` function that called `e.stopPropagation()` on wheel events when the note was selected, explicitly blocking canvas zoom/pan.

### Issue #2: Pointer-Events CSS

Both components had `pointer-events: auto` set on content areas when selected/hovered, which prevented ALL mouse events (including scroll/zoom) from reaching the underlying canvas.

## Solution

### Phase 1: Remove Wheel Event Blocking

Removed the `handleGlobalWheel` event listener from MarkdownNote that was intercepting scroll events.

### Phase 2: Fix Pointer-Events Configuration  

Changed the CSS `pointer-events` strategy for both components:

**Before:**

- Content area: `pointer-events: auto` when selected → ❌ Blocks scroll/zoom
- Header bar: `pointer-events: auto` → Works for clicks
- Iframe (WebEmbed): `pointer-events: auto` when selected → ❌ Blocks scroll/zoom

**After:**

- Content area: `pointer-events: none` always → ✅ Pass-through scroll/zoom
- Header bar: `pointer-events: auto` → Works for clicks/drag  
- Iframe (WebEmbed): `pointer-events: none` always → ✅ Pass-through scroll/zoom

## Changes Made

### MarkdownNote.tsx

1. **Removed wheel event interception** (lines 253-270)
2. **Simplified pointer-events**: Changed from conditional `isEditing ? 'auto' : (isSelected && isHovered ? 'auto' : 'none')` to simply `isEditing ? 'auto' : 'none'`

### WebEmbed.tsx

1. **Disabled contentStyle pointer-events**: Changed from `isSelected ? 'auto' : 'none'` to `'none'`
2. **Disabled content area pointer-events**: Changed from `isSelected ? 'auto' : 'none'` to `'none'`
3. **Disabled iframe pointer-events**: Changed from `isSelected ? 'auto' : 'none'` to `'none'`

## New Behavior

### MarkdownNote

✅ **Scroll wheel over note (selected or not)** → Zooms canvas  
✅ **Pinch-to-zoom over note** → Zooms canvas  
✅ **Trackpad pan over note** → Pans canvas  
✅ **Double-click note** → Enters edit mode  
✅ **Scroll when editing** → Scrolls note content  
✅ **Click/drag** → Selects/moves note (via Excalidraw's event handling)

### WebEmbed

✅ **Scroll wheel over embed (selected or not)** → Zooms canvas  
✅ **Pinch-to-zoom over embed** → Zooms canvas  
✅ **Trackpad pan over embed** → Pans canvas  
✅ **Drag header bar** → Moves embed  
✅ **Click buttons** → Close/Refresh/Edit URL  
✅ **Click "Open in New Tab"** → Opens site for full interaction

### Trade-off: WebEmbed Interaction

The iframe is now **non-interactive** (scroll/zoom always affects canvas). To interact with the embedded website, users must click the "Open in New Tab" button. This trade-off prioritizes canvas navigation fluidity over inline iframe interaction.

## Testing

1. Create a Markdown note
2. Click to select it (purple outline appears)  
3. Hover directly over the note
4. **Scroll wheel** → Canvas should zoom ✅
5. **Trackpad pinch** → Canvas should zoom ✅
6. **Trackpad pan** → Canvas should pan ✅

Repeat for Web embed with blue outline. All gestures should now affect the canvas naturally.
