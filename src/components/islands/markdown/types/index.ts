/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ⚪ types/index.ts              "The Type Definitions"                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I define the contracts. I ensure type safety across the markdown        ║
 * ║     feature. All interfaces, types, and constants live here.                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * @module markdown/types
 */

/**
 * Props for the MarkdownNote component
 */
export interface MarkdownNoteProps {
    /** The Excalidraw element containing customData with markdown content */
    element: MarkdownElement;
    /** Current app state for positioning calculations */
    appState: AppState;
    /** Callback when content changes */
    onChange: (id: string, text: string) => void;
}

/**
 * Ref exposed by MarkdownNote for imperative operations
 */
export interface MarkdownNoteRef {
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
 * Arrow binding info
 */
export interface ArrowBinding {
    elementId: string;
    focus: number;
    gap: number;
}

/**
 * Arrow element structure (simplified)
 */
export interface ArrowElement {
    id: string;
    type: 'arrow';
    x: number;
    y: number;
    width: number;
    height: number;
    points: [number, number][];
    startBinding?: ArrowBinding;
    endBinding?: ArrowBinding;
    boundElements?: any[];
    version?: number;
    versionNonce?: number;
}

/**
 * The Excalidraw element with markdown-specific custom data
 */
export interface MarkdownElement {
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
        type: 'markdown';
        content: string;
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
 * Resize handle positions
 */
export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * Configuration for resize handles
 */
export interface HandleConfig {
    pos: ResizeHandle;
    style: React.CSSProperties;
}

/**
 * Configuration for edge handles with visibility condition
 */
export interface EdgeHandleConfig extends HandleConfig {
    show: boolean;
}

/**
 * Edge proximity state for showing edge resize handles
 */
export interface EdgeProximity {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
}

/**
 * Drag start reference data
 */
export interface DragStartRef {
    x: number;
    y: number;
    elementX: number;
    elementY: number;
}

/**
 * Resize start reference data
 */
export interface ResizeStartRef {
    x: number;
    y: number;
    elementX: number;
    elementY: number;
    elementWidth: number;
    elementHeight: number;
    handle: ResizeHandle;
}

/**
 * Rotation start reference data
 */
export interface RotateStartRef {
    angle: number;
    centerX: number;
    centerY: number;
    initialMouseAngle: number;
}

/**
 * Theme options
 */
export type Theme = 'light' | 'dark';

/**
 * CSS custom properties for markdown styling
 */
export interface MarkdownCSSProperties extends React.CSSProperties {
    '--markdown-bg'?: string;
    '--markdown-fg'?: string;
    '--markdown-border'?: string;
    '--markdown-accent'?: string;
}

/**
 * Minimum dimensions for a markdown note
 */
export const MIN_WIDTH = 100;
export const MIN_HEIGHT = 80;

/**
 * Default edge threshold for showing resize handles (pixels)
 */
export const EDGE_THRESHOLD = 50;

/**
 * Default handle size (pixels)
 */
export const HANDLE_SIZE = 10;

/**
 * Default dimensions for new notes
 */
export const DEFAULT_NOTE_WIDTH = 500;
export const DEFAULT_NOTE_HEIGHT = 350;

/**
 * Default content for new notes
 */
export const DEFAULT_NOTE_CONTENT = `# 📝 New Note

Double-click to edit this note.

## Markdown Supported
- **Bold** and *italic* text
- Lists and checkboxes
- Code blocks with syntax highlighting
- Tables, links, and more!

\`\`\`javascript
const example = "Hello World";
\`\`\``;
