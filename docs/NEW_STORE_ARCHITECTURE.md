# New Store Architecture (2025)

## Overview

The store has been completely refactored from a monolithic structure to a modular slice-based architecture. This provides better separation of concerns, improved type safety, and eliminates the need for the event emitter pattern.

## Architecture

```
src/stores/
├── index.ts              # Public API exports
├── store.ts              # Main store composition with selectors
├── types.ts              # All TypeScript types
├── slices/
│   ├── canvasSlice.ts    # Canvas state, elements, API ref
│   ├── uiSlice.ts        # Panels, modals, toasts
│   ├── chatSlice.ts      # Chat messages, provider, loading
│   ├── commandSlice.ts   # Command queue for canvas ops
│   └── asyncSlice.ts     # Async operation tracking
├── hooks/
│   ├── useScreenshotCapture.ts  # Async screenshot capture
│   ├── useCanvasCommands.ts     # Command dispatching
│   └── useCommandSubscriber.ts  # Command execution
└── async/
    └── screenshot.ts     # Pure async screenshot functions
```

## Quick Reference

### Before / After

| Before | After |
|--------|-------|
| `useUnifiedCanvasStore()` | `useStore()` or specific hooks |
| `canvasEvents.emit('insert-image')` | `const { insertImage } = useCanvasCommands(); await insertImage(...)` |
| `canvasEvents.on('screenshot-captured', cb)` | `const { capture } = useScreenshotCapture(); const data = await capture()` |
| `eventBus.emit('x')` | `dispatchCommand('x', payload)` |
| `useEvent('x', cb)` | `useCommandSubscriber({ onX: handler })` |

## Usage Examples

### Reading State

```typescript
// Get entire store
const store = useStore();

// Get specific slice
const { elements, setElements } = useStore((state) => state);

// Use selector hooks (recommended)
const api = useExcalidrawAPI();
const { isChatOpen, toggleChat } = usePanels();
const { messages, addMessage } = useChat();
```

### Dispatching Commands

```typescript
import { useCanvasCommands } from '@/stores';

function MyComponent() {
  const { insertImage, drawElements, isPending, lastError } = useCanvasCommands();

  const handleAddImage = async () => {
    try {
      await insertImage(imageUrl, 800, 600, 'png');
    } catch (err) {
      console.error('Failed to insert:', err);
    }
  };

  return <button onClick={handleAddImage} disabled={isPending}>Add Image</button>;
}
```

### Executing Commands (in Canvas Components)

```typescript
import { useCommandSubscriber } from '@/stores';

function CanvasNotesLayer({ api }) {
  useCommandSubscriber({
    onInsertImage: async (payload) => {
      // Execute the insert
      const { imageData, width, height } = payload;
      // ... insert logic using api
    },
    onDrawElements: async (payload) => {
      const { elements, isModification } = payload;
      // ... draw logic
    },
    onError: (type, error) => {
      console.error(`Command ${type} failed:`, error);
    },
  });

  // ... render
}
```

### Async Operations (Screenshots)

```typescript
import { useScreenshotCapture } from '@/stores';

function ImageGenerationModal() {
  const { captureForPreview, data, isCapturing } = useScreenshotCapture();

  useEffect(() => {
    if (isOpen && selectedElements.length > 0) {
      captureForPreview(selectedElements)
        .then((result) => {
          setPreviewUrl(result.dataUrl);
        })
        .catch((err) => {
          console.error('Capture failed:', err);
        });
    }
  }, [isOpen, selectedElements]);

  // ... render
}
```

### Tracking Async Operations

```typescript
import { useAsyncOperation } from '@/stores';

function ImageGenerator() {
  const operationId = 'image-gen-123';
  const { startOperation, updateOperation, completeOperation } = useStore();

  const generate = async () => {
    startOperation(operationId, 'image-generation');
    
    try {
      for (let progress = 0; progress <= 100; progress += 10) {
        await delay(100);
        updateOperation(operationId, progress);
      }
      completeOperation(operationId, imageUrl);
    } catch (err) {
      failOperation(operationId, err.message);
    }
  };

  // Track progress elsewhere
  const progress = useStore(
    (state) => state.operations.get(operationId)?.progress
  );

  return <div>Progress: {progress}%</div>;
}
```

