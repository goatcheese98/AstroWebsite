import { useState, useCallback, useEffect, useRef } from "react";
import type { CanvasElementSnapshot, ElementContext } from "./types";

interface UseElementSelectionOptions {
    enabled: boolean;
    onSelectionChange?: (selectedIds: string[]) => void;
}

export function useElementSelection(options: UseElementSelectionOptions) {
    const { enabled, onSelectionChange } = options;
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [elementSnapshots, setElementSnapshots] = useState<Map<string, CanvasElementSnapshot>>(new Map());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const previousSelectionRef = useRef<string[]>([]);

    // Get element info from canvas
    const getElementInfo = useCallback((elementId: string): ElementContext | null => {
        const api = (window as any).excalidrawAPI;
        if (!api) return null;

        const elements = api.getSceneElements();
        const element = elements.find((el: any) => el.id === elementId);
        
        if (!element) return null;

        return {
            id: element.id,
            type: element.type,
            boundingBox: {
                x: element.x,
                y: element.y,
                width: element.width || 100,
                height: element.height || 100,
            },
            content: element.text || element.label?.text || element.customData?.content,
            metadata: element.customData,
        };
    }, []);

    // Capture snapshot of selected elements
    const captureSnapshots = useCallback((elementIds: string[]) => {
        const api = (window as any).excalidrawAPI;
        if (!api) return;

        const elements = api.getSceneElements();
        const files = api.getFiles?.() || {};
        const newSnapshots = new Map(elementSnapshots);

        elementIds.forEach(id => {
            const element = elements.find((el: any) => el.id === id);
            if (element) {
                const snapshot: CanvasElementSnapshot = {
                    id: element.id,
                    type: element.type,
                    x: element.x,
                    y: element.y,
                    width: element.width || 100,
                    height: element.height || 100,
                    text: element.text || element.label?.text,
                    selected: true,
                };

                // If it's an image element, capture the image data
                if (element.type === 'image' && element.fileId) {
                    snapshot.fileId = element.fileId;
                    const fileData = files[element.fileId];
                    if (fileData) {
                        snapshot.imageDataURL = fileData.dataURL;
                    }
                }

                newSnapshots.set(id, snapshot);
            }
        });

        // Remove snapshots for unselected elements
        Array.from(newSnapshots.keys()).forEach(id => {
            if (!elementIds.includes(id)) {
                newSnapshots.delete(id);
            }
        });

        setElementSnapshots(newSnapshots);
    }, [elementSnapshots]);

    // Sync with Excalidraw's actual selection
    const syncWithExcalidrawSelection = useCallback(() => {
        const api = (window as any).excalidrawAPI;
        if (!api) return;

        const appState = api.getAppState();
        const selectedIds = Object.entries(appState.selectedElementIds || {})
            .filter(([_, selected]) => selected)
            .map(([id]) => id);

        // Only update if selection actually changed
        const currentSelectionStr = selectedElements.sort().join(',');
        const newSelectionStr = selectedIds.sort().join(',');
        
        if (currentSelectionStr !== newSelectionStr) {
            setSelectedElements(selectedIds);
            if (selectedIds.length > 0) {
                captureSnapshots(selectedIds);
            }
            onSelectionChange?.(selectedIds);
        }
    }, [selectedElements, captureSnapshots, onSelectionChange]);

    // Listen to canvas state updates to track selection
    useEffect(() => {
        if (!enabled) return;

        const handleCanvasUpdate = (event: any) => {
            const detail = event.detail;
            if (detail?.appState?.selectedElementIds) {
                const selectedIds = Object.entries(detail.appState.selectedElementIds)
                    .filter(([_, selected]) => selected)
                    .map(([id]) => id);
                
                const currentSelectionStr = selectedElements.sort().join(',');
                const newSelectionStr = selectedIds.sort().join(',');
                
                if (currentSelectionStr !== newSelectionStr) {
                    setSelectedElements(selectedIds);
                    if (selectedIds.length > 0) {
                        captureSnapshots(selectedIds);
                    }
                    onSelectionChange?.(selectedIds);
                }
            }
        };

        // Listen for markdown note selection events (custom selection system)
        const handleMarkdownNoteSelect = (event: any) => {
            const { elementId } = event.detail;
            if (elementId) {
                setSelectedElements([elementId]);
                captureSnapshots([elementId]);
                onSelectionChange?.([elementId]);
            }
        };

        const handleMarkdownNoteDeselect = () => {
            setSelectedElements([]);
            setElementSnapshots(new Map());
            onSelectionChange?.([]);
        };

        window.addEventListener("excalidraw:state-update", handleCanvasUpdate);
        window.addEventListener("markdown-note:select", handleMarkdownNoteSelect);
        window.addEventListener("markdown-note:deselect", handleMarkdownNoteDeselect);
        
        // Initial sync
        syncWithExcalidrawSelection();

        return () => {
            window.removeEventListener("excalidraw:state-update", handleCanvasUpdate);
            window.removeEventListener("markdown-note:select", handleMarkdownNoteSelect);
            window.removeEventListener("markdown-note:deselect", handleMarkdownNoteDeselect);
        };
    }, [enabled, selectedElements, captureSnapshots, onSelectionChange, syncWithExcalidrawSelection]);

    // Toggle selection of an element
    const toggleElement = useCallback((elementId: string) => {
        const api = (window as any).excalidrawAPI;
        if (!api) return;

        const appState = api.getAppState();
        const currentlySelected = appState.selectedElementIds?.[elementId] || false;
        
        // Update Excalidraw's selection
        const newSelectedIds = {
            ...appState.selectedElementIds,
            [elementId]: !currentlySelected
        };

        api.updateScene({
            appState: {
                ...appState,
                selectedElementIds: newSelectedIds,
            },
        });

        // Sync our state
        const selectedArray = Object.entries(newSelectedIds)
            .filter(([_, selected]) => selected)
            .map(([id]) => id);
        
        setSelectedElements(selectedArray);
        captureSnapshots(selectedArray);
        onSelectionChange?.(selectedArray);
    }, [captureSnapshots, onSelectionChange]);

    // Select multiple elements (replaces current selection)
    const selectElements = useCallback((elementIds: string[]) => {
        const api = (window as any).excalidrawAPI;
        if (!api) {
            setSelectedElements(elementIds);
            captureSnapshots(elementIds);
            onSelectionChange?.(elementIds);
            return;
        }

        const appState = api.getAppState();
        const newSelectedIds = elementIds.reduce((acc, id) => {
            acc[id] = true;
            return acc;
        }, {} as Record<string, boolean>);

        api.updateScene({
            appState: {
                ...appState,
                selectedElementIds: newSelectedIds,
            },
        });

        setSelectedElements(elementIds);
        captureSnapshots(elementIds);
        onSelectionChange?.(elementIds);
    }, [captureSnapshots, onSelectionChange]);

    // Clear all selections
    const clearSelection = useCallback(() => {
        const api = (window as any).excalidrawAPI;
        if (api) {
            const appState = api.getAppState();
            api.updateScene({
                appState: {
                    ...appState,
                    selectedElementIds: {},
                },
            });
        }

        setSelectedElements([]);
        setElementSnapshots(new Map());
        onSelectionChange?.([]);
    }, [onSelectionChange]);

    // Set selection mode
    const setSelectionMode = useCallback((enabled: boolean) => {
        setIsSelectionMode(enabled);
        if (!enabled) {
            // Don't clear selection when exiting mode, just stop listening
        }
    }, []);

    // Get formatted context for AI
    const getSelectionContext = useCallback((): string => {
        if (selectedElements.length === 0) {
            return "";
        }

        const contexts: string[] = [];
        selectedElements.forEach(id => {
            const info = getElementInfo(id);
            if (info) {
                const content = info.content 
                    ? `: "${info.content.substring(0, 80)}${info.content.length > 80 ? '...' : ''}"` 
                    : '';
                contexts.push(`- ${info.type}${content}`);
            }
        });

        return contexts.join('\n');
    }, [selectedElements, getElementInfo]);

    return {
        // State
        selectedElements,
        elementSnapshots,
        isSelectionMode,
        
        // Actions
        toggleElement,
        selectElements,
        clearSelection,
        setSelectionMode,
        syncWithExcalidrawSelection,
        
        // Utils
        getSelectionContext,
        getElementInfo,
    };
}

export default useElementSelection;
