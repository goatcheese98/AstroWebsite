import { useEffect } from 'react';
import {
  $isAutoLinkNode,
  $isLinkNode,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  getDOMSelectionFromTarget,
  isHTMLElement,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical';
import { $createImageNode, $isImageNode, ImageNode, type ImagePayload } from '../nodes/ImageNode';
import { compressImageDataUrl } from '../../../../lib/image-compression';

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> =
  createCommand('INSERT_IMAGE_COMMAND');

const SUPPORTED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/ico',
  'image/x-icon',
]);

const TRANSPARENT_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const dragImage = document.createElement('img');
dragImage.src = TRANSPARENT_IMAGE;

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processImageFile(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return dataUrl;
  }
  return compressImageDataUrl(dataUrl);
}

function isImageFile(file: File): boolean {
  return SUPPORTED_MIME.has(file.type) || file.type.startsWith('image/');
}

function $getImageNodeInSelection(): ImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | ImagePayload {
  const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
  if (!dragData) {
    return null;
  }
  const { type, data } = JSON.parse(dragData);
  if (type !== 'image') {
    return null;
  }
  return data;
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    isHTMLElement(target) &&
    !target.closest('code, span.newlex-editor-image') &&
    isHTMLElement(target.parentElement) &&
    target.parentElement.closest('[contenteditable="true"]')
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const domSelection = getDOMSelectionFromTarget(event.target);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw new Error('Cannot get the selection when dragging');
  }
  return range;
}

function $onDragStart(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }

  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }

  dataTransfer.setData('text/plain', '_');
  dataTransfer.setDragImage(dragImage, 0, 0);
  dataTransfer.setData(
    'application/x-lexical-drag',
    JSON.stringify({
      data: {
        altText: node.__altText,
        height: node.__height,
        key: node.getKey(),
        maxWidth: node.__maxWidth,
        src: node.__src,
        width: node.__width,
      },
      type: 'image',
    }),
  );

  return true;
}

function $onDragover(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }

  if (!canDropImage(event)) {
    event.preventDefault();
  }

  return false;
}

function $onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }

  const data = getDragImageData(event);
  if (!data) {
    return false;
  }

  const existingLink = $findMatchingParent(
    node,
    (parent): parent is LinkNode => !$isAutoLinkNode(parent) && $isLinkNode(parent),
  );

  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
    if (existingLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, existingLink.getURL());
    }
  }

  return true;
}

export default function ImagesPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    const unregisterImageCommands = mergeRegister(
      editor.registerCommand<ImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createImageNode(payload);
          $insertNodes([imageNode]);
          if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        DRAGSTART_COMMAND,
        (event) => $onDragStart(event),
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => $onDragover(event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => $onDrop(event, editor),
        COMMAND_PRIORITY_HIGH,
      ),
    );

    const rootElement = editor.getRootElement();

    const onPaste = async (event: ClipboardEvent) => {
      if (!editor.isEditable()) return;
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.kind === 'file' && isImageFile(item.getAsFile()!)) {
          event.preventDefault();
          const file = item.getAsFile()!;
          try {
            const src = await processImageFile(file);
            editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
              altText: file.name,
              src,
            });
          } catch (error) {
            console.error('NewLex: image paste failed', error);
          }
          return;
        }
      }
    };

    const onNativeDrop = async (event: DragEvent) => {
      if (!editor.isEditable()) return;
      const files = event.dataTransfer?.files;
      const hasLexicalDrag = !!event.dataTransfer?.getData('application/x-lexical-drag');

      if (hasLexicalDrag || !files) {
        return;
      }

      const imageFiles = Array.from(files).filter(isImageFile);
      if (imageFiles.length === 0) return;

      event.preventDefault();
      event.stopPropagation();

      for (const file of imageFiles) {
        try {
          const src = await processImageFile(file);
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            altText: file.name,
            src,
          });
        } catch (error) {
          console.error('NewLex: image drop failed', error);
        }
      }
    };

    const onDragOver = (event: DragEvent) => {
      if (!editor.isEditable()) return;
      const types = event.dataTransfer?.types;
      if (types && Array.from(types).includes('Files')) {
        event.preventDefault();
      }
    };

    rootElement?.addEventListener('paste', onPaste as unknown as EventListener);
    rootElement?.addEventListener('drop', onNativeDrop as unknown as EventListener);
    rootElement?.addEventListener('dragover', onDragOver as unknown as EventListener);

    return () => {
      unregisterImageCommands();
      rootElement?.removeEventListener('paste', onPaste as unknown as EventListener);
      rootElement?.removeEventListener('drop', onNativeDrop as unknown as EventListener);
      rootElement?.removeEventListener('dragover', onDragOver as unknown as EventListener);
    };
  }, [editor]);

  return null;
}

export function openImageFilePicker(onFile: (payload: ImagePayload) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = false;
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener(
    'change',
    async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) return;
      try {
        const src = await processImageFile(file);
        onFile({ altText: file.name, src });
      } catch (error) {
        console.error('NewLex: image pick failed', error);
      }
    },
    { once: true },
  );

  input.click();
}