## Slice Details

### Canvas Slice

**State:**
- `elements: ExcalidrawElement[]`
- `appState: Partial<ExcalidrawAppState>`
- `files: Record<string, any> | null`
- `excalidrawAPI: ExcalidrawAPI | null`
- `canvasId: string | null`
- `isDirty: boolean`
- `lastSaved: Date | null`

**Actions:**
- `setCanvasData(data)`
- `setElements(elements)`
- `setExcalidrawAPI(api)`
- `setCanvasId(id)`
- `setDirty(dirty)`
- `resetCanvas()`

**Selectors:**
- `getSceneElements()` - Returns elements from API or state
- `getSelectedElementIds()` - Returns array of selected IDs
- `getSelectedElements()` - Returns selected element objects

### UI Slice

**State:**
- `isChatOpen: boolean`
- `isAssetsOpen: boolean`
- `isShareModalOpen: boolean`
- `isImageGenModalOpen: boolean`
- `toasts: Toast[]`

**Actions:**
- `setChatOpen(open)` / `toggleChat()`
- `setAssetsOpen(open)` / `toggleAssets()`
- `addToast(message, type, duration)`
- `removeToast(id)`

### Chat Slice

**State:**
- `messages: Message[]`
- `aiProvider: 'kimi' | 'claude'`
- `contextMode: 'all' | 'selected'`
- `isChatLoading: boolean`
- `chatError: string | null`

**Actions:**
- `addMessage(message)`
- `setMessages(messages)`
- `setAIProvider(provider)`
- `clearChatError()`

### Command Slice

**State:**
- `pendingCommand: PendingCommand | null`

**Actions:**
- `dispatchCommand(type, payload): Promise<any>` - Dispatch and await result
- `resolveCommand(result)` - Mark command as succeeded
- `rejectCommand(error)` - Mark command as failed

### Async Slice

**State:**
- `operations: Map<string, AsyncOperation>`

**Actions:**
- `startOperation(id, type)`
- `updateOperation(id, progress)`
- `completeOperation(id, result)`
- `failOperation(id, error)`

## Migration Guide

### 1. Update Imports

```typescript
// Before
import { useUnifiedCanvasStore, canvasEvents } from '@/stores';

// After
import { 
  useStore, 
  useExcalidrawAPI,
  useCanvasCommands,
  useScreenshotCapture,
  useCommandSubscriber,
} from '@/stores';
```

### 2. Replace Event Emits with Commands

```typescript
// Before
canvasEvents.emit('excalidraw:insert-image', { imageData, width, height });

// After
const { insertImage } = useCanvasCommands();
await insertImage(imageData, width, height);
```

### 3. Replace Event Listeners with Command Subscriber

```typescript
// Before
canvasEvents.on('excalidraw:insert-image', (data) => {
  // handle insert
});

// After
useCommandSubscriber({
  onInsertImage: async (payload) => {
    // handle insert
  },
});
```

### 4. Replace Screenshot Events with Async

```typescript
// Before
canvasEvents.emit('excalidraw:capture-screenshot', { requestId });
canvasEvents.on('excalidraw:screenshot-captured', (data) => {
  if (data.requestId === expectedId) {
    // handle result
  }
});

// After
const { capture } = useScreenshotCapture();
const result = await capture({ quality: 'high', elementIds });
// result.dataUrl contains the screenshot
```

## Benefits

1. **Type Safety**: Full TypeScript inference for all commands and state
2. **Observability**: Redux DevTools integration shows all state changes
3. **Testability**: Pure functions, easy to mock
4. **Performance**: Selective subscriptions prevent unnecessary re-renders
5. **Debugging**: Clear stack traces, no "spooky action at a distance"
6. **Maintainability**: Each slice has a single responsibility

## Backward Compatibility

The old `useUnifiedCanvasStore` is exported as an alias to the new store:

```typescript
export const useUnifiedCanvasStore = useStore;
```

This allows gradual migration. However, new code should use the new hooks directly.
