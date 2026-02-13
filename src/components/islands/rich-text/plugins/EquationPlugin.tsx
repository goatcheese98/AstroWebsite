/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    ∑ EquationPlugin.tsx                                      ║
 * ║                    "The Math Command"                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I handle the insertion of math equations into the editor.               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from 'lexical';
import { useEffect } from 'react';
import { $createEquationNode, EquationNode } from '../nodes/EquationNode';
import type { LexicalCommand } from 'lexical';
import { createCommand } from 'lexical';

export const INSERT_EQUATION_COMMAND: LexicalCommand<{
    equation: string;
    inline: boolean;
}> = createCommand('INSERT_EQUATION_COMMAND');

export default function EquationPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([EquationNode])) {
            throw new Error('EquationPlugin: EquationNode not registered on editor');
        }

        return editor.registerCommand(
            INSERT_EQUATION_COMMAND,
            (payload) => {
                const selection = $getSelection();

                if ($isRangeSelection(selection)) {
                    const equationNode = $createEquationNode(payload.equation, payload.inline);
                    selection.insertNodes([equationNode]);
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}
