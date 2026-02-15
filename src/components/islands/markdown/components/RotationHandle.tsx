import React from 'react';

interface RotationHandleProps {
    /** Whether to show the handle */
    isVisible: boolean;
    /** Whether rotation is in progress */
    isRotating: boolean;
    /** Called when user starts dragging */
    onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Rotation handle component
 */
export const RotationHandle = React.memo(function RotationHandle({
    isVisible,
    isRotating,
    onMouseDown,
}: RotationHandleProps) {
    if (!isVisible) return null;

    return (
        <div
            onMouseDown={onMouseDown}
            style={{
                position: 'absolute',
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '32px',
                height: '24px',
                backgroundColor: '#6366f1',
                borderRadius: '12px',
                cursor: isRotating ? 'grabbing' : 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
                userSelect: 'none',
                zIndex: 1002,
                opacity: isRotating ? 1 : 0.95,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'auto',
            }}
            title="Rotate"
        >
            ↻
        </div>
    );
});
