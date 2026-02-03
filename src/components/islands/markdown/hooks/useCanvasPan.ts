/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔵 useCanvasPan.ts             "The Pan Detector"                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I detect when the canvas is being panned. When users two-finger scroll  ║
 * ║     or middle-click drag, I temporarily disable note interactions to        ║
 * ║     prevent interference with canvas panning.                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │   Window    │─────▶│ useCanvasPan │─────▶│ MarkdownNote│   │
 *      │   │   Events    │      │   (ME)       │      │   UI State  │   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                  isCanvasPanning (disables hover)              │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Notes intercept pan gestures, making canvas navigation hard
 * - **User Impact:** Frustrating canvas navigation experience
 * - **Quick Fix:** Check wheel event detection (non-ctrl wheel = pan)
 * - **Debug:** Log wheel events and isCanvasPanning state
 * - **Common Issue:** Timeout too short, pan state flickers
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isCanvasPanning     │ Whether canvas is currently being panned             │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - Automatic detection via wheel/mousedown events
 * - Timeout-based reset (150ms after pan ends)
 * 
 * 🔑 KEY CONCEPTS:
 * - Two-finger scroll triggers wheel event without ctrl/meta
 * - Middle mouse button (button === 1) indicates panning
 * - Clears hover states immediately when pan starts
 * - 150ms timeout prevents flickering
 * 
 * @module markdown/hooks/useCanvasPan
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCanvasPanOptions {
    /** Callback when pan starts (to clear hover states) */
    onPanStart?: () => void;
}

interface UseCanvasPanReturn {
    /** Whether canvas is currently being panned */
    isCanvasPanning: boolean;
}

/** Timeout delay for resetting pan state (ms) */
const PAN_TIMEOUT = 150;

/**
 * Hook for detecting canvas panning operations
 */
export function useCanvasPan({ onPanStart }: UseCanvasPanOptions = {}): UseCanvasPanReturn {
    const [isCanvasPanning, setIsCanvasPanning] = useState(false);
    const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Clear any pending pan timeout
     */
    const clearPanTimeout = useCallback(() => {
        if (panTimeoutRef.current) {
            clearTimeout(panTimeoutRef.current);
            panTimeoutRef.current = null;
        }
    }, []);

    /**
     * Reset pan state after timeout
     */
    const resetPanState = useCallback(() => {
        panTimeoutRef.current = setTimeout(() => {
            setIsCanvasPanning(false);
        }, PAN_TIMEOUT);
    }, []);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            // Two-finger scroll detected (wheel without modifiers)
            if (!e.ctrlKey && !e.metaKey) {
                setIsCanvasPanning(true);
                onPanStart?.();

                clearPanTimeout();
                resetPanState();
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            // Middle mouse button or space+drag on canvas
            const isMiddleClick = e.button === 1;
            const isSpaceDrag = e.button === 0 && (e.target as HTMLElement)?.closest('.excalidraw__canvas');

            if (isMiddleClick || isSpaceDrag) {
                setIsCanvasPanning(true);
                onPanStart?.();
            }
        };

        const handleMouseUp = () => {
            clearPanTimeout();
            resetPanState();
        };

        // Clear hover states on any scroll
        const handleScroll = () => {
            onPanStart?.();
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

        return () => {
            clearPanTimeout();
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, [onPanStart, clearPanTimeout, resetPanState]);

    return { isCanvasPanning };
}
