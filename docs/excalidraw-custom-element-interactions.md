# Excalidraw Custom Element Interactions

## Objective
This note explains how dragging, resizing, rotation, movement, and interaction work for custom overlay elements in the Excalidraw canvas stack used here, primarily through `CanvasContainer`, `CanvasCore`, and `CanvasNotesLayer`.

The short version is:

- Excalidraw is the source of truth for whole-element geometry.
- Custom elements are still normal Excalidraw scene elements first.
- Overlay React components only mirror scene state and decide when they should accept pointer/input events.
- Content updates flow from the overlay back into `customData`, but geometry updates do not.

## Files That Matter

### Canvas composition and state ownership
- `src/components/canvas/CanvasContainer.tsx`
- `src/components/canvas/CanvasCore.tsx`
- `src/stores/slices/canvasSlice.ts`

### Shared overlay pipeline
- `src/components/canvas/CanvasNotesLayer.tsx`
- `src/components/canvas/overlay-registry.ts`
- `src/components/canvas/element-factories.ts`
- `src/components/islands/overlay-utils.ts`
- `src/components/islands/useZoomHint.ts`

### Overlay implementations
- `src/components/islands/markdown/MarkdownNote.tsx`
- `src/components/islands/new-lex/NewLexNote.tsx`
- `src/components/islands/new-lex/NewLexEditor.tsx`
- `src/components/islands/kanban/KanbanBoard.tsx`
- `src/components/islands/kanban/KanbanColumn.tsx`
- `src/components/islands/kanban/KanbanCardView.tsx`
- `src/components/islands/web-embed/WebEmbed.tsx`

## Core Mental Model

### 1. Custom elements start life as ordinary Excalidraw elements
`src/components/canvas/element-factories.ts` creates markdown, NewLex, kanban, and web embed items as Excalidraw `rectangle` elements with a `customData.type` field.

That means:

- selection is still Excalidraw selection
- dragging is still Excalidraw dragging
- resizing is still Excalidraw resizing
- rotation is still Excalidraw rotation
- scene order is still Excalidraw scene order

The overlay is not replacing Excalidraw's transform system. It is rendering a richer DOM view on top of an Excalidraw element that already exists.

### 2. Excalidraw remains the geometry source of truth
`src/components/canvas/CanvasCore.tsx` hosts the actual Excalidraw instance. Scene changes come from Excalidraw and are pushed into the unified store through the normal `onSceneChange` path.

`src/stores/slices/canvasSlice.ts` stores the current:

- `elements`
- `appState`
- `selectedElementIds`
- `scrollX`
- `scrollY`
- `zoom`

Those values are what the overlays read in order to stay visually aligned with the canvas.

### 3. `CanvasNotesLayer` is the shared synchronization layer
`src/components/canvas/CanvasNotesLayer.tsx` is the main unifying implementation for custom overlays.

It does four important things:

1. It polls `api.getSceneElements()` and `api.getAppState()` every animation frame.
2. It groups custom elements by type with `collectOverlayElements()`.
3. It tracks scene order as `stackIndex`.
4. It calls each mounted overlay's `updateTransform(...)` method every frame.

This is the key reason movement feels unified: every overlay uses the same geometry feed from the same Excalidraw scene state.

React is only used there for mount/unmount and prop refresh. The actual top/left/width/height/rotate updates are done by direct DOM mutation through each overlay ref for smoother sync.

## Movement, Dragging, Rotation, and Resizing Flow

When a user drags or resizes a custom element, the flow is:

1. Excalidraw changes the element's `x`, `y`, `width`, `height`, and/or `angle`.
2. `CanvasCore` and the canvas store receive that updated scene state.
3. `CanvasNotesLayer` reads the latest scene on the next animation frame.
4. `CanvasNotesLayer` calls `updateTransform(...)` on the matching overlay instance.
5. The overlay mutates its outer DOM container so it visually matches the Excalidraw element exactly.

This means the overlay component does not "perform" the drag or resize itself. It only follows the result of the drag or resize that Excalidraw already performed.

## Shared Overlay Contract

### Parsing and writing custom data
`src/components/canvas/overlay-registry.ts` defines the common registry for:

