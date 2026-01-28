# Testing Guide for Markdown Notes Implementation

## Quick Start
1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:4321/ai-canvas`
3. Follow test scenarios below

---

## Test Scenario 1: Manual Markdown Note Creation

### Steps
1. Click the **"+ Add Note"** button in the top-right corner
2. A new markdown note should appear in the center of the viewport
3. Double-click the note to enter edit mode
4. Type some markdown content:
   ```markdown
   # Test Note

   ## Features
   - Bold text: **bold**
   - Italic text: *italic*
   - Code: `inline code`

   ## Code Block
   ```typescript
   const greeting = "Hello World";
   console.log(greeting);
   ```
   ```
5. Press ESC or click outside to save

### Expected Results
- [ ] Note appears with default styling
- [ ] Double-click enters edit mode (shows textarea)
- [ ] Content is editable
- [ ] ESC exits edit mode
- [ ] Markdown is rendered correctly in view mode
- [ ] Code block has syntax highlighting

---

## Test Scenario 2: Note Interactions

### Dragging
1. Create a note
2. Click and hold on the note center
3. Move mouse 10+ pixels
4. Note should follow cursor

### Expected Results
- [ ] Note is draggable
- [ ] Small movement threshold prevents accidental drags
- [ ] Content scrolling still works

### Resizing
1. Hover over a note
2. Resize handles appear (8 total: 4 corners, 4 edges)
3. Click and drag a corner handle
4. Note resizes proportionally

### Expected Results
- [ ] 4 corner handles always visible on hover
- [ ] 4 edge handles appear when mouse near edges
- [ ] Resizing works in all directions
- [ ] Minimum size enforced (100x80)

### Rotating
1. Hover over a note
2. Blue rotation handle appears at top center
3. Click and drag to rotate

### Expected Results
- [ ] Rotation handle visible on hover
- [ ] Note rotates around center
- [ ] Rotation is smooth

### Selection & Deletion
1. Click a note to select it (border changes to purple)
2. Press DELETE or BACKSPACE key
3. Note is deleted

### Expected Results
- [ ] Click selects note (purple border)
- [ ] ESC deselects note
- [ ] Click outside deselects note
- [ ] DELETE/BACKSPACE removes note

---

## Test Scenario 3: Export Functionality

### PNG Export Without Markdown
1. Draw some Excalidraw shapes (rectangles, circles, etc.)
2. Click the **PNG** export button
3. Image downloads

### Expected Results
- [ ] PNG downloads successfully
- [ ] Filename format: `canvas-{timestamp}.png`
- [ ] Toast message: "✓ PNG downloaded"

### PNG Export With Markdown
1. Add a markdown note with content
2. Add some Excalidraw shapes
3. Click the **PNG** export button
4. Open downloaded image

### Expected Results
- [ ] PNG downloads successfully
- [ ] Toast message: "✓ PNG downloaded with notes"
- [ ] Downloaded image includes rendered markdown note
- [ ] Note position matches canvas position
- [ ] Note rotation preserved in export
- [ ] High quality (2x scale)

### Clipboard Copy
1. Create canvas with markdown notes and shapes
2. Click the **Copy** button
3. Paste into an image editor or document

### Expected Results
- [ ] Toast message: "✓ Copied to clipboard"
- [ ] Pasted image includes markdown notes
- [ ] Quality matches PNG export

---

## Test Scenario 4: Syntax Highlighting

### Light Theme
1. Ensure light theme is active
2. Create markdown note with code block:
   ```markdown
   # Code Example

   ```typescript
   interface User {
     id: string;
     name: string;
   }
   ```
   ```
3. Exit edit mode

### Expected Results
- [ ] Code block has light syntax highlighting
- [ ] TypeScript keywords highlighted (interface, string)
- [ ] Colors match light theme

### Dark Theme
1. Toggle to dark theme (theme switcher in nav)
2. Same note should update

### Expected Results
- [ ] Code block switches to dark syntax highlighting
- [ ] Colors readable on dark background
- [ ] Theme transition smooth

### Multiple Languages
Create notes with different languages:
```markdown
**JavaScript:**
```javascript
const x = 42;
```

