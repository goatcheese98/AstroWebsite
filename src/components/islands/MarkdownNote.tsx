import React, { useState, useRef, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownNoteProps {
    element: any; // ExcalidrawElement
    appState: any; // AppState
    onChange: (id: string, text: string) => void;
}

export const MarkdownNote: React.FC<MarkdownNoteProps> = memo(({
    element,
    appState,
    onChange,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(element.customData?.content || "# Double click to edit");
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; elementX: number; elementY: number } | null>(null);

    // Calculate coordinates - Excalidraw elements rotate around their center
    const x = (element.x + appState.scrollX) * appState.zoom.value;
    const y = (element.y + appState.scrollY) * appState.zoom.value;
    const width = element.width * appState.zoom.value;
    const height = element.height * appState.zoom.value;
    const angle = element.angle || 0;

    // Container style - rotates around center to match Excalidraw
    const containerStyle: React.CSSProperties = {
        position: "absolute",
        top: `${y}px`,
        left: `${x}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `rotate(${angle}rad)`,
        transformOrigin: "center center", // Match Excalidraw's rotation
        pointerEvents: "none", // Container is non-interactive
        zIndex: isEditing ? 100 : 10,
    };

    // Inner content style - the actual visible card
    const contentStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        backgroundColor: "var(--color-bg-primary, #ffffff)",
        color: "var(--color-text-primary, #000000)",
        border: isEditing ? "2px solid #3b82f6" : "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        paddingTop: "28px", // Make room for drag handle
        overflow: "auto",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        pointerEvents: "auto", // Content is interactive
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

    const handleDragStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        setIsDragging(true);

        // Store initial positions in scene coordinates
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            elementX: element.x,
            elementY: element.y,
        };

        // Add global listeners
        document.addEventListener('mousemove', handleDragMove as any);
        document.addEventListener('mouseup', handleDragEnd as any);
    };

    const handleDragMove = (e: MouseEvent) => {
        if (!dragStartRef.current) return;

        const dx = (e.clientX - dragStartRef.current.x) / appState.zoom.value;
        const dy = (e.clientY - dragStartRef.current.y) / appState.zoom.value;

        // Update element position via Excalidraw API
        const api = (window as any).excalidrawAPI;
        if (api) {
            const elements = api.getSceneElements();
            const updatedElements = elements.map((el: any) => {
                if (el.id === element.id) {
                    return {
                        ...el,
                        x: dragStartRef.current!.elementX + dx,
                        y: dragStartRef.current!.elementY + dy,
                    };
                }
                return el;
            });
            api.updateScene({ elements: updatedElements });
        }
    };

    const handleDragEnd = (e: MouseEvent) => {
        setIsDragging(false);
        dragStartRef.current = null;

        // Remove global listeners
        document.removeEventListener('mousemove', handleDragMove as any);
        document.removeEventListener('mouseup', handleDragEnd as any);
    };

    return (
        <div
            style={containerStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="markdown-note-container"
        >
            {/* Drag handle - positioned absolutely within the container */}
            {!isEditing && (isHovered || isDragging) && (
                <div
                    onMouseDown={handleDragStart}
                    style={{
                        position: "absolute",
                        top: "4px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "48px",
                        height: "20px",
                        backgroundColor: "#6366f1",
                        borderRadius: "10px",
                        cursor: isDragging ? "grabbing" : "grab",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
                        userSelect: "none",
                        zIndex: 1001,
                        opacity: isDragging ? 1 : 0.95,
                        transition: "opacity 0.2s ease",
                        pointerEvents: "auto",
                    }}
                    title="Drag to move"
                >
                    ⋮⋮
                </div>
            )}

            {/* Content card */}
            <div
                style={contentStyle}
                onDoubleClick={handleDoubleClick}
                className="markdown-note-overlay"
            >
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
    );
});

MarkdownNote.displayName = "MarkdownNote";
