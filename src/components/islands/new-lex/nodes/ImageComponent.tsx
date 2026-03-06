import type { LexicalEditor, NodeKey } from 'lexical';
import type { JSX } from 'react';
import './ImageNode.css';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ImageResizer from './ImageResizer';
import { $isImageNode } from './ImageNode';

type ImageStatus = { error: true } | { error: false; height: number; width: number };

const imageCache = new Map<string, Promise<ImageStatus> | ImageStatus>();

function useSuspenseImage(src: string): ImageStatus {
  let cached = imageCache.get(src);
  if (cached && 'error' in cached) {
    return cached;
  }

  if (!cached) {
    cached = new Promise<ImageStatus>((resolve) => {
      const image = new Image();
      image.src = src;
      image.onload = () =>
        resolve({
          error: false,
          height: image.naturalHeight,
          width: image.naturalWidth,
        });
      image.onerror = () => resolve({ error: true });
    }).then((result) => {
      imageCache.set(src, result);
      return result;
    });

    imageCache.set(src, cached);
  }

  throw cached;
}

function LazyImage({
  altText,
  className,
  height,
  imageRef,
  maxWidth,
  onError,
  src,
  width,
  draggable,
}: {
  altText: string;
  className: string | null;
  draggable: boolean;
  height: 'inherit' | number;
  imageRef: { current: HTMLImageElement | null };
  maxWidth: number;
  onError: () => void;
  src: string;
  width: 'inherit' | number;
}): JSX.Element {
  const status = useSuspenseImage(src);

  useEffect(() => {
    if (status.error) {
      onError();
    }
  }, [onError, status.error]);

  if (status.error) {
    return <BrokenImage />;
  }

  return (
    <img
      className={className || undefined}
      src={src}
      alt={altText}
      ref={imageRef}
      style={{
        height,
        maxWidth,
        width,
      }}
      onError={onError}
      draggable={draggable}
    />
  );
}

function BrokenImage(): JSX.Element {
  return (
    <div className="newlex-image-broken" aria-label="Broken image">
      Image failed to load
    </div>
  );
}

export default function ImageComponent({
  altText,
  height,
  maxWidth,
  nodeKey,
  resizable,
  src,
  width,
}: {
  altText: string;
  height: 'inherit' | number;
  maxWidth: number;
  nodeKey: NodeKey;
  resizable: boolean;
  src: string;
  width: 'inherit' | number;
}): JSX.Element {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageWrapperRef = useRef<HTMLSpanElement | null>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = useState(false);
  const [editor] = useLexicalComposerContext();
  const [isLoadError, setIsLoadError] = useState(false);
  const [liveSize, setLiveSize] = useState<null | { height: number; width: number }>(null);
  const isEditable = useLexicalEditable();

  const isInNodeSelection = useMemo(
    () =>
      isSelected &&
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        return $isNodeSelection(selection) && selection.has(nodeKey);
      }),
    [editor, isSelected, nodeKey],
  );

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (isResizing) {
        return true;
      }

      if (event.target === imageRef.current) {
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
    [clearSelection, isResizing, isSelected, setSelected],
  );

  const handleWrapperMouseDown = useCallback(
    (event: React.MouseEvent<HTMLSpanElement>) => {
      if (!isEditable || isResizing) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest('.image-resizer')) {
        return;
      }

      if (target === imageRef.current) {
        if (event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          setSelected(!isSelected);
          return;
        }

        if (!isInNodeSelection) {
          event.preventDefault();
          event.stopPropagation();
          clearSelection();
          setSelected(true);
        }
      }
    },
    [clearSelection, isEditable, isInNodeSelection, isResizing, isSelected, setSelected],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        onClick,
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, onClick]);

  useEffect(() => {
    if (
      !isResizing &&
      liveSize &&
      typeof width === 'number' &&
      typeof height === 'number' &&
      width === liveSize.width &&
      height === liveSize.height
    ) {
      setLiveSize(null);
    }
  }, [height, isResizing, liveSize, width]);

  const onResizeEnd = (nextWidth: 'inherit' | number, nextHeight: 'inherit' | number) => {
    setIsResizing(false);
    if (typeof nextWidth === 'number' && typeof nextHeight === 'number') {
      setLiveSize({ height: nextHeight, width: nextWidth });
    }
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setWidthAndHeight(nextWidth, nextHeight);
      }
    });
  };

  const onResizeStart = () => {
    setIsResizing(true);
  };

  const onResizeChange = (nextWidth: number, nextHeight: number) => {
    setLiveSize({ height: nextHeight, width: nextWidth });
  };

  const draggable = isInNodeSelection && !isResizing;
  const isFocused = (isSelected || isResizing) && isEditable;
  const renderedWidth = liveSize?.width ?? width;
  const renderedHeight = liveSize?.height ?? height;

  return (
    <Suspense fallback={null}>
      <>
        <span
          ref={imageWrapperRef}
          className="newlex-image-inline-wrapper"
          draggable={draggable}
          onMouseDown={handleWrapperMouseDown}
        >
          {isLoadError ? (
            <BrokenImage />
          ) : (
            <LazyImage
              className={isFocused ? `focused ${isInNodeSelection ? 'draggable' : ''}` : null}
              src={src}
              altText={altText}
              draggable={draggable}
              imageRef={imageRef}
              width={renderedWidth}
              height={renderedHeight}
              maxWidth={maxWidth}
              onError={() => setIsLoadError(true)}
            />
          )}
        </span>
        {resizable && isInNodeSelection && isFocused && (
          <ImageResizer
            editor={editor}
            imageRef={imageRef}
            imageWrapperRef={imageWrapperRef}
            maxWidth={maxWidth}
            onResizeChange={onResizeChange}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
          />
        )}
      </>
    </Suspense>
  );
}
