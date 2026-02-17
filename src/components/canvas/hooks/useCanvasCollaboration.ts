/**
 * useCanvasCollaboration
 * Thin React wrapper around CollaborationCoordinator
 * 
 * Handles PartyKit/WebSocket collaboration state
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useUnifiedCanvasStore } from '@/stores';
import type { ExcalidrawAPI } from '@/stores';
import { 
  CollaborationCoordinator, 
  type CollaborationState,
  type Cursor 
} from '@/lib/collaboration/CollaborationCoordinator';

interface UseCanvasCollaborationOptions {
  isSharedMode: boolean;
  shareRoomId: string | undefined;
  partyKitHost: string;
  api: ExcalidrawAPI | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useCanvasCollaboration({
  isSharedMode,
  shareRoomId,
  partyKitHost,
  api,
  onConnect,
  onDisconnect,
  onError,
}: UseCanvasCollaborationOptions): CollaborationState {
  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    activeUsers: 1,
    cursors: [],
  });
  
  const coordinatorRef = useRef<CollaborationCoordinator | null>(null);
  const { canvasData } = useUnifiedCanvasStore();
  
  // Create coordinator instance
  useEffect(() => {
    const coordinator = new CollaborationCoordinator();
    coordinatorRef.current = coordinator;
    
    // Subscribe to state changes
    const handleStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<CollaborationState>;
      setState(customEvent.detail);
    };
    
    coordinator.addEventListener('state-change', handleStateChange);
    coordinator.addEventListener('connected', () => onConnect?.());
    coordinator.addEventListener('disconnected', () => onDisconnect?.());
    coordinator.addEventListener('error', (e: Event) => {
      const customEvent = e as CustomEvent<Error>;
      onError?.(customEvent.detail);
    });
    
    return () => {
      coordinator.removeEventListener('state-change', handleStateChange);
      coordinator.disconnect();
      coordinatorRef.current = null;
    };
  }, [onConnect, onDisconnect, onError]);
  
  // Connect/disconnect based on props
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) return;
    
    if (isSharedMode && shareRoomId && api) {
      coordinator.connect(partyKitHost, shareRoomId, api);
    } else {
      coordinator.disconnect();
    }
  }, [isSharedMode, shareRoomId, partyKitHost, api]);
  
  // Send canvas updates when data changes
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator || !canvasData) return;
    
    coordinator.sendCanvasUpdate(canvasData);
  }, [canvasData]);
  
  return state;
}

// Re-export types for convenience
export type { CollaborationState, Cursor };
