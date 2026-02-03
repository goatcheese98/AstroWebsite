/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🟣 ResizeHandles.tsx           "The Handle Renderer"                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I render the resize handles. Corner handles are always visible on       ║
 * ║     hover, edge handles only appear when mouse is near that edge. I'm       ║
 * ║     the visual feedback for resizing capability.                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  useResize  │─────▶│      ME      │─────▶│   Mouse     │   │
 *      │   │   Hook      │      │   Handles    │      │   Events    │   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │           ▲                    │                               │
 *      │           └────────────────────┘                               │
 *      │              onMouseDown (start resize)                        │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Handles don't appear or don't respond to clicks
 * - **User Impact:** Users can't resize notes
 * - **Quick Fix:** Check isHovered and edgeProximity conditions
 * - **Debug:** Verify handleResizeStart is being called
 * - **Common Issue:** z-index too low, handles behind other elements
 * 
 * 📦 PROPS I RECEIVE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isHovered           │ Whether to show handles (parent hover state)         │
 * │ isResizing          │ Whether resize is in progress (keep handles visible) │
 * │ edgeProximity       │ Which edges to show handles for                      │
 * │ hoveredEdge         │ Which handle is currently hovered (for styling)      │
 * │ onResizeStart       │ Callback when user starts dragging a handle          │
 * │ onEdgeEnter/Leave   │ Callbacks for hover styling                          │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - Render 4 corner handles (always visible when hovered)
 * - Render 4 edge handles (only when near that edge)
 * - Apply hover styling to handles
 * 
 * 🔑 KEY CONCEPTS:
 * - Corner handles: nw, ne, se, sw
 * - Edge handles: n, s, e, w (conditional on edgeProximity)
 * - Handle size: 10px
 * - Positioned absolutely around the note
 * 
 * @module markdown/components/ResizeHandles
 */

import React, { useMemo } from 'react';
import type { ResizeHandle, EdgeProximity } from '../types';
import { HANDLE_SIZE } from '../types';

interface ResizeHandlesProps {
    /** Whether to show handles (parent hover state) */
    isHovered: boolean;
    /** Whether resize is in progress (keeps handles visible) */
    isResizing: boolean;
    /** Which edges mouse is near */
    edgeProximity: EdgeProximity;
    /** Currently hovered handle for styling */
    hoveredEdge: ResizeHandle | null;
    /** Called when user starts dragging a handle */
    onResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
    /** Called when mouse enters a handle */
    onEdgeEnter: (handle: ResizeHandle) => void;
    /** Called when mouse leaves a handle */
    onEdgeLeave: () => void;
}

interface HandleDef {
    pos: ResizeHandle;
    style: React.CSSProperties;
}

/**
 * Resize handles component
 */
export const ResizeHandles = React.memo(function ResizeHandles({
    isHovered,
    isResizing,
    edgeProximity,
    hoveredEdge,
    onResizeStart,
    onEdgeEnter,
    onEdgeLeave,
}: ResizeHandlesProps) {
    // Corner handles - always visible when hovered
    const cornerHandles = useMemo<HandleDef[]>(() => [
        { pos: 'nw', style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nw-resize' } },
        { pos: 'ne', style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'ne-resize' } },
        { pos: 'se', style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'se-resize' } },
        { pos: 'sw', style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'sw-resize' } },
    ], []);

    // Edge handles - only visible when near that edge
    const edgeHandles = useMemo<HandleDef[]>(() => [
        { pos: 'n', style: { top: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
        { pos: 'e', style: { top: '50%', right: -HANDLE_SIZE / 2, transform: 'translateY(-50%)', cursor: 'e-resize' } },
        { pos: 's', style: { bottom: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
        { pos: 'w', style: { top: '50%', left: -HANDLE_SIZE / 2, transform: 'translateY(-50%)', cursor: 'w-resize' } },
    ], []);

    const shouldShow = isHovered || isResizing;
    if (!shouldShow) return null;

    return (
        <>
            {/* Corner handles - always visible on hover */}
            {cornerHandles.map(({ pos, style }) => (
                <div
                    key={pos}
                    onMouseDown={(e) => onResizeStart(e, pos)}
                    onMouseEnter={() => onEdgeEnter(pos)}
                    onMouseLeave={onEdgeLeave}
                    style={{
                        position: 'absolute',
                        width: `${HANDLE_SIZE}px`,
                        height: `${HANDLE_SIZE}px`,
                        backgroundColor: hoveredEdge === pos ? '#818cf8' : '#6366f1',
                        borderRadius: '50%',
                        pointerEvents: 'auto',
                        zIndex: 1001,
                        transition: 'background-color 0.15s ease, transform 0.15s ease',
                        transform: hoveredEdge === pos ? 'scale(1.3)' : 'scale(1)',
                        boxShadow: '0 1px 4px rgba(99, 102, 241, 0.4)',
                        ...style,
                    }}
                />
            ))}

            {/* Edge handles - only when near edges */}
            {edgeHandles.map(({ pos, style }) => {
                const show = edgeProximity[pos as keyof EdgeProximity];
                if (!show) return null;

                return (
                    <div
                        key={pos}
                        onMouseDown={(e) => onResizeStart(e, pos as ResizeHandle)}
                        onMouseEnter={() => onEdgeEnter(pos as ResizeHandle)}
                        onMouseLeave={onEdgeLeave}
                        style={{
                            position: 'absolute',
                            width: `${HANDLE_SIZE}px`,
                            height: `${HANDLE_SIZE}px`,
                            backgroundColor: hoveredEdge === pos ? '#818cf8' : '#6366f1',
                            borderRadius: '50%',
                            pointerEvents: 'auto',
                            zIndex: 1001,
                            transition: 'background-color 0.15s ease, transform 0.15s ease',
                            transform: hoveredEdge === pos ? 'scale(1.3)' : 'scale(1)',
                            boxShadow: '0 1px 4px rgba(99, 102, 241, 0.4)',
                            ...style,
                        }}
                    />
                );
            })}
        </>
    );
});
