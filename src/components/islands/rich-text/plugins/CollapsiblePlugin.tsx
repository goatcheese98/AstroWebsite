import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $createParagraphNode,
    $createTextNode,
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_EDITOR,
    COMMAND_PRIORITY_LOW,
    KEY_BACKSPACE_COMMAND,
    KEY_DELETE_COMMAND,
    createCommand,
    type LexicalCommand,
    type LexicalNode,
} from 'lexical';
import { useEffect } from 'react';
import {
    $createCollapsibleContainerNode,
    $createCollapsibleContentNode,
    $createCollapsibleTitleNode,
    $findCollapsibleContainerNode,
    $isCollapsibleContentNode,
    $isCollapsibleTitleNode,
    CollapsibleContainerNode,
    CollapsibleContentNode,
    CollapsibleTitleNode,
} from '../nodes/CollapsibleNodes';

export const INSERT_COLLAPSIBLE_COMMAND: LexicalCommand<void> = createCommand(
    'INSERT_COLLAPSIBLE_COMMAND',
);

function unwrapCollapsibleContainer(container: CollapsibleContainerNode): void {
    const titleNode = container.getChildAtIndex(0);
    const contentNode = container.getChildAtIndex(1);
    let insertionPoint: LexicalNode = container;

    if ($isCollapsibleTitleNode(titleNode)) {
        const summaryText = titleNode.getTextContent().trim();
        if (summaryText.length > 0) {
            const summaryParagraph = $createParagraphNode().append(
                $createTextNode(summaryText),
            );
            insertionPoint.insertAfter(summaryParagraph);
            insertionPoint = summaryParagraph;
        }
    }

    if ($isCollapsibleContentNode(contentNode)) {
        const contentChildren = [...contentNode.getChildren()];
        for (const child of contentChildren) {
            insertionPoint.insertAfter(child);
            insertionPoint = child;
        }
    }

    if (insertionPoint === container) {
        const fallbackParagraph = $createParagraphNode();
        container.insertAfter(fallbackParagraph);
        insertionPoint = fallbackParagraph;
    }

    container.remove();
    insertionPoint.selectEnd();
}

export default function CollapsiblePlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (
            !editor.hasNodes([
                CollapsibleContainerNode,
                CollapsibleTitleNode,
                CollapsibleContentNode,
            ])
        ) {
            throw new Error(
                'CollapsiblePlugin: CollapsibleNodes not registered on editor',
            );
        }

        const unregisterInsert = editor.registerCommand(
            INSERT_COLLAPSIBLE_COMMAND,
            () => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    const container = $findCollapsibleContainerNode(
                        selection.anchor.getNode(),
                    );
                    if (container) {
                        unwrapCollapsibleContainer(container);
                        return true;
                    }

                    const title = $createCollapsibleTitleNode();
                    const content = $createCollapsibleContentNode().append(
                        $createParagraphNode(),
                    );
                    const newContainer = $createCollapsibleContainerNode(true).append(
                        title,
                        content,
                    );
                    selection.insertNodes([newContainer]);
                }
                return true;
            },
            COMMAND_PRIORITY_LOW,
        );

        const removeEmptyCollapsible = (event: KeyboardEvent): boolean => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                return false;
            }

            const container = $findCollapsibleContainerNode(selection.anchor.getNode());
            if (!container || container.getTextContent().trim().length > 0) {
                return false;
            }

            event.preventDefault();
            unwrapCollapsibleContainer(container);
            return true;
        };

        const unregisterBackspace = editor.registerCommand(
            KEY_BACKSPACE_COMMAND,
            (event) => removeEmptyCollapsible(event),
            COMMAND_PRIORITY_EDITOR,
        );

        const unregisterDelete = editor.registerCommand(
            KEY_DELETE_COMMAND,
            (event) => removeEmptyCollapsible(event),
            COMMAND_PRIORITY_EDITOR,
        );

        return () => {
            unregisterInsert();
            unregisterBackspace();
            unregisterDelete();
        };
    }, [editor]);

    return null;
}
