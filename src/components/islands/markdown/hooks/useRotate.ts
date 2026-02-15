import { useState, useRef, useCallback } from 'react';
import type { RotateStartRef } from '../types';

interface UseRotateOptions {
    /** Current element angle (radians) */
    currentAngle: number;
    /** Element center position in screen coordinates */
    centerPosition: { x: number; y: number };
    /** Callback to update element angle */
    updateElement: (updates: { angle?: number }) => void;
}

interface UseRotateReturn {
    /** Whether user is currently rotating */
    isRotating: boolean;
    /** Start rotation operation */
    handleRotateStart: (e: React.MouseEvent) => void;
}

/**
 * Hook for handling rotation interactions on markdown notes
 */
export function useRotate({
    currentAngle,
    centerPosition,
    updateElement,
}: UseRotateOptions): UseRotateReturn {
    const [isRotating, setIsRotating] = useState(false);
    const rotateStartRef = useRef<RotateStartRef | null>(null);

    /**
     * Handle rotation movement - calculates angle from center to mouse
     */
    const handleRotateMove = useCallback((e: MouseEvent) => {
        if (!rotateStartRef.current) return;

        // Calculate current mouse angle from center
        const dx = e.clientX - rotateStartRef.current.centerX;
        const dy = e.clientY - rotateStartRef.current.centerY;
        const currentMouseAngle = Math.atan2(dy, dx);

        // Calculate delta from starting angle
        const deltaAngle = currentMouseAngle - rotateStartRef.current.initialMouseAngle;

        // Apply delta to original element angle
        const newAngle = rotateStartRef.current.angle + deltaAngle;

        updateElement({ angle: newAngle });
    }, [updateElement]);

    /**
     * Handle rotation end - clean up listeners
     */
    const handleRotateEnd = useCallback(() => {
        setIsRotating(false);
        rotateStartRef.current = null;

        document.removeEventListener('mousemove', handleRotateMove);
        document.removeEventListener('mouseup', handleRotateEnd);
    }, [handleRotateMove]);

    /**
     * Start rotation operation
     */
    const handleRotateStart = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsRotating(true);

        // Calculate initial angle from center to mouse
        const initialMouseAngle = Math.atan2(
            e.clientY - centerPosition.y,
            e.clientX - centerPosition.x
        );

        rotateStartRef.current = {
            angle: currentAngle,
            centerX: centerPosition.x,
            centerY: centerPosition.y,
            initialMouseAngle,
        };

        document.addEventListener('mousemove', handleRotateMove);
        document.addEventListener('mouseup', handleRotateEnd);
    }, [currentAngle, centerPosition, handleRotateMove, handleRotateEnd]);

    return {
        isRotating,
        handleRotateStart,
    };
}
