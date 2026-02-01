# ExcalidrawCanvas Features Restoration Plan

## Executive Summary

This document outlines a phased approach to restore missing features from commit `7d6803d` that were accidentally removed in commit `13235e7`. The restoration maintains compatibility with the current dynamic import architecture while fixing broken inter-component communication.

---

## Root Cause Analysis

### What Was Removed

1. **`renderTopRightUI` prop** - The "+ Add Note" button UI
2. **Event Listeners:**
   - `excalidraw:draw` - AI drawing commands
   - `excalidraw:get-state` - State request from other components
   - `excalidraw:insert-svg` - SVG library insertion
   - `excalidraw:insert-image` - Generated image insertion
3. **Periodic State Broadcasting** - `excalidraw:state-update` every 1 second
4. **Global API Exposure** - `(window as any).excalidrawAPI`
5. **Markdown Note Refs Exposure** - `(window as any).getMarkdownNoteRefs`

### Current Architecture Challenges

- Uses dynamic imports (lazy loading) requiring async patterns
- Component stored in React state (`ExcalidrawComponent`)
- RAF polling loop for state updates (performance optimization)
- Props mismatch between `MarkdownNote` and `ExcalidrawCanvas`

### Props Mismatch Table

| Component | Expects | Currently Receives |
|-----------|---------|-------------------|
| MarkdownNote | `appState` | `viewState` |
| MarkdownNote | `onChange(id, text)` | `onUpdate(content)` |
| MarkdownNote | `ref` (forwardRef) | `registerRef` callback |

---

## Phase 1: Restore Add Note Button (UI Fix)

### Goal
Restore the "+ Add Note" button in the top-right corner of the canvas.

### Implementation

```tsx
// In ExcalidrawComponent props, add:
renderTopRightUI={() => (
    <button
        style={{
            background: "var(--color-primary, #6366f1)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "6px 12px",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontWeight: 600,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}
        onClick={handleCreateMarkdown}
    >
        + Add Note
    </button>
)}
```

### Failsafe Considerations
- Button only renders when `ExcalidrawComponent` is loaded (after dynamic import)
- Uses existing `handleCreateMarkdown` callback (already implemented)

---

## Phase 2: Restore Event System

### 2.1 Event Listener Architecture

Create a unified event handler that supports both old (`excalidraw:*`) and new (`ai-draw-command`) event names for backward compatibility.

```tsx
// Event handler map for maintainability
const EVENTS = {
    DRAW: ['excalidraw:draw', 'ai-draw-command'],
    GET_STATE: 'excalidraw:get-state',
    INSERT_SVG: 'excalidraw:insert-svg',
    INSERT_IMAGE: 'excalidraw:insert-image',
    STATE_UPDATE: 'excalidraw:state-update',
} as const;
```

### 2.2 Restore Individual Event Handlers

#### A. Drawing Commands (`excalidraw:draw`)

**Current State:** Only listens to `ai-draw-command`
**Required Fix:** Listen to both `excalidraw:draw` AND `ai-draw-command`

```tsx
useEffect(() => {
    const handleDrawCommand = async (event: any) => {
        // Existing implementation works for both event names
        // Just need to add listener for both events
    };

    // Support both old and new event names
    window.addEventListener("ai-draw-command", handleDrawCommand);
    window.addEventListener("excalidraw:draw", handleDrawCommand);
    
    return () => {
        window.removeEventListener("ai-draw-command", handleDrawCommand);
        window.removeEventListener("excalidraw:draw", handleDrawCommand);
    };
}, [excalidrawAPI]);
```

#### B. State Request Handler (`excalidraw:get-state`)

**Purpose:** Other components request current canvas state

```tsx
useEffect(() => {
    const handleGetState = () => {
        if (!excalidrawAPI) return;
        
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        window.dispatchEvent(new CustomEvent("excalidraw:state-update", {
            detail: { elements, appState },
        }));
    };

    window.addEventListener("excalidraw:get-state", handleGetState);
    return () => window.removeEventListener("excalidraw:get-state", handleGetState);
}, [excalidrawAPI]);
```

#### C. Periodic State Broadcasting

**Purpose:** Keep other components in sync without them polling

```tsx
useEffect(() => {
    if (!excalidrawAPI) return;

    const broadcastState = () => {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        window.dispatchEvent(new CustomEvent("excalidraw:state-update", {
            detail: { elements, appState },
        }));
    };

    // Broadcast every 1 second
    const interval = setInterval(broadcastState, 1000);
    return () => clearInterval(interval);
}, [excalidrawAPI]);
```

