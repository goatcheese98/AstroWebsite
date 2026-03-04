import { nanoid } from 'nanoid';
import type { ExcalidrawAppState, ExcalidrawElement } from '@/stores';
import {
  DEFAULT_NOTE_CONTENT,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_NOTE_WIDTH,
} from '@/components/islands/markdown';
import { DEFAULT_NEWLEX_CONTENT } from '@/components/islands/new-lex';

export type CanvasElementInput = Partial<ExcalidrawElement> & {
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  points?: [number, number][];
};

export interface SceneCenter {
  x: number;
  y: number;
}

interface BoundingFallback {
  width: number;
  height: number;
}

const DEFAULT_VIEWPORT_WIDTH = 800;
const DEFAULT_VIEWPORT_HEIGHT = 600;

export function getViewportSceneCenter(
  appState: Partial<ExcalidrawAppState>,
): SceneCenter {
  const zoomValue =
    typeof appState.zoom?.value === 'number' && appState.zoom.value > 0
      ? appState.zoom.value
      : 1;
  const scrollX = typeof appState.scrollX === 'number' ? appState.scrollX : 0;
  const scrollY = typeof appState.scrollY === 'number' ? appState.scrollY : 0;
  const viewportCenterX =
    (typeof appState.width === 'number' ? appState.width : DEFAULT_VIEWPORT_WIDTH) / 2;
  const viewportCenterY =
    (typeof appState.height === 'number' ? appState.height : DEFAULT_VIEWPORT_HEIGHT) / 2;

  return {
    x: viewportCenterX / zoomValue - scrollX,
    y: viewportCenterY / zoomValue - scrollY,
  };
}

function computeElementsCenter(
  elements: CanvasElementInput[],
  fallback: BoundingFallback,
): SceneCenter {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((element) => {
    const x = element.x ?? 0;
    const y = element.y ?? 0;
    const width = element.width ?? fallback.width;
    const height = element.height ?? fallback.height;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

export function centerElementsOnScene(
  elements: CanvasElementInput[],
  targetCenter: SceneCenter,
  fallback: BoundingFallback = { width: 100, height: 100 },
): CanvasElementInput[] {
  if (elements.length === 0) {
    return [];
  }

  const sourceCenter = computeElementsCenter(elements, fallback);
  const offsetX = targetCenter.x - sourceCenter.x;
  const offsetY = targetCenter.y - sourceCenter.y;

  return elements.map((element) => ({
    ...element,
    x: (element.x ?? 0) + offsetX,
    y: (element.y ?? 0) + offsetY,
  }));
}

export function centerElementsInViewport(
  elements: CanvasElementInput[],
  appState: Partial<ExcalidrawAppState>,
  fallback?: BoundingFallback,
): CanvasElementInput[] {
  return centerElementsOnScene(elements, getViewportSceneCenter(appState), fallback);
}

function createCenteredRect(
  sceneCenter: SceneCenter,
  width: number,
  height: number,
): Pick<CanvasElementInput, 'x' | 'y' | 'width' | 'height'> {
  return {
    x: sceneCenter.x - width / 2,
    y: sceneCenter.y - height / 2,
    width,
    height,
  };
}

export function createMarkdownElementDraft(sceneCenter: SceneCenter): CanvasElementInput {
  const width = DEFAULT_NOTE_WIDTH;
  const height = DEFAULT_NOTE_HEIGHT;

  return {
    type: 'rectangle',
    ...createCenteredRect(sceneCenter, width, height),
    backgroundColor: '#ffffff',
    strokeColor: 'transparent',
    strokeWidth: 0,
    roughness: 0,
    opacity: 100,
    fillStyle: 'solid',
    id: nanoid(),
    locked: false,
    customData: {
      type: 'markdown',
      content: DEFAULT_NOTE_CONTENT,
    },
  };
}

export async function createRichTextElementDraft(
  sceneCenter: SceneCenter,
): Promise<CanvasElementInput> {
  const { DEFAULT_NOTE_STATE } = await import('@/components/islands/rich-text');
  const width = 1000;
  const height = 1200;

  return {
    type: 'rectangle',
    ...createCenteredRect(sceneCenter, width, height),
    backgroundColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 1,
    roughness: 0,
    opacity: 100,
    fillStyle: 'solid',
    roundness: { type: 3 },
    id: nanoid(),
    locked: false,
    customData: {
      type: 'lexical',
      lexicalState: DEFAULT_NOTE_STATE,
      version: 1,
    },
  };
}

export function createNewLexElementDraft(sceneCenter: SceneCenter): CanvasElementInput {
  const width = 920;
  const height = 980;

  return {
    type: 'rectangle',
    ...createCenteredRect(sceneCenter, width, height),
    backgroundColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 1,
    roughness: 0,
    opacity: 100,
    fillStyle: 'solid',
    roundness: { type: 3 },
    id: nanoid(),
    locked: false,
    customData: {
      type: 'newlex',
      content: DEFAULT_NEWLEX_CONTENT,
      comments: [],
      commentsPanelOpen: false,
      version: 1,
    },
  };
}

export async function createKanbanElementDraft(
  sceneCenter: SceneCenter,
): Promise<CanvasElementInput> {
  const { DEFAULT_BOARD } = await import('@/components/islands/kanban/kanban-types');
  const width = 1400;
  const height = 800;

  return {
    type: 'rectangle',
    ...createCenteredRect(sceneCenter, width, height),
    backgroundColor: '#faf8f2',
    strokeColor: 'rgba(0,0,0,0.12)',
    strokeWidth: 1,
    roughness: 0,
    opacity: 100,
    fillStyle: 'solid',
    id: nanoid(),
    locked: false,
    customData: {
      ...DEFAULT_BOARD,
      title: 'Kanban Board',
    },
  };
}

export function createWebEmbedElementDraft(sceneCenter: SceneCenter): CanvasElementInput {
  const width = 700;
  const height = 500;

  return {
    type: 'rectangle',
    ...createCenteredRect(sceneCenter, width, height),
    backgroundColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 4,
    roughness: 0,
    opacity: 100,
    fillStyle: 'solid',
    id: nanoid(),
    locked: false,
    customData: {
      type: 'web-embed',
      url: '',
      title: 'Web Embed',
    },
  };
}

export function createImageElementDraft(
  sceneCenter: SceneCenter,
  options: {
    width?: number;
    height?: number;
    fileId: string;
  },
): CanvasElementInput {
  const width = options.width || 400;
  const height = options.height || 300;

  return {
    id: nanoid(),
    type: 'image',
    ...createCenteredRect(sceneCenter, width, height),
    angle: 0,
    strokeColor: 'transparent',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roundness: null,
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    fileId: options.fileId,
    status: 'saved',
    scale: [1, 1] as [number, number],
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Date.now(),
  };
}
