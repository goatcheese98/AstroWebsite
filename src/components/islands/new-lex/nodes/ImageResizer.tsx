import type { LexicalEditor } from 'lexical';
import type { JSX } from 'react';
import { calculateZoomLevel } from '@lexical/utils';
import React, { useEffect, useRef } from 'react';
import { calculateImageResize, type ResizeCorner } from './imageResize';

const CORNERS: Array<{
  cursor: string;
  handle: ResizeCorner;
  className: string;
}> = [
  { cursor: 'nwse-resize', handle: 'nw', className: 'image-resizer-nw' },
  { cursor: 'nesw-resize', handle: 'ne', className: 'image-resizer-ne' },
  { cursor: 'nwse-resize', handle: 'se', className: 'image-resizer-se' },
  { cursor: 'nesw-resize', handle: 'sw', className: 'image-resizer-sw' },
];

export default function ImageResizer({
  editor,
  imageRef,
  imageWrapperRef,
  maxWidth,
  onResizeChange,
  onResizeEnd,
  onResizeStart,
}: {
  editor: LexicalEditor;
  imageRef: { current: HTMLElement | null };
  imageWrapperRef: { current: HTMLElement | null };
  maxWidth?: number;
  onResizeChange: (width: number, height: number) => void;
  onResizeEnd: (width: 'inherit' | number, height: 'inherit' | number) => void;
  onResizeStart: () => void;
}): JSX.Element {
  const activeResizeRef = useRef<{
    startHeight: number;
    startWidth: number;
    startX: number;
    corner: ResizeCorner;
  } | null>(null);
  const previousDraggableRef = useRef<boolean | null>(null);
  const onResizeChangeRef = useRef(onResizeChange);
  const onResizeEndRef = useRef(onResizeEnd);
  const imageRefRef = useRef(imageRef);
  const imageWrapperRefRef = useRef(imageWrapperRef);

  const editorRootElement = editor.getRootElement();

  onResizeChangeRef.current = onResizeChange;
  onResizeEndRef.current = onResizeEnd;
  imageRefRef.current = imageRef;
  imageWrapperRefRef.current = imageWrapperRef;

  const setCursor = (cursor: string) => {
    editorRootElement?.style.setProperty('cursor', cursor, 'important');
    document.body?.style.setProperty('cursor', cursor, 'important');
    document.body?.style.setProperty('-webkit-user-select', 'none', 'important');
  };

  const resetCursor = () => {
    editorRootElement?.style.setProperty('cursor', 'text');
    document.body?.style.setProperty('cursor', 'default');
    document.body?.style.removeProperty('-webkit-user-select');
  };

  const handlePointerMove = (event: PointerEvent) => {
    const active = activeResizeRef.current;
    const image = imageRefRef.current.current;
    if (!active || !image) {
      return;
    }

    const zoom = calculateZoomLevel(image);
    const rootWidth = editorRootElement?.getBoundingClientRect().width;
    const nextSize = calculateImageResize({
      corner: active.corner,
      currentX: active.startX + (event.clientX - active.startX) / zoom,
      maxWidth,
      rootWidth,
      startHeight: active.startHeight,
      startWidth: active.startWidth,
      startX: active.startX,
    });

    onResizeChangeRef.current(nextSize.width, nextSize.height);
  };

  const handlePointerUp = () => {
    const image = imageRefRef.current.current;
    const active = activeResizeRef.current;
    if (!image || !active) {
      return;
    }

    const width = Math.round(image.getBoundingClientRect().width);
    const height = Math.round(image.getBoundingClientRect().height);

    activeResizeRef.current = null;
    if (imageWrapperRefRef.current.current && previousDraggableRef.current !== null) {
      imageWrapperRefRef.current.current.draggable = previousDraggableRef.current;
      previousDraggableRef.current = null;
    }
    resetCursor();
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    onResizeEndRef.current(width, height);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      resetCursor();
    };
  }, []);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    corner: ResizeCorner,
    cursor: string,
  ) => {
    if (!editor.isEditable()) {
      return;
    }

    const image = imageRefRef.current.current;
    if (!image) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = image.getBoundingClientRect();
    activeResizeRef.current = {
      corner,
      startHeight: rect.height,
      startWidth: rect.width,
      startX: event.clientX,
    };

    if (imageWrapperRefRef.current.current) {
      previousDraggableRef.current = imageWrapperRefRef.current.current.draggable;
      imageWrapperRefRef.current.current.draggable = false;
    }

    setCursor(cursor);
    onResizeStart();
    onResizeChangeRef.current(Math.round(rect.width), Math.round(rect.height));

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="image-resizer-overlay">
      {CORNERS.map(({ className, handle, cursor }) => (
        <div
          key={handle}
          className={`image-resizer ${className}`}
          onPointerDown={(event) => handlePointerDown(event, handle, cursor)}
        />
      ))}
    </div>
  );
}
