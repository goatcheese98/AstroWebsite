# AI Chat with Element Selection - Implementation Guide

## ✅ What's Been Built

### New Components Created

```
src/components/ai-chat/
├── types.ts                    # TypeScript interfaces
├── useElementSelection.ts      # Element selection hook
├── AIChatContainer.tsx         # Main chat component
└── index.ts                    # Exports
```

---

## 🎯 Key Features

### 1. Element Selection System

**How it works:**
1. Click "Select elements" button in the chat panel
2. Click on any element in the canvas to select/deselect it
3. Selected elements appear as pills in the context panel
4. Send a message - the AI knows which elements you're referring to

**Code example:**
```typescript
const { 
    selectedElements,     // Array of selected element IDs
    isSelectionMode,      // Boolean - is selection active
    toggleElement,        // Toggle single element
    selectElements,       // Set multiple elements
    clearSelection,       // Clear all selections
    getSelectionContext   // Get formatted context string
} = useElementSelection({
    enabled: isChatOpen,
    onSelectionChange: (ids) => console.log("Selected:", ids)
});
```

### 2. Canvas Context Visualization

Shows in the chat panel:
- Total element count
- Selected element count
- Element type icons (▭ rectangle, ◇ diamond, etc.)
- Element text preview (truncated)
- Clear selection button

### 3. Quick Templates

Pre-built prompts accessible via the ⚡ Templates button:
- **UI Mockup** - Create wireframes
- **Flowchart** - Process diagrams
- **Architecture** - System design
- **Explain** - Explain selected elements

### 4. Modern UI/UX

- **Resizable panel** - Drag left edge
- **Backdrop blur** - Professional overlay
- **Smooth animations** - Slide in, fade effects
- **Loading states** - Spinner with "AI is thinking..."
- **Error handling** - Inline error messages
- **Keyboard shortcuts** - Enter to send, ESC to close

---

## 🚀 Usage

### Switching Between Old and New

The `CanvasApp.tsx` has both components ready:

```tsx
// Use NEW component with element selection
<AIChatContainer isOpen={isChatOpen} onClose={handleCloseChat} />

// Use ORIGINAL component (backup)
<AIChatPanel isOpen={isChatOpen} onClose={handleCloseChat} />
```

Simply uncomment the one you want to use.

### Using Element Selection

1. **Open AI Chat** - Click the chat button
2. **Click "Select elements"** - Button turns blue/active
3. **Click canvas elements** - They get highlighted on canvas
4. **Type your prompt** - e.g., "Make these blue"
5. **Send** - AI receives context about selected elements

### Prompt Templates

Click ⚡ **Templates** to see quick actions:

```
🎨 UI Mockup    → "Create a web wireframe for..."
🔄 Flowchart    → "Create a flowchart for:..."
🏗️ Architecture → "Design system architecture..."
💡 Explain      → "Explain these canvas elements..."
```

---

## 🎨 Design System

The new component uses CSS variables for theming:

```css
/* Colors */
--color-surface      /* Background */
--color-bg           /* Secondary background */
--color-text         /* Primary text */
--color-text-muted   /* Secondary text */
--color-accent       /* Primary action (indigo-500) */
--color-stroke       /* Borders */
--color-stroke-muted /* Subtle borders */
--color-fill-1       /* Light fills */
--color-fill-2       /* Darker fills */
```

---

## 🔌 Integration with Canvas

### Events Used

```typescript
// Listen for canvas state
window.addEventListener("excalidraw:state-update", handler);

// Request state
window.dispatchEvent(new CustomEvent("excalidraw:get-state"));

// Send drawing commands
window.dispatchEvent(new CustomEvent("excalidraw:draw", { 
    detail: { elements: [...] } 
}));
```

### Global API Required

The component expects `window.excalidrawAPI` to be exposed (which we added in the restoration):

```typescript
(window as any).excalidrawAPI = api;
```

---

## 📋 Next Steps / Enhancements

### Phase 2: Rich Messages
- [ ] Code syntax highlighting
- [ ] Image previews with zoom
- [ ] Drawing previews inline
- [ ] Message actions (edit, delete, react)

### Phase 3: Advanced Context
- [ ] Canvas thumbnail preview
- [ ] Selection highlighting on canvas
- [ ] Spatial context ("element to the left of...")
- [ ] Element grouping/tagging

### Phase 4: Conversation Management
- [ ] Message threading
- [ ] Conversation history
- [ ] Export (markdown, PDF)
- [ ] Search messages

---

## 🐛 Troubleshooting

### Element selection not working?
- Ensure `window.excalidrawAPI` is exposed
- Check browser console for errors
- Verify canvas is not in a special mode (drawing, etc.)

### Canvas state not updating?
- Check `excalidraw:state-update` event is firing
- Verify event listener is attached

### Build errors?
```bash
npm run build
# Check for TypeScript errors
npx tsc --noEmit --skipLibCheck
```

---

## 💡 Tips

1. **Multi-select**: Click multiple elements while in selection mode
2. **Clear anytime**: Click "Clear" to deselect all
3. **Context included**: Selected elements automatically included in AI context
4. **Escape key**: Press ESC to exit selection mode or close chat
5. **Resize**: Drag the left edge to resize the panel

---

*Implementation Date: 2026-02-01*
*Status: Ready for testing*
