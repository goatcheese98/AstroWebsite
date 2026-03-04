import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
    $getNodeByKey,
    $getSelection,
    $isNodeSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_LOW,
    KEY_BACKSPACE_COMMAND,
    KEY_DELETE_COMMAND,
    SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { ImageNode } from '../nodes/ImageNode';

interface ImageComponentProps {
    src: string;
    altText: string;
    width?: number;
    height?: number;
    maxWidth: number;
    nodeKey: string;
}

const MIN_WIDTH = 50;
const MIN_HEIGHT = 50;

export default function ImageComponent({
    src,
    altText,
    width,
    height,
    maxWidth,
    nodeKey,
}: ImageComponentProps): React.JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
    const [isResizing, setIsResizing] = useState(false);
    const [currentWidth, setCurrentWidth] = useState(width);
    const [currentHeight, setCurrentHeight] = useState(height);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

    // Update local state when props change
    useEffect(() => {
        setCurrentWidth(width);
        setCurrentHeight(height);
    }, [width, height]);

    const onDelete = useCallback(
        (payload: KeyboardEvent) => {
            if (isSelected && $isNodeSelection($getSelection())) {
                const event = payload;
                event.preventDefault();
                const node = $getNodeByKey(nodeKey);
                if (node instanceof ImageNode) {
                    node.remove();
                }
                return true;
            }
            return false;
        },
        [isSelected, nodeKey]
    );

    const onClick = useCallback(
        (event: MouseEvent) => {
            // Don't select if clicking on resize handles
            const target = event.target as HTMLElement;
            if (target.closest('.image-resize-handle')) {
                return false;
            }

            if (event.target === imageRef.current || event.target === containerRef.current) {
                if (event.shiftKey) {
                    setSelected(!isSelected);
                } else {
                    clearSelection();
                    setSelected(true);
                }
                return true;
            }
            return false;
        },
        [isSelected, setSelected, clearSelection]
    );

    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    const selection = $getSelection();
                    if (!$isNodeSelection(selection)) {
                        setSelected(false);
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                CLICK_COMMAND,
                onClick,
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                onDelete,
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor, onClick, onDelete, setSelected]);

    const handleResizeStart = useCallback(
        (event: React.MouseEvent, direction: string) => {
            event.preventDefault();
            event.stopPropagation();
            setIsResizing(true);

            const startX = event.clientX;
            const startY = event.clientY;
            const startWidth = currentWidth ?? imageRef.current?.naturalWidth ?? 200;
            const startHeight = currentHeight ?? imageRef.current?.naturalHeight ?? 200;

            resizeStartRef.current = {
                x: startX,
                y: startY,
                width: startWidth,
                height: startHeight,
            };

            const handleMouseMove = (moveEvent: MouseEvent) => {
                if (!resizeStartRef.current) return;

                const deltaX = moveEvent.clientX - resizeStartRef.current.x;
                const deltaY = moveEvent.clientY - resizeStartRef.current.y;

                let newWidth = startWidth;
                let newHeight = startHeight;

                // Calculate new dimensions based on resize direction
                if (direction.includes('e')) {
                    newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
                }
                if (direction.includes('w')) {
                    newWidth = Math.max(MIN_WIDTH, startWidth - deltaX);
                }
                if (direction.includes('s')) {
                    newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
                }
                if (direction.includes('n')) {
                    newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
                }

                // Maintain aspect ratio if shift key is held
                if (moveEvent.shiftKey) {
                    const aspectRatio = startWidth / startHeight;
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        newHeight = newWidth / aspectRatio;
                    } else {
                        newWidth = newHeight * aspectRatio;
                    }
                }

                // Enforce max width
                if (newWidth > maxWidth) {
                    const ratio = maxWidth / newWidth;
                    newWidth = maxWidth;
                    newHeight = newHeight * ratio;
                }

                setCurrentWidth(Math.round(newWidth));
                setCurrentHeight(Math.round(newHeight));
            };

            const handleMouseUp = () => {
                setIsResizing(false);
                resizeStartRef.current = null;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // Update the node with new dimensions
                editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    if (node instanceof ImageNode) {
                        node.setWidth(currentWidth);
                        node.setHeight(currentHeight);
                    }
                });
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [currentWidth, currentHeight, editor, maxWidth, nodeKey]
    );

    const handleDelete = useCallback(() => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node instanceof ImageNode) {
                node.remove();
            }
        });
    }, [editor, nodeKey]);

    const imageStyle: React.CSSProperties = {
        width: currentWidth ? `${currentWidth}px` : '100%',
        height: currentHeight ? `${currentHeight}px` : 'auto',
        maxWidth: `${maxWidth}px`,
        display: 'block',
        userSelect: 'none',
        pointerEvents: isResizing ? 'none' : 'auto',
    };

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-block',
        maxWidth: `${maxWidth}px`,
        outline: isSelected ? '2px solid #6366f1' : 'none',
        outlineOffset: '2px',
        borderRadius: '4px',
    };

    const resizeHandleStyle = (position: string): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: '#6366f1',
            border: '2px solid white',
            borderRadius: '50%',
            cursor: getCursorForPosition(position),
            zIndex: 10,
            display: isSelected ? 'block' : 'none',
        };

        switch (position) {
            case 'nw':
                return { ...base, top: '-5px', left: '-5px' };
            case 'ne':
                return { ...base, top: '-5px', right: '-5px' };
            case 'sw':
                return { ...base, bottom: '-5px', left: '-5px' };
            case 'se':
                return { ...base, bottom: '-5px', right: '-5px' };
            default:
                return base;
        }
    };

    function getCursorForPosition(position: string): string {
        switch (position) {
            case 'nw':
            case 'se':
                return 'nwse-resize';
            case 'ne':
            case 'sw':
                return 'nesw-resize';
            default:
                return 'default';
        }
    }

    return (
        <div style={{ margin: '8px 0' }}>
            <div ref={containerRef} style={containerStyle}>
                <img
                    ref={imageRef}
                    src={src}
                    alt={altText}
                    style={imageStyle}
                    draggable={false}
                />
                {isSelected && (
                    <>
                        {/* Resize handles */}
                        <div
                            className="image-resize-handle"
                            style={resizeHandleStyle('nw')}
                            onMouseDown={(e) => handleResizeStart(e, 'nw')}
                        />
                        <div
                            className="image-resize-handle"
                            style={resizeHandleStyle('ne')}
                            onMouseDown={(e) => handleResizeStart(e, 'ne')}
                        />
                        <div
                            className="image-resize-handle"
                            style={resizeHandleStyle('sw')}
                            onMouseDown={(e) => handleResizeStart(e, 'sw')}
                        />
                        <div
                            className="image-resize-handle"
                            style={resizeHandleStyle('se')}
                            onMouseDown={(e) => handleResizeStart(e, 'se')}
                        />
                        {/* Delete button */}
                        <button
                            onClick={handleDelete}
                            style={{
                                position: 'absolute',
                                top: '-12px',
                                right: '-12px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#ef4444',
                                border: '2px solid white',
                                color: 'white',
                                fontSize: '14px',
                                lineHeight: '1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                zIndex: 10,
                            }}
                            title="Delete image"
                        >
                            ×
                        </button>
                    </>
                )}
            </div>
            {altText && (
                <div
                    style={{
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        marginTop: '4px',
                        fontStyle: 'italic',
                    }}
                >
                    {altText}
                </div>
            )}
        </div>
    );
}
