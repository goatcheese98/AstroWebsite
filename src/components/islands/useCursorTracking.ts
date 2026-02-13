/**
 * Cursor Tracking Hook
 * 
 * Manages real-time cursor positions for collaborative editing.
 * Uses spring physics for smooth cursor interpolation.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { encode } from '@msgpack/msgpack';

export interface CollaboratorCursor {
    userId: string;
    userName: string;
    x: number;
    y: number;
    color: string;
    lastUpdate: number;
}

interface CursorState extends CollaboratorCursor {
    // Spring physics for smooth movement
    targetX: number;
    targetY: number;
    renderedX: number;
    renderedY: number;
    velocityX: number;
    velocityY: number;
}

// Spring physics constants
const CURSOR_SPRING_STIFFNESS = 400;
const CURSOR_SPRING_DAMPING = 30;
const CURSOR_THRESHOLD = 0.3;
const CURSOR_UPDATE_THROTTLE = 16; // ~60fps

// Generate a consistent color for a user ID
const getUserColor = (userId: string): string => {
    const colors = [
        '#ef4444', // red
        '#f59e0b', // amber
        '#10b981', // emerald
        '#3b82f6', // blue
        '#8b5cf6', // violet
        '#ec4899', // pink
        '#14b8a6', // teal
        '#f97316', // orange
    ];

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

export function useCursorTracking(
    socket: WebSocket | null,
    excalidrawAPI: any,
    userId: string | null
) {
    const [cursors, setCursors] = useState<Map<string, CollaboratorCursor>>(new Map());
    const cursorStatesRef = useRef<Map<string, CursorState>>(new Map());
    const lastSentPositionRef = useRef<{ x: number; y: number } | null>(null);
    const lastSentTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(Date.now());
    const isAnimatingRef = useRef<boolean>(false);

    // Spring physics update
    const updateCursorSpring = useCallback((
        current: number,
        target: number,
        velocity: number,
        deltaTime: number
    ): { position: number; velocity: number } => {
        const displacement = current - target;
        const springForce = -CURSOR_SPRING_STIFFNESS * displacement;
        const dampingForce = -CURSOR_SPRING_DAMPING * velocity;
        const acceleration = springForce + dampingForce;

        const newVelocity = velocity + acceleration * deltaTime;
        const newPosition = current + newVelocity * deltaTime;

        if (Math.abs(newPosition - target) < CURSOR_THRESHOLD && Math.abs(newVelocity) < 1) {
            return { position: target, velocity: 0 };
        }

        return { position: newPosition, velocity: newVelocity };
    }, []);

    // Animation loop for smooth cursor movement
    const animate = useCallback(() => {
        const now = Date.now();
        const deltaTime = Math.min((now - lastFrameTimeRef.current) / 1000, 0.1);
        lastFrameTimeRef.current = now;

        const states = cursorStatesRef.current;
        let hasActiveAnimations = false;

        // Update cursor springs
        states.forEach((state, id) => {
            let needsUpdate = false;

            if (Math.abs(state.renderedX - state.targetX) > CURSOR_THRESHOLD ||
                Math.abs(state.velocityX) > 0.1) {
                const result = updateCursorSpring(state.renderedX, state.targetX, state.velocityX, deltaTime);
                state.renderedX = result.position;
                state.velocityX = result.velocity;
                needsUpdate = true;
                hasActiveAnimations = true;
            }

            if (Math.abs(state.renderedY - state.targetY) > CURSOR_THRESHOLD ||
                Math.abs(state.velocityY) > 0.1) {
                const result = updateCursorSpring(state.renderedY, state.targetY, state.velocityY, deltaTime);
                state.renderedY = result.position;
                state.velocityY = result.velocity;
                needsUpdate = true;
                hasActiveAnimations = true;
            }

            if (needsUpdate) {
                state.x = state.renderedX;
                state.y = state.renderedY;
            }
        });

        // Update React state if there were changes
        if (hasActiveAnimations) {
            const updatedCursors = new Map<string, CollaboratorCursor>();
            states.forEach((state, id) => {
                updatedCursors.set(id, {
                    userId: state.userId,
                    userName: state.userName,
                    x: state.x,
                    y: state.y,
                    color: state.color,
                    lastUpdate: state.lastUpdate,
                });
            });
            setCursors(updatedCursors);
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            isAnimatingRef.current = false;
            animationFrameRef.current = null;
        }
    }, [updateCursorSpring]);

    // Start animation loop
    const startAnimation = useCallback(() => {
        if (!isAnimatingRef.current) {
            isAnimatingRef.current = true;
            lastFrameTimeRef.current = Date.now();
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [animate]);

    // Send cursor position to server
    const sendCursorPosition = useCallback((x: number, y: number) => {
        if (!socket || !userId || socket.readyState !== WebSocket.OPEN) return;

        const now = Date.now();

        // Throttle updates
        if (now - lastSentTimeRef.current < CURSOR_UPDATE_THROTTLE) return;

        // Don't send if position hasn't changed significantly
        if (lastSentPositionRef.current) {
            const dx = Math.abs(x - lastSentPositionRef.current.x);
            const dy = Math.abs(y - lastSentPositionRef.current.y);
            if (dx < 2 && dy < 2) return;
        }

        const color = getUserColor(userId);
        const message = encode({
            type: 'cursor-update',
            userId,
            userName: `User ${userId.slice(0, 6)}`,
            x,
            y,
            color,
        });

        socket.send(message);
        lastSentPositionRef.current = { x, y };
        lastSentTimeRef.current = now;
    }, [socket, userId]);

    // Handle incoming cursor updates
    const handleCursorUpdate = useCallback((data: any) => {
        if (data.userId === userId) return; // Ignore own cursor

        const states = cursorStatesRef.current;
        let state = states.get(data.userId);

        if (!state) {
            // New cursor
            state = {
                userId: data.userId,
                userName: data.userName,
                x: data.x,
                y: data.y,
                targetX: data.x,
                targetY: data.y,
                renderedX: data.x,
                renderedY: data.y,
                velocityX: 0,
                velocityY: 0,
                color: data.color,
                lastUpdate: Date.now(),
            };
            states.set(data.userId, state);
            console.log('✨ New collaborator cursor:', data.userName);
        } else {
            // Update existing cursor target
            state.targetX = data.x;
            state.targetY = data.y;
            state.userName = data.userName;
            state.color = data.color;
            state.lastUpdate = Date.now();
        }

        startAnimation();
    }, [userId, startAnimation]);

    // Remove cursor when user leaves
    const removeCursor = useCallback((removedUserId: string) => {
        const states = cursorStatesRef.current;
        if (states.delete(removedUserId)) {
            setCursors(new Map(
                Array.from(states.entries()).map(([id, state]) => [
                    id,
                    {
                        userId: state.userId,
                        userName: state.userName,
                        x: state.x,
                        y: state.y,
                        color: state.color,
                        lastUpdate: state.lastUpdate,
                    }
                ])
            ));
            console.log('👋 Removed cursor:', removedUserId);
        }
    }, []);

    // Track mouse movement and send updates (only when socket is connected)
    useEffect(() => {
        if (!excalidrawAPI || !socket || socket.readyState !== WebSocket.OPEN || !userId) return;

        console.log('🎯 Starting cursor tracking for user:', userId);

        const handlePointerMove = (event: PointerEvent) => {
            if (!excalidrawAPI || !socket || socket.readyState !== WebSocket.OPEN) return;

            try {
                const appState = excalidrawAPI.getAppState();
                if (!appState) return;

                // Convert screen coordinates to canvas coordinates
                const { scrollX, scrollY, zoom } = appState;
                const canvasX = (event.clientX / zoom.value) - scrollX;
                const canvasY = (event.clientY / zoom.value) - scrollY;

                sendCursorPosition(canvasX, canvasY);
            } catch (err) {
                // Silently fail if getAppState() isn't ready
            }
        };

        // Use passive listener to avoid interfering with Excalidraw
        window.addEventListener('pointermove', handlePointerMove, { passive: true });

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            console.log('🎯 Stopped cursor tracking');
        };
    }, [excalidrawAPI, socket, userId, sendCursorPosition]);

    // Clean up animation on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return {
        cursors,
        sendCursorPosition,
        handleCursorUpdate,
        removeCursor,
    };
}