### 2.3 Restore Insertion Handlers

#### A. SVG Insertion (`excalidraw:insert-svg`)

```tsx
useEffect(() => {
    const handleInsertSVG = async (event: any) => {
        if (!excalidrawAPI) return;

        const { svgPath } = event.detail;
        
        try {
            const response = await fetch(svgPath);
            const svgText = await response.text();

            const appState = excalidrawAPI.getAppState();
            const centerX = appState.scrollX + appState.width / 2;
            const centerY = appState.scrollY + appState.height / 2;

            const { convertToExcalidrawElements: converter } = await loadExcalidraw();

            // Create image element
            const imageElement = converter([{
                type: "image",
                x: centerX - 50,
                y: centerY - 50,
                width: 100,
                height: 100,
                fileId: svgPath,
            }]);

            const currentElements = excalidrawAPI.getSceneElements();
            const files = excalidrawAPI.getFiles();

            // Create blob URL for SVG
            const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
            const svgUrl = URL.createObjectURL(svgBlob);

            const newFiles = {
                ...files,
                [svgPath]: {
                    mimeType: "image/svg+xml",
                    id: svgPath,
                    dataURL: svgUrl,
                    created: Date.now(),
                },
            };

            excalidrawAPI.updateScene({
                elements: [...currentElements, ...imageElement],
            });
            excalidrawAPI.addFiles(Object.values(newFiles));
        } catch (err) {
            console.error("❌ Error inserting SVG:", err);
        }
    };

    window.addEventListener("excalidraw:insert-svg", handleInsertSVG);
    return () => window.removeEventListener("excalidraw:insert-svg", handleInsertSVG);
}, [excalidrawAPI]);
```

#### B. Image Insertion (`excalidraw:insert-image`)

```tsx
useEffect(() => {
    const handleInsertImage = async (event: any) => {
        if (!excalidrawAPI) return;

        const { imageData, type = "png" } = event.detail;

        try {
            const appState = excalidrawAPI.getAppState();
            const centerX = appState.scrollX + appState.width / 2;
            const centerY = appState.scrollY + appState.height / 2;

            const { convertToExcalidrawElements: converter } = await loadExcalidraw();

            const fileId = `generated-${Date.now()}`;

            const imageElement = converter([{
                type: "image",
                x: centerX - 100,
                y: centerY - 100,
                width: 200,
                height: 200,
                fileId: fileId,
            }]);

            const currentElements = excalidrawAPI.getSceneElements();

            const newFile = {
                mimeType: `image/${type}`,
                id: fileId,
                dataURL: imageData,
                created: Date.now(),
            };

            excalidrawAPI.updateScene({
                elements: [...currentElements, ...imageElement],
            });
            excalidrawAPI.addFiles([newFile]);
        } catch (err) {
            console.error("❌ Error inserting image:", err);
        }
    };

    window.addEventListener("excalidraw:insert-image", handleInsertImage);
    return () => window.removeEventListener("excalidraw:insert-image", handleInsertImage);
}, [excalidrawAPI]);
```

---

## Phase 3: Fix MarkdownNote Props Compatibility

### 3.1 Current Mismatch

The current code passes:
```tsx
<MarkdownNoteComponent
    element={element}
    viewState={viewStateRef.current}  // ❌ Should be appState
    onUpdate={(content) => handleMarkdownUpdate(element.id, content)}  // ❌ Should be onChange
    registerRef={(ref) => registerMarkdownNoteRef(element.id, ref)}  // ❌ Should use forwardRef
/>
```

But `MarkdownNote` expects:
```tsx
interface MarkdownNoteProps {
    element: any;
    appState: any;  // Not viewState
    onChange: (id: string, text: string) => void;  // Not onUpdate
}

export const MarkdownNote = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(...))
```

### 3.2 Solution Options

**Option A: Fix ExcalidrawCanvas to match MarkdownNote (Recommended)**

Change prop names in ExcalidrawCanvas to match what MarkdownNote expects:

```tsx
<MarkdownNoteComponent
    key={element.id}
    element={element}
    appState={viewStateRef.current}  // Changed from viewState
    onChange={handleMarkdownUpdate}  // Changed from onUpdate - needs signature adjustment
    ref={(ref) => {  // Changed from registerRef
        if (ref) registerMarkdownNoteRef(element.id, ref);
    }}
/>
```

Update `handleMarkdownUpdate` signature:
```tsx
const handleMarkdownUpdate = useCallback((elementId: string, newContent: string) => {
    // Existing implementation
}, [excalidrawAPI]);
```

