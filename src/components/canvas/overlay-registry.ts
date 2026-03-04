import type { ComponentType, RefAttributes } from 'react';
import type { ExcalidrawElement } from '@/stores';
import type {
  MarkdownElement,
  MarkdownNoteProps,
  MarkdownNoteRef,
} from '@/components/islands/markdown';
import type { MarkdownNoteSettings } from '@/components/islands/markdown/types';
import type { WebEmbedProps, WebEmbedRef } from '@/components/islands/web-embed';
import type {
  LexicalElement,
  LexicalNoteProps,
  LexicalNoteRef,
} from '@/components/islands/rich-text';
import type {
  KanbanBoardData,
  KanbanElement,
  KanbanNoteRef,
} from '@/components/islands/kanban';
import type {
  NewLexCommentThread,
  NewLexElement,
  NewLexNoteProps,
  NewLexNoteRef,
} from '@/components/islands/new-lex';

export type OverlayType =
  | 'markdown'
  | 'web-embed'
  | 'lexical'
  | 'newlex'
  | 'kanban';

export const OVERLAY_TYPES: OverlayType[] = [
  'markdown',
  'web-embed',
  'lexical',
  'newlex',
  'kanban',
];

const OVERLAY_TYPE_SET = new Set<OverlayType>(OVERLAY_TYPES);

export interface OverlayAppState {
  scrollX: number;
  scrollY: number;
  zoom: { value: number };
  selectedElementIds?: Record<string, boolean>;
}

export type OverlayTransformRef = {
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
};

export type OverlayElementsByType = {
  markdown: MarkdownElement[];
  'web-embed': ExcalidrawElement[];
  lexical: LexicalElement[];
  newlex: NewLexElement[];
  kanban: KanbanElement[];
};

export type OverlayRefsByType = {
  [K in OverlayType]: Map<string, OverlayTransformRef>;
};

export type OverlayUpdatePayloadMap = {
  markdown: {
    content: string;
    images?: Record<string, string>;
    settings?: MarkdownNoteSettings;
  };
  'web-embed': { url: string };
  lexical: {
    lexicalState?: string;
    backgroundOpacity?: number;
    blurAmount?: number;
  };
  newlex: {
    content?: string;
    comments?: NewLexCommentThread[];
    commentsPanelOpen?: boolean;
  };
  kanban: KanbanBoardData;
};

type KanbanBoardProps = {
  element: KanbanElement;
  appState: OverlayAppState;
  stackIndex?: number;
  onChange: (elementId: string, data: KanbanBoardData) => void;
};

type OverlayComponentPropsMap = {
  markdown: MarkdownNoteProps;
  'web-embed': WebEmbedProps;
  lexical: LexicalNoteProps;
  newlex: NewLexNoteProps;
  kanban: KanbanBoardProps;
};

export type OverlayComponentsByType = {
  markdown: ComponentType<MarkdownNoteProps & RefAttributes<MarkdownNoteRef>>;
  'web-embed': ComponentType<WebEmbedProps & RefAttributes<WebEmbedRef>>;
  lexical: ComponentType<LexicalNoteProps & RefAttributes<LexicalNoteRef>>;
  newlex: ComponentType<NewLexNoteProps & RefAttributes<NewLexNoteRef>>;
  kanban: ComponentType<KanbanBoardProps & RefAttributes<KanbanNoteRef>>;
};

type OverlayDescriptor<K extends OverlayType> = {
  type: K;
  parse: (
    element: ExcalidrawElement,
  ) => OverlayElementsByType[K][number] | null;
  createProps: (args: {
    element: OverlayElementsByType[K][number];
    appState: OverlayAppState;
    stackIndex: number;
    onUpdate: (elementId: string, payload: OverlayUpdatePayloadMap[K]) => void;
    onDeselect: () => void;
  }) => OverlayComponentPropsMap[K];
  applyUpdate: (
    element: ExcalidrawElement,
    payload: OverlayUpdatePayloadMap[K],
  ) => ExcalidrawElement;
};

type OverlayRegistry = {
  [K in OverlayType]: OverlayDescriptor<K>;
};

