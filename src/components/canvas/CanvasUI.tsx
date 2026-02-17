/**
 * CanvasUI - All UI Controls, Modals, and Panels
 * 
 * Restored element creation to use convertToExcalidrawElements
 * and proper element format matching the original ExcalidrawCanvas
 */

import { useCallback, useState, useEffect } from 'react';
import { useUnifiedCanvasStore, useExcalidrawAPISafe, useCommandSubscriber } from '@/stores';
import { nanoid } from 'nanoid';

// Import sub-components
import CanvasControls from '../islands/CanvasControls';
import { AIChatContainer } from '../ai-chat';
import IconLibrary from '../islands/IconLibrary';
import SaveOptionsModal from '../islands/SaveOptionsModal';
import ShareModal from '../islands/ShareModal';
import CanvasStatusBadge from '../islands/CanvasStatusBadge';
import ToastNotification from '../islands/ToastNotification';
import ImageGenerationModal from '../ai-chat/ImageGenerationModal';

// Lazy load convertToExcalidrawElements
let convertToExcalidrawElements: ((elements: any[]) => any[]) | null = null;

const loadConverter = async () => {
  if (!convertToExcalidrawElements) {
    const mod = await import('@excalidraw/excalidraw');
    convertToExcalidrawElements = mod.convertToExcalidrawElements;
  }
  return convertToExcalidrawElements;
};

interface CanvasUIProps {
  isSignedIn: boolean | undefined;
  userId?: string | null;
  userName?: string | null;
  isSharedMode: boolean;
  isConnected: boolean;
  activeUsers: number;
}

