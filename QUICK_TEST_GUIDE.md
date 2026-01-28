# Quick Test Guide - Markdown Notes Improvements

## 🚀 Quick Start

```bash
# Server should already be running at:
http://localhost:4321/ai-canvas
```

---

## ✅ Test 1: Visual Polish (30 seconds)

1. Click **"+ Add Note"** button
2. Observe the note appearance

**Expected Results**:

- ✨ Smooth fade-in animation
- 🎨 Semi-transparent background with blur effect
- 📝 "Markdown" badge in top-left corner
- 💎 Professional shadows and rounded corners
- 📚 Well-formatted default content with:
  - Clear heading hierarchy
  - Bulleted list
  - Code block with syntax highlighting

**Before vs After**:

- Before: Plain white box, basic text
- After: Glass-morphism effect, rich typography

---

## ✅ Test 2: Copy Button (1 minute)

1. Create a note (or use the default one)
2. Scroll to the code block
3. Hover over the code block

**Expected Results**:

- 📋 Copy button appears in top-right corner
- 👆 Click the button
- ✅ Button shows "Copied!" with checkmark
- 📝 Paste (Cmd+V) confirms code was copied

**Visual Check**:

- Button has subtle background
- Hover makes it more visible
- Icon changes from clipboard to checkmark

---

## ✅ Test 3: Two-Finger Scrolling Fix (1 minute)

1. Create a markdown note in the center of canvas
2. Position your cursor directly over the note
3. Use two-finger scroll (trackpad) OR middle-mouse drag

**Expected Results**:

- ✅ Canvas pans smoothly
- 🚫 Note does NOT block navigation
- 🎯 Note becomes "transparent" to mouse during pan
- ⚡ Re-activates after you stop panning

**Before vs After**:

- Before: Canvas stops when cursor over note
- After: Canvas pans smoothly regardless of cursor position

---

## ✅ Test 4: Markdown Formatting (2 minutes)

1. Create a new note
2. Edit with this content:

```markdown
# Heading 1
## Heading 2
### Heading 3

Regular paragraph with **bold** and *italic* text.

## Lists
- Item 1
- Item 2
  - Nested item

## Task List
My bad, did you ask if this is actually working correctly

## Code
Inline `code` looks good.

```typescript
// Block code with syntax highlighting
const greeting: string = "Hello World";
console.log(greeting);
```

## Table

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |

## Quote
>
> This is a blockquote with proper styling.

---

[Visit Link](https://example.com)

```

**Expected Results**:
- ✅ Proper spacing between all elements
- ✅ Headings decrease in size (H1 > H2 > H3)
- ✅ Lists have proper indentation
- ✅ Checkboxes render correctly
- ✅ Code block has syntax highlighting + copy button
- ✅ Table has borders and styling
- ✅ Blockquote has left border and indentation
- ✅ Horizontal rule is visible
- ✅ Link is blue with underline

---

## ✅ Test 5: Dark Mode (30 seconds)

1. Toggle to dark theme (theme switcher in nav)
2. Look at markdown notes

**Expected Results**:
- 🌙 Background changes to dark with blur
- 💜 Borders update to lighter colors
- 📝 Text remains readable
- 🎨 Code syntax highlighting switches to dark theme
- 📋 Copy button adapts to dark colors
- ✨ Scrollbar changes to light color

---

## ✅ Test 6: Interactions (1 minute)

1. **Hover Test**:
   - Hover over note → Shadow increases, badge appears

2. **Selection Test**:
   - Click note → Purple border, stronger shadow

3. **Editing Test**:
   - Double-click → Blue border, glowing shadow
   - Type some text
   - Press ESC → Exits edit mode, content saved

4. **Rotation Test**:
   - Hover over note → Blue rotation handle at top
   - Drag to rotate
   - Observe styling remains intact

**Expected Results**:
- All transitions are smooth (0.2-0.3s)
- Visual feedback is clear
- No jank or lag

---

