export interface NewLexCommentReply {
  id: string;
  author: string;
  message: string;
  createdAt: number;
  deleted?: boolean;
}

export interface NewLexCommentThread {
  id: string;
  author: string;
  comment: string;
  commentDeleted?: boolean;
  anchorText: string;
  createdAt: number;
  resolved: boolean;
  collapsed: boolean;
  replies: NewLexCommentReply[];
}

export interface NewLexUpdatePayload {
  content?: string;
  comments?: NewLexCommentThread[];
  commentsPanelOpen?: boolean;
}

export interface NewLexNoteProps {
  element: NewLexElement;
  appState: AppState;
  stackIndex?: number;
  onChange: (id: string, updates: NewLexUpdatePayload) => void;
  onDeselect?: () => void;
}

export interface NewLexNoteRef {
  updateTransform: (
    x: number,
    y: number,
    width: number,
    height: number,
    angle: number,
    zoom: number,
    scrollX: number,
    scrollY: number,
  ) => void;
}

export interface NewLexElement {
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
  customData?: {
    type: 'newlex';
    content: string;
    comments?: NewLexCommentThread[];
    commentsPanelOpen?: boolean;
    version: number;
  };
}

export interface AppState {
  scrollX: number;
  scrollY: number;
  zoom: {
    value: number;
  };
  selectedElementIds?: Record<string, boolean>;
}

export const DEFAULT_NEWLEX_CONTENT = [
  '<h1>NewLex</h1>',
  '<p>Experimental high-performance note.</p>',
  '<ul>',
  '<li>Minimal rich text foundation</li>',
  '<li>No advanced embeds yet</li>',
  '</ul>',
].join('');
