import type {
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    LexicalNode,
    NodeKey,
    SerializedLexicalNode,
    Spread,
} from 'lexical';
import { $applyNodeReplacement, DecoratorNode } from 'lexical';
import React from 'react';

export type DateTimeFormat = 'full' | 'short' | 'iso';

export interface DateTimePayload {
    dateTime: Date;
    format?: DateTimeFormat;
    key?: NodeKey;
}

export type SerializedDateTimeNode = Spread<
    {
        dateTime: string;
        format: DateTimeFormat;
        type: 'datetime';
        version: 1;
    },
    SerializedLexicalNode
>;

/**
 * DateTimeNode - A decorator node that displays a formatted date
 * 
 * Supports three formats:
 * - full: "March 3, 2025"
 * - short: "03/03/2025"
 * - iso: "2025-03-03"
 */
export class DateTimeNode extends DecoratorNode<React.JSX.Element> {
    __dateTime: Date;
    __format: DateTimeFormat;

    static getType(): string {
        return 'datetime';
    }

    static clone(node: DateTimeNode): DateTimeNode {
        return new DateTimeNode(
            new Date(node.__dateTime),
            node.__format,
            node.__key
        );
    }

    constructor(dateTime: Date, format: DateTimeFormat = 'full', key?: NodeKey) {
        super(key);
        this.__dateTime = dateTime;
        this.__format = format;
    }

    static importJSON(serializedNode: SerializedDateTimeNode): DateTimeNode {
        const node = $createDateTimeNode({
            dateTime: new Date(serializedNode.dateTime),
            format: serializedNode.format,
        });
        return node;
    }

    exportJSON(): SerializedDateTimeNode {
        return {
            ...super.exportJSON(),
            dateTime: this.__dateTime.toISOString(),
            format: this.__format,
            type: 'datetime',
            version: 1,
        };
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement('span');
        element.className = 'editor-datetime';
        element.style.display = 'inline';
        element.style.fontWeight = '500';
        element.style.color = 'inherit';
        return element;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('span');
        element.className = 'editor-datetime';
        element.textContent = this.getFormattedDate();
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            span: (node: Node) => ({
                conversion: $convertDateTimeElement,
                priority: 1,
            }),
        };
    }

    updateDOM(_prevNode: DateTimeNode): boolean {
        return false;
    }

    getDateTime(): Date {
        return this.__dateTime;
    }

    getFormat(): DateTimeFormat {
        return this.__format;
    }

    getFormattedDate(): string {
        return formatDate(this.__dateTime, this.__format);
    }

    setDateTime(dateTime: Date): void {
        const writable = this.getWritable();
        writable.__dateTime = dateTime;
    }

    setFormat(format: DateTimeFormat): void {
        const writable = this.getWritable();
        writable.__format = format;
    }

    decorate(): React.JSX.Element {
        return React.createElement(DateTimeComponent, {
            dateTime: this.__dateTime,
            format: this.__format,
            nodeKey: this.__key,
        });
    }
}

/**
 * Format a date according to the specified format
 */
export function formatDate(date: Date, format: DateTimeFormat): string {
    switch (format) {
        case 'full':
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        case 'short':
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        case 'iso':
            return date.toISOString().split('T')[0];
        default:
            return date.toLocaleDateString();
    }
}

function $convertDateTimeElement(element: HTMLElement): DOMConversionOutput | null {
    const text = element.textContent;
    if (text && element.className === 'editor-datetime') {
        // Try to parse the date from the text content
        const date = new Date(text);
        if (!isNaN(date.getTime())) {
            const node = $createDateTimeNode({ dateTime: date });
            return { node };
        }
    }
    return null;
}

export function $createDateTimeNode(payload: DateTimePayload): DateTimeNode {
    const dateTimeNode = new DateTimeNode(
        payload.dateTime,
        payload.format ?? 'full',
        payload.key
    );
    return $applyNodeReplacement(dateTimeNode);
}

export function $isDateTimeNode(node: LexicalNode | null | undefined): node is DateTimeNode {
    return node instanceof DateTimeNode;
}

// React component for rendering

interface DateTimeComponentProps {
    dateTime: Date;
    format: DateTimeFormat;
    nodeKey: NodeKey;
}

function DateTimeComponent({ dateTime, format }: DateTimeComponentProps): React.JSX.Element {
    const formattedDate = formatDate(dateTime, format);

    return React.createElement('span', {
        className: 'editor-datetime',
        style: {
            display: 'inline',
            fontWeight: 500,
            color: 'inherit',
            userSelect: 'none',
        },
        children: formattedDate,
    });
}

export default DateTimeNode;