export default function CanvasUI({
  isSignedIn,
  userId,
  userName,
  isSharedMode,
  isConnected,
  activeUsers,
}: CanvasUIProps) {
  const store = useUnifiedCanvasStore();
  const api = useExcalidrawAPISafe();

  const {
    isChatOpen,
    isChatMinimized,
    isAssetsOpen,
    isShareModalOpen,
    isImageGenModalOpen,
    toasts,
    canvasTitle,
    isDirty,
    lastSaved,
    setChatOpen,
    setChatMinimized,
    setAssetsOpen,
    setShareModalOpen,
    setImageGenModalOpen,
    removeToast,
    addToast,
  } = store;

  // Image generation state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedElementsForImageGen, setSelectedElementsForImageGen] = useState<string[]>([]);

  // Load converter on mount
  useEffect(() => {
    loadConverter();
  }, []);

  // Update selected elements when image gen modal opens
  useEffect(() => {
    if (isImageGenModalOpen && api) {
      const appState = api.getAppState();
      const selectedIds = Object.keys(appState.selectedElementIds || {});
      setSelectedElementsForImageGen(selectedIds);
    }
  }, [isImageGenModalOpen, api]);

  // Listen for AI chat drawing commands (excalidraw:draw event)
  useEffect(() => {
    if (!api) return;

    const handleDrawCommand = async (event: CustomEvent) => {
      const { elements, isModification } = event.detail || {};
      if (!elements || !Array.isArray(elements)) return;

      try {
        const { convertToExcalidrawElements: converter } = await import('@excalidraw/excalidraw');
        
        // Get viewport center for positioning if not a modification
        let elementsToConvert = elements;
        if (!isModification) {
          const appState = api.getAppState();
          const viewportCenterX = (appState.width as number) / 2 || 400;
          const viewportCenterY = (appState.height as number) / 2 || 300;
          const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
          const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

          // Calculate bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          elements.forEach((el: any) => {
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

          elementsToConvert = elements.map((el: any) => ({
            ...el,
            x: (el.x || 0) + offsetX,
            y: (el.y || 0) + offsetY,
          }));
        }

        const converted = converter(elementsToConvert);
        const currentElements = api.getSceneElements();
        api.updateScene({ elements: [...currentElements, ...converted] });
      } catch (err) {
        console.error('Error handling draw command:', err);
      }
    };

    window.addEventListener('excalidraw:draw', handleDrawCommand as EventListener);
    return () => window.removeEventListener('excalidraw:draw', handleDrawCommand as EventListener);
  }, [api]);

  // Handle commands from the store (image insertion, etc.)
  useCommandSubscriber({
    onInsertImage: async (payload) => {
      if (!api) {
        console.warn('[CanvasUI] Cannot insert image - API not ready');
        return;
      }
      const { imageData, width, height } = payload;
      
      console.log('[CanvasUI] Inserting image:', width, height);
      
      // Create a new image element
      const appState = api.getAppState();
      const viewportCenterX = (appState.width || 800) / 2;
      const viewportCenterY = (appState.height || 600) / 2;
      const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
      const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

      const newElement = {
        type: 'image',
        x: sceneX - (width || 400) / 2,
        y: sceneY - (height || 300) / 2,
        width: width || 400,
        height: height || 300,
        fileId: nanoid(),
        status: 'pending',
        id: nanoid(),
        version: 1,
        versionNonce: Date.now(),
      };

      // Add the image file
      const file = {
        id: newElement.fileId,
        mimeType: 'image/png',
        dataURL: imageData,
        created: Date.now(),
      };

      const currentElements = api.getSceneElements();
      api.updateScene({ 
        elements: [...currentElements, newElement],
        files: { ...api.getFiles(), [file.id]: file },
      });
      
      addToast('Image inserted', 'success');
    },
    onDrawElements: async (payload) => {
      if (!api) {
        console.warn('[CanvasUI] Cannot draw elements - API not ready');
        return;
      }
      const { elements, isModification } = payload;
      
      const appState = api.getAppState();
      let elementsToAdd = elements;
      
      if (!isModification) {
        // Center elements on viewport
        const viewportCenterX = (appState.width || 800) / 2;
        const viewportCenterY = (appState.height || 600) / 2;
        const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
        const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        elements.forEach((el: any) => {
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

        elementsToAdd = elements.map((el: any) => ({
          ...el,
          id: el.id || nanoid(),
          x: (el.x || 0) + offsetX,
          y: (el.y || 0) + offsetY,
          version: 1,
          versionNonce: Date.now(),
        }));
      }

      const currentElements = api.getSceneElements();
      api.updateScene({ elements: [...currentElements, ...elementsToAdd] });
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

  const handleShare = useCallback(() => {
    setShareModalOpen(true);
  }, [setShareModalOpen]);

  // Create markdown note element - with full default content from original
  const handleCreateMarkdown = useCallback(async () => {
    if (!api) {
      addToast('Canvas not ready', 'error');
      return;
    }

    try {
      const converter = await loadConverter();
      if (!converter) {
        addToast('Converter not loaded', 'error');
        return;
      }

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

      const converted = converter([newElement]);
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
      const converter = await loadConverter();
      if (!converter) {
        addToast('Converter not loaded', 'error');
        return;
      }

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

      const converted = converter([newElement]);
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
      const converter = await loadConverter();
      if (!converter) {
        addToast('Converter not loaded', 'error');
        return;
      }

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

      const converted = converter([newElement]);
      const currentElements = api.getSceneElements();
      api.updateScene({ elements: [...currentElements, ...converted] });

    } catch (err) {
      console.error('Error creating web embed:', err);
    }
  }, [api]);

  // Handle image generation
  const handleGenerateImage = useCallback(() => {
    setImageGenModalOpen(true);
  }, [setImageGenModalOpen]);

  // Handle image generation submit - close modal immediately and show toast
  const handleImageGenSubmit = useCallback(async (options: any) => {
    if (!api) return;

    // Close modal immediately and show generating toast
    setImageGenModalOpen(false);
    addToast('Generating image...', 'loading');

    setIsGeneratingImage(true);
    try {
      // TODO: Connect to image generation system
      // This was previously using eventBus but had no listener
      // Should call image generation API directly or use the store
      console.log('Image generation requested:', options);
      addToast('Image generation not yet implemented', 'info');
    } catch (err) {
      console.error('Error in image generation:', err);
      addToast('Failed to generate image', 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [api, addToast, setImageGenModalOpen]);

  return (
    <>
      {/* Status Badge */}
      <CanvasStatusBadge
        isDirty={isDirty}
        lastSaved={lastSaved}
        isSharedMode={isSharedMode}
        isConnected={isConnected}
        activeUsers={activeUsers}
      />

      {/* Main Controls */}
      <CanvasControls
        onOpenChat={() => {
          if (isChatMinimized) {
            setChatMinimized(false);
          } else {
            setChatOpen(true);
          }
        }}
        onOpenAssets={() => setAssetsOpen(true)}
        isChatOpen={isChatOpen && !isChatMinimized}
        isAssetsOpen={isAssetsOpen}
        onSaveState={handleSave}
        onLoadState={handleLoad}
        onCreateMarkdown={handleCreateMarkdown}
        onCreateWebEmbed={handleCreateWebEmbed}
        onCreateLexical={handleCreateRichText}
        onShare={handleShare}
        onGenerateImage={handleGenerateImage}
      />

      {/* AI Chat Panel */}
      {isChatOpen && (
        <AIChatContainer
          isOpen={isChatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Icon Library Panel */}
      <IconLibrary
        isOpen={isAssetsOpen}
        onClose={() => setAssetsOpen(false)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Image Generation Modal */}
      <ImageGenerationModal
        isOpen={isImageGenModalOpen}
        onClose={() => setImageGenModalOpen(false)}
        selectedElements={selectedElementsForImageGen}
        elementSnapshots={new Map()}
        canvasState={null}
        onGenerate={handleImageGenSubmit}
        isGenerating={isGeneratingImage}
      />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {toasts.map((toast) => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              onRemove={removeToast}
            />
          ))}
        </div>
      )}
    </>
  );
}


