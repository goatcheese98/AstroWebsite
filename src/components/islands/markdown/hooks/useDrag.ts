/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔵 useDrag.ts                  "The Drag Coordinator"                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I handle dragging. When users click and move a note, I calculate        ║
 * ║     the delta and update the element position. I'm precise and smooth.      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ MarkdownNote│─────▶│   useDrag    │─────▶│  Excalidraw │   │
 *      │   │  Component  │      │   (ME)       │      │     API     │   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                        updateElement()                         │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Notes don't move when dragged, jump erratically, or keep following mouse
 * - **User Impact:** Users can't reposition notes or notes stick to cursor
 * - **Quick Fix:** Check zoom value calculation (must divide mouse delta by zoom)
 * - **Debug:** Log dragStartRef values and delta calculations
 * - **Common Issue:** Event listeners not cleaned up due to stale closures
 * - **Critical Fix (2026-02-03):** Use refs to store handler references for proper cleanup
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isDragging          │ Whether user is currently dragging                   │
 * │ dragStartRef        │ Initial positions for calculating delta              │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - handleContentMouseDown(): Start drag detection with threshold
 * - handleDragMove(): Calculate and apply position changes
 * - handleDragEnd(): Clean up and reset state
 * 
 * 🔑 KEY CONCEPTS:
 * - Uses 5px threshold before starting drag (allows click vs drag distinction)
 * - All coordinates converted to scene space by dividing by zoom
 * - Event listeners added/removed dynamically to prevent leaks
 * - CRITICAL: Uses refs to store handler references for reliable cleanup
 *
 * 📝 REFACTOR JOURNAL:
 * 2026-02-03: Fixed drag listeners not cleaning up properly
 *             - Refactored to use handlersRef for stable function references
 *             - Prevents notes from sticking to cursor after mouseup
 *             - Added cleanup helpers for drag and threshold listeners
 *
 * @module markdown/hooks/useDrag
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { DragStartRef } from '../types';

interface UseDragOptions {
    /** Current zoom level for coordinate conversion */
    zoom: number;
    /** Callback to update element position */
    updateElement: (updates: { x?: number; y?: number }) => void;
    /** Initial element position */
    elementPosition: { x: number; y: number };
    /** Whether editing mode is active (blocks dragging) */
    isEditing: boolean;
    /** Callback when drag starts */
    onDragStart?: () => void;
    /** Callback when drag ends */
    onDragEnd?: () => void;
}

interface UseDragReturn {
    /** Whether user is currently dragging */
    isDragging: boolean;
    /** Mouse down handler to attach to draggable element */
    handleContentMouseDown: (e: React.MouseEvent) => void;
}

/** Drag detection threshold in pixels */
const DRAG_THRESHOLD = 5;

/**
 * Hook for handling drag interactions on markdown notes
 */
export function useDrag({
    zoom,
    updateElement,
    elementPosition,
    isEditing,
    onDragStart,
    onDragEnd,
}: UseDragOptions): UseDragReturn {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<DragStartRef | null>(null);

    // Store stable references to handlers for proper cleanup
    const handlersRef = useRef<{
        dragMove: ((e: MouseEvent) => void) | null;
        dragEnd: ((e: MouseEvent) => void) | null;
        thresholdMove: ((e: MouseEvent) => void) | null;
        thresholdUp: (() => void) | null;
    }>({
        dragMove: null,
        dragEnd: null,
        thresholdMove: null,
        thresholdUp: null,
    });

    /**
     * Clean up all drag listeners
     */
    const cleanupDragListeners = useCallback(() => {
        if (handlersRef.current.dragMove) {
            document.removeEventListener('mousemove', handlersRef.current.dragMove);
            handlersRef.current.dragMove = null;
        }
        if (handlersRef.current.dragEnd) {
            document.removeEventListener('mouseup', handlersRef.current.dragEnd);
            handlersRef.current.dragEnd = null;
        }
    }, []);

    /**
     * Clean up threshold detection listeners
     */
    const cleanupThresholdListeners = useCallback(() => {
        if (handlersRef.current.thresholdMove) {
            document.removeEventListener('mousemove', handlersRef.current.thresholdMove);
            handlersRef.current.thresholdMove = null;
        }
        if (handlersRef.current.thresholdUp) {
            document.removeEventListener('mouseup', handlersRef.current.thresholdUp);
            handlersRef.current.thresholdUp = null;
        }
    }, []);

    /**
     * Initial mouse down handler - starts threshold detection
     */
    const handleContentMouseDown = useCallback((e: React.MouseEvent) => {
        if (isEditing) return;

        // Clean up any existing listeners first
        cleanupDragListeners();
        cleanupThresholdListeners();

        // Select the note immediately on click (not just on drag)
        onDragStart?.();

        const startX = e.clientX;
        const startY = e.clientY;

        /**
         * Handle drag movement - updates element position
         */
        const handleDragMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;

            const dx = (e.clientX - dragStartRef.current.x) / zoom;
            const dy = (e.clientY - dragStartRef.current.y) / zoom;

            updateElement({
                x: dragStartRef.current.elementX + dx,
                y: dragStartRef.current.elementY + dy,
            });
        };

        /**
         * Handle drag end - cleans up listeners
         */
        const handleDragEnd = (e: MouseEvent) => {
            setIsDragging(false);
            dragStartRef.current = null;
            onDragEnd?.();
            cleanupDragListeners();
        };

        /**
         * Handle mouse move during drag threshold detection
         */
        const handleThresholdMove = (moveEvent: MouseEvent) => {
            const dx = Math.abs(moveEvent.clientX - startX);
            const dy = Math.abs(moveEvent.clientY - startY);

            // Only start drag if moved more than threshold
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                setIsDragging(true);

                dragStartRef.current = {
                    x: startX,
                    y: startY,
                    elementX: elementPosition.x,
                    elementY: elementPosition.y,
                };

                // Switch from threshold detection to drag listeners
                cleanupThresholdListeners();

                handlersRef.current.dragMove = handleDragMove;
                handlersRef.current.dragEnd = handleDragEnd;
                document.addEventListener('mousemove', handleDragMove);
                document.addEventListener('mouseup', handleDragEnd);
            }
        };

        /**
         * Handle mouse up during threshold detection (no drag occurred)
         */
        const handleThresholdUp = () => {
            cleanupThresholdListeners();
        };

        // Store and add threshold detection listeners
        handlersRef.current.thresholdMove = handleThresholdMove;
        handlersRef.current.thresholdUp = handleThresholdUp;
        document.addEventListener('mousemove', handleThresholdMove);
        document.addEventListener('mouseup', handleThresholdUp);
    }, [isEditing, zoom, updateElement, elementPosition.x, elementPosition.y, onDragStart, onDragEnd, cleanupDragListeners, cleanupThresholdListeners]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupDragListeners();
            cleanupThresholdListeners();
        };
    }, [cleanupDragListeners, cleanupThresholdListeners]);

    return {
        isDragging,
        handleContentMouseDown,
    };
}
