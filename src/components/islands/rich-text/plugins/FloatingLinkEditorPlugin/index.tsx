import type { JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
    $getSelection,
    $isRangeSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    COMMAND_PRIORITY_HIGH,
    COMMAND_PRIORITY_LOW,
    KEY_ESCAPE_COMMAND,
    SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { getSelectedNode } from '../../utils/getSelectedNode';
import { setFloatingElemPositionForLinkEditor } from '../../utils/setFloatingElemPosition';

function sanitizeUrl(url: string): string {
    /** A pattern that matches safe  URLs. */
    const SAFE_URL_PATTERN =
        /^(?:(?:https?|mailto|ftp|tel|file|sms):|[^#&/:?]*(?:[#/?]|$))/gi;

    /** A pattern that matches safe data URLs. */
    const DATA_URL_PATTERN =
        /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z]+=*$/i;

    url = String(url).trim();

    if (url.match(SAFE_URL_PATTERN) || url.match(DATA_URL_PATTERN)) return url;

    return 'https://' + url;
}

// No need for FloatingContainer since we use createPortal

interface FloatingLinkEditorProps {
    isLinkEditMode: boolean;
    setIsLinkEditMode: (isEditMode: boolean) => void;
    isLink: boolean;
    setIsLink: (isLink: boolean) => void;
    anchorElem: HTMLElement;
    editor: ReturnType<typeof useLexicalComposerContext>[0];
    isDark: boolean;
}

function FloatingLinkEditor({
    isLinkEditMode,
    setIsLinkEditMode,
    isLink,
    setIsLink,
    anchorElem,
    editor,
    isDark,
}: FloatingLinkEditorProps): JSX.Element {
    const editorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [editedLinkUrl, setEditedLinkUrl] = useState('');
    const [lastSelection, setLastSelection] = useState<
        ReturnType<typeof $getSelection>
    >(null);

    const updateLinkEditor = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const linkParent = $findMatchingParent(node, $isLinkNode);

            if (linkParent) {
                setLinkUrl(linkParent.getURL());
            } else if ($isLinkNode(node)) {
                setLinkUrl(node.getURL());
            } else {
                setLinkUrl('');
            }
        }
        const editorElem = editorRef.current;
        const nativeSelection = window.getSelection();
        const activeElement = document.activeElement;

        if (editorElem === null) {
            return;
        }

        const rootElement = editor.getRootElement();

        if (
            selection !== null &&
            nativeSelection !== null &&
            rootElement !== null &&
            rootElement.contains(nativeSelection.anchorNode) &&
            editor.isEditable()
        ) {
            const domRect: DOMRect | undefined =
                nativeSelection.focusNode?.parentElement?.getBoundingClientRect();
            if (domRect) {
                domRect.y += 40;
                setFloatingElemPositionForLinkEditor(domRect, editorElem, anchorElem);
            }
            setLastSelection(selection);
        } else if (!activeElement || activeElement.className !== 'link-input') {
            if (rootElement !== null) {
                setFloatingElemPositionForLinkEditor(null, editorElem, anchorElem);
            }
            setLastSelection(null);
            setIsLinkEditMode(false);
            setLinkUrl('');
        }

        return true;
    }, [anchorElem, editor, setIsLinkEditMode]);

    useEffect(() => {
        const scrollerElem = anchorElem.parentElement;

        const update = () => {
            editor.getEditorState().read(() => {
                updateLinkEditor();
            });
        };

        window.addEventListener('resize', update);

        if (scrollerElem) {
            scrollerElem.addEventListener('scroll', update);
        }

        return () => {
            window.removeEventListener('resize', update);

            if (scrollerElem) {
                scrollerElem.removeEventListener('scroll', update);
            }
        };
    }, [anchorElem.parentElement, editor, updateLinkEditor]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateLinkEditor();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateLinkEditor();
                    return true;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                () => {
                    if (isLink) {
                        setIsLink(false);
                        setIsLinkEditMode(false);
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH,
            ),
        );
    }, [editor, updateLinkEditor, isLink, setIsLink, setIsLinkEditMode]);

    useEffect(() => {
        editor.getEditorState().read(() => {
            updateLinkEditor();
        });
    }, [editor, updateLinkEditor]);

    useEffect(() => {
        if (isLinkEditMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLinkEditMode]);

    const monitorInputInteraction = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleLinkSubmission();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setIsLinkEditMode(false);
        }
    };

    const handleLinkSubmission = () => {
        if (lastSelection !== null) {
            if (linkUrl !== '') {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl(editedLinkUrl));
            }
            setEditedLinkUrl('');
            setIsLinkEditMode(false);
        }
    };

    const handleLinkRemove = () => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        setIsLinkEditMode(false);
        setIsLink(false);
    };

    const handleLinkEdit = () => {
        setEditedLinkUrl(linkUrl);
        setIsLinkEditMode(true);
    };

    const handleLinkConfirm = () => {
        handleLinkSubmission();
    };

    const handleLinkCancel = () => {
        setIsLinkEditMode(false);
    };

    const handleLinkOpen = (
        event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    ) => {
        const isMetaKey = event.metaKey || event.ctrlKey;
        if (isMetaKey) {
            window.open(linkUrl, '_blank');
        }
    };

    return (
        <div
            ref={editorRef}
            className="link-editor"
            style={{
                position: 'absolute',
                top: '0',
                left: '0',
                opacity: '0',
                backgroundColor: isDark ? '#1a1a1a' : '#fff',
                boxShadow: isDark 
                    ? '0 5px 10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
                    : '0 5px 10px rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                transition: 'opacity 0.5s',
                willChange: 'transform',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '300px',
            }}
        >
            {!isLink ? null : isLinkEditMode ? (
                <>
                    <input
                        ref={inputRef}
                        className="link-input"
                        value={editedLinkUrl}
                        onChange={(event) => {
                            setEditedLinkUrl(event.target.value);
                        }}
                        onKeyDown={(event) => {
                            monitorInputInteraction(event);
                        }}
                        style={{
                            border: isDark ? '1px solid #444' : '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            fontSize: '14px',
                            flex: '1',
                            outline: 'none',
                            backgroundColor: isDark ? '#2a2a2a' : '#fff',
                            color: isDark ? '#e5e5e5' : '#1a1a1a',
                        }}
                        placeholder="https://example.com"
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            className="link-confirm"
                            onClick={handleLinkConfirm}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#6366f1',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Confirm"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </button>
                        <button
                            className="link-cancel"
                            onClick={handleLinkCancel}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: isDark ? '#333' : '#f3f4f6',
                                color: isDark ? '#aaa' : '#6b7280',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Cancel"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleLinkOpen}
                        style={
                            {
                                color: '#6366f1',
                                textDecoration: 'none',
                                fontSize: '14px',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            } as React.CSSProperties
                        }
                        title={`${linkUrl} (Cmd/Ctrl + Click to open)`}
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        {linkUrl}
                    </a>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                        <button
                            className="link-edit"
                            onClick={handleLinkEdit}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: isDark ? '#333' : '#f3f4f6',
                                color: isDark ? '#e5e5e5' : '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Edit Link"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </button>
                        <button
                            className="link-trash"
                            onClick={handleLinkRemove}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Remove Link"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function useFloatingLinkEditorToolbar(
    editor: ReturnType<typeof useLexicalComposerContext>[0],
    anchorElem: HTMLElement,
    isDark: boolean,
): JSX.Element | null {
    const [activeEditor, setActiveEditor] = useState(editor);
    const [isLink, setIsLink] = useState(false);
    const [isLinkEditMode, setIsLinkEditMode] = useState(false);

    useEffect(() => {
        function updateToolbar() {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const node = getSelectedNode(selection);
                const linkParent = $findMatchingParent(node, $isLinkNode);
                const isLinkNodeSelected = $isLinkNode(linkParent) || $isLinkNode(node);
                setIsLink(isLinkNodeSelected);
            }
        }
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateToolbar();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                (_payload, newEditor) => {
                    updateToolbar();
                    setActiveEditor(newEditor);
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
            editor.registerCommand(
                CLICK_COMMAND,
                (payload) => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const node = getSelectedNode(selection);
                        const linkNode = $findMatchingParent(node, $isLinkNode);
                        if ($isLinkNode(linkNode)) {
                            // Check if it's a meta/ctrl click to open the link
                            const event = payload as MouseEvent;
                            if (event.metaKey || event.ctrlKey) {
                                window.open(linkNode.getURL(), '_blank');
                                return true;
                            }
                            setIsLink(true);
                            return true;
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [editor]);

    // Only render the link editor when a link is selected or being edited
    if (!isLink && !isLinkEditMode) {
        return null;
    }

    return createPortal(
        <FloatingLinkEditor
            isLinkEditMode={isLinkEditMode}
            setIsLinkEditMode={setIsLinkEditMode}
            isLink={isLink}
            setIsLink={setIsLink}
            anchorElem={anchorElem}
            editor={activeEditor}
            isDark={isDark}
        />,
        anchorElem,
    );
}

interface FloatingLinkEditorPluginProps {
    anchorElem?: HTMLElement;
    isDark?: boolean;
}

export default function FloatingLinkEditorPlugin({
    anchorElem = document.body,
    isDark = false,
}: FloatingLinkEditorPluginProps): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    return useFloatingLinkEditorToolbar(editor, anchorElem, isDark);
}