- how each overlay type is detected from `customData.type`
- how an Excalidraw element is parsed into an overlay element shape
- how overlay props are created
- how overlay content changes are written back into `customData`

Important distinction:

- geometry changes come from Excalidraw
- content/data changes come from `applyUpdate()` in the registry

`applyOverlayUpdateByType()` and `bumpElementVersion()` are used when an overlay changes its own content, such as markdown text, lexical state, comments, kanban board data, or embed URL.

### Shared z-index rules
`src/components/islands/overlay-utils.ts` gives every overlay the same stacking strategy through `getOverlayZIndex(isSelected, isEditing, stackIndex)`.

The current pattern is:

- base z-index follows scene order
- selected overlays are raised inside their scene band
- editing overlays are raised above selected overlays

This keeps overlay layering consistent with Excalidraw order while still letting active/editing elements sit above nearby siblings.

### Shared wheel and zoom behavior
`src/components/islands/useZoomHint.ts` is another important shared piece.

It mediates wheel input for overlays so that:

- `ctrl` or pinch zoom is forwarded to Excalidraw
- `meta` wheel is forwarded as canvas pan
- plain wheel can either pan the canvas or show the zoom hint depending on whether the overlay is currently meant to intercept interaction

This is why scroll and zoom behavior stays mostly consistent even though the user is hovering DOM overlays rather than the raw Excalidraw canvas.

### Shared outer-container pattern
All current overlays follow the same high-level DOM structure:

- outer transformed container: `position: absolute`, `pointerEvents: none`
- inner content surface: enables `pointerEvents` only when the overlay should be interactive

That pattern is important because it lets Excalidraw continue to own selection/dragging when the overlay is not in an interactive mode.

## Subtle Shared Behavior in `CanvasNotesLayer`

### Overlay order follows scene order
`CanvasNotesLayer` computes a `stackIndex` from the current scene array order and passes that into overlays. That is what keeps overlay stacking aligned with Excalidraw's element order.

### Auto bring-to-front exists during prolonged overlap
`CanvasNotesLayer` also contains auto-front logic:

- it watches for a single selected element being dragged
- it computes rotated bounds overlap
- if the selected element hovers on top of another element long enough, it reorders the scene and reselects the dragged element

So although Excalidraw owns dragging, `CanvasNotesLayer` still adds one shared behavior on top of it: prolonged overlap can promote the dragged element in scene order.

### Deselect is centralized
The shared deselect handler in `CanvasNotesLayer` clears `selectedElementIds` through `api.updateScene({ appState: { selectedElementIds: {} } })`.

This matters because some overlays call back into that shared deselect path rather than reaching directly into Excalidraw selection logic themselves.

## Per-Overlay Differences

### Markdown Note
`src/components/islands/markdown/MarkdownNote.tsx`

Markdown uses the clearest version of the selected-versus-editing split.

Behavior:

- if unselected, the overlay is non-interactive
- if selected but not editing, it behaves like a canvas object and still lets Excalidraw own whole-note movement
- double click enters edit mode
- click outside exits edit mode
- `Escape` exits edit mode and deselects

Implementation details:

- `isInteractive = isEditing || isSelected`
- `pointerEvents` are only enabled on the inner surface when interactive
- `userSelect` is only enabled while editing
- `updateTransform(...)` mirrors Excalidraw geometry each frame

Markdown also has search highlight behavior wired up through:

- `canvas:note-search-highlight`
- `canvas:note-search-clear`

That search integration is specific to markdown and is not part of the core movement model.

### NewLex Note
`src/components/islands/new-lex/NewLexNote.tsx`
`src/components/islands/new-lex/NewLexEditor.tsx`

NewLex now follows the same broad interaction pattern as markdown for whole-note interaction.

Behavior:

- if unselected, the note shell does not accept pointer input
- if selected but not editing, Excalidraw remains in control of whole-note movement
- double click enters edit mode
- click outside exits edit mode
- `Escape` exits edit mode and calls the shared deselect path

Implementation details:

- `isInteractive = isEditing || isSelected`
- the outer transformed shell is non-interactive
- the inner content surface only enables pointer events when selected or editing
- the Lexical editor is set editable only while `isEditing` is true
- the formatting toolbar is rendered only while editing

