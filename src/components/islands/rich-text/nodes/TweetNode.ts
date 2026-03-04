import type {
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    ElementFormatType,
    LexicalEditor,
    LexicalNode,
    NodeKey,
    Spread,
} from 'lexical';
import type { JSX } from 'react';

import { BlockWithAlignableContents } from '@lexical/react/LexicalBlockWithAlignableContents';
import {
    DecoratorBlockNode,
    type SerializedDecoratorBlockNode,
} from '@lexical/react/LexicalDecoratorBlockNode';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { extractTweetIdFromUrl } from '../utils/embedUrl';

export interface TweetPayload {
    tweetId: string;
    tweetUrl: string;
    key?: NodeKey;
}

export type SerializedTweetNode = Spread<
    {
        id: string;
    },
    SerializedDecoratorBlockNode
>;

const WIDGET_SCRIPT_URL = 'https://platform.twitter.com/widgets.js';

// Global script loading state
let twitterScriptLoaded = false;
let twitterScriptLoading = false;
const tweetCallbacks: Array<() => void> = [];

function loadTwitterScript(): Promise<void> {
    return new Promise((resolve) => {
        if (twitterScriptLoaded) {
            resolve();
            return;
        }

        tweetCallbacks.push(resolve);

        if (twitterScriptLoading) {
            return;
        }

        twitterScriptLoading = true;

        const script = document.createElement('script');
        script.src = WIDGET_SCRIPT_URL;
        script.async = true;
        script.charset = 'utf-8';
        script.onload = () => {
            twitterScriptLoaded = true;
            twitterScriptLoading = false;
            tweetCallbacks.forEach((cb) => cb());
            tweetCallbacks.length = 0;
        };
        script.onerror = () => {
            twitterScriptLoading = false;
            // Resolve anyway to not block rendering
            tweetCallbacks.forEach((cb) => cb());
            tweetCallbacks.length = 0;
        };

        document.body.appendChild(script);
    });
}

interface TweetComponentProps {
    tweetID: string;
    tweetUrl: string;
}

function TweetInnerComponent({ tweetID, tweetUrl }: TweetComponentProps): JSX.Element {
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderedRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const renderTweet = async () => {
            await loadTwitterScript();

            if (!isMounted || !containerRef.current) return;

            // Clear previous content
            containerRef.current.innerHTML = '';

            // Check if twttr is available
            const twttr = (window as unknown as {
                twttr?: {
                    widgets?: {
                        createTweet: (id: string, container: HTMLElement) => Promise<HTMLElement>;
                    };
                };
            }).twttr;

            if (twttr?.widgets?.createTweet) {
                try {
                    await twttr.widgets.createTweet(tweetID, containerRef.current);
                    if (isMounted) {
                        setIsLoaded(true);
                    }
                } catch {
                    if (isMounted) {
                        setLoadError(true);
                    }
                }
            } else {
                if (isMounted) {
                    setLoadError(true);
                }
            }
        };

        if (!renderedRef.current) {
            renderedRef.current = true;
            renderTweet();
        }

        return () => {
            isMounted = false;
        };
    }, [tweetID]);

    return React.createElement('div', {
        style: {
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            minHeight: '100px',
        },
        children: [
            // Twitter widget container
            React.createElement('div', {
                key: 'container',
                ref: containerRef,
                style: { width: '100%' },
            }),
            // Fallback when Twitter widget fails or is loading
            (!isLoaded || loadError) && React.createElement('div', {
                key: 'fallback',
                style: {
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    background: '#f9fafb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                },
                children: [
                    React.createElement('div', {
                        key: 'header',
                        style: { display: 'flex', alignItems: 'center', gap: '8px' },
                        children: [
                            React.createElement('svg', {
                                key: 'icon',
                                width: 20,
                                height: 20,
                                viewBox: '0 0 24 24',
                                fill: '#1da1f2',
                                children: React.createElement('path', {
                                    d: 'M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z',
                                }),
                            }),
                            React.createElement('span', {
                                key: 'label',
                                style: { fontWeight: 600, color: '#111827' },
                                children: 'Tweet',
                            }),
                        ],
                    }),
                    React.createElement('a', {
                        key: 'link',
                        href: tweetUrl,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        style: {
                            color: '#3b82f6',
                            textDecoration: 'none',
                            fontSize: '14px',
                            wordBreak: 'break-all',
                        },
                        children: tweetUrl,
                    }),
                    !isLoaded && !loadError && React.createElement('span', {
                        key: 'loading',
                        style: { fontSize: '12px', color: '#6b7280' },
                        children: 'Loading...',
                    }),
                ],
            }),
        ].filter(Boolean),
    });
}

