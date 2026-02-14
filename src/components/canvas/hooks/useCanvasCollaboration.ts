/**
 * useCanvasCollaboration
 * Handles PartyKit/WebSocket collaboration
 * 
 * Extracted from ExcalidrawCanvas to simplify the main component
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { encode, decode } from "@msgpack/msgpack";
import { useUnifiedCanvasStore } from '@/stores';
import type { ExcalidrawAPI, ExcalidrawElement } from '@/stores/unifiedCanvasStore';

interface Cursor {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
  lastUpdate: number;
}

interface UseCanvasCollaborationOptions {
  isSharedMode: boolean;
  shareRoomId: string | undefined;
  partyKitHost: string;
  api: ExcalidrawAPI | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface CollaborationState {
  isConnected: boolean;
  activeUsers: number;
  cursors: Cursor[];
}

const SYNC_THROTTLE_MS = 100;
const CURSOR_TIMEOUT_MS = 10000;

export function useCanvasCollaboration({
  isSharedMode,
  shareRoomId,
  partyKitHost,
  api,
  onConnect,
  onDisconnect,
  onError,
}: UseCanvasCollaborationOptions): CollaborationState {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState(1);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  
  const socketRef = useRef<WebSocket | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const mySequenceRef = useRef<number>(0);
  const { canvasData } = useUnifiedCanvasStore();
  
  // Connect to PartyKit
  useEffect(() => {
    if (!isSharedMode || !shareRoomId || !api) {
      return;
    }
    
    console.log(`🌐 Connecting to shared room: ${shareRoomId}`);
    const wsUrl = `wss://${partyKitHost}/parties/main/${shareRoomId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    
    ws.onopen = () => {
      console.log('✅ Connected to shared room');
      setIsConnected(true);
      onConnect?.();
    };
    
    ws.onmessage = (event) => {
      try {
        const data = decode(new Uint8Array(event.data)) as any;
        
        switch (data.type) {
          case 'init':
            // Initial state from server
            if (data.state?.elements) {
              api.updateScene({ elements: data.state.elements });
            }
            setActiveUsers(data.activeUsers || 1);
            break;
            
          case 'canvas-update':
            // Remote canvas update
            handleRemoteUpdate(data, api);
            break;
            
          case 'cursor-update':
            // Remote cursor position
            handleCursorUpdate(data);
            break;
            
          case 'user-joined':
          case 'user-left':
            setActiveUsers(data.activeUsers || 1);
            break;
        }
      } catch (err) {
        console.error('❌ Failed to process message:', err);
      }
    };
    
    ws.onclose = () => {
      console.log('🔌 Disconnected from room');
      setIsConnected(false);
      onDisconnect?.();
    };
    
    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      onError?.(new Error('Connection failed'));
    };
    
    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [isSharedMode, shareRoomId, partyKitHost, api, onConnect, onDisconnect, onError]);
  
  // Send local changes to server
  useEffect(() => {
    if (!isConnected || !socketRef.current || !canvasData) return;
    
    const now = Date.now();
    if (now - lastSyncTimeRef.current < SYNC_THROTTLE_MS) return;
    
    lastSyncTimeRef.current = now;
    mySequenceRef.current++;
    
    const message = {
      type: 'canvas-update',
      elements: canvasData.elements,
      appState: canvasData.appState,
      files: canvasData.files,
      seq: mySequenceRef.current,
    };
    
    try {
      socketRef.current.send(encode(message));
    } catch (err) {
      console.error('❌ Failed to send update:', err);
    }
  }, [canvasData, isConnected]);
  
  // Clean up stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => prev.filter(c => now - c.lastUpdate < CURSOR_TIMEOUT_MS));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleRemoteUpdate = useCallback((data: any, api: ExcalidrawAPI) => {
    // Don't apply our own updates
    if (data.seq && data.seq === mySequenceRef.current) return;
    
    // Merge remote elements with local
    const localElements = api.getSceneElements();
    const merged = reconcileElements(localElements, data.elements || []);
    
    api.updateScene({ elements: merged });
  }, []);
  
  const handleCursorUpdate = useCallback((data: any) => {
    setCursors(prev => {
      const others = prev.filter(c => c.id !== data.userId);
      return [...others, {
        id: data.userId,
        x: data.x,
        y: data.y,
        color: data.color || '#6366f1',
        name: data.userName || 'User',
        lastUpdate: Date.now(),
      }];
    });
  }, []);
  
  return { isConnected, activeUsers, cursors };
}

// Helper to merge remote elements
function reconcileElements(
  local: readonly ExcalidrawElement[],
  remote: readonly ExcalidrawElement[]
): ExcalidrawElement[] {
  const elementMap = new Map<string, ExcalidrawElement>();
  
  local.forEach(el => elementMap.set(el.id, el));
  
  remote.forEach(remoteEl => {
    const localEl = elementMap.get(remoteEl.id);
    
    if (!localEl ||
        ((remoteEl.version ?? 0) > (localEl.version ?? 0)) ||
        ((remoteEl.version ?? 0) === (localEl.version ?? 0) && 
         (remoteEl.versionNonce ?? 0) > (localEl.versionNonce ?? 0))) {
      elementMap.set(remoteEl.id, remoteEl);
    }
  });
  
  return Array.from(elementMap.values());
}
