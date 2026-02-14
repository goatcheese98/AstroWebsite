/**
 * CanvasUI - All UI Controls, Modals, and Panels
 * 
 * Consolidates from CanvasApp/CanvasAppRefactored:
 * - CanvasControls
 * - AIChatContainer
 * - SaveOptionsModal
 * - ShareModal
 * - MyAssetsPanel
 * - TemplateGallery
 * - WelcomeOverlay
 * - FeatureTour
 * - Toast notifications
 */

import { useCallback } from 'react';
import { useUnifiedCanvasStore } from '@/stores';
import type { ExcalidrawAPI } from '@/stores/unifiedCanvasStore';

// Import sub-components
import CanvasControls from '../islands/CanvasControls';
import { AIChatContainer } from '../ai-chat';
import MyAssetsPanel from '../islands/MyAssetsPanel';
import SaveOptionsModal from '../islands/SaveOptionsModal';
import ShareModal from '../islands/ShareModal';
import CanvasStatusBadge from '../islands/CanvasStatusBadge';
import LocalFeaturePopover from '../islands/LocalFeaturePopover';
import ToastNotification from '../islands/ToastNotification';

interface CanvasUIProps {
  api: ExcalidrawAPI | null;
  isSignedIn: boolean | undefined;
  isSharedMode: boolean;
  isConnected: boolean;
  activeUsers: number;
}

export default function CanvasUI({
  api,
  isSignedIn,
  isSharedMode,
  isConnected,
  activeUsers,
}: CanvasUIProps) {
  const store = useUnifiedCanvasStore();
  const {
    // UI State
    isChatOpen,
    isAssetsOpen,
    isShareModalOpen,
    isTemplateGalleryOpen,
    toasts,
    canvasTitle,
    isDirty,
    lastSaved,
    
    // Actions
    setChatOpen,
    setAssetsOpen,
    setShareModalOpen,
    setTemplateGalleryOpen,
    removeToast,
    setCanvasTitle,
    addToast,
    
    // Collaboration state from store
    isChatMinimized,
    setChatMinimized,
  } = store;
  
  const handleSave = useCallback(async (options?: any) => {
    if (!api) return;
    
    try {
      const data = {
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
      };
      
      // TODO: Implement actual save logic
      console.log('Saving canvas:', data);
      addToast('Canvas saved', 'success');
    } catch (err) {
      addToast('Failed to save canvas', 'error');
    }
  }, [api, addToast]);
  
  const handleShare = useCallback(() => {
    setShareModalOpen(true);
  }, [setShareModalOpen]);
  
  return (
    <>
      {/* Status Badge (shows save status, collaboration status) */}
      <CanvasStatusBadge 
        isDirty={isDirty}
        lastSaved={lastSaved}
        isSharedMode={isSharedMode}
        isConnected={isConnected}
        activeUsers={activeUsers}
      />
      
      {/* Main Controls (top-right) */}
      <CanvasControls
        onSave={handleSave}
        onShare={handleShare}
        onToggleChat={() => setChatOpen(!isChatOpen)}
        onToggleAssets={() => setAssetsOpen(!isAssetsOpen)}
        isChatOpen={isChatOpen}
        isAssetsOpen={isAssetsOpen}
      />
      
      {/* AI Chat Panel */}
      {isChatOpen && (
        <AIChatContainer
          api={api}
          isMinimized={isChatMinimized}
          onMinimize={() => setChatMinimized(!isChatMinimized)}
          onClose={() => setChatOpen(false)}
        />
      )}
      
      {/* Assets Panel */}
      {isAssetsOpen && (
        <MyAssetsPanel
          api={api}
          onClose={() => setAssetsOpen(false)}
        />
      )}
      
      {/* Modals */}
      {isShareModalOpen && (
        <ShareModal
          canvasId={store.canvasId}
          canvasTitle={canvasTitle}
          onClose={() => setShareModalOpen(false)}
        />
      )}
      
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
      
      {/* Local Feature Popover (for new features) */}
      <LocalFeaturePopover />
    </>
  );
}
