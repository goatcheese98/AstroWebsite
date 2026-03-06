import type { NodeKey } from 'lexical';
import type { JSX } from 'react';
import './ImageNode.css';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  KEY_ESCAPE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { $isImageNode } from './ImageNode';

type ImageStatus = { error: true } | { error: false; height: number; width: number };
const imageCache = new Map<string, Promise<ImageStatus> | ImageStatus>();

function useSuspenseImage(src: string): ImageStatus {
  let cached = imageCache.get(src);
  if (cached && 'error' in cached) return cached;
  if (!cached) {
    cached = new Promise<ImageStatus>((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve({ error: false, height: img.naturalHeight, width: img.naturalWidth });
      img.onerror = () => resolve({ error: true });
    }).then((r) => { imageCache.set(src, r); return r; });
    imageCache.set(src, cached);
  }
  throw cached;
}

function SuspendedImage({ src, alt, imageRef, style, onError }: {
  src: string;
  alt: string;
  imageRef: React.RefObject<HTMLImageElement | null>;
  style: React.CSSProperties;
  onError: () => void;
}): JSX.Element {
  const status = useSuspenseImage(src);
  useEffect(() => { if (status.error) onError(); }, [status.error, onError]);
  if (status.error) return <span style={{ color: '#9ca3af', fontSize: 13 }}>Image failed to load</span>;
  return <img ref={imageRef} src={src} alt={alt} style={style} draggable={false} onError={onError} />;
}

export default function ImageComponent({ altText, height, maxWidth, nodeKey, resizable, src, width }: {
  altText: string;
  height: 'inherit' | number;
  maxWidth: number;
  nodeKey: NodeKey;
  resizable: boolean;
  src: string;
  width: 'inherit' | number;
}): JSX.Element {
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [editor] = useLexicalComposerContext();
  const [isLoadError, setIsLoadError] = useState(false);
  const isResizingRef = useRef(false);

  const isInNodeSelection = useMemo(() =>
    isSelected && editor.getEditorState().read(() => {
      const sel = $getSelection();
      return $isNodeSelection(sel) && sel.has(nodeKey);
    }),
    [editor, isSelected, nodeKey],
  );

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (isResizingRef.current) return;
    if (!editor.isEditable()) return;
    // Don't preventDefault here — let Lexical still process focus, but select the node
    event.stopPropagation();
    // Use a microtask so Lexical's own mousedown handler runs first, then we override selection
    Promise.resolve().then(() => {
      if (event.shiftKey) { setSelected(!isSelected); }
      else { clearSelection(); setSelected(true); }
    });
  }, [clearSelection, editor, isSelected, setSelected]);

  useEffect(() => mergeRegister(
    editor.registerCommand(KEY_ESCAPE_COMMAND, () => {
      if (isSelected) { clearSelection(); return true; }
      return false;
    }, COMMAND_PRIORITY_LOW),
  ), [editor, isSelected, clearSelection]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const img = imageRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    // Capture scale once — offsetWidth is CSS pixels, rect.width is screen pixels
    const scale = img.offsetWidth > 0 ? rect.width / img.offsetWidth : 1;
    const startX = e.clientX;
    const startY = e.clientY;
    // Start dimensions in CSS pixels (what we set on style)
    const startW = rect.width / scale;
    const startH = rect.height / scale;
    const ratio = startW / startH;
    isResizingRef.current = true;

    const onMove = (me: PointerEvent) => {
      // Convert screen-pixel delta → CSS-pixel delta using the fixed scale
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? dx : dy * ratio;
      const newW = Math.max(80, startW + delta);
      img.style.width = `${newW}px`;
      img.style.height = `${newW / ratio}px`;
    };

    const onUp = () => {
      isResizingRef.current = false;
      // offsetWidth/Height are in CSS pixels — correct for saving to node
      const finalW = Math.round(parseFloat(img.style.width) || img.offsetWidth);
      const finalH = Math.round(parseFloat(img.style.height) || img.offsetHeight);
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) node.setWidthAndHeight(finalW, finalH);
      });
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [editor, nodeKey]);

  const imgStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    width: typeof width === 'number' ? width : undefined,
    height: typeof height === 'number' ? height : undefined,
  };

  return (
    <Suspense fallback={null}>
      <span
        ref={wrapperRef}
        className={`newlex-editor-image${isInNodeSelection ? ' selected' : ''}`}
        draggable={isInNodeSelection && !isResizingRef.current}
        onPointerDown={handlePointerDown}
      >
        {isLoadError
          ? <span style={{ color: '#9ca3af', fontSize: 13 }}>Image failed to load</span>
          : <SuspendedImage
              src={src} alt={altText} imageRef={imageRef}
              style={imgStyle} onError={() => setIsLoadError(true)}
            />
        }
        {resizable && isInNodeSelection && !isLoadError && (
          <span
            className="newlex-image-resize-handle"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={onHandlePointerDown}
          />
        )}
      </span>
    </Suspense>
  );
}
