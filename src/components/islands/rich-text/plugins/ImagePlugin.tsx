import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import {
    $createParagraphNode,
    $getSelection,
    $insertNodes,
    $isRangeSelection,
    COMMAND_PRIORITY_EDITOR,
    createCommand,
    type LexicalCommand,
} from 'lexical';
import { useEffect } from 'react';
import { $createImageNode, $isImageNode, ImageNode, type ImagePayload } from '../nodes/ImageNode';

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
    'INSERT_IMAGE_COMMAND'
);

export default function ImagePlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([ImageNode])) {
            throw new Error('ImagePlugin: ImageNode not registered on editor');
        }

        return mergeRegister(
            // Register INSERT_IMAGE_COMMAND
            editor.registerCommand(
                INSERT_IMAGE_COMMAND,
                (payload) => {
                    const selection = $getSelection();

                    if ($isRangeSelection(selection)) {
                        if ($isImageNode(selection.getNodes()[0])) {
                            // If an image is selected, insert after it
                            const imageNode = $createImageNode(payload);
                            selection.insertNodes([imageNode]);
                        } else {
                            // Insert image and wrap in paragraph if needed
                            const imageNode = $createImageNode(payload);
                            $insertNodes([imageNode]);
                            if ($isImageNode(imageNode.getNextSibling())) {
                                $wrapNodeInElement(imageNode, $createParagraphNode);
                            }
                        }
                    }

                    return true;
                },
                COMMAND_PRIORITY_EDITOR
            ),

            // Handle drag and drop of images
            editor.registerRootListener((rootElement, prevRootElement) => {
                if (rootElement) {
                    rootElement.addEventListener('dragover', handleDragOver);
                    rootElement.addEventListener('drop', handleDrop);
                }

                if (prevRootElement) {
                    prevRootElement.removeEventListener('dragover', handleDragOver);
                    prevRootElement.removeEventListener('drop', handleDrop);
                }
            }),

            // Handle paste of images
            editor.registerCommand(
                'PASTE_COMMAND' as unknown as LexicalCommand<ClipboardEvent>,
                (event: ClipboardEvent) => {
                    const items = event.clipboardData?.items;
                    if (!items) return false;

                    let handled = false;

                    for (const item of Array.from(items)) {
                        // Handle image files
                        if (item.type.startsWith('image/')) {
                            const file = item.getAsFile();
                            if (file) {
                                event.preventDefault();
                                handleImageFile(file, editor);
                                handled = true;
                            }
                        }

                        // Handle image URLs in text
                        if (item.type === 'text/plain') {
                            item.getAsString((text) => {
                                if (isImageUrl(text)) {
                                    event.preventDefault();
                                    editor.update(() => {
                                        const selection = $getSelection();
                                        if ($isRangeSelection(selection)) {
                                            const imageNode = $createImageNode({
                                                src: text,
                                                altText: 'Pasted image',
                                            });
                                            $insertNodes([imageNode]);
                                        }
                                    });
                                }
                            });
                        }
                    }

                    return handled;
                },
                COMMAND_PRIORITY_EDITOR
            )
        );
    }, [editor]);

    return null;
}

function handleDragOver(event: DragEvent): void {
    event.preventDefault();
}

function handleDrop(event: DragEvent): void {
    event.preventDefault();

    const editor = (event.currentTarget as HTMLElement).closest('[data-lexical-editor]') as
        | (HTMLElement & { __lexicalEditor?: ReturnType<typeof useLexicalComposerContext>[0] })
        | null;

    if (!editor?.__lexicalEditor) return;

    const files = event.dataTransfer?.files;
    if (!files) return;

    for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
            handleImageFile(file, editor.__lexicalEditor);
        }
    }
}

function handleImageFile(
    file: File,
    editor: ReturnType<typeof useLexicalComposerContext>[0]
): void {
    const reader = new FileReader();
    reader.onload = () => {
        const src = reader.result as string;
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const imageNode = $createImageNode({
                    src,
                    altText: file.name,
                });
                $insertNodes([imageNode]);
            }
        });
    };
    reader.readAsDataURL(file);
}

function isImageUrl(text: string): boolean {
    const imageUrlPattern = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico))(\?.*)?$/i;
    return imageUrlPattern.test(text.trim());
}


