/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔵 useResize.ts                "The Resizing Specialist"                    ║
 * ║                    🎯 Also manages edge proximity detection                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I handle resizing. When users drag handles, I calculate new dimensions  ║
 * ║     and positions. I also track when the mouse is near edges to show        ║
 * ║     the edge resize handles. I'm precise and enforce minimum sizes.         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ ResizeHandle│─────▶│  useResize   │─────▶│  Excalidraw │   │
 *      │   │  Components │      │   (ME)       │      │     API     │   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                  edgeProximity (for UI state)                  │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Resize handles don't work, or resize in wrong direction
 * - **User Impact:** Users can't resize notes
 * - **Quick Fix:** Check handle direction mapping (n/s/e/w combinations)
 * - **Debug:** Log which handle is active and calculated dimensions
 * - **Common Issue:** Forgetting to adjust x/y when resizing from west/north
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isResizing          │ Whether user is currently resizing                   │
 * │ edgeProximity       │ Which edges mouse is near (shows edge handles)       │
 * │ hoveredEdge         │ Currently hovered resize handle                      │
 * │ resizeStartRef      │ Initial dimensions for calculating changes           │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - handleResizeStart(): Begin resize operation
 * - handleResizeMove(): Calculate new dimensions/position
 * - handleResizeEnd(): Clean up
 * - handleMouseMove(): Track edge proximity for handle visibility
 * - handleEdgeEnter/Leave(): Track hovered handle for styling
 * 
 * 🔑 KEY CONCEPTS:
 * - Edge proximity shows handles only when mouse is near that edge
 * - Corner handles always visible on hover
 * - Resizing from west/north requires adjusting x/y position
 * - MIN_WIDTH/MIN_HEIGHT enforced on all resize operations
 * 
 * @module markdown/hooks/useResize
 */

import { useState, useRef, useCallback } from 'react';
import type { ResizeHandle, ResizeStartRef, EdgeProximity } from '../types';
import { EDGE_THRESHOLD, MIN_WIDTH, MIN_HEIGHT } from '../types';

interface UseResizeOptions {
    /** Current zoom level for coordinate conversion */
    zoom: number;
    /** Callback to update element dimensions */
    updateElement: (updates: { x?: number; y?: number; width?: number; height?: number }) => void;
    /** Initial element position and dimensions */
    elementState: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Whether editing mode is active (blocks resizing) */
    isEditing: boolean;
}

interface UseResizeReturn {
    /** Whether user is currently resizing */
    isResizing: boolean;
    /** Which edges mouse is near (for showing edge handles) */
    edgeProximity: EdgeProximity;
    /** Currently hovered handle for styling */
    hoveredEdge: ResizeHandle | null;
    /** Start resize operation */
    handleResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
    /** Track mouse movement for edge proximity */
    handleMouseMove: (e: React.MouseEvent) => void;
    /** Set hovered edge handle */
    setHoveredEdge: (handle: ResizeHandle | null) => void;
}

/**
 * Hook for handling resize interactions and edge proximity detection
 */
export function useResize({
    zoom,
    updateElement,
    elementState,
    isEditing,
}: UseResizeOptions): UseResizeReturn {
    const [isResizing, setIsResizing] = useState(false);
    const [edgeProximity, setEdgeProximity] = useState<EdgeProximity>({
        top: false,
        right: false,
        bottom: false,
        left: false,
    });
    const [hoveredEdge, setHoveredEdge] = useState<ResizeHandle | null>(null);
    const resizeStartRef = useRef<ResizeStartRef | null>(null);

    /**
     * Detect if mouse is near edges for showing edge handles
     */
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isEditing || isResizing) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        setEdgeProximity({
            top: relY < EDGE_THRESHOLD,
            right: rect.width - relX < EDGE_THRESHOLD,
            bottom: rect.height - relY < EDGE_THRESHOLD,
            left: relX < EDGE_THRESHOLD,
        });
    }, [isEditing, isResizing]);

    /**
     * Calculate new dimensions based on handle and mouse position
     */
    const calculateNewDimensions = useCallback((
        handle: ResizeHandle,
        dx: number,
        dy: number,
        start: ResizeStartRef
    ): { x: number; y: number; width: number; height: number } => {
        let newX = start.elementX;
        let newY = start.elementY;
        let newWidth = start.elementWidth;
        let newHeight = start.elementHeight;

        // Apply resize based on handle direction
        if (handle.includes('w')) {
            newX += dx;
            newWidth -= dx;
        }
        if (handle.includes('e')) {
            newWidth += dx;
        }
        if (handle.includes('n')) {
            newY += dy;
            newHeight -= dy;
        }
        if (handle.includes('s')) {
            newHeight += dy;
        }

        // Enforce minimum size
        if (newWidth < MIN_WIDTH) {
            if (handle.includes('w')) {
                newX = start.elementX + start.elementWidth - MIN_WIDTH;
            }
            newWidth = MIN_WIDTH;
        }
        if (newHeight < MIN_HEIGHT) {
            if (handle.includes('n')) {
                newY = start.elementY + start.elementHeight - MIN_HEIGHT;
            }
            newHeight = MIN_HEIGHT;
        }

        return { x: newX, y: newY, width: newWidth, height: newHeight };
    }, []);

    /**
     * Handle resize movement
     */
    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizeStartRef.current) return;

        const dx = (e.clientX - resizeStartRef.current.x) / zoom;
        const dy = (e.clientY - resizeStartRef.current.y) / zoom;

        const { x, y, width, height } = calculateNewDimensions(
            resizeStartRef.current.handle,
            dx,
            dy,
            resizeStartRef.current
        );

        updateElement({ x, y, width, height });
    }, [zoom, updateElement, calculateNewDimensions]);

    /**
     * Handle resize end - clean up listeners
     */
    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
        resizeStartRef.current = null;

        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    }, [handleResizeMove]);

    /**
     * Start resize operation
     */
    const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);

        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            elementX: elementState.x,
            elementY: elementState.y,
            elementWidth: elementState.width,
            elementHeight: elementState.height,
            handle,
        };

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    }, [elementState, handleResizeMove, handleResizeEnd]);

    return {
        isResizing,
        edgeProximity,
        hoveredEdge,
        handleResizeStart,
        handleMouseMove,
        setHoveredEdge,
    };
}
