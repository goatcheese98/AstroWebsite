# AI Canvas Communication System - Complete Explanation

## Overview

The AI can read and draw on the Excalidraw canvas through a **two-way communication system** using:

1. **Custom browser events** (for real-time communication between components)
2. **Excalidraw API** (to read/write canvas data)
3. **Claude API** (to generate intelligent responses)

---

## Architecture Diagram

```
┌─────────────────────┐         ┌─────────────────────┐
│  ExcalidrawCanvas   │◄───────►│   AIChatSidebar     │
│   (Canvas View)     │  Events │   (Chat Interface)  │
└─────────────────────┘         └─────────────────────┘
         │                               │
         │ Excalidraw API               │ Fetch API
         ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│  Canvas Elements    │         │   /api/chat.ts      │
│  (Drawing Data)     │         │   (Backend API)     │
└─────────────────────┘         └─────────────────────┘
                                         │
                                         │ HTTP Request
                                         ▼
                                ┌─────────────────────┐
                                │   Claude API        │
                                │   (AI Brain)        │
                                └─────────────────────┘
```

---

## Part 1: Canvas → AI (Reading the Canvas)

### Step 1: Canvas Broadcasts Its State

**File:** `ExcalidrawCanvas.tsx` (lines 93-110)

```typescript
// Broadcast canvas state changes every second
useEffect(() => {
  if (!excalidrawAPI) return;

  const broadcastState = () => {
    // Get current elements from Excalidraw
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    
    // Dispatch a custom event with the data
    window.dispatchEvent(new CustomEvent("excalidraw:state-update", {
      detail: {
        elements,    // Array of all shapes, text, arrows, etc.
        appState,    // Canvas settings (zoom, pan, etc.)
      },
    }));
  };

  // Broadcast every 1 second
  const interval = setInterval(broadcastState, 1000);
  
  return () => clearInterval(interval);
}, [excalidrawAPI]);
```

**What's happening:**

- Every 1 second, the canvas reads all elements using `excalidrawAPI.getSceneElements()`
- It packages this data into a custom event called `"excalidraw:state-update"`
- The event is broadcast to the entire window using `window.dispatchEvent()`

---

### Step 2: Chat Sidebar Listens for Updates

**File:** `AIChatSidebar.tsx` (lines 31-46)

```typescript
// Listen for canvas state updates
useEffect(() => {
  const handleCanvasUpdate = (event: any) => {
    console.log("📊 Canvas state updated:", event.detail);
    setCanvasState(event.detail);  // Store in React state
  };

  // Listen for the custom event
  window.addEventListener("excalidraw:state-update", handleCanvasUpdate);
  
  // Request initial canvas state
  window.dispatchEvent(new CustomEvent("excalidraw:get-state"));

  return () => {
    window.removeEventListener("excalidraw:state-update", handleCanvasUpdate);
  };
}, []);
```

**What's happening:**

- Chat sidebar listens for `"excalidraw:state-update"` events
- When received, it stores the canvas data in React state (`canvasState`)
- Now the chat has access to all canvas elements in real-time!

---

### Step 3: Extract Readable Information

**File:** `AIChatSidebar.tsx` (lines 51-91)

```typescript
const getCanvasDescription = () => {
  if (!canvasState?.elements?.length) {
    return "The canvas is currently empty.";
  }

  const elementCounts: Record<string, number> = {};
  const textContents: string[] = [];
  const labels: string[] = [];

  // Loop through all elements
  canvasState.elements.forEach((el: any) => {
    // Count element types
    elementCounts[el.type] = (elementCounts[el.type] || 0) + 1;
    
    // Extract text from text elements
    if (el.type === 'text' && el.text) {
      textContents.push(`"${el.text}"`);
    }
    
    // Extract labels from shapes
    if (el.label?.text) {
      labels.push(`"${el.label.text}"`);
    }
  });

  // Build human-readable description
  let description = `Current canvas contains: 1 diamond, 2 texts, 1 rectangle (4 total elements)`;
  
  if (textContents.length > 0) {
    description += `\n\nText elements: "Dog", "cat"`;
  }
  
  return description;
};
```

**What's happening:**

