// Main component
export { MarkdownNote } from './MarkdownNote';

// Error boundary
export { ErrorBoundary as MarkdownErrorBoundary } from './components';

// Types
export type {
    MarkdownNoteProps,
    MarkdownNoteRef,
    MarkdownElement,
    AppState,
    ResizeHandle,
    EdgeProximity,
    DragStartRef,
    ResizeStartRef,
    RotateStartRef,
    Theme,
} from './types';

// Constants
export {
    MIN_WIDTH,
    MIN_HEIGHT,
    EDGE_THRESHOLD,
    HANDLE_SIZE,
    DEFAULT_NOTE_WIDTH,
    DEFAULT_NOTE_HEIGHT,
    DEFAULT_NOTE_CONTENT,
} from './types';
