/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    ▶ CollapsiblePlugin.tsx                                   ║
 * ║                    "The Accordion Logic"                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I handle the insertion and behavior of collapsible sections.             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_LOW,
    createCommand,
    type LexicalCommand,
} from 'lexical';
import { useEffect } from 'react';
import {
    $createCollapsibleContainerNode,
    $createCollapsibleContentNode,
    $createCollapsibleTitleNode,
    CollapsibleContainerNode,
    CollapsibleContentNode,
    CollapsibleTitleNode,
} from '../nodes/CollapsibleNodes';

export const INSERT_COLLAPSIBLE_COMMAND: LexicalCommand<void> = createCommand(
    'INSERT_COLLAPSIBLE_COMMAND',
);

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

        return editor.registerCommand(
            INSERT_COLLAPSIBLE_COMMAND,
            () => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    const title = $createCollapsibleTitleNode();
                    const content = $createCollapsibleContentNode().append(
                        $createParagraphNode(),
                    );
                    const container = $createCollapsibleContainerNode(true).append(
                        title,
                        content,
                    );
                    selection.insertNodes([container]);
                }
                return true;
            },
            COMMAND_PRIORITY_LOW,
        );
    }, [editor]);

    return null;
}