- Loops through all elements in `canvasState.elements`
- Counts how many of each type (rectangle, text, diamond, etc.)
- Extracts actual text content from `el.text` and `el.label.text`
- Formats it into a human-readable description

---

### Step 4: Send to AI

**File:** `AIChatSidebar.tsx` (lines 103-120)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ... user sends a message ...
  
  // Get canvas description
  const canvasDescription = getCanvasDescription();
  
  // Send to API with canvas context
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [...messages, userMessage],
      model,
      canvasState: {
        description: canvasDescription,  // Human-readable summary
        elementCount: canvasState?.elements?.length || 0,
        elements: canvasState?.elements || [],  // Full element data
      },
    }),
  });
};
```

**What's happening:**

- When user sends a message, we include the canvas description
- The API receives both the user's question AND the canvas state
- AI can now "see" what's on the canvas!

---

## Part 2: AI → Canvas (Drawing on Canvas)

### Step 1: AI Generates Drawing Instructions

**File:** `/api/chat.ts` (lines 62-65)

```typescript
// Add canvas context to system prompt
let canvasContext = '';
if (canvasState?.description) {
  canvasContext = `\n\n## Current Canvas State\n${canvasState.description}\n\nYou can see what's already on the canvas...`;
}

const response = await client.messages.create({
  model: selectedModel,
  max_tokens: 4096,
  system: `You are an expert at creating Excalidraw diagrams...${canvasContext}`,
  messages: [...],
});
```

**What's happening:**

- The canvas description is injected into the AI's system prompt
- AI now knows: "There's a diamond with 'Dog' and text saying 'cat'"
- AI can generate contextually aware responses

**AI Response Example:**

```
I'll add a third animal to match your existing ones.

```json
[
  {
    "type": "ellipse",
    "x": 450,
    "y": 200,
    "width": 150,
    "height": 100,
    "backgroundColor": "#b2f2bb",
    "strokeColor": "#2f9e44",
    "label": { "text": "bird" }
  }
]
```

```

---

### Step 2: Chat Sidebar Parses JSON

**File:** `AIChatSidebar.tsx` (lines 145-175)

```typescript
// Look for JSON in AI response
const jsonMatch = data.message.match(/```json\s*\n([\s\S]*?)\n```/);

if (jsonMatch) {
  const jsonString = jsonMatch[1].trim();
  const parsedData = JSON.parse(jsonString);  // Parse to array
  
  if (Array.isArray(parsedData)) {
    // Execute the drawing command
    executeDrawingCommand(parsedData);
  }
}
```

**What's happening:**

- Uses regex to find JSON code blocks in AI response
- Parses the JSON string into a JavaScript array
- Passes the array to `executeDrawingCommand()`

---

### Step 3: Dispatch Drawing Event

**File:** `AIChatSidebar.tsx` (lines 30-48)

```typescript
const executeDrawingCommand = (elementsArray: any[]) => {
  console.log(`✨ Dispatching ${elementsArray.length} elements to canvas`);
  
  // Dispatch custom event to canvas
  const event = new CustomEvent("excalidraw:draw", {
    detail: { elements: elementsArray },
  });
  window.dispatchEvent(event);
  
  return true;
};
```

**What's happening:**

- Creates a custom event called `"excalidraw:draw"`
- Includes the element array in `event.detail`
- Broadcasts to the window so canvas can receive it

---

### Step 4: Canvas Receives and Converts

**File:** `ExcalidrawCanvas.tsx` (lines 30-65)

```typescript
useEffect(() => {
  const handleDrawCommand = (event: any) => {
    const { elements } = event.detail;
    
    // Convert skeleton elements to full Excalidraw elements
    const fullElements = convertToExcalidrawElements(elements);
    
    // Get current elements
    const currentElements = excalidrawAPI.getSceneElements();
    
    // Add new elements to canvas
    excalidrawAPI.updateScene({
      elements: [...currentElements, ...fullElements],
    });
    
    // Auto-zoom to fit
    excalidrawAPI.scrollToContent([...currentElements, ...fullElements], {
      fitToContent: true,
    });
  };

  window.addEventListener("excalidraw:draw", handleDrawCommand);
  
  return () => {
    window.removeEventListener("excalidraw:draw", handleDrawCommand);
  };
}, [excalidrawAPI]);
```

**What's happening:**

1. Canvas listens for `"excalidraw:draw"` events
2. Receives the skeleton elements (simplified JSON)
3. Uses `convertToExcalidrawElements()` to add all required properties
4. Merges with existing elements
5. Updates the canvas using `excalidrawAPI.updateScene()`
6. Auto-zooms to show everything

---

## Key Technologies

### 1. **Custom Events** (Browser API)

```typescript
// Create event
const event = new CustomEvent("my-event", {
  detail: { data: "hello" }
});

