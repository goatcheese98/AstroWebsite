/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🟣 RotationHandle.tsx          "The Rotator"                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I am the rotation handle. I sit at the top of the note and let users    ║
 * ║     rotate the note around its center. I show a curved arrow icon.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  useRotate  │─────▶│      ME      │─────▶│   Mouse     │   │
 *      │   │    Hook     │      │   Handle     │      │   Events    │   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Can't rotate note, handle not clickable
 * - **User Impact:** Users can't rotate notes
 * - **Quick Fix:** Check isHovered or isRotating conditions
 * - **Debug:** Verify onMouseDown is being called
 * - **Common Issue:** z-index blocking clicks
 * 
 * 📦 PROPS I RECEIVE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isVisible           │ Whether to show the handle                           │
 * │ isRotating          │ Whether rotation is in progress (changes cursor)     │
 * │ onMouseDown         │ Callback when user starts dragging                   │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - Render rotation handle at top center
 * - Show grab/grabbing cursor based on state
 * - Display curved arrow icon
 * 
 * @module markdown/components/RotationHandle
 */

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