## ✅ Test 7: Edge Cases (1 minute)

### Long Content
1. Create note with 50+ lines of text
2. Scroll within note

**Expected**:
- Custom scrollbar appears
- Smooth scrolling
- No performance issues

### Long Code Lines
1. Create note with very long code line:
```javascript
const veryLongVariableName = "This is a very long string that will extend beyond the width of the code block to test horizontal scrolling";
```

**Expected**:

- Horizontal scrollbar appears
- Code remains syntax-highlighted
- Copy button still visible

### Empty Note

1. Delete all content from a note
2. Save (ESC)

**Expected**:

- Shows placeholder: "# Empty Note..."
- Guides user to double-click

---

## ✅ Test 8: Export with Markdown (1 minute)

1. Create canvas with markdown notes + shapes
2. Click **PNG** export button

**Expected Results**:

- ✅ Downloads PNG file
- ✅ Toast: "✓ PNG downloaded with notes"
- ✅ Open image: markdown notes are rendered
- ✅ Notes positioned correctly
- ✅ High quality (2x scale)

---

## 🐛 Known Issues to Watch For

1. **TypeScript Error**: Pre-existing error in ExcalidrawCanvas line 238 (not related to our changes)
2. **Safari Clipboard**: May require HTTPS for clipboard API
3. **Firefox Scrollbar**: Uses default scrollbar (custom webkit only)

---

## 📊 Performance Check

Open DevTools → Performance tab:

- FPS should stay 60+ during pan
- No memory leaks when creating/deleting notes
- Smooth animations

---

## 🎨 Visual Checklist

- [ ] Glass-morphism effect (semi-transparent blur)
- [ ] Professional shadows (layered, subtle)
- [ ] Smooth animations (fade-in, hover, transitions)
- [ ] Theme-aware colors (light/dark)
- [ ] Copy button on code blocks
- [ ] Note type badge ("📝 Markdown")
- [ ] Custom scrollbar styling
- [ ] Proper typography hierarchy
- [ ] Task list checkboxes
- [ ] Syntax-highlighted code
- [ ] Styled tables with borders
- [ ] Blockquotes with left border
- [ ] Blue links with hover effect

---

## 🚀 Quick AI Test

In chat, try:

```
"Add a markdown note with these tasks:
- Design homepage
- Implement auth
- Write tests"
```

**Expected**:

- Note created with task list
- Checkboxes render correctly
- Positioned intelligently on canvas

---

## ✨ Success Criteria

All tests should pass with:

- ✅ No console errors
- ✅ Smooth 60fps performance
- ✅ Professional appearance
- ✅ Intuitive interactions
- ✅ Two-finger scroll works
- ✅ Copy button functions
- ✅ Export includes markdown

---

## 📝 Test Results Template

```
Date: ___________
Browser: ___________

Test 1 - Visual Polish:        [ PASS / FAIL ]
Test 2 - Copy Button:          [ PASS / FAIL ]
Test 3 - Two-Finger Scroll:    [ PASS / FAIL ]
Test 4 - Markdown Formatting:  [ PASS / FAIL ]
Test 5 - Dark Mode:            [ PASS / FAIL ]
Test 6 - Interactions:         [ PASS / FAIL ]
Test 7 - Edge Cases:           [ PASS / FAIL ]
Test 8 - Export:               [ PASS / FAIL ]

Overall: [ PASS / FAIL ]

Notes:
_______________________________________
_______________________________________
```

---

## 🎯 Priority Tests

If time is limited, test these first:

1. **Two-Finger Scroll** (Test 3) - Critical UX fix
2. **Copy Button** (Test 2) - New feature
3. **Visual Polish** (Test 1) - Overall impression
4. **Export** (Test 8) - Verify no regression

---

## 📚 For More Details

- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **QoL Improvements**: See `MARKDOWN_QOL_IMPROVEMENTS.md`
- **Full Testing Guide**: See `TESTING_GUIDE.md`

---

Enjoy the improved markdown notes! 🎉
