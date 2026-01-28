import React, { useState, useRef, memo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import html2canvas from "html2canvas";

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
    const [snapshot, setSnapshot] = useState<string | null>(element.customData?.snapshot || null);
    const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; elementX: number; elementY: number } | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Calculate coordinates
    const x = (element.x + appState.scrollX) * appState.zoom.value;
    const y = (element.y + appState.scrollY) * appState.zoom.value;
    const width = element.width * appState.zoom.value;
    const height = element.height * appState.zoom.value;
    const angle = element.angle || 0;

    // Generate snapshot when content changes
    useEffect(() => {
        if (!isHovered && !isEditing && contentRef.current && !snapshot) {
            generateSnapshot();
        }
    }, [content, isHovered, isEditing]);

    const generateSnapshot = async () => {
        if (!contentRef.current || isGeneratingSnapshot) return;

        setIsGeneratingSnapshot(true);
        try {
            const canvas = await html2canvas(contentRef.current, {
                backgroundColor: '#ffffff',
                scale: 1, // Lower scale for performance
                logging: false,
                useCORS: true,
            });

            const dataUrl = canvas.toDataURL('image/png', 0.8); // 80% quality
            setSnapshot(dataUrl);

            // Save snapshot to customData for persistence
            const api = (window as any).excalidrawAPI;
            if (api) {
                const elements = api.getSceneElements();
                const updatedElements = elements.map((el: any) => {
                    if (el.id === element.id) {
                        return {
                            ...el,
                            customData: {
                                ...el.customData,
                                snapshot: dataUrl,
                            }
                        };
                    }
                    return el;
                });
                api.updateScene({ elements: updatedElements });
            }
        } catch (err) {
            console.error('Failed to generate snapshot:', err);
        } finally {
            setIsGeneratingSnapshot(false);
        }
    };

    // Container style
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

    // Use image when available and not hovering/editing
    const useSnapshot = false; // TEMPORARILY DISABLED for performance testing
    // const useSnapshot = snapshot && !isHovered && !isEditing;

    const contentStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        backgroundColor: "var(--color-bg-primary, #ffffff)",
        color: "var(--color-text-primary, #000000)",
        border: isEditing ? "2px solid #3b82f6" : "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        paddingTop: "28px",
        overflow: "hidden", // Changed from auto to prevent scrollbars in snapshot
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        pointerEvents: "auto",
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (content !== element.customData?.content) {
            onChange(element.id, content);
            setSnapshot(null); // Invalidate snapshot to regenerate
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

        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            elementX: element.x,
            elementY: element.y,
        };

        document.addEventListener('mousemove', handleDragMove as any);
        document.addEventListener('mouseup', handleDragEnd as any);
    };

    const handleDragMove = (e: MouseEvent) => {
        if (!dragStartRef.current) return;

        const dx = (e.clientX - dragStartRef.current.x) / appState.zoom.value;
        const dy = (e.clientY - dragStartRef.current.y) / appState.zoom.value;

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
            {/* Drag handle */}
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
                {useSnapshot ? (
                    // LOD Mode: Show cached image for performance
                    <img
                        src={snapshot}
                        alt="Markdown preview"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "top left",
                            imageRendering: "auto",
                        }}
                    />
                ) : (
                    // Interactive Mode: Show live React component
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
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div className="markdown-preview prose prose-sm dark:prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

MarkdownNote.displayName = "MarkdownNote";