**Option B: Create Adapter Component**

If we want to keep the current API in ExcalidrawCanvas:

```tsx
const MarkdownNoteAdapter = ({ element, viewState, onUpdate, registerRef }) => {
    return (
        <MarkdownNote
            element={element}
            appState={viewState}
            onChange={onUpdate}
            ref={registerRef}
        />
    );
};
```

**Decision:** Use Option A - simpler, less abstraction.

---

## Phase 4: Global API Exposure

### 4.1 Expose Excalidraw API Globally

Required for `MarkdownNote` to work (it accesses `(window as any).excalidrawAPI`):

```tsx
// In excalidrawAPI setter:
excalidrawAPI={(api: any) => {
    setExcalidrawAPI(api);
    if (typeof window !== "undefined") {
        (window as any).excalidrawAPI = api;
    }
}}
```

### 4.2 Expose Markdown Note Refs

For export functionality:

```tsx
useEffect(() => {
    (window as any).getMarkdownNoteRefs = () => markdownNoteRefsRef.current;
}, []);
```

---

## Phase 5: Validation & Testing

### 5.1 Test Matrix

| Feature | Test Step | Expected Result |
|---------|-----------|-----------------|
| Add Note Button | Click "+ Add Note" | New markdown note appears at center of viewport |
| AI Draw | Send drawing command from AIChatPanel | Elements appear on canvas |
| SVG Insert | Click SVG in SVGLibrary | SVG appears at center of canvas |
| Image Insert | Generate image in AIChatPanel | Image appears at center of canvas |
| State Sync | Open AIChatPanel | Canvas state loads correctly |
| Markdown Edit | Double-click note | Edit mode activates |
| Markdown Drag | Drag note | Note moves with mouse |
| Export | Call export function | Markdown renders as image |

### 5.2 Browser Console Checks

```javascript
// Verify global API
window.excalidrawAPI  // Should return API object
window.getMarkdownNoteRefs()  // Should return Map

// Test events
window.dispatchEvent(new CustomEvent('excalidraw:get-state'))
// Should trigger state update in other components
```

---

## Implementation Checklist

### Phase 1
- [ ] Add `renderTopRightUI` prop to `ExcalidrawComponent`
- [ ] Verify button appears after dynamic import loads

### Phase 2
- [ ] Add `excalidraw:draw` listener (in addition to `ai-draw-command`)
- [ ] Add `excalidraw:get-state` listener
- [ ] Add periodic `excalidraw:state-update` broadcasting
- [ ] Add `excalidraw:insert-svg` handler
- [ ] Add `excalidraw:insert-image` handler

### Phase 3
- [ ] Change `viewState` prop to `appState`
- [ ] Update `onUpdate` to `onChange` with correct signature
- [ ] Change `registerRef` callback to `ref` prop with forwardRef pattern

### Phase 4
- [ ] Add global `excalidrawAPI` exposure in setter
- [ ] Add global `getMarkdownNoteRefs` exposure

### Phase 5
- [ ] Run full test matrix
- [ ] Verify no console errors
- [ ] Test with AI chat, SVG library, and image generation

---

## Risk Mitigation

### Risk 1: Dynamic Import Timing
**Issue:** Event handlers may try to access Excalidraw before it's loaded
**Mitigation:** All handlers check `if (!excalidrawAPI) return;` at start

### Risk 2: Memory Leaks from Event Listeners
**Issue:** Multiple mount/unmount cycles could leave orphaned listeners
**Mitigation:** Use proper cleanup in useEffect return functions

### Risk 3: Circular Dependencies
**Issue:** State broadcasting → component update → state change → broadcast
**Mitigation:** RAF loop is throttled (8ms interval), broadcast is every 1s

### Risk 4: MarkdownNote Depends on window.excalidrawAPI
**Issue:** If global API not exposed, MarkdownNote breaks
**Mitigation:** Ensure global exposure happens synchronously in API setter

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate:** Comment out new event listeners one by one to identify culprit
2. **Short-term:** Revert to commit `7d6803d` for stable canvas
3. **Long-term:** Apply fixes and re-test in isolated branch

---

## Success Criteria

✅ "+ Add Note" button visible and functional
✅ AI can draw on canvas from chat panel
✅ SVGs can be inserted from library
✅ Generated images can be inserted from chat
✅ Canvas state syncs with AI chat context
✅ Markdown notes editable, draggable, resizable
✅ No console errors
✅ Performance remains smooth (no jank)

---

*Document Version: 1.0*
*Created: 2026-02-01*
*Target Completion: Same day (single session)*