// Dispatch (send)
window.dispatchEvent(event);

// Listen (receive)
window.addEventListener("my-event", (e) => {
  console.log(e.detail.data);  // "hello"
});
```

**Why use this?**

- Allows React components to communicate without props
- Works across different component trees
- Real-time, event-driven architecture

---

### 2. **Excalidraw API**

```typescript
// Get API reference
<Excalidraw excalidrawAPI={(api) => setExcalidrawAPI(api)} />

// Read canvas
const elements = excalidrawAPI.getSceneElements();

// Write to canvas
excalidrawAPI.updateScene({ elements: [...] });
```

**What it provides:**

- `getSceneElements()` - Read all shapes/text
- `updateScene()` - Add/modify elements
- `scrollToContent()` - Auto-zoom
- `getAppState()` - Get canvas settings

---

### 3. **convertToExcalidrawElements()**

```typescript
// Skeleton (simplified)
const skeleton = [
  {
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    backgroundColor: "#a5d8ff"
  }
];

// Convert to full element
const fullElements = convertToExcalidrawElements(skeleton);

// Now has all required properties:
// - id, version, versionNonce
// - groupIds, frameId, roundness
// - strokeStyle, fillStyle, roughness
// - seed, updated, locked, etc.
```

**Why needed?**

- Excalidraw requires ~25 properties per element
- AI only needs to specify ~6 properties
- This function fills in the rest automatically

---

## Data Flow Summary

### Reading Canvas (Canvas → AI)

```
Canvas Elements
    ↓ (getSceneElements)
Excalidraw API
    ↓ (custom event: "excalidraw:state-update")
Chat Sidebar State
    ↓ (getCanvasDescription)
Human-Readable Text
    ↓ (fetch /api/chat)
Claude API
    ↓
AI understands canvas!
```

### Drawing on Canvas (AI → Canvas)

```
User Message
    ↓ (fetch /api/chat with canvas context)
Claude API
    ↓
AI generates JSON
    ↓ (regex parse)
Skeleton Elements Array
    ↓ (custom event: "excalidraw:draw")
Canvas Component
    ↓ (convertToExcalidrawElements)
Full Excalidraw Elements
    ↓ (updateScene)
Canvas Updated!
```

---

## Why This Architecture Works

1. **Decoupled Components**
   - Canvas and Chat don't directly depend on each other
   - They communicate via events (loose coupling)
   - Easy to modify or replace either component

2. **Real-Time Sync**
   - Canvas broadcasts state every second
   - Chat always has latest canvas data
   - No manual refresh needed

3. **Simplified AI Output**
   - AI only generates simple JSON (6 properties)
   - `convertToExcalidrawElements()` handles complexity
   - Less chance of AI making mistakes

4. **Bidirectional**
   - AI can read canvas (via state updates)
   - AI can write to canvas (via draw events)
   - True two-way communication

---

## Try It Yourself

Open browser console and try:

```javascript
// Manually trigger a drawing
window.dispatchEvent(new CustomEvent("excalidraw:draw", {
  detail: {
    elements: [{
      type: "rectangle",
      x: 500,
      y: 500,
      width: 100,
      height: 100,
      backgroundColor: "#ffc9c9"
    }]
  }
}));

// Request canvas state
window.dispatchEvent(new CustomEvent("excalidraw:get-state"));

// Listen for state updates
window.addEventListener("excalidraw:state-update", (e) => {
  console.log("Canvas has", e.detail.elements.length, "elements");
});
```

This shows the event system working independently of React!