**Python:**
```python
def hello():
    print("Hello")
```

**JSON:**
```json
{
  "name": "Test"
}
```
```

### Expected Results
- [ ] Each language highlighted correctly
- [ ] Different colors for different syntax elements
- [ ] Inline code not highlighted (remains monospace)

---

## Test Scenario 5: AI Integration

### Basic Markdown Creation
**Chat Input**: "Add a markdown note with project requirements"

### Expected Results
- [ ] AI responds with confirmation message
- [ ] JSON array with markdown note appears in response
- [ ] Note is created on canvas
- [ ] Content is relevant to request
- [ ] Position is intelligent (not overlapping)

### Code Snippet Creation
**Chat Input**: "Create a markdown note with a TypeScript React component example"

### Expected Results
- [ ] Note includes code block with TypeScript syntax
- [ ] Code is properly formatted
- [ ] Markdown structure correct (heading + code block)

### Spatial Awareness
1. Create some shapes on the left side of canvas
2. **Chat Input**: "Add a markdown note to the right with these items: Feature A, Feature B, Feature C"

### Expected Results
- [ ] Note placed to the right of existing shapes
- [ ] No overlap with existing elements
- [ ] Proper spacing (100px gap)
- [ ] Content matches requested list

### Combined Requests
**Chat Input**: "Create a flowchart with 3 steps and add a markdown note below explaining each step"

### Expected Results
- [ ] Both flowchart shapes AND markdown note created
- [ ] Note positioned below shapes
- [ ] Content explains the flowchart
- [ ] All elements properly formatted

---

## Test Scenario 6: Edge Cases

### Empty Canvas Export
1. Create blank canvas (no elements)
2. Click PNG export

### Expected Results
- [ ] Export succeeds (doesn't crash)
- [ ] Downloads image with canvas background
- [ ] Toast message appears

### Very Long Markdown Content
1. Create note with 50+ lines of text
2. Scroll within note
3. Export canvas

### Expected Results
- [ ] Content scrollable within note
- [ ] Export includes visible portion (or all content if configured)
- [ ] No performance issues

### Rotated Notes Export
1. Create markdown note
2. Rotate 45 degrees
3. Export as PNG

### Expected Results
- [ ] Exported image shows note at correct angle
- [ ] Content readable
- [ ] No clipping

### Multiple Notes Export
1. Create 5+ markdown notes on canvas
2. Various positions, sizes, rotations
3. Export as PNG

### Expected Results
- [ ] All notes included in export
- [ ] Positions and rotations correct
- [ ] No overlap or missing notes
- [ ] Export completes in reasonable time (<3 seconds)

---

## Test Scenario 7: Markdown Feature Support

### Test All Markdown Features
Create a comprehensive markdown note:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text* and ***bold italic***

- Unordered list
- Item 2
  - Nested item

1. Ordered list
2. Item 2
   1. Nested ordered

`inline code` in a sentence

```javascript
// Code block
const x = 42;
```

> Blockquote
> Multiple lines

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |

[Link text](https://example.com)

---

Horizontal rule above
```

### Expected Results
- [ ] All headings render with correct size/weight
- [ ] Bold, italic, and combined styles work
- [ ] Lists nested properly
- [ ] Inline code styled correctly
- [ ] Code block has syntax highlighting
- [ ] Blockquotes indented and styled
- [ ] Tables render with borders
- [ ] Links clickable and styled
- [ ] Horizontal rule visible

---

## Test Scenario 8: Performance Testing

### RAF Polling Performance
1. Create 10 markdown notes
2. Pan/zoom canvas rapidly
3. Drag elements around

