/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    ▶ CollapsibleNodes.ts                                     ║
 * ║                    "The Accordion System"                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I provide collapsible accordion sections with a title and content.      ║
 * ║     Users can expand/collapse to show/hide content.                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    ElementFormatType,
    LexicalEditor,
    LexicalNode,
    NodeKey,
    SerializedElementNode,
    Spread,
} from 'lexical';
import {
    $applyNodeReplacement,
    $createParagraphNode,
    $getChildCaret,
    $getNodeByKey,
    $isElementNode,
    $isParagraphNode,
    ElementNode,
    IS_BOLD,
} from 'lexical';
import { $findMatchingParent } from '@lexical/utils';

export type SerializedCollapsibleContainerNode = Spread<
    {
        open: boolean;
        type: 'collapsible-container';
        version: 1;
    },
    SerializedElementNode
>;

export class CollapsibleContainerNode extends ElementNode {
    __open: boolean;

    constructor(open: boolean = true, key?: NodeKey) {
        super(key);
        this.__open = open;
    }

    static getType(): string {
        return 'collapsible-container';
    }

    static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
        return new CollapsibleContainerNode(node.__open, node.__key);
    }

    createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
        const dom = document.createElement('details');
        dom.classList.add('Collapsible__container');
        dom.open = this.__open;
        dom.addEventListener('toggle', () => {
            const open = dom.open;
            editor.update(() => {
                const node = $getNodeByKey(this.getKey());
                if ($isCollapsibleContainerNode(node)) {
                    node.setOpen(open);
                }
            });
        });
        return dom;
    }

    updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLDetailsElement): boolean {
        if (prevNode.__open !== this.__open) {
            dom.open = this.__open;
        }
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            details: (domNode: HTMLElement) => {
                return {
                    conversion: $convertCollapsibleContainerElement,
                    priority: 1,
                };
            },
        };
    }

    static importJSON(serializedNode: SerializedCollapsibleContainerNode): CollapsibleContainerNode {
        const node = $createCollapsibleContainerNode(serializedNode.open);
        return node;
    }

    exportJSON(): SerializedCollapsibleContainerNode {
        return {
            ...super.exportJSON(),
            open: this.__open,
            type: 'collapsible-container',
            version: 1,
        };
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('details');
        element.classList.add('Collapsible__container');
        element.setAttribute('open', String(this.__open));
        return { element };
    }

    setOpen(open: boolean): void {
        const writable = this.getWritable();
        writable.__open = open;
    }

    getOpen(): boolean {
        return this.__open;
    }

    insertNewAfter(_: LexicalEditor, restoreSelection?: boolean): ElementNode {
        const newBlock = $createParagraphNode();
        const direction = this.getDirection();
        newBlock.setDirection(direction);
        this.insertAfter(newBlock, restoreSelection);
        return newBlock;
    }

    collapseAtStart(_: LexicalEditor): true {
        this.insertNewAfter(_, false);
        return true;
    }
}

export type SerializedCollapsibleTitleNode = Spread<
    {
        type: 'collapsible-title';
        version: 1;
    },
    SerializedElementNode
>;

export class CollapsibleTitleNode extends ElementNode {
    static getType(): string {
        return 'collapsible-title';
    }

    static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
        return new CollapsibleTitleNode(node.__key);
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const dom = document.createElement('summary');
        dom.classList.add('Collapsible__title');
        return dom;
    }

    updateDOM(): boolean {
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            summary: (domNode: HTMLElement) => {
                return {
                    conversion: $convertCollapsibleTitleElement,
                    priority: 1,
                };
            },
        };
    }

    static importJSON(serializedNode: SerializedCollapsibleTitleNode): CollapsibleTitleNode {
        return $createCollapsibleTitleNode();
    }

    exportJSON(): SerializedCollapsibleTitleNode {
        return {
            ...super.exportJSON(),
            type: 'collapsible-title',
            version: 1,
        };
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('summary');
        element.classList.add('Collapsible__title');
        return { element };
    }

    insertNewAfter(_: LexicalEditor, restoreSelection?: boolean): ElementNode {
        const containerNode = this.getParentOrThrow();
        if (!$isCollapsibleContainerNode(containerNode)) {
            throw new Error('CollapsibleTitleNode expects to be child of CollapsibleContainerNode');
        }
        
        if (containerNode.getOpen()) {
            const contentNode = containerNode.getChildAtIndex<CollapsibleContentNode>(1);
            if ($isCollapsibleContentNode(contentNode)) {
                const firstChild = contentNode.getFirstChild();
                if ($isElementNode(firstChild)) {
                    return firstChild;
                } else {
                    const paragraphNode = $createParagraphNode();
                    contentNode.append(paragraphNode);
                    return paragraphNode;
                }
            }
        }
        
        const paragraphNode = $createParagraphNode();
        containerNode.insertAfter(paragraphNode, restoreSelection);
        return paragraphNode;
    }

    collapseAtStart(_: LexicalEditor): true {
        this.getParentOrThrow().insertNewAfter(_, false);
        return true;
    }
}

export type SerializedCollapsibleContentNode = Spread<
    {
        type: 'collapsible-content';
        version: 1;
    },
    SerializedElementNode
>;

export class CollapsibleContentNode extends ElementNode {
    static getType(): string {
        return 'collapsible-content';
    }

    static clone(node: CollapsibleContentNode): CollapsibleContentNode {
        return new CollapsibleContentNode(node.__key);
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const dom = document.createElement('div');
        dom.classList.add('Collapsible__content');
        return dom;
    }

    updateDOM(): boolean {
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return null;
    }

    static importJSON(serializedNode: SerializedCollapsibleContentNode): CollapsibleContentNode {
        return $createCollapsibleContentNode();
    }

    exportJSON(): SerializedCollapsibleContentNode {
        return {
            ...super.exportJSON(),
            type: 'collapsible-content',
            version: 1,
        };
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('div');
        element.classList.add('Collapsible__content');
        return { element };
    }

    isShadowRoot(): boolean {
        return true;
    }
}

// Helper functions

function $convertCollapsibleContainerElement(domNode: HTMLElement): DOMConversionOutput | null {
    const isOpen = domNode.open ?? true;
    const node = $createCollapsibleContainerNode(isOpen);
    return { node };
}

function $convertCollapsibleTitleElement(domNode: HTMLElement): DOMConversionOutput | null {
    const node = $createCollapsibleTitleNode();
    return { node };
}

export function $createCollapsibleContainerNode(open: boolean = true): CollapsibleContainerNode {
    return $applyNodeReplacement(new CollapsibleContainerNode(open));
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
    return $applyNodeReplacement(new CollapsibleTitleNode());
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
    return $applyNodeReplacement(new CollapsibleContentNode());
}

export function $isCollapsibleContainerNode(node: LexicalNode | null | undefined): node is CollapsibleContainerNode {
    return node instanceof CollapsibleContainerNode;
}

export function $isCollapsibleTitleNode(node: LexicalNode | null | undefined): node is CollapsibleTitleNode {
    return node instanceof CollapsibleTitleNode;
}

export function $isCollapsibleContentNode(node: LexicalNode | null | undefined): node is CollapsibleContentNode {
    return node instanceof CollapsibleContentNode;
}

export function $findCollapsibleContainerNode(node: LexicalNode | null): CollapsibleContainerNode | null {
    return $findMatchingParent(node, $isCollapsibleContainerNode) as CollapsibleContainerNode | null;
}
