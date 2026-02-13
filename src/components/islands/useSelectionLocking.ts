import { useRef, useState, useCallback, useEffect } from 'react';
import { encode } from '@msgpack/msgpack';

export interface UserSelection {
    userId: string;
    userName: string;
    color: string;
    selectedElementIds: string[];
    lastUpdate: number;
}

interface SelectionLock {
    elementId: string;
    userId: string;
    userName: string;
    color: string;
}

const SELECTION_UPDATE_THROTTLE = 100; // Send selection updates every 100ms

export function useSelectionLocking(
    socket: WebSocket | null,
    excalidrawAPI: any,
    currentUserId: string | null,
    userColor: string
) {
    const [selections, setSelections] = useState<Map<string, UserSelection>>(new Map());
    const [lockedElements, setLockedElements] = useState<Set<string>>(new Set());
    const lastSentSelectionRef = useRef<string[]>([]);
    const lastSentTimeRef = useRef<number>(0);

    // Get current user name (simplified - you can enhance this)
    const getUserName = useCallback((userId: string) => {
        return `User ${userId.slice(0, 6)}`;
    }, []);

    // Send selection update to server
    const sendSelectionUpdate = useCallback((selectedIds: string[]) => {
        if (!socket || socket.readyState !== WebSocket.OPEN || !currentUserId) return;

        const now = Date.now();

        // Throttle selection updates
        if (now - lastSentTimeRef.current < SELECTION_UPDATE_THROTTLE) return;

        // Check if selection actually changed
        const selectionChanged =
            selectedIds.length !== lastSentSelectionRef.current.length ||
            !selectedIds.every(id => lastSentSelectionRef.current.includes(id));

        if (!selectionChanged) return;

        try {
            const message = encode({
                type: 'selection-update',
                userId: currentUserId,
                userName: getUserName(currentUserId),
                color: userColor,
                selectedElementIds: selectedIds,
            });

            socket.send(message);
            lastSentSelectionRef.current = selectedIds;
            lastSentTimeRef.current = now;

            console.log('📌 Sent selection update:', selectedIds.length, 'elements');
        } catch (err) {
            console.error('Failed to send selection update:', err);
        }
    }, [socket, currentUserId, userColor, getUserName]);

    // Handle incoming selection updates
    const handleSelectionUpdate = useCallback((data: {
        userId: string;
        userName: string;
        color: string;
        selectedElementIds: string[];
    }) => {
        if (!currentUserId || data.userId === currentUserId) return;

        console.log('📌 Received selection from', data.userName, ':', data.selectedElementIds.length);

        setSelections(prev => {
            const next = new Map(prev);
            if (data.selectedElementIds.length === 0) {
                next.delete(data.userId);
            } else {
                next.set(data.userId, {
                    userId: data.userId,
                    userName: data.userName,
                    color: data.color,
                    selectedElementIds: data.selectedElementIds,
                    lastUpdate: Date.now(),
                });
            }
            return next;
        });

        // Update locked elements set
        setLockedElements(prev => {
            const next = new Set(prev);
            // Remove all elements from this user
            prev.forEach(elementId => {
                const owner = Array.from(selections.values()).find(s =>
                    s.selectedElementIds.includes(elementId)
                );
                if (owner?.userId === data.userId) {
                    next.delete(elementId);
                }
            });
            // Add newly selected elements
            data.selectedElementIds.forEach(id => next.add(id));
            return next;
        });
    }, [currentUserId, selections]);

    // Remove user's selection when they disconnect
    const removeUserSelection = useCallback((userId: string) => {
        setSelections(prev => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
        });

        setLockedElements(prev => {
            const next = new Set(prev);
            const userSelection = selections.get(userId);
            if (userSelection) {
                userSelection.selectedElementIds.forEach(id => next.delete(id));
            }
            return next;
        });

        console.log('📌 Removed selection for disconnected user:', userId);
    }, [selections]);

    // Check if an element is locked by another user
    const isElementLocked = useCallback((elementId: string): SelectionLock | null => {
        for (const [userId, selection] of selections.entries()) {
            if (userId !== currentUserId && selection.selectedElementIds.includes(elementId)) {
                return {
                    elementId,
                    userId: selection.userId,
                    userName: selection.userName,
                    color: selection.color,
                };
            }
        }
        return null;
    }, [selections, currentUserId]);

    // Get all locked elements with their details
    const getLockedElementsDetails = useCallback(() => {
        if (!excalidrawAPI) return [];

        const locked: Array<{
            id: string;
            userId: string;
            userName: string;
            color: string;
            bounds: { x: number; y: number; width: number; height: number };
        }> = [];

        const elements = excalidrawAPI.getSceneElements();

        for (const [userId, selection] of selections.entries()) {
            if (userId === currentUserId) continue;

            selection.selectedElementIds.forEach(elementId => {
                const element = elements.find((el: any) => el.id === elementId);
                if (element && !element.isDeleted) {
                    locked.push({
                        id: elementId,
                        userId: selection.userId,
                        userName: selection.userName,
                        color: selection.color,
                        bounds: {
                            x: element.x,
                            y: element.y,
                            width: element.width,
                            height: element.height,
                        },
                    });
                }
            });
        }

        return locked;
    }, [excalidrawAPI, selections, currentUserId]);

    return {
        selections,
        lockedElements,
        isElementLocked,
        getLockedElementsDetails,
        sendSelectionUpdate,
        handleSelectionUpdate,
        removeUserSelection,
    };
}
