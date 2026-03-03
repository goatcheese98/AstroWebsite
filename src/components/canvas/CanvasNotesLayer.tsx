/**
 * CanvasNotesLayer
 *
 * Renders markdown, web-embed, and rich-text overlays on top of canvas.
 */

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from 'react';
import { useCommandSubscriber, type ExcalidrawAPI, type ExcalidrawElement } from '@/stores';
import type { MarkdownNoteProps, MarkdownNoteRef, MarkdownElement, AppState as OverlayAppState } from '@/components/islands/markdown';
import type { WebEmbedProps, WebEmbedRef } from '@/components/islands/web-embed';
import type { LexicalNoteProps, LexicalNoteRef, LexicalElement } from '@/components/islands/rich-text';
import type { KanbanNoteRef, KanbanElement, KanbanBoardData } from '@/components/islands/kanban';

type MarkdownNoteComponent = ForwardRefExoticComponent<MarkdownNoteProps & RefAttributes<MarkdownNoteRef>>;
type WebEmbedComponent = ForwardRefExoticComponent<WebEmbedProps & RefAttributes<WebEmbedRef>>;
type LexicalNoteComponent = ForwardRefExoticComponent<LexicalNoteProps & RefAttributes<LexicalNoteRef>>;
type KanbanBoardComponent = ForwardRefExoticComponent<{
  element: KanbanElement;
  appState: OverlayAppState;
  onChange: (elementId: string, data: KanbanBoardData) => void;
} & RefAttributes<KanbanNoteRef>>;

