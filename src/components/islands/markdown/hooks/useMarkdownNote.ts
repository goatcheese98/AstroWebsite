import { useState, useCallback, useRef, useEffect } from 'react';
import { useDrag } from './useDrag';
import { useResize } from './useResize';
import { useRotate } from './useRotate';
import { useCanvasPan } from './useCanvasPan';
import { useExcalidrawSelection } from './useExcalidrawSelection';
import type { MarkdownElement, AppState, ResizeHandle } from '../types';
import html2canvas from 'html2canvas';

interface UseMarkdownNoteOptions {
    /** The Excalidraw element */
    element: MarkdownElement;
    /** Current app state */
    appState: AppState;
    /** Callback when content changes */
    onChange: (id: string, content: string) => void;
}

interface UseMarkdownNoteReturn {
    // Core state
    isEditing: boolean;
    isHovered: boolean;
    isNewNote: boolean;
    content: string;

    // Sub-hook states
    isDragging: boolean;
    isResizing: boolean;
    isRotating: boolean;
    isSelected: boolean;
    isCanvasPanning: boolean;
    edgeProximity: { top: boolean; right: boolean; bottom: boolean; left: boolean };
    hoveredEdge: ResizeHandle | null;

    // Actions
    setIsHovered: (value: boolean) => void;
    setHoveredEdge: (handle: ResizeHandle | null) => void;
    enterEditMode: () => void;
    exitEditMode: () => void;
    updateContent: (value: string) => void;
    toggleCheckbox: (lineIndex: number) => void;
    handleContentMouseDown: (e: React.MouseEvent) => void;
    handleResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
    handleMouseMove: (e: React.MouseEvent) => void;
    handleRotateStart: (e: React.MouseEvent) => void;
    select: () => void;
    exportAsImage: () => Promise<{
        imageData: string;
        position: { x: number; y: number; width: number; height: number; angle: number };
    }>;
    contentRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Main hook for markdown note functionality
 */
export function useMarkdownNote({
    element,
    appState,
    onChange,
}: UseMarkdownNoteOptions): UseMarkdownNoteReturn {
    // Core state
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isNewNote, setIsNewNote] = useState(true);
    const [content, setContent] = useState(
        element.customData?.content || '# Double click to edit'
    );

    const contentRef = useRef<HTMLDivElement>(null);

    // Fade-in animation on mount
    useEffect(() => {
        const timer = setTimeout(() => setIsNewNote(false), 100);
        return () => clearTimeout(timer);
    }, []);

    /**
     * Update element in Excalidraw via global API
     */
    const updateElement = useCallback((updates: Partial<MarkdownElement>) => {
        const api = (window as any).excalidrawAPI;
        if (api) {
            const elements = api.getSceneElements();
            const appState = api.getAppState();
            
            const updatedElements = elements.map((el: any) => {
                if (el.id === element.id) {
                    return { 
                        ...el, 
                        ...updates,
                        version: (el.version || 0) + 1,
                        versionNonce: Date.now(),
                        updated: Date.now(),
                    };
                }
                return el;
            });
            
            // Update scene and trigger binding recalculation by updating appState
            api.updateScene({ 
                elements: updatedElements,
                appState: {
                    ...appState,
                    editingElement: null,
                }
            });
        }
    }, [element.id]);

    /**
     * Delete element from Excalidraw
     */
    const deleteElement = useCallback(() => {
        const api = (window as any).excalidrawAPI;
        if (api) {
            const elements = api.getSceneElements();
            const updatedElements = elements.filter((el: MarkdownElement) => el.id !== element.id);
            api.updateScene({ elements: updatedElements });
        }
    }, [element.id]);

    // Clear hover states helper
    const clearHoverStates = useCallback(() => {
        setIsHovered(false);
    }, []);

    // Canvas pan detection
    const { isCanvasPanning } = useCanvasPan({
        onPanStart: clearHoverStates,
    });

    // Selection management - syncs with Excalidraw's native selection
    const { isSelected, select } = useExcalidrawSelection({
        elementId: element.id,
    });

    // Drag functionality
    const { isDragging, handleContentMouseDown } = useDrag({
        zoom: appState.zoom.value,
        updateElement,
        elementPosition: { x: element.x, y: element.y },
        isEditing,
        onDragStart: select,
    });

    // Handle delete key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && isSelected && !isEditing) {
                e.preventDefault();
                deleteElement();
            }
        };

        if (isSelected) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isSelected, isEditing, deleteElement]);

    // Resize functionality
    const {
        isResizing,
        edgeProximity,
        hoveredEdge,
        handleResizeStart,
        handleMouseMove,
        setHoveredEdge,
    } = useResize({
        zoom: appState.zoom.value,
        updateElement,
        elementState: {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
        },
        isEditing,
    });

    // Calculate center position for rotation
    const x = (element.x + appState.scrollX) * appState.zoom.value;
    const y = (element.y + appState.scrollY) * appState.zoom.value;
    const centerX = x + (element.width * appState.zoom.value) / 2;
    const centerY = y + (element.height * appState.zoom.value) / 2;

    // Rotation functionality
    const { isRotating, handleRotateStart } = useRotate({
        currentAngle: element.angle || 0,
        centerPosition: { x: centerX, y: centerY },
        updateElement,
    });

    /**
     * Enter edit mode
     */
    const enterEditMode = useCallback(() => {
        setIsEditing(true);
    }, []);

    /**
     * Exit edit mode and save content
     */
    const exitEditMode = useCallback(() => {
        setIsEditing(false);
        if (content !== element.customData?.content) {
            onChange(element.id, content);
        }
    }, [content, element.id, element.customData?.content, onChange]);

    /**
     * Update content (local state only, persisted on blur)
     */
    const updateContent = useCallback((value: string) => {
        setContent(value);
    }, []);

    /**
     * Toggle checkbox state in task list
     */
    const toggleCheckbox = useCallback((lineIndex: number) => {
        const lines = content.split('\n');
        const line = lines[lineIndex];

        if (line?.includes('- [ ]')) {
            lines[lineIndex] = line.replace('- [ ]', '- [x]');
        } else if (line?.includes('- [x]')) {
            lines[lineIndex] = line.replace('- [x]', '- [ ]');
        }

        const newContent = lines.join('\n');
        setContent(newContent);
        onChange(element.id, newContent);
    }, [content, element.id, onChange]);

    /**
     * Export note as image
     */
    const exportAsImage = useCallback(async () => {
        if (!contentRef.current) {
            throw new Error('Content ref not available');
        }

        const canvas = await html2canvas(contentRef.current, {
            backgroundColor: null,
            scale: 2, // 2x for retina quality
        });

        return {
            imageData: canvas.toDataURL('image/png'),
            position: {
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                angle: element.angle || 0,
            },
        };
    }, [element.x, element.y, element.width, element.height, element.angle]);

    return {
        // Core state
        isEditing,
        isHovered,
        isNewNote,
        content,

        // Sub-hook states
        isDragging,
        isResizing,
        isRotating,
        isSelected,
        isCanvasPanning,
        edgeProximity,
        hoveredEdge,

        // Actions
        setIsHovered,
        setHoveredEdge,
        enterEditMode,
        exitEditMode,
        updateContent,
        toggleCheckbox,
        handleContentMouseDown,
        handleResizeStart,
        handleMouseMove,
        handleRotateStart,
        select,
        exportAsImage,
        contentRef,
    };
}
