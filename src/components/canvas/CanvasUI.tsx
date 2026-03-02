/**
 * CanvasUI
 *
 * Renders canvas overlays and handles command-driven canvas actions.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  useUnifiedCanvasStore,
  useExcalidrawAPISafe,
  useCommandSubscriber,
  type ExcalidrawElement,
  type Toast,
} from '@/stores';
import { convertToExcalidrawElements as convertToExcalidrawElementsRaw } from "@excalidraw/excalidraw";
import { nanoid } from 'nanoid';

// Import sub-components
import { AIChatContainer } from '../ai-chat';
import IconLibrary from '../islands/IconLibrary';
import CanvasStatusBadge from '../islands/CanvasStatusBadge';
import ToastNotification from '../islands/ToastNotification';
import CanvasSearch from './CanvasSearch';

type CanvasElementInput = Partial<ExcalidrawElement> & {
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

const convertToSceneElements = (elements: CanvasElementInput[]): ExcalidrawElement[] =>
  (
    convertToExcalidrawElementsRaw as unknown as (input: CanvasElementInput[]) => ExcalidrawElement[]
  )(elements);

interface CanvasUIProps {
  isSharedMode: boolean;
}

const TOAST_EXIT_DURATION_MS = 220;

type RenderedToast = Toast & {
  isExiting: boolean;
};

export default function CanvasUI({
  isSharedMode,
}: CanvasUIProps) {
  const store = useUnifiedCanvasStore();
  const api = useExcalidrawAPISafe();

  const {
    isChatOpen,
    isChatMinimized,
    isAssetsOpen,
    toasts,
    isDirty,
    lastSaved,
    setChatOpen,
    setChatMinimized,
    setAssetsOpen,
    removeToast,
    addToast,
  } = store;
  const [renderedToasts, setRenderedToasts] = useState<RenderedToast[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setRenderedToasts((current) => {
      const incoming = new Map(toasts.map((toast) => [toast.id, toast]));

      const merged = current.map((toast) => {
        const next = incoming.get(toast.id);
        if (next) {
          return { ...toast, ...next, isExiting: false };
        }
        return toast.isExiting ? toast : { ...toast, isExiting: true };
      });

      const knownIds = new Set(current.map((toast) => toast.id));
      for (const toast of toasts) {
        if (!knownIds.has(toast.id)) {
          merged.push({ ...toast, isExiting: false });
        }
      }

      return merged;
    });
  }, [toasts]);

  useEffect(() => {
    const exitingToasts = renderedToasts.filter((toast) => toast.isExiting);
    if (exitingToasts.length === 0) {
      return;
    }

    const timers = exitingToasts.map((toast) =>
      setTimeout(() => {
        setRenderedToasts((current) => current.filter((item) => item.id !== toast.id));
      }, TOAST_EXIT_DURATION_MS)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [renderedToasts]);

  // Listen for AI chat drawing commands (excalidraw:draw event)
  useEffect(() => {
    if (!api) return;

    const handleDrawCommand = (event: Event) => {
      const customEvent = event as CustomEvent<{ elements?: unknown; isModification?: boolean }>;
      const detail = customEvent.detail;
      if (!Array.isArray(detail?.elements)) return;

      const elements = detail.elements as CanvasElementInput[];
      const isModification = detail.isModification === true;

      try {
        // Get viewport center for positioning if not a modification
        let elementsToConvert = elements;
        if (!isModification) {
          const appState = api.getAppState();
          const viewportWidth = typeof appState.width === "number" ? appState.width : 800;
          const viewportHeight = typeof appState.height === "number" ? appState.height : 600;
          const viewportCenterX = viewportWidth / 2;
          const viewportCenterY = viewportHeight / 2;
          const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
          const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

          // Calculate bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          elements.forEach((el: CanvasElementInput) => {
            const x = el.x || 0;
            const y = el.y || 0;
            const width = el.width || 0;
            const height = el.height || 0;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
          });

          const elementsCenterX = (minX + maxX) / 2;
          const elementsCenterY = (minY + maxY) / 2;
          const offsetX = sceneX - elementsCenterX;
          const offsetY = sceneY - elementsCenterY;

          elementsToConvert = elements.map((el: CanvasElementInput) => ({
            ...el,
            x: (el.x || 0) + offsetX,
            y: (el.y || 0) + offsetY,
          }));
        }

        const converted = convertToSceneElements(elementsToConvert);
        const currentElements = api.getSceneElements();
        api.updateScene({ elements: [...currentElements, ...converted] });
      } catch (err) {
        console.error('Error handling draw command:', err);
      }
    };

    window.addEventListener('excalidraw:draw', handleDrawCommand);
    return () => window.removeEventListener('excalidraw:draw', handleDrawCommand);
  }, [api]);

  // Repair legacy/broken image elements to avoid Excalidraw hit-test crashes.
  useEffect(() => {
    if (!api) return;

    const files = api.getFiles() || {};
    const currentElements = api.getSceneElements();
    let changed = false;

    const repairedElements = currentElements.flatMap((element) => {
      if (element.type !== 'image') {
        return [element];
      }

      const imageElement = element as ExcalidrawElement & {
        fileId?: string;
        status?: string;
        scale?: [number, number];
      };
      const file = imageElement.fileId ? (files as Record<string, any>)[imageElement.fileId] : undefined;

      // Drop broken image elements that cannot resolve to binary file data.
      if (!imageElement.fileId || !file || typeof file.dataURL !== 'string' || file.dataURL.length === 0) {
        changed = true;
        return [];
      }

      const patch: Partial<typeof imageElement> = {};
      if (imageElement.status !== 'saved') {
        patch.status = 'saved';
      }
      if (!Array.isArray(imageElement.scale) || imageElement.scale.length !== 2) {
        patch.scale = [1, 1];
      }

      if (Object.keys(patch).length === 0) {
        return [element];
      }

      changed = true;
      return [{ ...imageElement, ...patch }];
    });

    if (changed) {
      api.updateScene({ elements: repairedElements });
      console.warn('[CanvasUI] Repaired invalid image elements in scene');
    }
  }, [api]);

  // Handle commands from the store (image insertion, etc.)
  useCommandSubscriber({
    onInsertImage: async (payload) => {
      if (!api) {
        console.warn('[CanvasUI] Cannot insert image - API not ready');
        return;
      }
      const { imageData, width, height } = payload;

      // Create a new image element
      const appState = api.getAppState();
      const viewportCenterX = (appState.width || 800) / 2;
      const viewportCenterY = (appState.height || 600) / 2;
      const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
      const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

      const detectedMimeType =
        typeof imageData === 'string'
          ? imageData.match(/^data:([^;,]+)[;,]/)?.[1] || 'image/png'
          : 'image/png';

      const fileId = nanoid();

      const newElement = {
        id: nanoid(),
        type: 'image',
        x: sceneX - (width || 400) / 2,
        y: sceneY - (height || 300) / 2,
        width: width || 400,
        height: height || 300,
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
        fileId,
        status: 'saved',
        scale: [1, 1] as [number, number],
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Date.now(),
      };

      // Add the image file
      const file = {
        id: fileId,
        mimeType: detectedMimeType,
        dataURL: imageData,
        created: Date.now(),
      };

      api.addFiles([file]);
      const currentElements = api.getSceneElements();
      api.updateScene({
        elements: [...currentElements, newElement],
      });
      
      addToast('Image inserted', 'success');
    },
    onDrawElements: async (payload) => {
      if (!api) {
        console.warn('[CanvasUI] Cannot draw elements - API not ready');
        return;
      }
      const { elements, isModification } = payload;
      
      try {
        // Let Excalidraw normalize element internals (especially text fields).
        let elementsToAdd = (elements as CanvasElementInput[]).map((el) => ({ ...el }));
        
        if (!isModification) {
          // Center elements on viewport
          const appState = api.getAppState();
          const viewportCenterX = (appState.width || 800) / 2;
          const viewportCenterY = (appState.height || 600) / 2;
          const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
          const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

          // Calculate bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          elementsToAdd.forEach((el: CanvasElementInput) => {
            const x = el.x || 0;
            const y = el.y || 0;
            const w = el.width || 100;
            const h = el.height || 100;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
          });

          const elementsCenterX = (minX + maxX) / 2;
          const elementsCenterY = (minY + maxY) / 2;
          const offsetX = sceneX - elementsCenterX;
          const offsetY = sceneY - elementsCenterY;

          elementsToAdd = elementsToAdd.map((el: CanvasElementInput) => ({
            ...el,
            x: (el.x ?? 0) + offsetX,
            y: (el.y ?? 0) + offsetY,
          }));
        }

        const converted = convertToSceneElements(elementsToAdd as CanvasElementInput[]);
        const withCustomData = converted.map((el, index) => {
          const customData = elementsToAdd[index]?.customData;
          return typeof customData === 'object' && customData !== null
            ? ({ ...el, customData } as ExcalidrawElement)
            : el;
        });

        const currentElements = api.getSceneElements();
        api.updateScene({ elements: [...currentElements, ...withCustomData] });
        
        addToast('Elements added to canvas', 'success');
      } catch (err) {
        console.error('[CanvasUI] Failed to draw elements:', err);
        addToast('Failed to add elements to canvas', 'error');
      }
    },
  });

  const handleSave = useCallback(async () => {
    if (!api) return;

    try {
      const data = {
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
      };

      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `canvas-${Date.now()}.rj`;
      link.click();
      URL.revokeObjectURL(url);

      addToast('Canvas saved', 'success');
    } catch (err) {
      addToast('Failed to save canvas', 'error');
    }
  }, [api, addToast]);

  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.rj,.excalidraw,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !api) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        api.updateScene({ elements: data.elements || [], appState: data.appState || {} });
        addToast('Canvas loaded', 'success');
      } catch (err) {
        addToast('Failed to load canvas', 'error');
      }
    };
    input.click();
  }, [api, addToast]);

  // Create markdown note element - with full default content from original
  const handleCreateMarkdown = useCallback(async () => {
    if (!api) {
      addToast('Canvas not ready', 'error');
      return;
    }

    try {
      // Get viewport center for positioning
      const appState = api.getAppState();
      const viewportCenterX = (appState.width as number) / 2 || 400;
      const viewportCenterY = (appState.height as number) / 2 || 300;

      // Convert viewport center to scene coordinates
      const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
      const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

      const newElement = {
        type: 'rectangle',
        x: sceneX - 250,
        y: sceneY - 175,
        width: 500,
        height: 350,
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
          content: '# 📝 New Note\n\nDouble-click to edit this note.\n\n## Markdown Supported\n- **Bold** and *italic* text\n- Lists and checkboxes\n- Code blocks with syntax highlighting\n- Tables, links, and more!\n\n```javascript\nconst example = "Hello World";\n```',
        },
      };

      const converted = convertToSceneElements([newElement]);
      const currentElements = api.getSceneElements();
      api.updateScene({ elements: [...currentElements, ...converted] });

    } catch (err) {
      console.error('Error creating markdown note:', err);
    }
  }, [api]);

  // Create rich text note element - with correct 1000x1200 size
  const handleCreateRichText = useCallback(async () => {
    if (!api) {
      addToast('Canvas not ready', 'error');
      return;
    }

    try {
      // Import DEFAULT_NOTE_STATE
      const { DEFAULT_NOTE_STATE } = await import('@/components/islands/rich-text');

      // Get viewport center for positioning
      const appState = api.getAppState();
      const viewportCenterX = (appState.width as number) / 2 || 400;
      const viewportCenterY = (appState.height as number) / 2 || 300;

      // Convert viewport center to scene coordinates
      const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
      const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

      // Note: Original size is 1000x1200 - much larger than markdown notes
      const newElement = {
        type: 'rectangle',
        x: sceneX - 500,
        y: sceneY - 600,
        width: 1000,
        height: 1200,
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

      const converted = convertToSceneElements([newElement]);
      const currentElements = api.getSceneElements();
      api.updateScene({ elements: [...currentElements, ...converted] });

    } catch (err) {
      console.error('Error creating rich text note:', err);
    }
  }, [api]);

  // Create web embed element - without prompt, with correct 700x500 size
  const handleCreateWebEmbed = useCallback(async () => {
    if (!api) {
      addToast('Canvas not ready', 'error');
      return;
    }

    try {
      // Get viewport center for positioning
      const appState = api.getAppState();
      const viewportCenterX = (appState.width as number) / 2 || 400;
      const viewportCenterY = (appState.height as number) / 2 || 300;

      // Convert viewport center to scene coordinates
      const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
      const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

      // Note: Original size is 700x500 with strokeWidth 4
      const newElement = {
        type: 'rectangle',
        x: sceneX - 350,
        y: sceneY - 250,
        width: 700,
        height: 500,
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

      const converted = convertToSceneElements([newElement]);
      const currentElements = api.getSceneElements();
      api.updateScene({ elements: [...currentElements, ...converted] });

    } catch (err) {
      console.error('Error creating web embed:', err);
    }
  }, [api]);

  // Open the assistant with the visual expert selected.
  const handleGenerateImage = useCallback(() => {
    if (isChatMinimized) {
      setChatMinimized(false);
    }
    setChatOpen(true);
    window.dispatchEvent(
      new CustomEvent('assistant:set-expert', {
        detail: { expert: 'visual' },
      }),
    );
  }, [isChatMinimized, setChatMinimized, setChatOpen]);

  const runCanvasAction = useCallback((action?: string) => {
    if (!action) return;

    switch (action) {
      case 'open-chat':
        if (isChatMinimized) {
          setChatMinimized(false);
        }
        setChatOpen(true);
        break;
      case 'open-icons':
        setAssetsOpen(true);
        break;
      case 'create-markdown':
        void handleCreateMarkdown();
        break;
      case 'create-rich-text':
        void handleCreateRichText();
        break;
      case 'create-web-embed':
        void handleCreateWebEmbed();
        break;
      case 'generate-image':
        handleGenerateImage();
        break;
      case 'save-rj':
        void handleSave();
        break;
      case 'load-rj':
        handleLoad();
        break;
      default:
        break;
    }
  }, [
    handleCreateMarkdown,
    handleCreateRichText,
    handleCreateWebEmbed,
    handleGenerateImage,
    handleLoad,
    handleSave,
    isChatMinimized,
    setAssetsOpen,
    setChatMinimized,
    setChatOpen,
  ]);

  // Handle commands from native Excalidraw MainMenu add-on entries
  useEffect(() => {
    const handleMenuAction = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: string }>;
      runCanvasAction(customEvent.detail?.action);
    };

    window.addEventListener('aw:canvas-menu-action', handleMenuAction);
    return () => window.removeEventListener('aw:canvas-menu-action', handleMenuAction);
  }, [runCanvasAction]);

  // Intercept Ctrl+F / Cmd+F to open our search overlay instead of the browser default
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleSearchShortcut, true);
    return () => window.removeEventListener('keydown', handleSearchShortcut, true);
  }, []);

  const handleAssistantLauncherClick = useCallback(() => {
    if (isChatOpen && !isChatMinimized) {
      setChatMinimized(true);
      return;
    }

    if (isChatMinimized) {
      setChatMinimized(false);
    }
    setChatOpen(true);
  }, [isChatMinimized, isChatOpen, setChatMinimized, setChatOpen]);

  const handleAssistantLauncherDoubleClick = useCallback(() => {
    if (isChatOpen) {
      setChatOpen(false);
      return;
    }
    setChatMinimized(false);
    setChatOpen(true);
  }, [isChatOpen, setChatMinimized, setChatOpen]);

  return (
    <>
      {/* Right-side quick actions (restored) */}
      <div className="aw-canvas-controls">
        <button
          className={`aw-control-btn${isAssetsOpen ? ' active' : ''}`}
          onClick={() => runCanvasAction('open-icons')}
          title="Icon library"
          aria-label="Open icon library"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="aw-label">Icon library</span>
        </button>
        <button
          className="aw-control-btn"
          onClick={() => runCanvasAction('create-markdown')}
          title="Add markdown note"
          aria-label="Add markdown note"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span className="aw-label">Markdown note</span>
        </button>
        <button
          className="aw-control-btn"
          onClick={() => runCanvasAction('create-rich-text')}
          title="Add rich text note"
          aria-label="Add rich text note"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3" />
            <path d="M9 20h6" />
            <path d="M12 4v16" />
            <path d="M8 12h8" />
          </svg>
          <span className="aw-label">Rich text note</span>
        </button>
        <button
          className="aw-control-btn"
          onClick={() => runCanvasAction('create-web-embed')}
          title="Add web embed"
          aria-label="Add web embed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className="aw-label">Web embed</span>
        </button>
        <div className="aw-divider" />
        <button
          className="aw-control-btn"
          onClick={() => runCanvasAction('save-rj')}
          title="Save as .rj"
          aria-label="Save as .rj"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span className="aw-label">Save .rj</span>
        </button>
        <button
          className="aw-control-btn"
          onClick={() => runCanvasAction('load-rj')}
          title="Open .rj/.excalidraw"
          aria-label="Open .rj or .excalidraw"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="aw-label">Open file</span>
        </button>
        <div className="aw-divider" />
        <button
          className={`aw-control-btn${isChatOpen && !isChatMinimized ? ' active' : ''}`}
          onClick={handleAssistantLauncherClick}
          onDoubleClick={handleAssistantLauncherDoubleClick}
          title={isChatOpen && !isChatMinimized ? "Click to minimize, double-click to close" : "Open AI assistant"}
          aria-label={isChatOpen && !isChatMinimized ? "Minimize assistant" : "Open assistant"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="aw-label">AI assistant</span>
        </button>
      </div>

      {/* Status Badge */}
      <CanvasStatusBadge
        isDirty={isDirty}
        lastSaved={lastSaved}
        isSharedMode={isSharedMode}
      />

      {/* AI Chat Panel */}
      {isChatOpen && (
        <AIChatContainer
          isOpen={isChatOpen}
        />
      )}

      {/* Icon Library Panel */}
      <IconLibrary
        isOpen={isAssetsOpen}
        onClose={() => setAssetsOpen(false)}
      />

      {/* Search overlay (Ctrl+F) */}
      <CanvasSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Toast Notifications */}
      {renderedToasts.length > 0 && (
        <div className="aw-toast-viewport">
          {renderedToasts.map((toast) => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              isExiting={toast.isExiting}
              onDismiss={removeToast}
            />
          ))}
        </div>
      )}

      <style>{`
        .aw-canvas-controls {
          position: fixed;
          right: 8px;
          /* Position control panel so divider above AI button aligns with chat panel top */
          /* AI chat: bottom: 20px, height: 744px, top = 100vh - 764px */
          /* Control panel items from bottom: AI btn (32px) + gap (6px) + divider (1px) + gap (6px) ~45px */
          /* So control panel bottom = chat_top + 45px + padding adjustment (~16px) */
          bottom: calc(100vh - 744px - 20px + 110px);
          transform: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 1000;
          pointer-events: none;
          background: white;
          padding: 2px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .aw-canvas-controls > * {
          pointer-events: auto;
        }

        .aw-control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: white;
          border: 1px solid transparent;
          border-radius: 7px;
          cursor: pointer;
          color: #4b5563;
          transition: all 0.15s ease;
          position: relative;
        }

        .aw-control-btn svg {
          width: 16px;
          height: 16px;
          stroke-width: 2.2;
        }

        .aw-control-btn:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .aw-control-btn:active {
          background: #e5e7eb;
        }

        .aw-control-btn.active {
          background: #eef2ff;
          color: #4f46e5;
          border-color: #c7d2fe;
        }

        .aw-label {
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%) translateX(-8px);
          padding: 4px 8px;
          background: #111827;
          color: white;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 500;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          z-index: 1002;
        }

        .aw-control-btn:hover .aw-label {
          opacity: 1;
          transform: translateY(-50%) translateX(-12px);
        }

        .aw-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 4px 6px;
        }

        .aw-toast-viewport {
          position: fixed;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          z-index: 1200;
          width: min(560px, calc(100vw - 16px));
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }

        .aw-toast-viewport > * {
          pointer-events: auto;
        }

        @media (max-width: 768px) {
          .aw-canvas-controls {
            right: 8px;
            top: auto;
            bottom: 80px;
            transform: none;
            padding: 2px;
          }

          .aw-toast-viewport {
            width: calc(100vw - 12px);
            bottom: 10px;
          }

          .aw-control-btn {
            width: 32px;
            height: 32px;
          }

          .aw-control-btn:hover .aw-label {
            display: none;
          }

        }
      `}</style>
    </>
  );
}
