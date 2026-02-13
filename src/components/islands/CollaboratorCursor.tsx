import { useEffect, useRef } from 'react';

interface CollaboratorCursorProps {
    userId: string;
    userName: string;
    x: number;
    y: number;
    color: string;
    zoom: number;
    scrollX: number;
    scrollY: number;
}

export default function CollaboratorCursor({
    userId,
    userName,
    x,
    y,
    color,
    zoom,
    scrollX,
    scrollY,
}: CollaboratorCursorProps) {
    const cursorRef = useRef<HTMLDivElement>(null);
    const currentPosRef = useRef({ x: 0, y: 0 });
    const velocityRef = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | undefined>(undefined);

    // Spring physics constants for ultra-smooth tweening (16-frame interpolation)
    const SPRING_STIFFNESS = 0.15;  // Lower = smoother, more frames to interpolate
    const SPRING_DAMPING = 0.75;    // Slightly higher for stability
    const MIN_VELOCITY = 0.05;      // Lower threshold for smoother finish

    // Smooth spring-based animation loop
    useEffect(() => {
        if (!cursorRef.current) return;

        // Convert target canvas coordinates to screen coordinates
        const targetX = (x + scrollX) * zoom;
        const targetY = (y + scrollY) * zoom;

        // Debug logging (remove after testing)
        console.log('🎯 Cursor update:', {
            userId,
            userName,
            canvasPos: { x, y },
            scroll: { scrollX, scrollY },
            zoom,
            screenTarget: { targetX, targetY }
        });

        // Initialize position on first render
        if (currentPosRef.current.x === 0 && currentPosRef.current.y === 0) {
            currentPosRef.current = { x: targetX, y: targetY };
            cursorRef.current.style.transform = `translate(${targetX}px, ${targetY}px)`;
            console.log('🎯 Initialized cursor at:', { targetX, targetY });
            return;
        }

        // Animation loop with spring physics
        const animate = () => {
            if (!cursorRef.current) return;

            const current = currentPosRef.current;
            const velocity = velocityRef.current;

            // Calculate spring forces
            const dx = targetX - current.x;
            const dy = targetY - current.y;

            // Apply spring acceleration
            velocity.x += dx * SPRING_STIFFNESS;
            velocity.y += dy * SPRING_STIFFNESS;

            // Apply damping
            velocity.x *= SPRING_DAMPING;
            velocity.y *= SPRING_DAMPING;

            // Update position
            current.x += velocity.x;
            current.y += velocity.y;

            // Apply to DOM
            cursorRef.current.style.transform = `translate(${current.x}px, ${current.y}px)`;

            // Continue animation if velocity is significant
            const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
            const distance = Math.sqrt(dx ** 2 + dy ** 2);

            if (speed > MIN_VELOCITY || distance > 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                // Snap to final position
                current.x = targetX;
                current.y = targetY;
                velocity.x = 0;
                velocity.y = 0;
                cursorRef.current.style.transform = `translate(${targetX}px, ${targetY}px)`;
            }
        };

        // Cancel previous animation
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        // Start animation
        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [x, y, zoom, scrollX, scrollY]);

    return (
        <>
            <div ref={cursorRef} className="collaborator-cursor">
                {/* Cursor pointer */}
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ color }}>
                    <path
                        d="M5.65 5.65v12.7L12 12l-6.35-6.35z"
                        fill="currentColor"
                        stroke="white"
                        strokeWidth="1.5"
                    />
                </svg>

                {/* User label */}
                <div className="cursor-label" style={{ backgroundColor: color }}>
                    {userName}
                </div>
            </div>

            <style>{`
                .collaborator-cursor {
                    position: fixed;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    z-index: 999999;
                    will-change: transform;
                    /* Debug: Make cursor very visible */
                    opacity: 1 !important;
                    visibility: visible !important;
                }

                .collaborator-cursor svg {
                    display: block;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
                    /* Make cursor slightly larger for better visibility */
                    transform: scale(1.2);
                }

                .cursor-label {
                    position: absolute;
                    top: 22px;
                    left: 14px;
                    padding: 0.3rem 0.6rem;
                    border-radius: 6px;
                    font-family: var(--font-ui), -apple-system, sans-serif;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: white;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    animation: fadeIn 0.2s ease;
                    letter-spacing: 0.02em;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
}
