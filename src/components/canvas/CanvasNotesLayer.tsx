/**
 * CanvasNotesLayer - Restored from original ExcalidrawCanvas
 * 
 * Renders markdown notes, web embeds, and rich text notes on top of canvas
 * Uses RAF loop with direct ref manipulation for 60fps smooth sync
 */

import { useEffect, useState, useRef, useCallback, type ComponentType } from 'react';
import { useUnifiedCanvasStore, type ExcalidrawAPI, type ExcalidrawElement, type ExcalidrawAppState } from '@/stores';

// Note: These components are loaded dynamically to avoid SSR issues
let MarkdownNoteComp: ComponentType<any> | null = null;
let WebEmbedComp: ComponentType<any> | null = null;
let LexicalNoteComp: ComponentType<any> | null = null;

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
  return { MarkdownNoteComp, WebEmbedComp, LexicalNoteComp };
};

interface CanvasNotesLayerProps {
  api: ExcalidrawAPI | null;
}

export default function CanvasNotesLayer({ api }: CanvasNotesLayerProps) {
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [markdownElements, setMarkdownElements] = useState<ExcalidrawElement[]>([]);
  const [webEmbedElements, setWebEmbedElements] = useState<ExcalidrawElement[]>([]);
  const [lexicalElements, setLexicalElements] = useState<ExcalidrawElement[]>([]);
  
  // Refs for direct transform updates (bypass React for 60fps)
  const markdownRefs = useRef<Map<string, any>>(new Map());
  const webEmbedRefs = useRef<Map<string, any>>(new Map());
  const lexicalRefs = useRef<Map<string, any>>(new Map());
  const viewStateRef = useRef({ scrollX: 0, scrollY: 0, zoom: { value: 1 } });
  
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
        };
        
        // Filter elements by type
        const md = elements.filter((el: ExcalidrawElement) => 
          el.customData?.type === 'markdown' && !el.isDeleted
        );
        const embeds = elements.filter((el: ExcalidrawElement) => 
          el.customData?.type === 'web-embed' && !el.isDeleted
        );
        const lex = elements.filter((el: ExcalidrawElement) => 
          el.customData?.type === 'lexical' && !el.isDeleted
        );
        
        // UNIFIED CLOCK: Update transforms directly on refs (every frame, no React)
        md.forEach((el: ExcalidrawElement) => {
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
        
        lex.forEach((el: ExcalidrawElement) => {
          const ref = lexicalRefs.current.get(el.id);
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
          versionNonce: Date.now(),
        };
      }
      return el;
    });
    api.updateScene({ elements: updated });
  }, [api]);
  
  // Handle web embed update
  const handleWebEmbedUpdate = useCallback((elementId: string, updates: any) => {
    if (!api) return;
    const elements = api.getSceneElements();
    const updated = elements.map((el: ExcalidrawElement) => {
      if (el.id === elementId) {
        return {
          ...el,
          customData: { ...el.customData, ...updates },
          version: (el.version || 0) + 1,
          versionNonce: Date.now(),
        };
      }
      return el;
    });
    api.updateScene({ elements: updated });
  }, [api]);
  
  // Handle lexical update
  const handleLexicalUpdate = useCallback((elementId: string, updates: any) => {
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
          versionNonce: Date.now(),
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
  
  // Register/unregister refs
  const registerMarkdownRef = (id: string, ref: any) => {
    if (ref) markdownRefs.current.set(id, ref);
    else markdownRefs.current.delete(id);
  };
  const registerWebEmbedRef = (id: string, ref: any) => {
    if (ref) webEmbedRefs.current.set(id, ref);
    else webEmbedRefs.current.delete(id);
  };
  const registerLexicalRef = (id: string, ref: any) => {
    if (ref) lexicalRefs.current.set(id, ref);
    else lexicalRefs.current.delete(id);
  };
  
  if (!componentsLoaded || !MarkdownNoteComp || !WebEmbedComp || !LexicalNoteComp) {
    return null;
  }
  
  const MarkdownNote = MarkdownNoteComp;
  const WebEmbed = WebEmbedComp;
  const LexicalNote = LexicalNoteComp;
  
  return (
    <>
      {/* Markdown Notes */}
      {markdownElements.map((element) => (
        <MarkdownNote
          key={element.id}
          element={element}
          appState={viewStateRef.current}
          onChange={handleMarkdownUpdate}
          ref={(ref: any) => registerMarkdownRef(element.id, ref)}
        />
      ))}
      
      {/* Web Embeds */}
      {webEmbedElements.map((element) => (
        <WebEmbed
          key={element.id}
          element={element}
          appState={viewStateRef.current}
          onChange={handleWebEmbedUpdate}
          ref={(ref: any) => registerWebEmbedRef(element.id, ref)}
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
          ref={(ref: any) => registerLexicalRef(element.id, ref)}
        />
      ))}
    </>
  );
}
