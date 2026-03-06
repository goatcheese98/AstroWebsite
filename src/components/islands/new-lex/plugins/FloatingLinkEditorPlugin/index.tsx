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
    const SAFE_URL_PATTERN =
        /^(?:(?:https?|mailto|ftp|tel|file|sms):|[^#&/:?]*(?:[#/?]|$))/gi;
    const DATA_URL_PATTERN =
        /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z]+=*$/i;
    url = String(url).trim();
    if (url.match(SAFE_URL_PATTERN) || url.match(DATA_URL_PATTERN)) return url;
    return 'https://' + url;
}

interface FloatingLinkEditorProps {
    isLinkEditMode: boolean;
    setIsLinkEditMode: (isEditMode: boolean) => void;
    isLink: boolean;
    setIsLink: (isLink: boolean) => void;
    anchorElem: HTMLElement;
    editor: ReturnType<typeof useLexicalComposerContext>[0];
}

function FloatingLinkEditor({
    isLinkEditMode,
    setIsLinkEditMode,
    isLink,
    setIsLink,
    anchorElem,
    editor,
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

        if (editorElem === null) return;

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

    const handleLinkSubmission = () => {
        if (lastSelection !== null) {
            if (linkUrl !== '') {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl(editedLinkUrl));
            }
            setEditedLinkUrl('');
            setIsLinkEditMode(false);
        }
    };

    return (
        <div
            ref={editorRef}
            className="newlex-link-editor"
            style={{
                position: 'absolute',
                top: '0',
                left: '0',
                opacity: '0',
                backgroundColor: '#fff',
                boxShadow: '0 5px 10px rgba(0,0,0,0.3)',
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
                        onChange={(e) => setEditedLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleLinkSubmission(); }
                            else if (e.key === 'Escape') { e.preventDefault(); setIsLinkEditMode(false); }
                        }}
                        style={{
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            fontSize: '14px',
                            flex: '1',
                            outline: 'none',
                        }}
                        placeholder="https://example.com"
                    />
                    <button
                        onClick={handleLinkSubmission}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ padding: '6px 12px', background: '#374151', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                    >
                        ✓
                    </button>
                    <button
                        onClick={() => setIsLinkEditMode(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ padding: '6px 12px', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                    >
                        ✕
                    </button>
                </>
            ) : (
                <>
                    <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { if (e.metaKey || e.ctrlKey) window.open(linkUrl, '_blank'); }}
                        style={{ color: '#374151', textDecoration: 'none', fontSize: '14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={`${linkUrl} (Cmd/Ctrl+Click to open)`}
                    >
                        {linkUrl}
                    </a>
                    <button
                        onClick={() => { setEditedLinkUrl(linkUrl); setIsLinkEditMode(true); }}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ padding: '4px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => { editor.dispatchCommand(TOGGLE_LINK_COMMAND, null); setIsLink(false); }}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Remove
                    </button>
                </>
            )}
        </div>
    );
}

function useFloatingLinkEditorToolbar(
    editor: ReturnType<typeof useLexicalComposerContext>[0],
    anchorElem: HTMLElement,
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
                setIsLink($isLinkNode(linkParent) || $isLinkNode(node));
            }
        }
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => updateToolbar());
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

    if (!isLink && !isLinkEditMode) return null;

    return createPortal(
        <FloatingLinkEditor
            isLinkEditMode={isLinkEditMode}
            setIsLinkEditMode={setIsLinkEditMode}
            isLink={isLink}
            setIsLink={setIsLink}
            anchorElem={anchorElem}
            editor={activeEditor}
        />,
        anchorElem,
    );
}

interface FloatingLinkEditorPluginProps {
    anchorElem?: HTMLElement;
}

export default function FloatingLinkEditorPlugin({
    anchorElem = document.body,
}: FloatingLinkEditorPluginProps): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    return useFloatingLinkEditorToolbar(editor, anchorElem);
}
