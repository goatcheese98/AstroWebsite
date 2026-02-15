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