### Expected Results
- [ ] No lag or stuttering
- [ ] Overlays follow smoothly (120fps)
- [ ] No console errors
- [ ] CPU usage reasonable (<50%)

### Export Performance
1. Create canvas with 5 markdown notes
2. Add 20 Excalidraw shapes
3. Export as PNG
4. Measure time

### Expected Results
- [ ] Export completes in <3 seconds
- [ ] No browser freezing
- [ ] Progress indication (if implemented)
- [ ] Memory usage reasonable

---

## Test Scenario 9: Browser Compatibility

### Chrome/Edge
Run all scenarios above

### Expected Results
- [ ] All features work
- [ ] Export works
- [ ] Clipboard works
- [ ] No console errors

### Firefox
Run all scenarios above

### Expected Results
- [ ] All features work
- [ ] Export works
- [ ] Clipboard works
- [ ] Minor CSS differences acceptable

### Safari
Run all scenarios above

### Expected Results
- [ ] All features work
- [ ] Export works
- [ ] Clipboard may require HTTPS (known limitation)
- [ ] Syntax highlighting works

---

## Test Scenario 10: Error Handling

### Export Failure Simulation
1. Open browser DevTools
2. Go to Network tab
3. Throttle to "Offline"
4. Try to export

### Expected Results
- [ ] Graceful error handling
- [ ] Toast message: "✗ Export failed"
- [ ] No crash
- [ ] Console error logged

### Invalid Markdown
1. Create note with malformed markdown
2. Special characters, unescaped HTML, etc.

### Expected Results
- [ ] No crash
- [ ] Invalid markdown rendered as plain text
- [ ] No XSS vulnerabilities
- [ ] Error boundary catches issues

---

## Regression Testing

### Verify Existing Features Still Work
- [ ] Excalidraw drawing tools work
- [ ] Pan/zoom works
- [ ] Standard PNG export (without markdown) works
- [ ] SVG export works
- [ ] AI chat for shapes works
- [ ] Theme toggle works
- [ ] Canvas state persists during session

---

## Automated Testing Commands

### TypeScript Type Check
```bash
npx tsc --noEmit
```
**Expected**: No errors in modified files

### Build Test
```bash
npm run build
```
**Expected**: Successful build, no errors

### Dev Server
```bash
npm run dev
```
**Expected**: Server starts on port 4321

---

## Bug Report Template

If you find issues, report them with this format:

```markdown
## Bug Report

**What were you doing?**
[Describe the steps]

**What did you expect?**
[Expected behavior]

**What actually happened?**
[Actual behavior]

**Screenshots/Videos:**
[Attach if helpful]

**Browser:**
[Chrome 120, Firefox 115, etc.]

**Console Errors:**
[Copy any errors from DevTools console]
```

---

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ Smooth performance (60fps+)
- ✅ Exports include markdown notes
- ✅ AI creates markdown notes correctly
- ✅ Syntax highlighting works
- ✅ All markdown features render
- ✅ No regression in existing features

---

## Known Issues & Workarounds

### Issue: Safari Clipboard Requires HTTPS
**Workaround**: Use PNG download instead, or test on localhost with HTTPS

### Issue: Very Large Notes May Export Slowly
**Workaround**: Use pagination or split into multiple notes

### Issue: SVG Export Doesn't Include Markdown
**Status**: Not implemented (future enhancement)
**Workaround**: Use PNG export

---

## Next Steps After Testing

1. **If All Tests Pass**: Ready for production deployment
2. **If Minor Issues Found**: Create bug reports and fix
3. **If Major Issues Found**: Revisit implementation
4. **If Feature Gaps**: Plan Phase 4 (Persistence) and Phase 5 (Enhanced Editing)

---

## Contact

Questions or issues during testing? Check:
- Implementation Summary: `/IMPLEMENTATION_SUMMARY.md`
- Original Plan: See plan mode transcript
- Code Documentation: Inline comments in modified files
