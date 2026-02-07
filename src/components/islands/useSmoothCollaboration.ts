/**
 * Smooth Collaboration Hook
 *
 * Uses spring physics and fade-in animations to smooth remote canvas updates.
 * Makes dragging and element creation feel fluid instead of stuttery.
 */

import { useRef, useCallback, useEffect } from 'react';

interface ElementState {
    // Target positions (server truth)
    targetX: number;
    targetY: number;
    targetAngle: number;

    // Rendered positions (what user sees with smoothing)
    renderedX: number;
    renderedY: number;
    renderedAngle: number;

    // Spring velocities
    velocityX: number;
    velocityY: number;
    velocityAngle: number;

    // Fade-in state
    opacity: number;
    fadeStartTime: number;
    isNew: boolean;

    // Original element
    element: any;
    lastUpdateTime: number;
}

// Spring physics constants (balanced feel)
const SPRING_STIFFNESS = 250; // How quickly spring pulls toward target
const SPRING_DAMPING = 25;    // How much to reduce oscillation
const POSITION_THRESHOLD = 0.5; // Snap to target when within 0.5px
const ANGLE_THRESHOLD = 0.01;   // Snap to target when within 0.01 radians
const FADE_DURATION = 150;      // Fade-in duration in ms

export function useSmoothCollaboration(excalidrawAPI: any) {
    const elementStatesRef = useRef<Map<string, ElementState>>(new Map());
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(Date.now());
    const isAnimatingRef = useRef<boolean>(false);
    const isSmoothingUpdateRef = useRef<boolean>(false); // Flag to prevent sync loop

    /**
     * Update spring physics for a single value
     */
    const updateSpring = useCallback((
        current: number,
        target: number,
        velocity: number,
        deltaTime: number
    ): { position: number; velocity: number } => {
        const displacement = current - target;
        const springForce = -SPRING_STIFFNESS * displacement;
        const dampingForce = -SPRING_DAMPING * velocity;
        const acceleration = springForce + dampingForce;

        const newVelocity = velocity + acceleration * deltaTime;
        const newPosition = current + newVelocity * deltaTime;

        // Snap to target if close enough
        const distance = Math.abs(newPosition - target);
        if (distance < POSITION_THRESHOLD && Math.abs(newVelocity) < 1) {
            return { position: target, velocity: 0 };
        }

        return { position: newPosition, velocity: newVelocity };
    }, []);

    /**
     * Animation loop - updates all springs and applies to canvas
     */
    const animate = useCallback(() => {
        if (!excalidrawAPI) return;

        const now = Date.now();
        const deltaTime = Math.min((now - lastFrameTimeRef.current) / 1000, 0.1); // Cap at 100ms
        lastFrameTimeRef.current = now;

        const states = elementStatesRef.current;
        const currentElements = excalidrawAPI.getSceneElements();
        let hasActiveAnimations = false;

        // Update each element's spring
        const updatedElements = currentElements.map((el: any) => {
            const state = states.get(el.id);
            if (!state) return el;

            let needsUpdate = false;
            const updates: any = { ...el };

            // Update position springs
            if (Math.abs(state.renderedX - state.targetX) > POSITION_THRESHOLD ||
                Math.abs(state.velocityX) > 0.1) {
                const result = updateSpring(state.renderedX, state.targetX, state.velocityX, deltaTime);
                state.renderedX = result.position;
                state.velocityX = result.velocity;
                updates.x = result.position;
                needsUpdate = true;
                hasActiveAnimations = true;
            }

            if (Math.abs(state.renderedY - state.targetY) > POSITION_THRESHOLD ||
                Math.abs(state.velocityY) > 0.1) {
                const result = updateSpring(state.renderedY, state.targetY, state.velocityY, deltaTime);
                state.renderedY = result.position;
                state.velocityY = result.velocity;
                updates.y = result.position;
                needsUpdate = true;
                hasActiveAnimations = true;
            }

            // Update rotation spring
            if (Math.abs(state.renderedAngle - state.targetAngle) > ANGLE_THRESHOLD ||
                Math.abs(state.velocityAngle) > 0.01) {
                const result = updateSpring(state.renderedAngle, state.targetAngle, state.velocityAngle, deltaTime);
                state.renderedAngle = result.position;
                state.velocityAngle = result.velocity;
                updates.angle = result.position;
                needsUpdate = true;
                hasActiveAnimations = true;
            }

            // Update fade-in
            if (state.isNew && state.opacity < 1) {
                const elapsed = now - state.fadeStartTime;
                state.opacity = Math.min(1, elapsed / FADE_DURATION);
                updates.opacity = state.opacity * 100; // Excalidraw uses 0-100
                needsUpdate = true;
                hasActiveAnimations = true;

                if (state.opacity >= 1) {
                    state.isNew = false;
                }
            }

            return needsUpdate ? updates : el;
        });

        // Set flag to indicate this is a smoothing update (prevents sync loop)
        isSmoothingUpdateRef.current = true;

        // Apply smoothed elements to canvas
        excalidrawAPI.updateScene({ elements: updatedElements });

        // Reset flag after a short delay
        requestAnimationFrame(() => {
            isSmoothingUpdateRef.current = false;
        });

        // Continue animation if needed
        if (hasActiveAnimations) {
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            isAnimatingRef.current = false;
            animationFrameRef.current = null;
        }
    }, [excalidrawAPI, updateSpring]);

    /**
     * Start animation loop if not already running
     */
    const startAnimation = useCallback(() => {
        if (!isAnimatingRef.current) {
            isAnimatingRef.current = true;
            lastFrameTimeRef.current = Date.now();
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [animate]);

    /**
     * Apply smoothing to remote element updates
     */
    const smoothRemoteUpdate = useCallback((remoteElements: any[]) => {
        if (!excalidrawAPI) return remoteElements;

        const states = elementStatesRef.current;
        const currentElements = excalidrawAPI.getSceneElements();
        const currentById = new Map(currentElements.map((el: any) => [el.id, el]));
        const now = Date.now();

        remoteElements.forEach((remoteEl: any) => {
            const currentEl = currentById.get(remoteEl.id);
            let state = states.get(remoteEl.id);

            if (!state) {
                // New element - initialize with fade-in
                state = {
                    targetX: remoteEl.x,
                    targetY: remoteEl.y,
                    targetAngle: remoteEl.angle || 0,
                    renderedX: remoteEl.x,
                    renderedY: remoteEl.y,
                    renderedAngle: remoteEl.angle || 0,
                    velocityX: 0,
                    velocityY: 0,
                    velocityAngle: 0,
                    opacity: 0,
                    fadeStartTime: now,
                    isNew: true,
                    element: remoteEl,
                    lastUpdateTime: now,
                };
                states.set(remoteEl.id, state);
                console.log("✨ New element with fade-in:", remoteEl.id);
            } else {
                // Existing element - update target for spring
                const moved = state.targetX !== remoteEl.x || state.targetY !== remoteEl.y;
                state.targetX = remoteEl.x;
                state.targetY = remoteEl.y;
                state.targetAngle = remoteEl.angle || 0;
                state.element = remoteEl;
                state.lastUpdateTime = now;

                if (moved) {
                    console.log("🎯 Spring target updated:", remoteEl.id);
                }
            }
        });

        // Clean up deleted elements
        const remoteIds = new Set(remoteElements.map((el: any) => el.id));
        for (const [id, state] of states.entries()) {
            if (!remoteIds.has(id)) {
                states.delete(id);
            }
        }

        // Start animation loop
        startAnimation();

        return remoteElements;
    }, [excalidrawAPI, startAnimation]);

    /**
     * Check if current update is from smoothing system
     */
    const isSmoothingUpdate = useCallback(() => {
        return isSmoothingUpdateRef.current;
    }, []);

    /**
     * Clean up on unmount
     */
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return {
        smoothRemoteUpdate,
        isSmoothingUpdate,
    };
}
