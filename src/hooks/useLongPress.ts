import { useCallback, useRef, useEffect } from "react";

export interface UseLongPressOptions {
    /** Callback fired when long press is detected */
    onLongPress?: (event: TouchEvent | MouseEvent) => void;
    /** Callback fired for context menu (right-click or long-press) */
    onContextMenu?: (event: MouseEvent | TouchEvent) => void;
    /** Delay in milliseconds before long press triggers (default: 800) */
    delay?: number;
    /** Whether to disable long press detection */
    disabled?: boolean;
    /** Whether to prevent default on touch events (default: true) */
    preventDefault?: boolean;
}

export interface UseLongPressReturn {
    /** Bind these props to the element you want to detect long press on */
    handlers: {
        onTouchStart: (e: React.TouchEvent) => void;
        onTouchEnd: (e: React.TouchEvent) => void;
        onTouchMove: (e: React.TouchEvent) => void;
        onContextMenu: (e: React.MouseEvent) => void;
        onMouseDown: (e: React.MouseEvent) => void;
        onMouseUp: (e: React.MouseEvent) => void;
        onMouseLeave: (e: React.MouseEvent) => void;
    };
}

/**
 * Hook to detect long press gestures and trigger context menu
 */
export function useLongPress(options: UseLongPressOptions): UseLongPressReturn {
    const {
        onLongPress,
        onContextMenu,
        delay = 800,
        disabled = false,
        preventDefault = true,
    } = options;

    const timerRef = useRef<number | null>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLongPressRef = useRef(false);

    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const start = useCallback((event: TouchEvent | MouseEvent) => {
        if (disabled) return;

        // Get position for touch or mouse
        const clientX = "touches" in event 
            ? event.touches[0]?.clientX 
            : (event as MouseEvent).clientX;
        const clientY = "touches" in event 
            ? event.touches[0]?.clientY 
            : (event as MouseEvent).clientY;

        startPosRef.current = { x: clientX, y: clientY };
        isLongPressRef.current = false;

        // Start timer
        timerRef.current = window.setTimeout(() => {
            isLongPressRef.current = true;
            onLongPress?.(event);
            
            // Try to trigger native context menu for mobile
            if ("touches" in event && event.target instanceof HTMLElement) {
                // For touch devices, dispatch a synthetic context menu event
                const syntheticEvent = new MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: 2,
                    buttons: 2,
                    clientX,
                    clientY,
                });
                event.target.dispatchEvent(syntheticEvent);
            }
        }, delay);
    }, [disabled, delay, onLongPress]);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        startPosRef.current = null;
    }, []);

    const move = useCallback((event: TouchEvent | MouseEvent) => {
        if (!startPosRef.current) return;

        // Get current position
        const clientX = "touches" in event 
            ? event.touches[0]?.clientX 
            : (event as MouseEvent).clientX;
        const clientY = "touches" in event 
            ? event.touches[0]?.clientY 
            : (event as MouseEvent).clientY;

        // If moved more than 10px, cancel long press
        const deltaX = Math.abs(clientX - startPosRef.current.x);
        const deltaY = Math.abs(clientY - startPosRef.current.y);

        if (deltaX > 10 || deltaY > 10) {
            cancel();
        }
    }, [cancel]);

    const handleContextMenu = useCallback((event: React.MouseEvent) => {
        // If this was triggered by long press, don't propagate
        if (isLongPressRef.current) {
            event.preventDefault();
            isLongPressRef.current = false;
        }
        
        onContextMenu?.(event.nativeEvent);
    }, [onContextMenu]);

    const handlers = {
        onTouchStart: (e: React.TouchEvent) => {
            if (preventDefault) {
                // Don't prevent default immediately to allow scrolling
                // Only prevent if it turns into a long press
            }
            start(e.nativeEvent);
        },
        onTouchEnd: (e: React.TouchEvent) => {
            if (isLongPressRef.current && preventDefault) {
                e.preventDefault();
            }
            cancel();
        },
        onTouchMove: (e: React.TouchEvent) => {
            move(e.nativeEvent);
        },
        onContextMenu: handleContextMenu,
        onMouseDown: (e: React.MouseEvent) => {
            if (e.button === 0) { // Left click only
                start(e.nativeEvent);
            }
        },
        onMouseUp: () => {
            cancel();
        },
        onMouseLeave: () => {
            cancel();
        },
    };

    return { handlers };
}

export default useLongPress;
