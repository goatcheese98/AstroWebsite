import React, { useState, useRef, memo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import html2canvas from "html2canvas";

interface MarkdownNoteProps {
    element: any;
    appState: any;
    onChange: (id: string, text: string) => void;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const MarkdownNote: React.FC<MarkdownNoteProps> = memo(({
    element,
    appState,
    onChange,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(element.customData?.content || "# Double click to edit");
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [isSelected, setIsSelected] = useState(false);
    const [hoveredEdge, setHoveredEdge] = useState<ResizeHandle | null>(null);
    const [edgeProximity, setEdgeProximity] = useState<{ top: boolean; right: boolean; bottom: boolean; left: boolean }>({
        top: false, right: false, bottom: false, left: false
    });

    const dragStartRef = useRef<{ x: number; y: number; elementX: number; elementY: number } | null>(null);
    const resizeStartRef = useRef<{
        x: number; y: number;
        elementX: number; elementY: number;
        elementWidth: number; elementHeight: number;
        handle: ResizeHandle;
    } | null>(null);
    const rotateStartRef = useRef<{ angle: number; centerX: number; centerY: number; initialMouseAngle: number } | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Calculate coordinates
    const x = (element.x + appState.scrollX) * appState.zoom.value;
    const y = (element.y + appState.scrollY) * appState.zoom.value;
    const width = element.width * appState.zoom.value;
    const height = element.height * appState.zoom.value;
    const angle = element.angle || 0;

    const containerStyle: React.CSSProperties = {
        position: "absolute",
        top: `${y}px`,
        left: `${x}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `rotate(${angle}rad)`,
        transformOrigin: "center center",
        pointerEvents: "none",
        zIndex: isEditing ? 100 : 10,
    };

    const contentStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        backgroundColor: "var(--color-bg-primary, #ffffff)",
        color: "var(--color-text-primary, #000000)",
        border: isEditing ? "2px solid #3b82f6" : (isSelected ? "2px solid #818cf8" : "1px solid #e5e7eb"),
        borderRadius: "8px",
        padding: "16px",
        paddingTop: "32px",
        overflow: "auto", // Enable scrolling
        boxShadow: isSelected ? "0 8px 16px -2px rgba(99, 102, 241, 0.2)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        pointerEvents: "auto",
        cursor: isDragging ? "grabbing" : "default", // Default cursor to allow scrolling
        outline: "none",
    };

    // Detect edge proximity
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isEditing || isResizing || isDragging || isRotating) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        const edgeThreshold = 50; // pixels from edge

        setEdgeProximity({
            top: relY < edgeThreshold,
            right: rect.width - relX < edgeThreshold,
            bottom: rect.height - relY < edgeThreshold,
            left: relX < edgeThreshold,
        });
    };

    // Drag handlers - only drag when moving, allow scrolling otherwise
    const handleContentMouseDown = (e: React.MouseEvent) => {
        if (isEditing) return;

        setIsSelected(true); // Mark as selected

        // Track initial position
        const startX = e.clientX;
        const startY = e.clientY;
        let hasDragged = false;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = Math.abs(moveEvent.clientX - startX);
            const dy = Math.abs(moveEvent.clientY - startY);

            // Only start drag if moved more than 5px (allows scrolling)
            if (!hasDragged && (dx > 5 || dy > 5)) {
                hasDragged = true;
                setIsDragging(true);

                dragStartRef.current = {
                    x: startX,
                    y: startY,
                    elementX: element.x,
                    elementY: element.y,
                };

                document.removeEventListener('mousemove', handleMouseMove);
                document.addEventListener('mousemove', handleDragMove as any);
            }
        };

        const handleMouseUp = () => {
            if (!hasDragged) {
                // Was just a click, not a drag
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleDragMove = (e: MouseEvent) => {
        if (!dragStartRef.current) return;

        const dx = (e.clientX - dragStartRef.current.x) / appState.zoom.value;
        const dy = (e.clientY - dragStartRef.current.y) / appState.zoom.value;

        updateElement({
            x: dragStartRef.current.elementX + dx,
            y: dragStartRef.current.elementY + dy,
        });
    };

    const handleDragEnd = (e: MouseEvent) => {
        setIsDragging(false);
        dragStartRef.current = null;
        document.removeEventListener('mousemove', handleDragMove as any);
        document.removeEventListener('mouseup', handleDragEnd as any);
    };

    // Resize handlers
    const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);

        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            elementX: element.x,
            elementY: element.y,
            elementWidth: element.width,
            elementHeight: element.height,
            handle,
        };

        document.addEventListener('mousemove', handleResizeMove as any);
        document.addEventListener('mouseup', handleResizeEnd as any);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizeStartRef.current) return;

        const dx = (e.clientX - resizeStartRef.current.x) / appState.zoom.value;
        const dy = (e.clientY - resizeStartRef.current.y) / appState.zoom.value;
        const handle = resizeStartRef.current.handle;

        let newX = resizeStartRef.current.elementX;
        let newY = resizeStartRef.current.elementY;
        let newWidth = resizeStartRef.current.elementWidth;
        let newHeight = resizeStartRef.current.elementHeight;

        // Apply resize based on handle
        if (handle.includes('w')) {
            newX += dx;
            newWidth -= dx;
        }
        if (handle.includes('e')) {
            newWidth += dx;
        }
        if (handle.includes('n')) {
            newY += dy;
            newHeight -= dy;
        }
        if (handle.includes('s')) {
            newHeight += dy;
        }

        // Enforce minimum size
        if (newWidth < 100) newWidth = 100;
        if (newHeight < 80) newHeight = 80;

        updateElement({ x: newX, y: newY, width: newWidth, height: newHeight });
    };

    const handleResizeEnd = (e: MouseEvent) => {
        setIsResizing(false);
        resizeStartRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove as any);
        document.removeEventListener('mouseup', handleResizeEnd as any);
    };

    // Rotation handlers
    const handleRotateStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsRotating(true);

        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Calculate initial angle from center to mouse
        const initialMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

        rotateStartRef.current = {
            angle: element.angle || 0,
            centerX,
            centerY,
            initialMouseAngle,
        };

        document.addEventListener('mousemove', handleRotateMove as any);
        document.addEventListener('mouseup', handleRotateEnd as any);
    };

    const handleRotateMove = (e: MouseEvent) => {
        if (!rotateStartRef.current) return;

        // Calculate current mouse angle from center
        const dx = e.clientX - rotateStartRef.current.centerX;
        const dy = e.clientY - rotateStartRef.current.centerY;
        const currentMouseAngle = Math.atan2(dy, dx);

        // Calculate the delta angle from where we started
        const deltaAngle = currentMouseAngle - rotateStartRef.current.initialMouseAngle;

        // Apply delta to the original element angle
        const newAngle = rotateStartRef.current.angle + deltaAngle;

        updateElement({ angle: newAngle });
    };

    const handleRotateEnd = (e: MouseEvent) => {
        setIsRotating(false);
        rotateStartRef.current = null;
        document.removeEventListener('mousemove', handleRotateMove as any);
        document.removeEventListener('mouseup', handleRotateEnd as any);
    };

    // Update Excalidraw element
    const updateElement = (updates: any) => {
        const api = (window as any).excalidrawAPI;
        if (api) {
            const elements = api.getSceneElements();
            const updatedElements = elements.map((el: any) => {
                if (el.id === element.id) {
                    return { ...el, ...updates };
                }
                return el;
            });
            api.updateScene({ elements: updatedElements });
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (content !== element.customData?.content) {
            onChange(element.id, content);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            handleBlur();
        }
    };

    // Handle delete key for selected notes
    const handleDeleteKey = React.useCallback((e: KeyboardEvent) => {
        if ((e.key === "Delete" || e.key === "Backspace") && isSelected && !isEditing) {
            e.preventDefault();
            deleteElement();
        }
    }, [isSelected, isEditing, element.id]);

    // Delete element
    const deleteElement = () => {
        const api = (window as any).excalidrawAPI;
        if (api) {
            const elements = api.getSceneElements();
            const updatedElements = elements.filter((el: any) => el.id !== element.id);
            api.updateScene({ elements: updatedElements });
        }
    };

    // Handle click outside to deselect
    const handleClickOutside = React.useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Check if click is outside this note
        if (!target.closest(`[data-note-id="${element.id}"]`)) {
            setIsSelected(false);
        }
    }, [element.id]);

    // Add keyboard listener for delete and click outside listener
    useEffect(() => {
        if (isSelected) {
            document.addEventListener('keydown', handleDeleteKey);
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('keydown', handleDeleteKey);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSelected, handleDeleteKey, handleClickOutside]);

    // Define handles - corners always shown, edges only on proximity
    const handleSize = 10;
    const cornerHandles: { pos: ResizeHandle; style: React.CSSProperties }[] = [
        { pos: 'nw', style: { top: -handleSize / 2, left: -handleSize / 2, cursor: 'nw-resize' } },
        { pos: 'ne', style: { top: -handleSize / 2, right: -handleSize / 2, cursor: 'ne-resize' } },
        { pos: 'se', style: { bottom: -handleSize / 2, right: -handleSize / 2, cursor: 'se-resize' } },
        { pos: 'sw', style: { bottom: -handleSize / 2, left: -handleSize / 2, cursor: 'sw-resize' } },
    ];

    const edgeHandles: { pos: ResizeHandle; style: React.CSSProperties; show: boolean }[] = [
        { pos: 'n', style: { top: -handleSize / 2, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' }, show: edgeProximity.top },
        { pos: 'e', style: { top: '50%', right: -handleSize / 2, transform: 'translateY(-50%)', cursor: 'e-resize' }, show: edgeProximity.right },
        { pos: 's', style: { bottom: -handleSize / 2, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' }, show: edgeProximity.bottom },
        { pos: 'w', style: { top: '50%', left: -handleSize / 2, transform: 'translateY(-50%)', cursor: 'w-resize' }, show: edgeProximity.left },
    ];

    return (
        <div
            style={containerStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setEdgeProximity({ top: false, right: false, bottom: false, left: false });
            }}
            className="markdown-note-container"
            data-note-id={element.id}
        >
            {/* Rotation handle - replaces drag handle */}
            {!isEditing && (isHovered || isRotating) && (
                <div
                    onMouseDown={handleRotateStart}
                    style={{
                        position: "absolute",
                        top: "4px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "32px",
                        height: "24px",
                        backgroundColor: "#6366f1",
                        borderRadius: "12px",
                        cursor: isRotating ? "grabbing" : "grab",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
                        userSelect: "none",
                        zIndex: 1002,
                        opacity: isRotating ? 1 : 0.95,
                        transition: "opacity 0.2s ease",
                        pointerEvents: "auto",
                    }}
                    title="Rotate"
                >
                    ↻
                </div>
            )}

            {/* Corner resize handles - always visible on hover */}
            {!isEditing && (isHovered || isResizing) && cornerHandles.map(({ pos, style }) => (
                <div
                    key={pos}
                    onMouseDown={(e) => handleResizeStart(e, pos)}
                    onMouseEnter={() => setHoveredEdge(pos)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    style={{
                        position: "absolute",
                        width: `${handleSize}px`,
                        height: `${handleSize}px`,
                        backgroundColor: hoveredEdge === pos ? "#818cf8" : "#6366f1",
                        borderRadius: "50%",
                        pointerEvents: "auto",
                        zIndex: 1001,
                        transition: "background-color 0.15s ease, transform 0.15s ease",
                        transform: hoveredEdge === pos ? 'scale(1.3)' : 'scale(1)',
                        boxShadow: "0 1px 4px rgba(99, 102, 241, 0.4)",
                        ...style,
                    }}
                />
            ))}

            {/* Edge resize handles - only show when near edges */}
            {!isEditing && (isHovered || isResizing) && edgeHandles.filter(h => h.show).map(({ pos, style }) => (
                <div
                    key={pos}
                    onMouseDown={(e) => handleResizeStart(e, pos)}
                    onMouseEnter={() => setHoveredEdge(pos)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    style={{
                        position: "absolute",
                        width: `${handleSize}px`,
                        height: `${handleSize}px`,
                        backgroundColor: hoveredEdge === pos ? "#818cf8" : "#6366f1",
                        borderRadius: "50%",
                        pointerEvents: "auto",
                        zIndex: 1001,
                        transition: "background-color 0.15s ease, transform 0.15s ease",
                        transform: hoveredEdge === pos ? 'scale(1.3)' : 'scale(1)',
                        boxShadow: "0 1px 4px rgba(99, 102, 241, 0.4)",
                        ...style,
                    }}
                />
            ))}

            {/* Content card - draggable from center area */}
            <div
                style={contentStyle}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleContentMouseDown}
                onMouseMove={handleMouseMove}
                className="markdown-note-overlay"
            >
                <div ref={contentRef} style={{ width: "100%", height: "100%" }}>
                    {isEditing ? (
                        <textarea
                            autoFocus
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                                outline: "none",
                                resize: "none",
                                fontFamily: "monospace",
                                fontSize: "14px",
                                backgroundColor: "transparent",
                                color: "inherit",
                                padding: 0,
                                cursor: "text",
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div className="markdown-preview prose prose-sm dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

MarkdownNote.displayName = "MarkdownNote";
