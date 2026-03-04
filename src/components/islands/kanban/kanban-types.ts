export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  labels?: string[];
  priority?: 'low' | 'medium' | 'high';
  checklist?: Array<{ text: string; done: boolean }>;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  cards: KanbanCard[];
}

export interface KanbanBoardData {
  type: 'kanban';
  title: string;
  columns: KanbanColumn[];
  theme?: 'sketch' | 'clean';
  bgTheme?: string;
  fontId?: string;
  fontSize?: number;
}

export type KanbanOperation =
  | { op: 'add_card'; columnId: string; card: Partial<KanbanCard> }
  | { op: 'update_card'; cardId: string; changes: Partial<KanbanCard> }
  | { op: 'delete_card'; cardId: string }
  | { op: 'move_card'; cardId: string; toColumnId: string; toIndex?: number }
  | { op: 'add_column'; column: Partial<KanbanColumn> }
  | { op: 'update_column'; columnId: string; changes: Partial<KanbanColumn> }
  | { op: 'delete_column'; columnId: string }
  | { op: 'reorder_cards'; columnId: string; cardIds: string[] };

export interface KanbanElement {
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
  opacity?: number;
  fontFamily?: number;
  roundness?: { type: number; value?: number } | null;
  customData: KanbanBoardData;
}

export interface KanbanNoteRef {
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

export interface AppState {
  scrollX: number;
  scrollY: number;
  zoom: { value: number };
  selectedElementIds?: Record<string, boolean>;
}

export interface BoardTheme {
  id: string;
  name: string;
  boardBg: string;
  headerBg: string;
  colBg: string;
  cardBg: string;
  border: string;
}

export interface BoardFont {
  id: string;
  name: string;
  family: string;
  label: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'parchment',
    name: 'Parchment',
    boardBg: 'rgba(250,248,242,0.97)',
    headerBg: 'rgba(255,255,255,0.6)',
    colBg: '#f5f0e8',
    cardBg: '#fffef5',
    border: 'rgba(0,0,0,0.12)',
  },
  {
    id: 'white',
    name: 'White',
    boardBg: '#ffffff',
    headerBg: '#f8f9fa',
    colBg: '#f3f4f6',
    cardBg: '#ffffff',
    border: 'rgba(0,0,0,0.10)',
  },
  {
    id: 'blue',
    name: 'Blue',
    boardBg: '#eff6ff',
    headerBg: 'rgba(219,234,254,0.7)',
    colBg: '#dbeafe',
    cardBg: '#f0f7ff',
    border: 'rgba(59,130,246,0.18)',
  },
  {
    id: 'green',
    name: 'Green',
    boardBg: '#f0fdf4',
    headerBg: 'rgba(220,252,231,0.7)',
    colBg: '#dcfce7',
    cardBg: '#f7fffc',
    border: 'rgba(16,185,129,0.18)',
  },
  {
    id: 'rose',
    name: 'Rose',
    boardBg: '#fff1f2',
    headerBg: 'rgba(255,228,230,0.7)',
    colBg: '#ffe4e6',
    cardBg: '#fff5f6',
    border: 'rgba(244,63,94,0.18)',
  },
  {
    id: 'violet',
    name: 'Violet',
    boardBg: '#f5f3ff',
    headerBg: 'rgba(237,233,254,0.7)',
    colBg: '#ede9fe',
    cardBg: '#faf8ff',
    border: 'rgba(139,92,246,0.18)',
  },
  {
    id: 'amber',
    name: 'Amber',
    boardBg: '#fffbeb',
    headerBg: 'rgba(254,243,199,0.7)',
    colBg: '#fef3c7',
    cardBg: '#fffef5',
    border: 'rgba(245,158,11,0.18)',
  },
  {
    id: 'slate',
    name: 'Slate',
    boardBg: '#f8fafc',
    headerBg: 'rgba(226,232,240,0.7)',
    colBg: '#e2e8f0',
    cardBg: '#f8fafc',
    border: 'rgba(100,116,139,0.18)',
  },
];

export const BOARD_FONTS: BoardFont[] = [
  {
    id: 'virgil',
    name: 'Handwritten',
    family: "'Virgil', 'Comic Sans MS', cursive",
    label: 'Handwritten',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit', system-ui, sans-serif",
    label: 'Outfit',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    family: "'DM Sans', system-ui, sans-serif",
    label: 'DM Sans',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    family: "'Space Grotesk', system-ui, sans-serif",
    label: 'Space Grotesk',
  },
  {
    id: 'playfair',
    name: 'Playfair',
    family: "'Playfair Display', Georgia, serif",
    label: 'Playfair',
  },
];

export const DEFAULT_BOARD: KanbanBoardData = {
  type: 'kanban',
  title: 'Kanban Board',
  bgTheme: 'parchment',
  fontId: 'outfit',
  fontSize: 13,
  columns: [
    {
      id: 'col-todo',
      title: 'To Do',
      color: '#6366f1',
      cards: [
        {
          id: 'card-1',
          title: 'Plan project structure',
          description: 'Define architecture and key milestones',
          priority: 'high',
          labels: ['planning'],
        },
        {
          id: 'card-2',
          title: 'Research competitors',
          priority: 'medium',
        },
      ],
    },
    {
      id: 'col-inprogress',
      title: 'In Progress',
      color: '#f59e0b',
      cards: [
        {
          id: 'card-3',
          title: 'Design wireframes',
          description: 'Create low-fidelity mockups for main screens',
          priority: 'high',
          labels: ['design'],
          checklist: [
            { text: 'Home page', done: true },
            { text: 'Dashboard', done: false },
            { text: 'Settings', done: false },
          ],
        },
      ],
    },
    {
      id: 'col-done',
      title: 'Done',
      color: '#10b981',
      cards: [
        {
          id: 'card-4',
          title: 'Set up repository',
          priority: 'low',
          labels: ['devops'],
        },
      ],
    },
  ],
};

export const LABEL_COLORS: Record<string, string> = {
  planning: '#dbeafe',
  design: '#fce7f3',
  devops: '#d1fae5',
  bug: '#fee2e2',
  feature: '#ede9fe',
  docs: '#fef3c7',
  research: '#e0f2fe',
  review: '#f3f4f6',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};
