import React, { useState, useRef, memo, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import html2canvas from "html2canvas";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Copy button component for code blocks
const CodeBlockWithCopy: React.FC<{ code: string; language: string; isDark: boolean }> = ({ code, language, isDark }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
        console.log('Copy button clicked!'); // Debug log
        e.stopPropagation();
        e.preventDefault();

        try {
            await navigator.clipboard.writeText(code);
            console.log('Code copied successfully!'); // Debug log
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = code;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                console.log('Code copied via fallback!'); // Debug log
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
            }
            document.body.removeChild(textarea);
        }
    };

    return (
        <div style={{ position: 'relative', marginBottom: '1em' }} onDoubleClick={(e) => e.stopPropagation()}>
            <button
                type="button"
                onClick={handleCopy}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                }}
                className="copy-code-button"
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: copied
                        ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)')
                        : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'),
                    border: `1px solid ${copied
                        ? (isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)')
                        : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)')}`,
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: copied ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#fff' : '#333'),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 10,
                    transition: 'all 0.2s ease',
                    pointerEvents: 'auto',
                }}
                title="Copy code"
            >
                {copied ? (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied!
                    </>
                ) : (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                    </>
                )}
            </button>
            <SyntaxHighlighter
                style={isDark ? oneDark : oneLight}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    borderRadius: '6px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

interface MarkdownNoteProps {
    element: any;
    appState: any;
    onChange: (id: string, text: string) => void;
}

export interface MarkdownNoteRef {
    exportAsImage: () => Promise<{
        imageData: string;
        position: { x: number; y: number; width: number; height: number; angle: number };
    }>;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const MarkdownNote = memo(forwardRef<MarkdownNoteRef, MarkdownNoteProps>(({
    element,
    appState,
    onChange,
}, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(element.customData?.content || "# Double click to edit");
    const [isNewNote, setIsNewNote] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [isSelected, setIsSelected] = useState(false);
    const [hoveredEdge, setHoveredEdge] = useState<ResizeHandle | null>(null);
    const [edgeProximity, setEdgeProximity] = useState<{ top: boolean; right: boolean; bottom: boolean; left: boolean }>({
        top: false, right: false, bottom: false, left: false
    });
    const [isCanvasPanning, setIsCanvasPanning] = useState(false);

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
    const width = element.width; // Use original dimensions
    const height = element.height; // Use original dimensions
    const angle = element.angle || 0;

    const containerStyle: React.CSSProperties = {
        position: "absolute",
        top: `${y}px`,
        left: `${x}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `rotate(${angle}rad) scale(${appState.zoom.value})`, // Apply zoom via transform
        transformOrigin: "top left",
        pointerEvents: "none",
        zIndex: isEditing ? 100 : 10,
        opacity: isNewNote ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out',
    };


    const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

    const contentStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        backgroundColor: isDark ? "rgba(23, 23, 23, 0.98)" : "rgba(255, 255, 255, 0.98)",
        color: isDark ? "#e5e5e5" : "#1a1a1a",
        border: isEditing
            ? "2px solid #3b82f6"
            : (isSelected
                ? "2px solid #818cf8"
                : `1px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.1)'}`),
        borderRadius: "10px",
        padding: "18px 22px",
        paddingTop: "38px",
        overflow: "auto",
        boxShadow: isEditing
            ? "0 12px 24px -4px rgba(59, 130, 246, 0.3), 0 0 0 3px rgba(59, 130, 246, 0.1)"
            : (isSelected
                ? (isDark
                    ? "0 10px 20px -3px rgba(129, 140, 248, 0.4), 0 0 0 1px rgba(129, 140, 248, 0.2)"
                    : "0 10px 20px -3px rgba(99, 102, 241, 0.25)")
                : (isHovered
                    ? (isDark
                        ? "0 6px 16px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(82, 82, 91, 0.3)"
                        : "0 6px 12px -2px rgba(0, 0, 0, 0.15)")
                    : (isDark
                        ? "0 4px 12px -1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(82, 82, 91, 0.2)"
                        : "0 4px 8px -1px rgba(0, 0, 0, 0.1)"))),
        pointerEvents: isCanvasPanning ? "none" : "auto", // Disable pointer events during canvas pan
        cursor: isDragging ? "grabbing" : "default",
        outline: "none",
        backdropFilter: isDark ? "blur(12px)" : "blur(8px)",
        WebkitBackdropFilter: isDark ? "blur(12px)" : "blur(8px)",
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

                // Clean up threshold listeners and add drag listeners
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.addEventListener('mousemove', handleDragMove as any);
                document.addEventListener('mouseup', handleDragEnd as any);
            }
        };

        const handleMouseUp = () => {
            // Clean up if no drag started (just a click)
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
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
        // Only block double-click if directly clicking on these specific interactive elements
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();

        // Block only for actual interactive elements, not their containers
        if (tagName === 'a' || tagName === 'input' || tagName === 'button') {
            return;
        }

        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (content !== element.customData?.content) {
            onChange(element.id, content);
        }
    };

    // Handle task list checkbox toggle
    const handleCheckboxToggle = (lineIndex: number) => {
        const lines = content.split('\n');
        const line = lines[lineIndex];

        // Toggle checkbox state
        if (line.includes('- [ ]')) {
            lines[lineIndex] = line.replace('- [ ]', '- [x]');
        } else if (line.includes('- [x]')) {
            lines[lineIndex] = line.replace('- [x]', '- [ ]');
        }

        const newContent = lines.join('\n');
        setContent(newContent);
        onChange(element.id, newContent);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            handleBlur();
        }
    };