const toMarkdownElement = (element: ExcalidrawElement): MarkdownElement | null => {
  const customData = element.customData as Record<string, unknown> | undefined;
  if (
    element.isDeleted ||
    customData?.type !== 'markdown' ||
    typeof customData.content !== 'string'
  ) {
    return null;
  }

  const fillStyle =
    element.fillStyle === 'solid' ||
    element.fillStyle === 'hachure' ||
    element.fillStyle === 'cross-hatch'
      ? element.fillStyle
      : undefined;

  const strokeStyle =
    element.strokeStyle === 'solid' ||
    element.strokeStyle === 'dashed' ||
    element.strokeStyle === 'dotted'
      ? element.strokeStyle
      : undefined;

  return {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    angle: element.angle,
    isDeleted: element.isDeleted,
    version: element.version,
    versionNonce: element.versionNonce,
    locked: element.locked,
    backgroundColor: element.backgroundColor,
    strokeColor: element.strokeColor,
    strokeWidth: element.strokeWidth,
    strokeStyle,
    fillStyle,
    roundness: element.roundness as { type: number; value?: number } | null | undefined,
    roughness: element.roughness,
    opacity: element.opacity,
    fontFamily: typeof element.fontFamily === 'number' ? element.fontFamily : undefined,
    customData: {
      type: 'markdown' as const,
      content: customData.content,
      images: customData.images as Record<string, string> | undefined,
      settings: customData.settings as MarkdownNoteSettings | undefined,
    },
  };
};

const toLexicalElement = (element: ExcalidrawElement): LexicalElement | null => {
  const customData = element.customData as Record<string, unknown> | undefined;
  if (
    element.isDeleted ||
    customData?.type !== 'lexical' ||
    typeof customData.lexicalState !== 'string'
  ) {
    return null;
  }

  const fillStyle =
    element.fillStyle === 'solid' ||
    element.fillStyle === 'hachure' ||
    element.fillStyle === 'cross-hatch'
      ? element.fillStyle
      : undefined;

  const strokeStyle =
    element.strokeStyle === 'solid' ||
    element.strokeStyle === 'dashed' ||
    element.strokeStyle === 'dotted'
      ? element.strokeStyle
      : undefined;

  return {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    angle: element.angle,
    isDeleted: element.isDeleted,
    version: element.version,
    versionNonce: element.versionNonce,
    locked: element.locked,
    backgroundColor: element.backgroundColor,
    strokeColor: element.strokeColor,
    strokeWidth: element.strokeWidth,
    strokeStyle,
    fillStyle,
    roundness: element.roundness as { type: number; value?: number } | null | undefined,
    roughness: element.roughness,
    opacity: element.opacity,
    customData: {
      type: 'lexical',
      lexicalState: customData.lexicalState,
      backgroundOpacity:
        typeof customData.backgroundOpacity === 'number'
          ? customData.backgroundOpacity
          : undefined,
      blurAmount:
        typeof customData.blurAmount === 'number'
          ? customData.blurAmount
          : undefined,
      version: typeof customData.version === 'number' ? customData.version : 1,
    },
  };
};

const toKanbanElement = (element: ExcalidrawElement): KanbanElement | null => {
  const customData = element.customData as Record<string, unknown> | undefined;
  if (
    element.isDeleted ||
    customData?.type !== 'kanban' ||
    !Array.isArray(customData.columns)
  ) {
    return null;
  }

  const fillStyle =
    element.fillStyle === 'solid' ||
    element.fillStyle === 'hachure' ||
    element.fillStyle === 'cross-hatch'
      ? element.fillStyle
      : undefined;

  const strokeStyle =
    element.strokeStyle === 'solid' ||
    element.strokeStyle === 'dashed' ||
    element.strokeStyle === 'dotted'
      ? element.strokeStyle
      : undefined;

  return {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    angle: element.angle,
    isDeleted: element.isDeleted,
    version: element.version,
    versionNonce: element.versionNonce,
    locked: element.locked,
    backgroundColor: element.backgroundColor,
    strokeColor: element.strokeColor,
    strokeWidth: element.strokeWidth,
    strokeStyle,
    fillStyle,
    opacity: element.opacity,
    fontFamily: typeof element.fontFamily === 'number' ? element.fontFamily : undefined,
    roundness: element.roundness as { type: number; value?: number } | null | undefined,
    customData: customData as unknown as KanbanBoardData,
  };
};

