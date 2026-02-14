# State Management Migration Guide

## Overview

We've unified our state management into a single Zustand store that replaces:
- `canvasStore.ts` (legacy store)
- `eventBus.ts` (event system)
- `ExcalidrawContext.tsx` (React context for API)

## Quick Reference

| Before | After |
|--------|-------|
| `useCanvasStore()` | `useUnifiedCanvasStore()` |
| `eventBus.emit('imagegen:open')` | `store.openImageGen()` |
| `eventBus.emit('share:open')` | `store.openShareModal()` |
| `useEvent('canvas:data-change', cb)` | `useUnifiedCanvasStore.subscribe(selector, cb)` |
| `useExcalidrawAPI()` | `useExcalidrawAPI()` (from stores) |
| `useSetExcalidrawAPI()` | `useSetExcalidrawAPI()` (from stores) |
| `<ExcalidrawProvider>` | **Not needed anymore!** |

## Migration Examples

### 1. Component State Access

**Before:**
```typescript
import { useCanvasStore } from '@/stores';
import { eventBus } from '@/lib/events';

function MyComponent() {
  const { messages, addMessage } = useCanvasStore();
  
  const handleClick = () => {
    eventBus.emit('imagegen:open');
  };
}
```

**After:**
```typescript
import { useUnifiedCanvasStore } from '@/stores';

function MyComponent() {
  const store = useUnifiedCanvasStore();
  const { messages, addMessage } = store;
  
  const handleClick = () => {
    store.openImageGen(); // Direct action, no string events
  };
}
```

### 2. Excalidraw API Access

**Before:**
```typescript
import { useExcalidrawAPI, useSetExcalidrawAPI } from '@/context';
import { ExcalidrawProvider } from '@/context';

// In parent component:
<ExcalidrawProvider>
  <App />
</ExcalidrawProvider>

// In child component:
function Canvas() {
  const api = useExcalidrawAPI();
  const setApi = useSetExcalidrawAPI();
}
```

**After:**
```typescript
import { useExcalidrawAPI, useSetExcalidrawAPI } from '@/stores';

// No Provider needed!
function Canvas() {
  const api = useExcalidrawAPI();
  const setApi = useSetExcalidrawAPI();
}
```

### 3. Event Bus Listeners

**Before:**
```typescript
import { useEvent } from '@/lib/events';

function MyComponent() {
  useEvent('excalidraw:insert-image', (data) => {
    // handle image insertion
  });
  
  useEvent('canvas:data-change', () => {
    // handle data change
  });
}
```

**After:**
```typescript
import { useUnifiedCanvasStore } from '@/stores';
import { useEffect } from 'react';

function MyComponent() {
  // Option 1: Subscribe to specific state changes
  const pendingCommand = useUnifiedCanvasStore((s) => s.pendingCommand);
  
  useEffect(() => {
    if (pendingCommand?.type === 'insertImage') {
      // handle image insertion
    }
  }, [pendingCommand]);
  
  // Option 2: Subscribe to any state change
  useEffect(() => {
    const unsubscribe = useUnifiedCanvasStore.subscribe(
      (state) => state.isDirty,
      (isDirty) => {
        // handle data change
      }
    );
    return unsubscribe;
  }, []);
}
```

### 4. Imperative Commands

For operations that need to be "commanded" from outside (like inserting elements):

**Before:**
```typescript
eventBus.emit('excalidraw:insert-image', { 
  imageData: url, 
  type: 'generated' 
});
```

**After:**
```typescript
const store = useUnifiedCanvasStore.getState();
store.dispatchCommand('insertImage', { 
  imageData: url, 
  type: 'generated' 
});
```

## Benefits of the Unified Store

1. **Single Source of Truth**: No more syncing between multiple state systems
2. **Better TypeScript**: Full type inference without string-based event names
3. **No Provider Hell**: No need to wrap components in `<ExcalidrawProvider>`
4. **DevTools Support**: Time-travel debugging via Redux DevTools
5. **Persisted State**: Automatic localStorage persistence for selected fields
6. **Simpler Mental Model**: One way to do everything

## Migration Priority

1. **High Priority**: Components using `eventBus` (68 usages found)
2. **Medium Priority**: Components using `ExcalidrawContext` (19 usages found)
3. **Low Priority**: Components using old `useCanvasStore` (16 usages found - still works)

## Backward Compatibility

All legacy exports still work:
- `useCanvasStore` → Redirects to unified store
- `eventBus` → Still functions (logs deprecation warning)
- `ExcalidrawProvider` → Still works (not needed but won't break)

## File Changes

### New Files
- `src/stores/unifiedCanvasStore.ts` - The unified store

### Modified Files
- `src/stores/index.ts` - Exports unified store
- `src/lib/events/index.ts` - Marked deprecated, re-exports from unified
- `src/context/index.ts` - Marked deprecated, re-exports from unified

### To Be Deleted (After Full Migration)
- `src/stores/canvasStore.ts`
- `src/lib/events/eventBus.ts`
- `src/context/ExcalidrawContext.tsx`