    // Handle delete key for selected notes and ESC to deselect
    const handleGlobalKeyDown = React.useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape" && isSelected) {
            e.preventDefault();
            setIsSelected(false);
        } else if ((e.key === "Delete" || e.key === "Backspace") && isSelected && !isEditing) {
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

    // Add keyboard listener for delete/ESC and click outside listener
    useEffect(() => {
        if (isSelected) {
            document.addEventListener('keydown', handleGlobalKeyDown);
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSelected, handleGlobalKeyDown, handleClickOutside]);

    // Detect canvas panning (two-finger scroll or space+drag) to disable pointer events
    useEffect(() => {
        let panTimeout: NodeJS.Timeout;

        const handleWheel = (e: WheelEvent) => {
            // Two-finger scroll detected (wheel event without modifiers)
            if (!e.ctrlKey && !e.metaKey) {
                setIsCanvasPanning(true);
                // Clear hover states when panning
                setIsHovered(false);
                setEdgeProximity({ top: false, right: false, bottom: false, left: false });
                clearTimeout(panTimeout);
                panTimeout = setTimeout(() => setIsCanvasPanning(false), 150);
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            // Middle mouse button or space+drag for panning
            if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement)?.closest('.excalidraw__canvas'))) {
                setIsCanvasPanning(true);
                // Clear hover states when panning
                setIsHovered(false);
                setEdgeProximity({ top: false, right: false, bottom: false, left: false });
            }
        };

        const handleMouseUp = () => {
            clearTimeout(panTimeout);
            panTimeout = setTimeout(() => setIsCanvasPanning(false), 100);
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            clearTimeout(panTimeout);
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // Export method for exporting markdown as image
    const exportAsImage = useCallback(async (): Promise<{
        imageData: string;
        position: { x: number; y: number; width: number; height: number; angle: number };
    }> => {
        if (!contentRef.current) {
            throw new Error("Content ref not available");
        }

        // Render to canvas using html2canvas
        const canvas = await html2canvas(contentRef.current, {
            backgroundColor: null,
            scale: 2, // 2x for retina quality
        });

        return {
            imageData: canvas.toDataURL("image/png"),
            position: { x: element.x, y: element.y, width, height, angle }
        };
    }, [element.x, element.y, width, height, angle]);

    // Expose export method via ref
    useImperativeHandle(ref, () => ({
        exportAsImage
    }), [exportAsImage]);

    // Fade-in animation for new notes
    useEffect(() => {
        const timer = setTimeout(() => setIsNewNote(false), 100);
        return () => clearTimeout(timer);
    }, []);

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
            onMouseEnter={() => {
                if (!isCanvasPanning) {
                    setIsHovered(true);
                }
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                setEdgeProximity({ top: false, right: false, bottom: false, left: false });
                setHoveredEdge(null);
            }}
            className="markdown-note-container"
            data-note-id={element.id}
        >
            {/* Note type badge - shows when selected or hovered */}
            {!isEditing && (isSelected || isHovered) && (
                <div
                    style={{
                        position: "absolute",
                        top: "8px",
                        left: "12px",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: isSelected ? "#818cf8" : (isDark ? "#a1a1aa" : "#6b7280"),
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        pointerEvents: "none",
                        opacity: 0.9,
                        zIndex: 1000,
                    }}
                >
                    📝 Markdown
                </div>
            )}

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
                onMouseDown={(e) => {
                    // Don't trigger drag if clicking on buttons or interactive elements
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('a') || target.closest('input')) {
                        return;
                    }
                    handleContentMouseDown(e);
                }}
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
                        <div className="markdown-preview">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        const code = String(children).replace(/\n$/, '');

                                        return !inline && match ? (
                                            <CodeBlockWithCopy code={code} language={match[1]} isDark={isDark} />
                                        ) : (
                                            <code
                                                style={{
                                                    background: isDark ? 'rgba(161, 161, 170, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                                                    color: isDark ? '#e4e4e7' : '#18181b',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '0.9em',
                                                    fontFamily: 'monospace',
                                                    border: isDark ? '1px solid rgba(161, 161, 170, 0.3)' : 'none',
                                                }}
                                                {...props}
                                            >
                                                {children}
                                            </code>
                                        );
                                    },
                                    p({ children }) {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return <p style={{ marginBottom: '0.75em', lineHeight: '1.6', color: isDark ? '#d4d4d8' : '#3f3f46' }}>{children}</p>;
                                    },
                                    h1({ children }) {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return <h1 style={{ fontSize: '1.75em', fontWeight: 700, marginBottom: '0.5em', marginTop: '0.5em', lineHeight: '1.2', color: isDark ? '#f4f4f5' : '#18181b' }}>{children}</h1>;
                                    },
                                    h2({ children }) {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return <h2 style={{ fontSize: '1.5em', fontWeight: 600, marginBottom: '0.5em', marginTop: '0.75em', lineHeight: '1.3', color: isDark ? '#f4f4f5' : '#18181b' }}>{children}</h2>;
                                    },
                                    h3({ children }) {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return <h3 style={{ fontSize: '1.25em', fontWeight: 600, marginBottom: '0.4em', marginTop: '0.6em', lineHeight: '1.4', color: isDark ? '#e4e4e7' : '#27272a' }}>{children}</h3>;
                                    },
                                    ul({ children }) {
                                        return <ul style={{ marginBottom: '0.75em', marginTop: '0.5em', paddingLeft: '1.5em', lineHeight: '1.6' }}>{children}</ul>;
                                    },
                                    ol({ children }) {
                                        return <ol style={{ marginBottom: '0.75em', marginTop: '0.5em', paddingLeft: '1.5em', lineHeight: '1.6' }}>{children}</ol>;
                                    },
                                    li({ children, ...props }: any) {
                                        // Check if this is a task list item
                                        const isTaskList = props.className === 'task-list-item';
                                        return (
                                            <li
                                                style={{
                                                    marginBottom: '0.25em',
                                                    listStyleType: isTaskList ? 'none' : undefined,
                                                }}
                                                {...props}
                                            >
                                                {children}
                                            </li>
                                        );
                                    },
                                    input({ type, checked, ...props }: any) {
                                        if (type === 'checkbox') {
                                            // Find the line index for this checkbox to toggle it
                                            const parentLi = props.node?.position?.start?.line;
                                            return (
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        if (parentLi !== undefined) {
                                                            handleCheckboxToggle(parentLi - 1); // -1 for 0-indexed
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        marginRight: '0.5em',
                                                        cursor: 'pointer',
                                                        accentColor: '#6366f1',
                                                        width: '16px',
                                                        height: '16px',
                                                    }}
                                                    {...props}
                                                />
                                            );
                                        }
                                        return <input type={type} {...props} />;
                                    },
                                    blockquote({ children }) {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return (
                                            <blockquote
                                                style={{
                                                    borderLeft: `4px solid ${isDark ? '#818cf8' : '#6366f1'}`,
                                                    paddingLeft: '1em',
                                                    marginLeft: 0,
                                                    marginBottom: '0.75em',
                                                    fontStyle: 'italic',
                                                    color: isDark ? '#a1a1aa' : 'rgba(0, 0, 0, 0.7)',
                                                    background: isDark ? 'rgba(161, 161, 170, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                                                    padding: '0.5em 1em',
                                                    borderRadius: '4px',
                                                }}
                                            >
                                                {children}
                                            </blockquote>
                                        );
                                    },
                                    table({ children }) {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return (
                                            <table
                                                style={{
                                                    width: '100%',
                                                    borderCollapse: 'collapse',
                                                    marginBottom: '1em',
                                                    border: `1px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.1)'}`,
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {children}
                                            </table>
                                        );
                                    },
                                    th({ children }) {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return (
                                            <th
                                                style={{
                                                    padding: '10px 12px',
                                                    textAlign: 'left',
                                                    fontWeight: 600,
                                                    borderBottom: `2px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.2)'}`,
                                                    background: isDark ? 'rgba(39, 39, 42, 0.5)' : 'rgba(0, 0, 0, 0.02)',
                                                    color: isDark ? '#e4e4e7' : '#18181b',
                                                }}
                                            >
                                                {children}
                                            </th>
                                        );
                                    },
                                    td({ children }) {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return (
                                            <td
                                                style={{
                                                    padding: '8px 12px',
                                                    borderBottom: `1px solid ${isDark ? 'rgba(82, 82, 91, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
                                                    color: isDark ? '#d4d4d8' : '#3f3f46',
                                                }}
                                            >
                                                {children}
                                            </td>
                                        );
                                    },
                                    hr() {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        return (
                                            <hr
                                                style={{
                                                    border: 'none',
                                                    borderTop: `2px solid ${isDark ? 'rgba(82, 82, 91, 0.5)' : 'rgba(0, 0, 0, 0.1)'}`,
                                                    margin: '1.5em 0',
                                                }}
                                            />
                                        );
                                    },
                                    a({ children, href }) {
                                        return (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent triggering note selection
                                                }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation(); // Prevent dragging
                                                }}
                                                style={{
                                                    color: '#3b82f6',
                                                    textDecoration: 'none',
                                                    borderBottom: '1px solid #3b82f6',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {children}
                                            </a>
                                        );
                                    },
                                }}
                            >
                                {content || '# Empty Note\n\nDouble-click to edit and add your content.'}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>

            {/* Scoped styles for markdown preview */}
            <style>{`
                .markdown-preview {
                    font-size: 14px;
                    line-height: 1.6;
                    color: inherit;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                .markdown-preview > *:first-child {
                    margin-top: 0 !important;
                }

                .markdown-preview > *:last-child {
                    margin-bottom: 0 !important;
                }

                .markdown-preview strong {
                    font-weight: 600;
                    color: inherit;
                }

                .markdown-preview em {
                    font-style: italic;
                }

                /* Better code block overflow handling */
                .markdown-preview pre {
                    overflow-x: auto;
                    max-width: 100%;
                }

                .markdown-preview code {
                    word-break: break-word;
                }

                /* Copy button hover effect */
                .copy-code-button {
                    opacity: 0.8;
                    pointer-events: auto !important;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .copy-code-button:hover {
                    opacity: 1 !important;
                    transform: scale(1.05) !important;
                }

                .copy-code-button:active {
                    transform: scale(0.98) !important;
                }

                [data-theme="light"] .copy-code-button:hover:not(:active) {
                    background: rgba(0, 0, 0, 0.08) !important;
                }

                [data-theme="dark"] .copy-code-button:hover:not(:active) {
                    background: rgba(255, 255, 255, 0.18) !important;
                }

                /* Ensure code blocks don't block button clicks */
                .markdown-preview pre {
                    position: relative;
                }

                .markdown-preview button {
                    pointer-events: auto !important;
                }

                /* Better scrollbar for markdown notes */
                .markdown-note-overlay::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }

                .markdown-note-overlay::-webkit-scrollbar-track {
                    background: transparent;
                }

                .markdown-note-overlay::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                }

                [data-theme="dark"] .markdown-note-overlay::-webkit-scrollbar-thumb {
                    background: rgba(161, 161, 170, 0.4);
                }

                .markdown-note-overlay::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.3);
                }

                [data-theme="dark"] .markdown-note-overlay::-webkit-scrollbar-thumb:hover {
                    background: rgba(161, 161, 170, 0.6);
                }

                /* Smooth transitions */
                .markdown-note-overlay {
                    transition: border-color 0.2s ease, box-shadow 0.3s ease;
                }

                /* Better checkbox styling */
                .markdown-preview input[type="checkbox"] {
                    margin-right: 0.5em;
                    cursor: pointer;
                }

                .markdown-preview input[type="checkbox"]:hover {
                    transform: scale(1.1);
                }

                /* Better link hover effect */
                .markdown-preview a {
                    transition: all 0.2s ease;
                }

                .markdown-preview a:hover {
                    border-bottom: 2px solid #3b82f6;
                    color: #2563eb;
                }

                /* Improve text selection */
                .markdown-preview ::selection {
                    background: rgba(59, 130, 246, 0.3);
                }

                [data-theme="dark"] .markdown-preview ::selection {
                    background: rgba(129, 140, 248, 0.3);
                }

                /* Better table responsive behavior */
                .markdown-preview table {
                    display: block;
                    overflow-x: auto;
                    white-space: nowrap;
                }

                /* Fade animation for container */
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
        </div>
    );
}));

MarkdownNote.displayName = "MarkdownNote";