const toNewLexElement = (element: ExcalidrawElement): NewLexElement | null => {
  const customData = element.customData as Record<string, unknown> | undefined;
  if (
    element.isDeleted ||
    customData?.type !== 'newlex' ||
    typeof customData.content !== 'string'
  ) {
    return null;
  }

  const fillStyle =
    element.fillStyle === 'solid' ||
    element.fillStyle === 'hachure' ||
    element.fillStyle === 'cross-hatch'
      ? element.fillStyle
      : undefined;

  const strokeStyle =
    element.strokeStyle === 'solid' ||
    element.strokeStyle === 'dashed' ||
    element.strokeStyle === 'dotted'
      ? element.strokeStyle
      : undefined;

  return {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    angle: element.angle,
    isDeleted: element.isDeleted,
    version: element.version,
    versionNonce: element.versionNonce,
    locked: element.locked,
    backgroundColor: element.backgroundColor,
    strokeColor: element.strokeColor,
    strokeWidth: element.strokeWidth,
    strokeStyle,
    fillStyle,
    roundness: element.roundness as { type: number; value?: number } | null | undefined,
    roughness: element.roughness,
    opacity: element.opacity,
    customData: {
      type: 'newlex',
      content: customData.content,
      comments: Array.isArray(customData.comments)
        ? (customData.comments as NewLexCommentThread[])
        : [],
      commentsPanelOpen:
        typeof customData.commentsPanelOpen === 'boolean'
          ? customData.commentsPanelOpen
          : false,
      version: typeof customData.version === 'number' ? customData.version : 1,
    },
  };
};

const toWebEmbedElement = (element: ExcalidrawElement): ExcalidrawElement | null => {
  const customData = element.customData as Record<string, unknown> | undefined;
  if (element.isDeleted || customData?.type !== 'web-embed') {
    return null;
  }
  return element;
};

export function bumpElementVersion<T extends ExcalidrawElement>(element: T): T {
  return {
    ...element,
    version: (element.version || 0) + 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
  };
}

export const overlayRegistry: OverlayRegistry = {
  markdown: {
    type: 'markdown',
    parse: toMarkdownElement,
    createProps: ({ element, appState, stackIndex, onUpdate }) => ({
      element,
      appState,
      stackIndex,
      onChange: (elementId, content, images, settings) =>
        onUpdate(elementId, { content, images, settings }),
    }),
    applyUpdate: (element, payload) =>
      bumpElementVersion({
        ...element,
        customData: {
          ...element.customData,
          content: payload.content,
          ...(payload.images !== undefined ? { images: payload.images } : {}),
          ...(payload.settings !== undefined ? { settings: payload.settings } : {}),
        },
      }),
  },
  'web-embed': {
    type: 'web-embed',
    parse: toWebEmbedElement,
    createProps: ({ element, appState, stackIndex, onUpdate }) => ({
      element,
      appState,
      stackIndex,
      onChange: (elementId, url) => onUpdate(elementId, { url }),
    }),
    applyUpdate: (element, payload) =>
      bumpElementVersion({
        ...element,
        customData: {
          ...element.customData,
          url: payload.url,
        },
      }),
  },
  lexical: {
    type: 'lexical',
    parse: toLexicalElement,
    createProps: ({ element, appState, stackIndex, onUpdate, onDeselect }) => ({
      element,
      appState,
      stackIndex,
      onChange: (elementId, updates) => onUpdate(elementId, updates),
      onDeselect,
    }),
    applyUpdate: (element, payload) => {
      const nextCustomData = { ...element.customData };
      if (payload.lexicalState !== undefined) {
        nextCustomData.lexicalState = payload.lexicalState;
      }
      if (payload.backgroundOpacity !== undefined) {
        nextCustomData.backgroundOpacity = payload.backgroundOpacity;
      }
      if (payload.blurAmount !== undefined) {
        nextCustomData.blurAmount = payload.blurAmount;
      }

      return bumpElementVersion({
        ...element,
        customData: nextCustomData,
      });
    },
  },
  newlex: {
    type: 'newlex',
    parse: toNewLexElement,
    createProps: ({ element, appState, stackIndex, onUpdate, onDeselect }) => ({
      element,
      appState,
      stackIndex,
      onChange: (elementId, updates) => onUpdate(elementId, updates),
      onDeselect,
    }),
    applyUpdate: (element, payload) =>
      bumpElementVersion({
        ...element,
        customData: {
          ...element.customData,
          ...(payload.content !== undefined ? { content: payload.content } : {}),
          ...(payload.comments !== undefined ? { comments: payload.comments } : {}),
          ...(payload.commentsPanelOpen !== undefined
            ? { commentsPanelOpen: payload.commentsPanelOpen }
            : {}),
        },
      }),
  },
  kanban: {
    type: 'kanban',
    parse: toKanbanElement,
    createProps: ({ element, appState, stackIndex, onUpdate }) => ({
      element,
      appState,
      stackIndex,
      onChange: (elementId, data) => onUpdate(elementId, data),
    }),
    applyUpdate: (element, payload) =>
      bumpElementVersion({
        ...element,
        customData: { ...payload },
      }),
  },
};