function TweetComponent({
    className,
    format,
    nodeKey,
    tweetID,
    tweetUrl,
}: Readonly<{
    className: Readonly<{
        base: string;
        focus: string;
    }>;
    format: ElementFormatType | null;
    nodeKey: NodeKey;
    tweetID: string;
    tweetUrl: string;
}>): JSX.Element {
    return React.createElement(BlockWithAlignableContents, {
        className,
        format,
        nodeKey,
        children: React.createElement(TweetInnerComponent, { tweetID, tweetUrl }),
    });
}

function $convertTweetElement(domNode: HTMLElement): DOMConversionOutput | null {
    const tweetID = domNode.getAttribute('data-lexical-tweet-id');
    if (tweetID) {
        const node = $createTweetNode(tweetID);
        return { node };
    }
    return null;
}

export class TweetNode extends DecoratorBlockNode {
    __id: string;

    static getType(): string {
        return 'tweet';
    }

    static clone(node: TweetNode): TweetNode {
        return new TweetNode(node.__id, node.__format, node.__key);
    }

    static importJSON(serializedNode: SerializedTweetNode): TweetNode {
        return $createTweetNode(serializedNode.id).updateFromJSON(serializedNode);
    }

    exportJSON(): SerializedTweetNode {
        return {
            ...super.exportJSON(),
            id: this.__id,
        };
    }

    constructor(id: string, format?: ElementFormatType, key?: NodeKey) {
        super(format, key);
        this.__id = id;
    }

    getId(): string {
        return this.__id;
    }

    getTextContent(
        _includeInert?: boolean | undefined,
        _includeDirectionless?: false | undefined,
    ): string {
        return `https://x.com/i/web/status/${this.__id}`;
    }

    decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
        const embedBlockTheme = (config.theme as Record<string, unknown>)?.embedBlock || {};
        const className = {
            base: (embedBlockTheme as Record<string, string>).base || '',
            focus: (embedBlockTheme as Record<string, string>).focus || '',
        };
        return React.createElement(TweetComponent, {
            className,
            format: this.__format,
            nodeKey: this.getKey(),
            tweetID: this.__id,
            tweetUrl: `https://x.com/i/web/status/${this.__id}`,
        });
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('div');
        element.setAttribute('data-lexical-tweet-id', this.__id);
        const text = document.createTextNode(this.getTextContent());
        element.append(text);
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            div: (domNode: Node) => {
                const element = domNode as HTMLElement;
                if (!element.hasAttribute('data-lexical-tweet-id')) {
                    return null;
                }
                return {
                    conversion: $convertTweetElement,
                    priority: 2,
                };
            },
        };
    }
}

export function $createTweetNode(tweetID: string): TweetNode {
    return new TweetNode(tweetID);
}

export function $isTweetNode(
    node: TweetNode | LexicalNode | null | undefined,
): node is TweetNode {
    return node instanceof TweetNode;
}

// Backward compatibility: maintain old payload interface
export function $createTweetNodeFromPayload(payload: TweetPayload): TweetNode {
    return $createTweetNode(payload.tweetId);
}

// Keep for backward compatibility with existing code
export function extractTweetId(url: string): string | null {
    return extractTweetIdFromUrl(url);
}

export default TweetNode;
