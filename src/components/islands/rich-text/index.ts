// Main components
export { LexicalNote } from './LexicalNote';

// Editor
export { RichTextEditor } from './RichTextEditor';

// Toolbar
export { Toolbar } from './components/Toolbar';

// Types
export type {
    LexicalNoteProps,
    LexicalNoteRef,
    LexicalElement,
    AppState,
    Theme,
    LexicalCSSProperties,
} from './types';

// Constants
export {
    MIN_WIDTH,
    MIN_HEIGHT,
    DEFAULT_NOTE_WIDTH,
    DEFAULT_NOTE_HEIGHT,
    DEFAULT_NOTE_STATE,
    EDITOR_NAMESPACE,
} from './types';

// Theme
export {
    lightTheme,
    darkTheme,
    getLexicalTheme,
    getLexicalEditorStyles,
} from './themes/lexicalTheme';