let cachedOverlayComponents: Partial<OverlayComponentsByType> = {};

export async function loadOverlayComponents(): Promise<OverlayComponentsByType> {
  if (!cachedOverlayComponents.markdown) {
    const mod = await import('@/components/islands/markdown');
    cachedOverlayComponents.markdown = mod.MarkdownNote;
  }

  if (!cachedOverlayComponents['web-embed']) {
    const mod = await import('@/components/islands/web-embed');
    cachedOverlayComponents['web-embed'] = mod.WebEmbed;
  }

  if (!cachedOverlayComponents.lexical) {
    const mod = await import('@/components/islands/rich-text');
    cachedOverlayComponents.lexical = mod.LexicalNote;
  }

  if (!cachedOverlayComponents.newlex) {
    const mod = await import('@/components/islands/new-lex');
    cachedOverlayComponents.newlex = mod.NewLexNote;
  }

  if (!cachedOverlayComponents.kanban) {
    const mod = await import('@/components/islands/kanban');
    cachedOverlayComponents.kanban = mod.KanbanBoard;
  }

  return {
    markdown: cachedOverlayComponents.markdown!,
    'web-embed': cachedOverlayComponents['web-embed']!,
    lexical: cachedOverlayComponents.lexical!,
    newlex: cachedOverlayComponents.newlex!,
    kanban: cachedOverlayComponents.kanban!,
  };
}

export function createEmptyOverlayElements(): OverlayElementsByType {
  return {
    markdown: [],
    'web-embed': [],
    lexical: [],
    newlex: [],
    kanban: [],
  };
}

export function createOverlayRefMaps(): OverlayRefsByType {
  return {
    markdown: new Map(),
    'web-embed': new Map(),
    lexical: new Map(),
    newlex: new Map(),
    kanban: new Map(),
  };
}

export function isOverlayCustomDataType(value: unknown): value is OverlayType {
  return typeof value === 'string' && OVERLAY_TYPE_SET.has(value as OverlayType);
}

export function getOverlayTypeFromElement(
  element: ExcalidrawElement,
): OverlayType | null {
  const customData = element.customData as Record<string, unknown> | undefined;
  const typeCandidate = customData?.type;
  return isOverlayCustomDataType(typeCandidate) ? typeCandidate : null;
}

export function collectOverlayElements(
  elements: ExcalidrawElement[],
): OverlayElementsByType {
  const grouped = createEmptyOverlayElements();

  for (const element of elements) {
    const overlayType = getOverlayTypeFromElement(element);
    if (!overlayType) continue;

    const parsed = overlayRegistry[overlayType].parse(element as ExcalidrawElement);
    if (!parsed) continue;

    grouped[overlayType].push(parsed as never);
  }

  return grouped;
}

export function applyOverlayUpdateByType(
  type: OverlayType,
  element: ExcalidrawElement,
  payload: OverlayUpdatePayloadMap[OverlayType],
): ExcalidrawElement {
  return overlayRegistry[type].applyUpdate(element, payload as never);
}
