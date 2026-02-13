/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    🛠️ Toolbar.tsx                                            ║
 * ║                    "The Formatting Command Center"                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I provide all the formatting controls for the Lexical editor. I handle  ║
 * ║     text styling, lists, headings, links, tables, and more.                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * @module rich-text/components
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    UNDO_COMMAND,
} from 'lexical';
import {
    $isListNode,
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
} from '@lexical/list';
import {
    $isHeadingNode,
    type HeadingTagType,
} from '@lexical/rich-text';
import {
    $createCodeNode,
    $isCodeNode,
    CODE_LANGUAGE_FRIENDLY_NAME_MAP,
    CODE_LANGUAGE_MAP,
    getLanguageFriendlyName,
} from '@lexical/code';
import {
    $createLinkNode,
    $isLinkNode,
    TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import {
    $getSelectionStyleValueForProperty,
    $patchStyleText,
    $setBlocksType,
} from '@lexical/selection';
import {
    $createParagraphNode,
    $getNodeByKey,
    $isParagraphNode,
} from 'lexical';
import { $findMatchingParent } from '@lexical/utils';
import { INSERT_CHECK_LIST_COMMAND } from '@lexical/list';
import {
    INSERT_TABLE_COMMAND,
} from '@lexical/table';

// Block type options
const BLOCK_TYPES: { label: string; value: string; icon: string }[] = [
    { label: 'Normal', value: 'paragraph', icon: '¶' },
    { label: 'Heading 1', value: 'h1', icon: 'H1' },
    { label: 'Heading 2', value: 'h2', icon: 'H2' },
    { label: 'Heading 3', value: 'h3', icon: 'H3' },
    { label: 'Bullet List', value: 'bullet', icon: '•' },
    { label: 'Numbered List', value: 'number', icon: '1.' },
    { label: 'Check List', value: 'check', icon: '☐' },
    { label: 'Quote', value: 'quote', icon: '"' },
    { label: 'Code Block', value: 'code', icon: '</>' },
];

interface ToolbarProps {
    isDark: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ isDark }) => {
    const [editor] = useLexicalComposerContext();

    // Format states
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [isLink, setIsLink] = useState(false);

    // Block type
    const [blockType, setBlockType] = useState('paragraph');

    // History
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Alignment
    const [isRTL, setIsRTL] = useState(false);

    // Font size & color
    const [fontSize, setFontSize] = useState<string>('15px');
    const [fontColor, setFontColor] = useState<string>('#000000');
    const [bgColor, setBgColor] = useState<string>('#ffffff');

    // Link dialog
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    // Table dialog
    const [showTableDialog, setShowTableDialog] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

    // Update toolbar state based on selection
    const updateToolbar = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
                // Text formatting
                setIsBold(selection.hasFormat('bold'));
                setIsItalic(selection.hasFormat('italic'));
                setIsUnderline(selection.hasFormat('underline'));
                setIsStrikethrough(selection.hasFormat('strikethrough'));
                setIsCode(selection.hasFormat('code'));

                // Link
                const node = getSelectedNode(selection);
                const parent = node.getParent();
                setIsLink($isLinkNode(parent) || $isLinkNode(node));

                // Block type
                const anchorNode = selection.anchor.getNode();
                let element =
                    anchorNode.getKey() === 'root'
                        ? anchorNode
                        : $findMatchingParent(anchorNode, (e) => {
                            const parent = e.getParent();
                            return parent !== null && $isParagraphNode(parent);
                        });

                if (element === null) {
                    element = anchorNode.getTopLevelElementOrThrow();
                }

                const elementKey = element.getKey();
                const elementDOM = editor.getElementByKey(elementKey);

                if (elementDOM !== null) {
                    if ($isListNode(element)) {
                        const listType = element.getListType();
                        setBlockType(listType === 'check' ? 'check' : listType === 'number' ? 'number' : 'bullet');
                    } else {
                        const type = $isHeadingNode(element)
                            ? element.getTag()
                            : $isParagraphNode(element)
                                ? 'paragraph'
                                : $isCodeNode(element)
                                    ? 'code'
                                    : 'paragraph';
                        setBlockType(type);
                    }
                }

                // Font size
                setFontSize(
                    $getSelectionStyleValueForProperty(selection, 'font-size', '15px')
                );

                // Colors
                setFontColor(
                    $getSelectionStyleValueForProperty(selection, 'color', '#000000')
                );
                setBgColor(
                    $getSelectionStyleValueForProperty(selection, 'background-color', '#ffffff')
                );
            }
        });
    }, [editor]);

    // Listen for selection changes
    useEffect(() => {
        return editor.registerUpdateListener(() => {
            updateToolbar();
        });
    }, [editor, updateToolbar]);

    // Listen for selection change command
    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                updateToolbar();
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor, updateToolbar]);

    // Undo/redo state
    useEffect(() => {
        return editor.registerCommand(
            CAN_UNDO_COMMAND,
            (payload) => {
                setCanUndo(payload);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor]);

    useEffect(() => {
        return editor.registerCommand(
            CAN_REDO_COMMAND,
            (payload) => {
                setCanRedo(payload);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor]);

    // Format handlers
    const toggleBold = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
    };

    const toggleItalic = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
    };

    const toggleUnderline = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
    };

    const toggleStrikethrough = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
    };

    const toggleCode = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
    };

    // Block type handlers
    const formatBlock = (type: string) => {
        if (type === 'bullet') {
            if (blockType !== 'bullet') {
                editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            } else {
                editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            }
        } else if (type === 'number') {
            if (blockType !== 'number') {
                editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            } else {
                editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            }
        } else if (type === 'check') {
            if (blockType !== 'check') {
                editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
            } else {
                editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            }
        } else if (type === 'quote') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => {
                        const { $createQuoteNode } = require('@lexical/rich-text');
                        return $createQuoteNode();
                    });
                }
            });
        } else if (type === 'code') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    if (selection.isCollapsed()) {
                        $setBlocksType(selection, () => $createCodeNode());
                    } else {
                        const textContent = selection.getTextContent();
                        const codeNode = $createCodeNode();
                        selection.insertNodes([codeNode]);
                        selection.insertRawText(textContent);
                    }
                }
            });
        } else if (type === 'paragraph') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createParagraphNode());
                }
            });
        } else if (type.startsWith('h')) {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    const { $createHeadingNode } = require('@lexical/rich-text');
                    $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
                }
            });
        }
    };

    // Link handlers
    const insertLink = () => {
        if (!isLink) {
            setShowLinkDialog(true);
            editor.getRootElement()?.focus();
        } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    };

    const confirmLink = () => {
        if (linkUrl) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
        }
        setShowLinkDialog(false);
        setLinkUrl('');
    };

    // Table handlers
    const insertTable = () => {
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: String(tableCols),
            rows: String(tableRows),
            includeHeaders: true,
        });
        setShowTableDialog(false);
    };

    // Alignment handlers
    const alignLeft = () => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
    };

    const alignCenter = () => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
    };

    const alignRight = () => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
    };

    const alignJustify = () => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
    };

    // Color handlers
    const applyFontColor = (color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { color });
            }
        });
    };

    const applyBgColor = (color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { 'background-color': color });
            }
        });
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '8px 12px',
        background: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        alignItems: 'center',
        minHeight: '44px',
    };

    const buttonStyle = (active: boolean, disabled = false): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        padding: '6px',
        border: 'none',
        borderRadius: '6px',
        background: active
            ? isDark
                ? 'rgba(99, 102, 241, 0.3)'
                : 'rgba(99, 102, 241, 0.15)'
            : 'transparent',
        color: active
            ? isDark
                ? '#a5b4fc'
                : '#6366f1'
            : isDark
                ? '#d1d5db'
                : '#4b5563',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s ease',
        fontSize: '14px',
        fontWeight: 500,
    });

    const dividerStyle: React.CSSProperties = {
        width: '1px',
        height: '24px',
        background: isDark ? '#374151' : '#e5e7eb',
        margin: '0 4px',
    };

    const selectStyle: React.CSSProperties = {
        padding: '4px 8px',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        borderRadius: '6px',
        background: isDark ? '#1f2937' : '#ffffff',
        color: isDark ? '#d1d5db' : '#374151',
        fontSize: '13px',
        cursor: 'pointer',
        outline: 'none',
    };

    return (
        <div style={toolbarStyle}>
            {/* History */}
            <button
                onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                disabled={!canUndo}
                style={buttonStyle(false, !canUndo)}
                title="Undo"
            >
                <UndoIcon />
            </button>
            <button
                onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                disabled={!canRedo}
                style={buttonStyle(false, !canRedo)}
                title="Redo"
            >
                <RedoIcon />
            </button>

            <div style={dividerStyle} />

            {/* Block Type */}
            <select
                value={blockType}
                onChange={(e) => formatBlock(e.target.value)}
                style={selectStyle}
                title="Block Type"
            >
                {BLOCK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                        {type.label}
                    </option>
                ))}
            </select>

            <div style={dividerStyle} />

            {/* Text Formatting */}
            <button
                onClick={toggleBold}
                style={buttonStyle(isBold)}
                title="Bold (Ctrl+B)"
            >
                <BoldIcon />
            </button>
            <button
                onClick={toggleItalic}
                style={buttonStyle(isItalic)}
                title="Italic (Ctrl+I)"
            >
                <ItalicIcon />
            </button>
            <button
                onClick={toggleUnderline}
                style={buttonStyle(isUnderline)}
                title="Underline (Ctrl+U)"
            >
                <UnderlineIcon />
            </button>
            <button
                onClick={toggleStrikethrough}
                style={buttonStyle(isStrikethrough)}
                title="Strikethrough"
            >
                <StrikethroughIcon />
            </button>
            <button
                onClick={toggleCode}
                style={buttonStyle(isCode)}
                title="Inline Code"
            >
                <CodeIcon />
            </button>

            <div style={dividerStyle} />

            {/* Link */}
            <button
                onClick={insertLink}
                style={buttonStyle(isLink)}
                title="Insert Link"
            >
                <LinkIcon />
            </button>

            {/* Table */}
            <button
                onClick={() => setShowTableDialog(true)}
                style={buttonStyle(false)}
                title="Insert Table"
            >
                <TableIcon />
            </button>

            <div style={dividerStyle} />

            {/* Alignment */}
            <button onClick={alignLeft} style={buttonStyle(false)} title="Align Left">
                <AlignLeftIcon />
            </button>
            <button onClick={alignCenter} style={buttonStyle(false)} title="Align Center">
                <AlignCenterIcon />
            </button>
            <button onClick={alignRight} style={buttonStyle(false)} title="Align Right">
                <AlignRightIcon />
            </button>

            {/* Link Dialog */}
            {showLinkDialog && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: isDark ? '#1f2937' : '#ffffff',
                        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        display: 'flex',
                        gap: '8px',
                    }}
                >
                    <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        style={{
                            padding: '6px 10px',
                            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                            borderRadius: '6px',
                            background: isDark ? '#111827' : '#ffffff',
                            color: isDark ? '#d1d5db' : '#374151',
                            fontSize: '13px',
                            width: '200px',
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && confirmLink()}
                    />
                    <button
                        onClick={confirmLink}
                        style={{
                            padding: '6px 12px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        Add
                    </button>
                    <button
                        onClick={() => setShowLinkDialog(false)}
                        style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            color: isDark ? '#9ca3af' : '#6b7280',
                            border: 'none',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Table Dialog */}
            {showTableDialog && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: isDark ? '#1f2937' : '#ffffff',
                        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                    }}
                >
                    <div style={{ marginBottom: '12px', fontWeight: 600 }}>Insert Table</div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Rows</span>
                            <input
                                type="number"
                                value={tableRows}
                                onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                                min={1}
                                max={10}
                                style={{
                                    width: '60px',
                                    padding: '6px',
                                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                                    borderRadius: '6px',
                                    background: isDark ? '#111827' : '#ffffff',
                                    color: isDark ? '#d1d5db' : '#374151',
                                }}
                            />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Columns</span>
                            <input
                                type="number"
                                value={tableCols}
                                onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                                min={1}
                                max={10}
                                style={{
                                    width: '60px',
                                    padding: '6px',
                                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                                    borderRadius: '6px',
                                    background: isDark ? '#111827' : '#ffffff',
                                    color: isDark ? '#d1d5db' : '#374151',
                                }}
                            />
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowTableDialog(false)}
                            style={{
                                padding: '6px 12px',
                                background: 'transparent',
                                color: isDark ? '#9ca3af' : '#6b7280',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={insertTable}
                            style={{
                                padding: '6px 12px',
                                background: '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            Insert
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to get selected node
function getSelectedNode(selection: any) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    if (anchorNode === focusNode) {
        return anchorNode;
    }
    const isBackward = selection.isBackward();
    if (isBackward) {
        return $isAtNodeEnd(focus) ? anchorNode : focusNode;
    } else {
        return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
    }
}

function $isAtNodeEnd(selection: any) {
    return selection.offset === selection.getNode().getTextContentSize();
}

// Icon Components
const BoldIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
);

const ItalicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="4" x2="10" y2="4" />
        <line x1="14" y1="20" x2="5" y2="20" />
        <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
);

const UnderlineIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
        <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
);

const StrikethroughIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.3 19c.77-1.2 1.1-2.6 1-4" />
        <path d="M5.7 19c-.77-1.2-1.1-2.6-1-4" />
        <path d="M19 11.77A6 6 0 0 0 12 6a6 6 0 0 0-7 5.77" />
        <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
);

const CodeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
);

const LinkIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

const TableIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
);

const UndoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
);

const RedoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
);

const AlignLeftIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="17" y1="10" x2="3" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="17" y1="18" x2="3" y2="18" />
    </svg>
);

const AlignCenterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="21" y1="10" x2="3" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="21" y1="18" x2="3" y2="18" />
    </svg>
);

const AlignRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="21" y1="10" x2="7" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="21" y1="18" x2="7" y2="18" />
    </svg>
);
