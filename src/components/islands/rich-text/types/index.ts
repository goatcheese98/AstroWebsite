/**
 * Props for the LexicalNote component
 */
export interface LexicalNoteProps {
    /** The Excalidraw element containing customData with Lexical state */
    element: LexicalElement;
    /** Current app state for positioning calculations */
    appState: AppState;
    /** Scene stacking index used for cross-overlay z-order */
    stackIndex?: number;
    /** Callback when content changes */
    onChange: (id: string, updates: { lexicalState?: string; backgroundOpacity?: number }) => void;
    /** Callback to deselect the note/element */
    onDeselect?: () => void;
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
    backgroundColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    fillStyle?: 'hachure' | 'cross-hatch' | 'solid';
    roundness?: { type: number; value?: number } | null;
    roughness?: number;
    opacity?: number;
    boundElements?: any[];
    customData?: {
        type: 'lexical';
        lexicalState: string;  // Serialized Lexical editor state (JSON)
        backgroundOpacity?: number; // 0 to 1
        blurAmount?: number;        // 0 to 20 (px)
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
export const DEFAULT_NOTE_STATE = `{
  "root": {
    "children": [
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Document Workspace",
            "type": "text",
            "version": 1
          }
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "heading",
        "version": 1,
        "tag": "h1"
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Plan, format, and share polished notes. Try rich content below.",
            "type": "text",
            "version": 1
          }
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1,
        "textFormat": 0,
        "textStyle": ""
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "References: ",
            "type": "text",
            "version": 1
          },
          {
            "children": [
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "",
                "text": "Lexical Docs",
                "type": "text",
                "version": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "link",
            "version": 1,
            "rel": null,
            "target": null,
            "title": null,
            "url": "https://lexical.dev"
          },
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": " • ",
            "type": "text",
            "version": 1
          },
          {
            "children": [
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "",
                "text": "Heroicons",
                "type": "text",
                "version": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "link",
            "version": 1,
            "rel": null,
            "target": null,
            "title": null,
            "url": "https://heroicons.com"
          },
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": " • ",
            "type": "text",
            "version": 1
          },
          {
            "children": [
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "",
                "text": "SVG Asset",
                "type": "text",
                "version": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "link",
            "version": 1,
            "rel": null,
            "target": null,
            "title": null,
            "url": "https://heroicons.com/24/outline/document-text"
          },
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": " • ",
            "type": "text",
            "version": 1
          },
          {
            "children": [
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "",
                "text": "GIF Asset",
                "type": "text",
                "version": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "link",
            "version": 1,
            "rel": null,
            "target": null,
            "title": null,
            "url": "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif"
          }
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1,
        "textFormat": 0,
        "textStyle": ""
      },
      {
        "children": [
          {
            "children": [
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "",
                "text": "Use headings, highlights, and links for narrative docs",
                "type": "text",
                "version": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "listitem",
            "version": 1,
            "checked": true,
            "value": 1
          },
          {
            "children": [
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "",
                "text": "Open linked SVG/GIF assets and pair with a Web Embed note for inline playback",
                "type": "text",
                "version": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "listitem",
            "version": 1,
            "checked": false,
            "value": 2
          }
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "list",
        "version": 1,
        "listType": "check",
        "start": 1,
        "tag": "ul"
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "Feature Snapshot",
            "type": "text",
            "version": 1
          }
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1,
        "textFormat": 1,
        "textStyle": ""
      },
      {
        "children": [
          {
            "children": [
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Capability",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 3,
                "rowSpan": 1
              },
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Rich Text Note",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 1,
                "rowSpan": 1
              },
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Best Use",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 1,
                "rowSpan": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "tablerow",
            "version": 1
          },
          {
            "children": [
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Hyperlinks",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 2,
                "rowSpan": 1
              },
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Native + styled",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 0,
                "rowSpan": 1
              },
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Specs, references, source trails",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 0,
                "rowSpan": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "tablerow",
            "version": 1
          },
          {
            "children": [
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Tables",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 2,
                "rowSpan": 1
              },
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Native editable grid",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 0,
                "rowSpan": 1
              },
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Roadmaps, comparisons, tracking",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 0,
                "rowSpan": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "tablerow",
            "version": 1
          },
          {
            "children": [
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "SVG / GIF media",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 2,
                "rowSpan": 1
              },
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Link out + pair with Web Embed",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 0,
                "rowSpan": 1
              },
              {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": "Interactive demos and animation previews",
                        "type": "text",
                        "version": 1
                      }
                    ],
                    "direction": null,
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1,
                    "textFormat": 0,
                    "textStyle": ""
                  }
                ],
                "direction": null,
                "format": "",
                "indent": 0,
                "type": "tablecell",
                "version": 1,
                "backgroundColor": null,
                "colSpan": 1,
                "headerState": 0,
                "rowSpan": 1
              }
            ],
            "direction": null,
            "format": "",
            "indent": 0,
            "type": "tablerow",
            "version": 1
          }
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "table",
        "version": 1
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "const status = \\\"rich text upgraded\\\";",
            "type": "text",
            "version": 1
          }
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "code",
        "version": 1,
        "language": "javascript"
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 2,
            "mode": "normal",
            "style": "",
            "text": "Tip: Use Rich Text for polished docs, and Markdown for quick technical drafting.",
            "type": "text",
            "version": 1
          }
        ],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1,
        "textFormat": 2,
        "textStyle": ""
      }
    ],
    "direction": null,
    "format": "",
    "indent": 0,
    "type": "root",
    "version": 1
  }
}`;

/**
 * Editor configuration
 */
export const EDITOR_NAMESPACE = 'ExcalidrawLexicalEditor';
