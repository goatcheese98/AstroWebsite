/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    ∑ EquationNode.ts                                         ║
 * ║                    "The Math Renderer"                                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I render LaTeX math equations using KaTeX. I support both inline and    ║
 * ║     block display modes.                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

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
import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import type { NodeKey as LexicalNodeKey } from 'lexical';

export type EquationType = 'inline' | 'block';

export interface EquationPayload {
    equation: string;
    inline?: boolean;
    key?: NodeKey;
}

export type SerializedEquationNode = Spread<
    {
        equation: string;
        inline: boolean;
        type: 'equation';
        version: 1;
    },
    SerializedLexicalNode
>;

export class EquationNode extends DecoratorNode<JSX.Element> {
    __equation: string;
    __inline: boolean;

    static getType(): string {
        return 'equation';
    }

    static clone(node: EquationNode): EquationNode {
        return new EquationNode(node.__equation, node.__inline, node.__key);
    }

    constructor(equation: string, inline?: boolean, key?: NodeKey) {
        super(key);
        this.__equation = equation;
        this.__inline = inline ?? false;
    }

    static importJSON(serializedNode: SerializedEquationNode): EquationNode {
        const node = $createEquationNode(serializedNode.equation, serializedNode.inline);
        return node;
    }

    exportJSON(): SerializedEquationNode {
        return {
            ...super.exportJSON(),
            equation: this.getEquation(),
            inline: this.__inline,
            type: 'equation',
            version: 1,
        };
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement(this.__inline ? 'span' : 'div');
        element.className = this.__inline ? 'inline-equation' : 'equation';
        return element;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement(this.__inline ? 'span' : 'div');
        element.setAttribute('data-lexical-equation', this.__equation);
        element.setAttribute('data-lexical-inline', String(this.__inline));
        katex.render(this.__equation, element, {
            displayMode: !this.__inline,
            throwOnError: false,
            trust: false,
        });
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            div: (node: Node) => ({
                conversion: $convertEquationElement,
                priority: 1,
            }),
            span: (node: Node) => ({
                conversion: $convertEquationElement,
                priority: 1,
            }),
        };
    }

    updateDOM(_prevNode: EquationNode): boolean {
        return false;
    }

    getEquation(): string {
        return this.__equation;
    }

    setEquation(equation: string): void {
        const writable = this.getWritable();
        writable.__equation = equation;
    }

    getInline(): boolean {
        return this.__inline;
    }

    decorate(): JSX.Element {
        return React.createElement(EquationComponent, {
            equation: this.__equation,
            inline: this.__inline,
            nodeKey: this.__key,
        });
    }
}

function $convertEquationElement(element: HTMLElement): DOMConversionOutput | null {
    const equation = element.getAttribute('data-lexical-equation');
    const inline = element.getAttribute('data-lexical-inline') === 'true';

    if (equation !== null) {
        const node = $createEquationNode(equation, inline);
        return { node };
    }
    return null;
}

export function $createEquationNode(equation: string, inline?: boolean): EquationNode {
    const equationNode = new EquationNode(equation, inline);
    return $applyNodeReplacement(equationNode);
}

export function $isEquationNode(node: LexicalNode | null | undefined): node is EquationNode {
    return node instanceof EquationNode;
}

// React component for rendering

interface EquationComponentProps {
    equation: string;
    inline: boolean;
    nodeKey: NodeKey;
}

function EquationComponent({ equation, inline }: EquationComponentProps): JSX.Element {
    const containerRef = useRef<HTMLSpanElement | HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            katex.render(equation, containerRef.current, {
                displayMode: !inline,
                throwOnError: false,
                trust: false,
            });
        }
    }, [equation, inline]);

    const Tag = inline ? 'span' : 'div';
    return React.createElement(Tag, {
        ref: containerRef,
        className: inline ? 'inline-equation' : 'equation',
        style: inline ? { display: 'inline-block' } : { margin: '1em 0' },
    });
}

export default EquationNode;
