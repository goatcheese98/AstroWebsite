# Patterns & Anti-Patterns

> **For:** AI coding assistant  
> **Purpose:** Condensed learnings from refactoring sessions  
> **Rule:** Add entries only when you made a mistake and learned from it.

---

## 🔴 ANTI-PATTERNS (Things That Broke)

### AP-001: The Moving Variable Problem
**Context:** Refactoring `useImageGeneration` hook  
**Mistake:** Removed `isCapturing` from hook return, but left references in 3 files (`AIChatContainer.tsx`, `ChatInput.tsx`, `ImageGenerationModal.tsx`)  
**Error:** `ReferenceError: isCapturing is not defined`  
**Fix:** 
1. Search entire codebase for removed exports BEFORE finishing
2. Run `npx tsc --noEmit` after hook changes
3. Check all consumers of modified modules  
**Rule:** When removing a hook export, grep for it across the entire project.

---

### AP-002: The Lost Event Coordination
**Context:** Image generation screenshot flow  
**Mistake:** Created `useScreenshotCapture` hook to coordinate events, but `ImageGenerationModal` had its own internal screenshot capture. Two systems, no connection.  
**Result:** Preview screenshot captured, but generation API never called.  
**Fix:** Parent (`AIChatContainer`) orchestrates flow:
1. Modal calls `onGenerate(options)`
2. Parent dispatches `excalidraw:capture-screenshot`
3. Parent listens for response, calls `generateImage(screenshot, options)`
4. Single coordinator, no competing listeners  
**Rule:** When multiple components need same async resource, parent coordinates. Children signal intent, parent handles execution.

---

### AP-003: The Race Condition Timeout
**Context:** Screenshot capture in `ImageGenerationModal`  
**Mistake:** Set 10s timeout in useEffect. Screenshot succeeded, state updated, component re-rendered. Original timeout still fired (from old closure).  
**Result:** "Timeout fired but response already received" - confusing UX  
**Fix:** Use ref to track completion state:
```ts
const receivedResponseRef = useRef(false);
// On success: receivedResponseRef.current = true
// In timeout: if (!receivedResponseRef.current) { showError() }
```  
**Rule:** Any async timeout needs a "completed" flag to prevent stale closures from firing.

---

### AP-004: The Broken Event Listener Chain
**Context:** `useScreenshotCapture` listening to window events  
**Mistake:** Added event listener in useEffect, but handler checked requestIds against internal ref. Event arrived, didn't match any known requestId (it was from modal), got ignored.  
**Result:** `⏭️ Ignoring screenshot for unknown requestId`  
**Fix:** Removed competing listener. Only parent coordinates screenshot events. Modal doesn't listen, just triggers.  
**Rule:** Don't add event listeners "just in case." Know exactly who should be listening to what.

---

## 🟢 PATTERNS (Things That Worked)

### P-001: Parent Orchestration Pattern
**When:** Multiple children need coordinated async operations  
**How:** 
- Child calls `onAction(options)` callback
- Parent stores options in ref: `pendingRef.current = { options, status: 'pending' }`
- Parent triggers async operation (screenshot, API call)
- Parent listens for completion, uses stored options to continue flow
- Single source of truth, no competing listeners  
**Used in:** `AIChatContainer` coordinating `ImageGenerationModal` → screenshot → `generateImage`

---

### P-002: The Ref-Guarded Timeout
**When:** Setting timeouts for async operations that might complete before timeout  
**How:**
```ts
const completedRef = useRef(false);

const handleSuccess = () => {
    completedRef.current = true;
    setState('done');
};

setTimeout(() => {
    if (!completedRef.current) {
        setState('timeout');
    }
}, 10000);
```  
**Used in:** `ImageGenerationModal` preview capture timeout

---

### P-003: Hook Simplification
**When:** Hook is managing state it shouldn't  
**How:** 
- Original: `useImageGeneration` managed screenshot state AND API state
- Problem: Screenshot was actually triggered by modal, not hook
- Fix: Removed screenshot logic from hook. Hook only handles API.
- Parent passes screenshot directly to `generateImage(screenshot, options)`  
**Result:** Simpler hook, clearer flow, no coordination bugs

---

### P-004: Personification Headers
**When:** Creating any new file  
**How:** Write header BEFORE writing code. It becomes your specification.  
**Key sections:**
- WHO AM I? → Defines single responsibility
- MY NEIGHBORS → Shows dependencies (reveals coupling issues early)
- IF I BREAK → Observability for debugging  
**Benefit:** Forces clarity before implementation. Header is 20% of file length but prevents 80% of confusion.

---

## 📝 CODEBASE-SPECIFIC NOTES

### Event Naming Convention
- `excalidraw:capture-screenshot` - Request screenshot
- `excalidraw:screenshot-captured` - Screenshot ready
- `excalidraw:draw` - Add elements to canvas
- `excalidraw:insert-image` - Add image to canvas
- `excalidraw:state-update` - Canvas changed

**Pattern:** Request events are verbs (`capture-screenshot`), response events are past tense (`screenshot-captured`).

### Request ID Format
- `preview-${timestamp}` - For modal preview
- `generation-${timestamp}` - For API generation
- `chat-${timestamp}` - For chat context screenshots

### File Size Baselines (This Codebase)
- UI Components: 150-350 lines acceptable
- Custom Hooks: 200-450 lines acceptable (API integration is verbose)
- Utilities: <100 lines ideal
- Orchestrators: <400 lines acceptable

### Screenshot Flow (Current Architecture)
```
ImageGenerationModal opens
    ↓
Captures preview (internal, for display only)
    ↓
User clicks Generate
    ↓
Modal calls onGenerate(options)
    ↓
AIChatContainer dispatches capture-screenshot
    ↓
ExcalidrawCanvas captures, dispatches screenshot-captured
    ↓
AIChatContainer receives, calls generateImage(dataURL, options)
    ↓
useImageGeneration calls /api/generate-image
    ↓
Success → insert-image event → canvas updated
```

---

## ⚡ QUICK REMINDERS

1. **Always run `npx tsc --noEmit` after hook changes**
2. **Always grep for removed exports before finishing**
3. **Parent coordinates async flows, children don't compete**
4. **Use refs for timeout guards, not state**
5. **Write header first, code second**
6. **Build after every major extraction**

---

*Add new entries at the top. Date each entry. Be specific about what broke and how you fixed it.*
