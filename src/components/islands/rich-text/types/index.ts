/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  📝 types/index.ts              "The Type Definitions"                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I define the contracts for the Lexical rich text editor. I ensure type  ║
 * ║     safety across the rich text feature.                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * @module rich-text/types
 */

/**
 * Props for the LexicalNote component
 */
export interface LexicalNoteProps {
    /** The Excalidraw element containing customData with Lexical state */
    element: LexicalElement;
    /** Current app state for positioning calculations */
    appState: AppState;
    /** Callback when content changes */
    onChange: (id: string, lexicalState: string) => void;
}

/**
 * Ref exposed by LexicalNote for imperative operations
 */
export interface LexicalNoteRef {
    /** Export the note as an image */
    exportAsImage: () => Promise<{
        imageData: string;
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
            angle: number;
        };
    }>;
    /** Update position/transform directly on DOM (bypasses React render for smooth animation) */
    updateTransform: (x: number, y: number, width: number, height: number, angle: number, zoom: number, scrollX: number, scrollY: number) => void;
}

/**
 * The Excalidraw element with Lexical-specific custom data
 */
export interface LexicalElement {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle?: number;
    isDeleted?: boolean;
    version?: number;
    versionNonce?: number;
    locked?: boolean;
    boundElements?: any[];
    customData?: {
        type: 'lexical';
        lexicalState: string;  // Serialized Lexical editor state (JSON)
        version: number;       // For migrations
    };
}

/**
 * Excalidraw app state for positioning
 */
export interface AppState {
    scrollX: number;
    scrollY: number;
    zoom: {
        value: number;
    };
    selectedElementIds?: Record<string, boolean>;
}

/**
 * Theme options
 */
export type Theme = 'light' | 'dark';

/**
 * CSS custom properties for Lexical styling
 */
export interface LexicalCSSProperties extends React.CSSProperties {
    '--lexical-bg'?: string;
    '--lexical-fg'?: string;
    '--lexical-border'?: string;
    '--lexical-accent'?: string;
    '--lexical-muted'?: string;
    '--lexical-code-bg'?: string;
}

/**
 * Minimum dimensions for a Lexical note
 */
export const MIN_WIDTH = 300;
export const MIN_HEIGHT = 200;

/**
 * Default dimensions for new Lexical notes
 */
export const DEFAULT_NOTE_WIDTH = 500;
export const DEFAULT_NOTE_HEIGHT = 400;

/**
 * Default content for new Lexical notes (serialized editor state)
 */
export const DEFAULT_NOTE_STATE = JSON.stringify({
    root: {
        children: [
            {
                children: [
                    {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: '📝 Rich Text Note',
                        type: 'text',
                        version: 1,
                    },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                tag: 'h1',
                type: 'heading',
                version: 1,
            },
            {
                children: [
                    {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'Double-click to edit with full formatting.',
                        type: 'text',
                        version: 1,
                    },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
            },
            {
                children: [
                    {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'Features include:',
                        type: 'text',
                        version: 1,
                    },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
            },
            {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Bold, italic, and formatting',
                                type: 'text',
                                version: 1,
                            },
                        ],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'listitem',
                        version: 1,
                        value: 1,
                    },
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Lists and checkboxes',
                                type: 'text',
                                version: 1,
                            },
                        ],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'listitem',
                        version: 1,
                        value: 2,
                    },
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Tables and code blocks',
                                type: 'text',
                                version: 1,
                            },
                        ],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'listitem',
                        version: 1,
                        value: 3,
                    },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                listType: 'bullet',
                start: 1,
                tag: 'ul',
                type: 'list',
                version: 1,
            },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
    },
});

/**
 * Editor configuration
 */
export const EDITOR_NAMESPACE = 'ExcalidrawLexicalEditor';
