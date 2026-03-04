import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from 'lexical';
import { useEffect } from 'react';
import { $createDateTimeNode, DateTimeNode, type DateTimeFormat } from '../nodes/DateTimeNode';
import type { LexicalCommand } from 'lexical';
import { createCommand } from 'lexical';

export interface InsertDateTimePayload {
    dateTime: Date;
    format?: DateTimeFormat;
}

export const INSERT_DATETIME_COMMAND: LexicalCommand<InsertDateTimePayload> = createCommand(
    'INSERT_DATETIME_COMMAND'
);

/**
 * DateTimePlugin - Registers the INSERT_DATETIME_COMMAND
 * 
 * Usage:
 * editor.dispatchCommand(INSERT_DATETIME_COMMAND, { dateTime: new Date(), format: 'full' });
 */
export default function DateTimePlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([DateTimeNode])) {
            throw new Error('DateTimePlugin: DateTimeNode not registered on editor');
        }

        return editor.registerCommand(
            INSERT_DATETIME_COMMAND,
            (payload) => {
                const selection = $getSelection();

                if ($isRangeSelection(selection)) {
                    const dateTimeNode = $createDateTimeNode({
                        dateTime: payload.dateTime,
                        format: payload.format ?? 'full',
                    });
                    selection.insertNodes([dateTimeNode]);
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}
