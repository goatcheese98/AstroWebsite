import { useEffect, useRef } from 'react';

interface LockedElement {
    id: string;
    userId: string;
    userName: string;
    color: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

interface SelectionLockOverlayProps {
    lockedElements: LockedElement[];
    zoom: number;
    scrollX: number;
    scrollY: number;
}

export default function SelectionLockOverlay({
    lockedElements,
    zoom,
    scrollX,
    scrollY,
}: SelectionLockOverlayProps) {
    return (
        <>
            {lockedElements.map((element) => {
                // Convert canvas coordinates to screen coordinates
                const screenX = (element.bounds.x + scrollX) * zoom;
                const screenY = (element.bounds.y + scrollY) * zoom;
                const screenWidth = element.bounds.width * zoom;
                const screenHeight = element.bounds.height * zoom;

                return (
                    <div
                        key={element.id}
                        className="selection-lock-overlay"
                        style={{
                            position: 'fixed',
                            left: `${screenX}px`,
                            top: `${screenY}px`,
                            width: `${screenWidth}px`,
                            height: `${screenHeight}px`,
                            border: `3px solid ${element.color}`,
                            borderRadius: '4px',
                            pointerEvents: 'none',
                            boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.5), inset 0 0 0 1px ${element.color}`,
                            animation: 'pulse 2s ease-in-out infinite',
                            zIndex: 999998,
                        }}
                    >
                        <div
                            className="lock-label"
                            style={{
                                position: 'absolute',
                                top: '-28px',
                                left: '0',
                                backgroundColor: element.color,
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                                <path d="M6 1C4.34 1 3 2.34 3 4v1H2v5h8V5h-1V4c0-1.66-1.34-3-3-3zm0 1c1.1 0 2 .9 2 2v1H4V4c0-1.1.9-2 2-2z" />
                            </svg>
                            {element.userName}
                        </div>
                    </div>
                );
            })}

            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.6;
                    }
                }

                .selection-lock-overlay {
                    will-change: transform;
                    transition: all 0.15s ease-out;
                }
            `}</style>
        </>
    );
}