type ElementPatch = Partial<ExcalidrawElement> & { id: string };
type LexicalUpdates = {
  lexicalState?: string;
  backgroundOpacity?: number;
  blurAmount?: number;
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
    customData: {
      type: 'markdown',
      content: customData.content,
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

// Note: These components are loaded dynamically to avoid SSR issues
let MarkdownNoteComp: MarkdownNoteComponent | null = null;
let WebEmbedComp: WebEmbedComponent | null = null;
let LexicalNoteComp: LexicalNoteComponent | null = null;
let KanbanBoardComp: KanbanBoardComponent | null = null;

const loadComponents = async () => {
  if (!MarkdownNoteComp) {
    const mod = await import('@/components/islands/markdown');
    MarkdownNoteComp = mod.MarkdownNote;
  }
  if (!WebEmbedComp) {
    const mod = await import('@/components/islands/web-embed');
    WebEmbedComp = mod.WebEmbed;
  }
  if (!LexicalNoteComp) {
    const mod = await import('@/components/islands/rich-text');
    LexicalNoteComp = mod.LexicalNote;
  }
  if (!KanbanBoardComp) {
    const mod = await import('@/components/islands/kanban');
    KanbanBoardComp = mod.KanbanBoard as KanbanBoardComponent;
  }
  return { MarkdownNoteComp, WebEmbedComp, LexicalNoteComp, KanbanBoardComp };
};

interface CanvasNotesLayerProps {
  api: ExcalidrawAPI | null;
}

const toKanbanElement = (element: ExcalidrawElement): KanbanElement | null => {
  const customData = element.customData as Record<string, unknown> | undefined;
  if (
    element.isDeleted ||
    customData?.type !== 'kanban' ||
    !Array.isArray(customData.columns)
  ) {
    return null;
  }
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
    customData: customData as unknown as KanbanBoardData,
  };
};

export default function CanvasNotesLayer({ api }: CanvasNotesLayerProps) {
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [markdownElements, setMarkdownElements] = useState<MarkdownElement[]>([]);
  const [webEmbedElements, setWebEmbedElements] = useState<ExcalidrawElement[]>([]);
  const [lexicalElements, setLexicalElements] = useState<LexicalElement[]>([]);
  const [kanbanElements, setKanbanElements] = useState<KanbanElement[]>([]);

  // Refs for direct transform updates (bypass React for 60fps)
  const markdownRefs = useRef<Map<string, MarkdownNoteRef>>(new Map());
  const webEmbedRefs = useRef<Map<string, WebEmbedRef>>(new Map());
  const lexicalRefs = useRef<Map<string, LexicalNoteRef>>(new Map());
  const kanbanRefs = useRef<Map<string, KanbanNoteRef>>(new Map());
  const viewStateRef = useRef<OverlayAppState>({
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 1 },
    selectedElementIds: {},
  });
  
  // Load components on mount
  useEffect(() => {
    let mounted = true;
    loadComponents().then(() => {
      if (mounted) setComponentsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);
  
  // RAF polling loop - unified clock for zero-lag overlay sync
  useEffect(() => {
    if (!api || !componentsLoaded) return;
    
    let rafId: number;
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 16; // React state updates at ~60fps
    
    const pollState = (timestamp: number) => {
      try {
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        
        // Update view state ref
        viewStateRef.current = {
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoom: appState.zoom,
          selectedElementIds:
            appState.selectedElementIds as Record<string, boolean> | undefined,
        };
        
        // Filter elements by type
        const md = elements
          .map(toMarkdownElement)
          .filter((el): el is MarkdownElement => el !== null);
        const embeds = elements.filter((el: ExcalidrawElement) =>
          el.customData?.type === 'web-embed' && !el.isDeleted
        );
        const lex = elements
          .map(toLexicalElement)
          .filter((el): el is LexicalElement => el !== null);
        const kanban = elements
          .map(toKanbanElement)
          .filter((el): el is KanbanElement => el !== null);

        // UNIFIED CLOCK: Update transforms directly on refs (every frame, no React)
        md.forEach((el) => {
          const ref = markdownRefs.current.get(el.id);
          if (ref?.updateTransform) {
            ref.updateTransform(
              el.x, el.y, el.width, el.height, el.angle || 0,
              appState.zoom.value, appState.scrollX, appState.scrollY
            );
          }
        });

        embeds.forEach((el: ExcalidrawElement) => {
          const ref = webEmbedRefs.current.get(el.id);
          if (ref?.updateTransform) {
            ref.updateTransform(
              el.x, el.y, el.width, el.height, el.angle || 0,
              appState.zoom.value, appState.scrollX, appState.scrollY
            );
          }
        });

        lex.forEach((el) => {
          const ref = lexicalRefs.current.get(el.id);
          if (ref?.updateTransform) {
            ref.updateTransform(
              el.x, el.y, el.width, el.height, el.angle || 0,
              appState.zoom.value, appState.scrollX, appState.scrollY
            );
          }
        });

        kanban.forEach((el) => {
          const ref = kanbanRefs.current.get(el.id);
          if (ref?.updateTransform) {
            ref.updateTransform(
              el.x, el.y, el.width, el.height, el.angle || 0,
              appState.zoom.value, appState.scrollX, appState.scrollY
            );
          }
        });

        // React state updates ONLY for mounting/unmounting
        if (timestamp - lastUpdateTime > UPDATE_INTERVAL) {
          setMarkdownElements(md);
          setWebEmbedElements(embeds);
          setLexicalElements(lex);
          setKanbanElements(kanban);
          lastUpdateTime = timestamp;
        }
      } catch (err) {
        console.error('[CanvasNotesLayer] Error polling:', err);
      }
      
      rafId = requestAnimationFrame(pollState);
    };
    
    rafId = requestAnimationFrame(pollState);
    return () => cancelAnimationFrame(rafId);
  }, [api, componentsLoaded]);
  
  // Handle markdown content update
  const handleMarkdownUpdate = useCallback((elementId: string, content: string) => {
    if (!api) return;
    const elements = api.getSceneElements();
    const updated = elements.map((el: ExcalidrawElement) => {
      if (el.id === elementId) {
        return {
          ...el,
          customData: { ...el.customData, content },
          version: (el.version || 0) + 1,
          versionNonce: Math.floor(Math.random() * 2 ** 31),
        };
      }
      return el;
    });
    api.updateScene({ elements: updated });
  }, [api]);
  
  // Handle web embed update
  const handleWebEmbedUpdate = useCallback((elementId: string, url: string) => {
    if (!api) return;
    const elements = api.getSceneElements();
    const updated = elements.map((el: ExcalidrawElement) => {
      if (el.id === elementId) {
        return {
          ...el,
          customData: { ...el.customData, url },
          version: (el.version || 0) + 1,
          versionNonce: Math.floor(Math.random() * 2 ** 31),
        };
      }
      return el;
    });
    api.updateScene({ elements: updated });
  }, [api]);
  
  // Handle lexical update
  const handleLexicalUpdate = useCallback((elementId: string, updates: LexicalUpdates) => {
    if (!api) return;
    const elements = api.getSceneElements();
    const updated = elements.map((el: ExcalidrawElement) => {
      if (el.id === elementId) {
        const newCustomData = { ...el.customData };
        if (updates.lexicalState !== undefined) newCustomData.lexicalState = updates.lexicalState;
        if (updates.backgroundOpacity !== undefined) newCustomData.backgroundOpacity = updates.backgroundOpacity;
        if (updates.blurAmount !== undefined) newCustomData.blurAmount = updates.blurAmount;
        return {
          ...el,
          customData: newCustomData,
          version: (el.version || 0) + 1,
          versionNonce: Math.floor(Math.random() * 2 ** 31),
        };
      }
      return el;
    });
    api.updateScene({ elements: updated });
  }, [api]);
  
  // Handle kanban update
  const handleKanbanUpdate = useCallback((elementId: string, data: KanbanBoardData) => {
    if (!api) return;
    const elements = api.getSceneElements();
    const updated = elements.map((el: ExcalidrawElement) => {
      if (el.id === elementId) {
        return {
          ...el,
          customData: { ...data },
          version: (el.version || 0) + 1,
          versionNonce: Math.floor(Math.random() * 2 ** 31),
        };
      }
      return el;
    });
    api.updateScene({ elements: updated });
  }, [api]);

  // Deselect all elements
  const handleDeselect = useCallback(() => {
    if (!api) return;
    api.updateScene({ appState: { selectedElementIds: {} } });
  }, [api]);

  // Handle commands from the store (CanvasUI handles onInsertImage and onDrawElements)
  useCommandSubscriber({
    onUpdateElements: async (payload) => {
      if (!api) return;
      const { elements } = payload;
      
      const currentElements = api.getSceneElements();
      const elementMap = new Map(
        (elements as ElementPatch[]).map((el) => [el.id, el] as const)
      );
      
      const updatedElements = currentElements.map((el: ExcalidrawElement) => {
        if (elementMap.has(el.id)) {
          return {
            ...el,
            ...elementMap.get(el.id),
            version: (el.version || 0) + 1,
            versionNonce: Math.floor(Math.random() * 2 ** 31),
          };
        }
        return el;
      });
      
      api.updateScene({ elements: updatedElements });
    },
  });
  
  // Register/unregister refs
  const registerMarkdownRef = (id: string, ref: MarkdownNoteRef | null) => {
    if (ref) markdownRefs.current.set(id, ref);
    else markdownRefs.current.delete(id);
  };
  const registerWebEmbedRef = (id: string, ref: WebEmbedRef | null) => {
    if (ref) webEmbedRefs.current.set(id, ref);
    else webEmbedRefs.current.delete(id);
  };
  const registerLexicalRef = (id: string, ref: LexicalNoteRef | null) => {
    if (ref) lexicalRefs.current.set(id, ref);
    else lexicalRefs.current.delete(id);
  };
  const registerKanbanRef = (id: string, ref: KanbanNoteRef | null) => {
    if (ref) kanbanRefs.current.set(id, ref);
    else kanbanRefs.current.delete(id);
  };

  if (!componentsLoaded || !MarkdownNoteComp || !WebEmbedComp || !LexicalNoteComp || !KanbanBoardComp) {
    return null;
  }

  const MarkdownNote = MarkdownNoteComp;
  const WebEmbed = WebEmbedComp;
  const LexicalNote = LexicalNoteComp;
  const KanbanBoardRendered = KanbanBoardComp;
  
  return (
    <>
      {/* Markdown Notes */}
      {markdownElements.map((element) => (
        <MarkdownNote
          key={element.id}
          element={element}
          appState={viewStateRef.current}
          onChange={handleMarkdownUpdate}
          ref={(ref) => registerMarkdownRef(element.id, ref)}
        />
      ))}
      
      {/* Web Embeds */}
      {webEmbedElements.map((element) => (
        <WebEmbed
          key={element.id}
          element={element}
          appState={viewStateRef.current}
          onChange={handleWebEmbedUpdate}
          ref={(ref) => registerWebEmbedRef(element.id, ref)}
        />
      ))}
      
      {/* Lexical Rich Text Notes */}
      {lexicalElements.map((element) => (
        <LexicalNote
          key={element.id}
          element={element}
          appState={viewStateRef.current}
          onChange={handleLexicalUpdate}
          onDeselect={handleDeselect}
          ref={(ref) => registerLexicalRef(element.id, ref)}
        />
      ))}

      {/* Kanban Boards */}
      {kanbanElements.map((element) => (
        <KanbanBoardRendered
          key={element.id}
          element={element}
          appState={viewStateRef.current}
          onChange={handleKanbanUpdate}
          ref={(ref) => registerKanbanRef(element.id, ref)}
        />
      ))}
    </>
  );
}
