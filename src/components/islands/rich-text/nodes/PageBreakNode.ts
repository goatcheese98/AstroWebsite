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

export type SerializedPageBreakNode = Spread<
    {
        type: 'page-break';
        version: 1;
    },
    SerializedLexicalNode
>;

export class PageBreakNode extends DecoratorNode<null> {
    static getType(): string {
        return 'page-break';
    }

    static clone(node: PageBreakNode): PageBreakNode {
        return new PageBreakNode(node.__key);
    }

    constructor(key?: NodeKey) {
        super(key);
    }

    static importJSON(_serializedNode: SerializedPageBreakNode): PageBreakNode {
        return $createPageBreakNode();
    }

    exportJSON(): SerializedPageBreakNode {
        return {
            ...super.exportJSON(),
            type: 'page-break',
            version: 1,
        };
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement('div');
        element.className = 'editor-page-break';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        element.style.position = 'relative';
        element.style.margin = '16px 0';
        element.style.pointerEvents = 'none';
        element.style.userSelect = 'none';
        element.setAttribute('contenteditable', 'false');

        // Left line
        const leftLine = document.createElement('span');
        leftLine.style.flex = '1';
        leftLine.style.height = '1px';
        leftLine.style.background = 'linear-gradient(to right, transparent, #888)';
        leftLine.style.marginRight = '12px';

        // Label
        const label = document.createElement('span');
        label.textContent = 'Page Break';
        label.style.fontSize = '11px';
        label.style.fontWeight = '500';
        label.style.color = '#888';
        label.style.textTransform = 'uppercase';
        label.style.letterSpacing = '1px';
        label.style.whiteSpace = 'nowrap';

        // Right line
        const rightLine = document.createElement('span');
        rightLine.style.flex = '1';
        rightLine.style.height = '1px';
        rightLine.style.background = 'linear-gradient(to left, transparent, #888)';
        rightLine.style.marginLeft = '12px';

        element.appendChild(leftLine);
        element.appendChild(label);
        element.appendChild(rightLine);

        return element;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('hr');
        element.className = 'page-break';
        element.style.pageBreakAfter = 'always';
        element.style.border = 'none';
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            hr: (node: Node) => {
                const hr = node as HTMLHRElement;
                if (hr.classList.contains('page-break')) {
                    return {
                        conversion: (): DOMConversionOutput => {
                            const node = $createPageBreakNode();
                            return { node };
                        },
                        priority: 1,
                    };
                }
                return null;
            },
        };
    }

    updateDOM(_prevNode: PageBreakNode): boolean {
        return false;
    }

    decorate(): null {
        return null;
    }
}

export function $createPageBreakNode(): PageBreakNode {
    const pageBreakNode = new PageBreakNode();
    return $applyNodeReplacement(pageBreakNode);
}

export function $isPageBreakNode(node: LexicalNode | null | undefined): node is PageBreakNode {
    return node instanceof PageBreakNode;
}

export default PageBreakNode;