Subtle differences from markdown:

- NewLex carries a second persistence path for comments and a comments panel
- lexical content writes are debounced
- comment writes are also debounced, but flushed separately
- focus is pushed into the contenteditable area on edit entry

So the whole-note movement model is shared with markdown, but the internal editor behavior is more complex because the note contains a stateful Lexical editor and threaded comments.

### Kanban Board
`src/components/islands/kanban/KanbanBoard.tsx`
`src/components/islands/kanban/KanbanColumn.tsx`
`src/components/islands/kanban/KanbanCardView.tsx`

Kanban is the biggest interaction exception.

For whole-board interaction:

- the board follows Excalidraw geometry exactly like the other overlays
- `updateTransform(...)` is still driven by `CanvasNotesLayer`
- the outer shell still uses `pointerEvents: none`

But unlike markdown and NewLex, kanban does not have a separate whole-board edit mode. It becomes interactive whenever the Excalidraw element is selected.

That means:

- `isInteracting = selected`
- the board surface enables pointer events as soon as the board is selected
- there is no extra double-click-to-edit gate for the whole board

There is also a second movement system inside the board:

- cards are draggable within and across columns using DOM drag-and-drop
- that internal card movement is not Excalidraw movement
- it updates kanban board data, not the board element's canvas geometry

So kanban has two distinct layers of movement:

- whole-board movement: Excalidraw-owned
- card movement inside the board: kanban-owned

### Web Embed
`src/components/islands/web-embed/WebEmbed.tsx`

Web embed shares the same inline overlay pattern only part of the time.

In `inline` mode:

- it behaves like the other overlays
- Excalidraw owns the geometry
- `updateTransform(...)` keeps the DOM container aligned to the scene element

But in `pip` and `expanded` modes:

- the embed switches to `position: fixed`
- it stops following the Excalidraw transform
- `updateTransform(...)` early-returns unless the view mode is `inline`

That makes web embed the main exception to the "overlay always follows canvas geometry" rule.

Its interaction rules are also mode-aware:

- inline mode uses canvas-style selection and interaction gating
- PIP mode has its own drag logic for the floating window
- expanded mode is effectively detached from canvas movement entirely

## What Resizing Actually Means Here

For markdown, NewLex, kanban, and inline web embeds, resizing means:

1. Excalidraw changes the underlying element's `width` and `height`.
2. `CanvasNotesLayer` reads the new size.
3. The overlay's `updateTransform(...)` updates its DOM width and height.
4. The overlay rerenders its internal layout inside those new bounds.

So if resizing feels wrong for a custom element, the bug is usually in one of three places:

- the Excalidraw element geometry itself
- the overlay's `updateTransform(...)` implementation
- the overlay's internal layout/CSS under the new dimensions

It is usually not a separate custom resize engine.

## Practical Rules For Future Custom Elements

If you add another Excalidraw overlay element, it should usually follow this pattern:

1. Create it as a normal Excalidraw element with `customData.type`.
2. Register it in `overlay-registry.ts`.
3. Render it from `CanvasNotesLayer`.
4. Implement `updateTransform(...)` so it mirrors Excalidraw geometry.
5. Keep the outer transformed container non-interactive.
6. Enable inner `pointerEvents` only when the overlay should temporarily own input.
7. Use `getOverlayZIndex(...)` for consistent layering.
8. Use `useZoomHint(...)` so wheel and zoom behavior stays consistent with the canvas.

If the element has an editing mode, the markdown/NewLex pattern is the closest reference.

If the element has its own internal drag-and-drop surface, the kanban pattern is the closest reference.

If the element can detach into a floating or modal surface, the web embed pattern is the closest reference.

## Summary

The unifying rule in this codebase is not "every custom element implements dragging the same way."

The unifying rule is:

- Excalidraw owns whole-element geometry
- `CanvasNotesLayer` mirrors that geometry into DOM overlays
- each overlay decides when it should become interactive without taking over the canvas transform system

The subtle differences are mostly about interaction gating:

- markdown: selected vs editing
- NewLex: selected vs editing, plus Lexical/comment state
- kanban: selected means interactive immediately, plus internal card drag
- web embed: inline follows canvas, PIP/expanded can detach from it
