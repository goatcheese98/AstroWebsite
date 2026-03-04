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
import ImageComponent from '../components/ImageComponent';

export interface ImagePayload {
    src: string;
    altText: string;
    width?: number;
    height?: number;
    maxWidth?: number;
    key?: NodeKey;
}

export type SerializedImageNode = Spread<
    {
        src: string;
        altText: string;
        width?: number;
        height?: number;
        maxWidth?: number;
        type: 'image';
        version: 1;
    },
    SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.JSX.Element> {
    __src: string;
    __altText: string;
    __width: number | undefined;
    __height: number | undefined;
    __maxWidth: number;

    static getType(): string {
        return 'image';
    }

    static clone(node: ImageNode): ImageNode {
        return new ImageNode(
            node.__src,
            node.__altText,
            node.__width,
            node.__height,
            node.__maxWidth,
            node.__key
        );
    }

    constructor(
        src: string,
        altText: string,
        width?: number,
        height?: number,
        maxWidth?: number,
        key?: NodeKey
    ) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__width = width;
        this.__height = height;
        this.__maxWidth = maxWidth ?? 800;
    }

    static importJSON(serializedNode: SerializedImageNode): ImageNode {
        const node = $createImageNode({
            src: serializedNode.src,
            altText: serializedNode.altText,
            width: serializedNode.width,
            height: serializedNode.height,
            maxWidth: serializedNode.maxWidth,
        });
        return node;
    }

    exportJSON(): SerializedImageNode {
        return {
            ...super.exportJSON(),
            src: this.__src,
            altText: this.__altText,
            width: this.__width,
            height: this.__height,
            maxWidth: this.__maxWidth,
            type: 'image',
            version: 1,
        };
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement('div');
        element.className = 'editor-image';
        return element;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('img');
        element.setAttribute('src', this.__src);
        element.setAttribute('alt', this.__altText);
        if (this.__width) {
            element.setAttribute('width', String(this.__width));
        }
        if (this.__height) {
            element.setAttribute('height', String(this.__height));
        }
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            img: (node: Node) => ({
                conversion: $convertImageElement,
                priority: 0,
            }),
        };
    }

    updateDOM(_prevNode: ImageNode): boolean {
        return false;
    }

    getSrc(): string {
        return this.__src;
    }

    getAltText(): string {
        return this.__altText;
    }

    getWidth(): number | undefined {
        return this.__width;
    }

    getHeight(): number | undefined {
        return this.__height;
    }

    getMaxWidth(): number {
        return this.__maxWidth;
    }

    setWidth(width: number | undefined): void {
        const writable = this.getWritable();
        writable.__width = width;
    }

    setHeight(height: number | undefined): void {
        const writable = this.getWritable();
        writable.__height = height;
    }

    setSrc(src: string): void {
        const writable = this.getWritable();
        writable.__src = src;
    }

    setAltText(altText: string): void {
        const writable = this.getWritable();
        writable.__altText = altText;
    }

    decorate(): React.JSX.Element {
        return React.createElement(ImageComponent, {
            src: this.__src,
            altText: this.__altText,
            width: this.__width,
            height: this.__height,
            maxWidth: this.__maxWidth,
            nodeKey: this.__key,
        });
    }
}

function $convertImageElement(element: HTMLImageElement): DOMConversionOutput | null {
    const src = element.getAttribute('src');
    const alt = element.getAttribute('alt') ?? '';
    const width = element.getAttribute('width');
    const height = element.getAttribute('height');

    if (src) {
        const node = $createImageNode({
            src,
            altText: alt,
            width: width ? parseInt(width, 10) : undefined,
            height: height ? parseInt(height, 10) : undefined,
        });
        return { node };
    }
    return null;
}

export function $createImageNode(payload: ImagePayload): ImageNode {
    const imageNode = new ImageNode(
        payload.src,
        payload.altText,
        payload.width,
        payload.height,
        payload.maxWidth,
        payload.key
    );
    return $applyNodeReplacement(imageNode);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
    return node instanceof ImageNode;
}

export default ImageNode;
