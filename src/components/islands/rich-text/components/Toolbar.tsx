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
    $createHeadingNode,
    $createQuoteNode,
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

// Custom commands
import { INSERT_EQUATION_COMMAND } from '../plugins/EquationPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from '../plugins/CollapsiblePlugin';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';

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

const FONT_FAMILIES = [
    { label: 'Sans Serif', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Mono', value: 'SF Mono, Menlo, monospace' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Playfair', value: 'Playfair Display, serif' },
];

const FONT_SIZES = ['12px', '14px', '15px', '16px', '18px', '20px', '24px', '32px'];

interface ToolbarProps {
    isDark: boolean;
    backgroundOpacity?: number;
    onBackgroundOpacityChange?: (opacity: number) => void;
    blurAmount?: number;
    onBlurAmountChange?: (blur: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ isDark, backgroundOpacity = 1, onBackgroundOpacityChange, blurAmount = 5, onBlurAmountChange }) => {
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

    // Font family, size & color
    const [fontFamily, setFontFamily] = useState<string>('system-ui, -apple-system, sans-serif');
    const [fontSize, setFontSize] = useState<string>('15px');
    const [fontColor, setFontColor] = useState<string>('#000000');
    const [bgColor, setBgColor] = useState<string>('#ffffff');

    // Dialog states
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showTableDialog, setShowTableDialog] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const [showEquationDialog, setShowEquationDialog] = useState(false);
    const [equation, setEquation] = useState('x^2 + y^2 = r^2');

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

                // Font family & size
                setFontFamily(
                    $getSelectionStyleValueForProperty(selection, 'font-family', 'system-ui, -apple-system, sans-serif')
                );
                setFontSize(
                    $getSelectionStyleValueForProperty(selection, 'font-size', '15px')
                );

                // Colors
                setFontColor(
                    $getSelectionStyleValueForProperty(selection, 'color', isDark ? '#e5e5e5' : '#000000')
                );
                setBgColor(
                    $getSelectionStyleValueForProperty(selection, 'background-color', isDark ? '#1a1a1a' : '#ffffff')
                );
            }
        });
    }, [editor, isDark]);

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
        const unregisterUndo = editor.registerCommand(
            CAN_UNDO_COMMAND,
            (payload) => {
                setCanUndo(payload);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
        const unregisterRedo = editor.registerCommand(
            CAN_REDO_COMMAND,
            (payload) => {
                setCanRedo(payload);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
        return () => {
            unregisterUndo();
            unregisterRedo();
        };
    }, [editor]);

    // Format handlers
    const toggleBold = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
    const toggleItalic = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
    const toggleUnderline = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
    const toggleStrikethrough = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
    const toggleCode = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');

    // Block type handlers
    const formatBlock = (type: string) => {
        if (type === 'bullet') {
            editor.dispatchCommand(blockType !== 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : REMOVE_LIST_COMMAND, undefined);
        } else if (type === 'number') {
            editor.dispatchCommand(blockType !== 'number' ? INSERT_ORDERED_LIST_COMMAND : REMOVE_LIST_COMMAND, undefined);
        } else if (type === 'check') {
            editor.dispatchCommand(blockType !== 'check' ? INSERT_CHECK_LIST_COMMAND : REMOVE_LIST_COMMAND, undefined);
        } else if (type === 'quote') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            });
        } else if (type === 'code') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createCodeNode());
                }
            });
        } else if (type === 'paragraph') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createParagraphNode());
            });
        } else if (type.startsWith('h')) {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
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
        if (linkUrl) editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
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

    // Align handlers
    const setAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
    };

    // Style handlers
    const onFontFamilySelect = (value: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { 'font-family': value });
            }
        });
    };

    const onFontSizeSelect = (value: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { 'font-size': value });
            }
        });
    };

    const applyFontColor = (color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) $patchStyleText(selection, { color });
        });
    };

    const applyBgColor = (color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) $patchStyleText(selection, { 'background-color': color });
        });
    };

    // Custom features
    const insertEquation = () => {
        editor.dispatchCommand(INSERT_EQUATION_COMMAND, { equation, inline: false });
        setShowEquationDialog(false);
    };

    const insertCollapsible = () => {
        editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
    };

    const insertHorizontalRule = () => {
        editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px',
        padding: '6px 10px',
        background: isDark ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: `blur(${blurAmount}px)`,
        WebkitBackdropFilter: `blur(${blurAmount}px)`,
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        alignItems: 'center',
        minHeight: '40px',
        position: 'sticky',
        top: '8px',
        margin: '8px auto',
        width: 'calc(100% - 16px)',
        borderRadius: '10px',
        zIndex: 10,
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.05)',
    };

    const buttonStyle = (active: boolean, disabled = false): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        border: 'none',
        borderRadius: '4px',
        background: active
            ? isDark ? '#333' : '#f0f0f0'
            : 'transparent',
        color: active
            ? '#6366f1'
            : isDark ? '#aaa' : '#555',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.1s ease',
        fontSize: '14px',
        margin: '0 1px',
    });

    const dividerStyle: React.CSSProperties = {
        width: '1px',
        height: '20px',
        background: isDark ? '#333' : '#eee',
        margin: '0 6px',
    };

    const selectStyle: React.CSSProperties = {
        padding: '2px 6px',
        border: `1px solid ${isDark ? '#333' : '#eee'}`,
        borderRadius: '4px',
        background: isDark ? '#111' : '#fdfdfd',
        color: isDark ? '#ccc' : '#444',
        fontSize: '12px',
        cursor: 'pointer',
        outline: 'none',
        height: '28px',
    };

    const colorPickerStyle = (color: string): React.CSSProperties => ({
        width: '20px',
        height: '20px',
        borderRadius: '3px',
        background: color,
        border: `1px solid ${isDark ? '#444' : '#ddd'}`,
        cursor: 'pointer',
    });

    return (
        <div style={toolbarStyle} className="lexical-toolbar">
            {/* History */}
            <div style={{ display: 'flex' }}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo} style={buttonStyle(false, !canUndo)} title="Undo">
                    <UndoIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo} style={buttonStyle(false, !canRedo)} title="Redo">
                    <RedoIcon />
                </button>
            </div>

            <div style={dividerStyle} />

            {/* Typography */}
            <select value={fontFamily} onChange={(e) => onFontFamilySelect(e.target.value)} style={{ ...selectStyle, width: '100px' }} title="Font Family">
                {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <select value={fontSize} onChange={(e) => onFontSizeSelect(e.target.value)} style={{ ...selectStyle, width: '60px', marginLeft: '4px' }} title="Font Size">
                {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <div style={dividerStyle} />

            {/* Block Type */}
            <select value={blockType} onChange={(e) => formatBlock(e.target.value)} style={{ ...selectStyle, width: '110px' }} title="Block Type">
                {BLOCK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                        {type.label}
                    </option>
                ))}
            </select>

            <div style={dividerStyle} />

            {/* Text Formatting */}
            <div style={{ display: 'flex' }}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={toggleBold} style={buttonStyle(isBold)} title="Bold">
                    <BoldIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={toggleItalic} style={buttonStyle(isItalic)} title="Italic">
                    <ItalicIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={toggleUnderline} style={buttonStyle(isUnderline)} title="Underline">
                    <UnderlineIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={toggleStrikethrough} style={buttonStyle(isStrikethrough)} title="Strikethrough">
                    <StrikethroughIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={toggleCode} style={buttonStyle(isCode)} title="Inline Code">
                    <CodeIcon />
                </button>
            </div>

            <div style={dividerStyle} />

            {/* Colors */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '4px' }}>
                <div title="Text Color" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: isDark ? '#aaa' : '#666' }}>A</div>
                    <input
                        type="color"
                        value={fontColor.startsWith('#') ? fontColor : (isDark ? '#e5e5e5' : '#000000')}
                        onChange={(e) => applyFontColor(e.target.value)}
                        style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                </div>
                <div title="Highlight Color" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '12px', background: '#ff0', color: '#000', padding: '0 2px', borderRadius: '2px' }}>H</div>
                    <input
                        type="color"
                        value={bgColor.startsWith('#') ? bgColor : (isDark ? '#1a1a1a' : '#ffffff')}
                        onChange={(e) => applyBgColor(e.target.value)}
                        style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                </div>

                <div style={dividerStyle} />

                <div title="Note Transparency" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                    <div style={{ fontSize: '12px', color: isDark ? '#818cf8' : '#6366f1', display: 'flex' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={backgroundOpacity}
                        onChange={(e) => onBackgroundOpacityChange?.(parseFloat(e.target.value))}
                        style={{
                            width: '80px',
                            height: '4px',
                            cursor: 'pointer',
                            accentColor: '#6366f1',
                            WebkitAppearance: 'none',
                            background: isDark ? '#333' : '#eee',
                            borderRadius: '2px',
                            outline: 'none'
                        }}
                    />
                    <div style={{ fontSize: '11px', fontWeight: '500', color: isDark ? '#888' : '#666', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {Math.floor(backgroundOpacity * 100)}%
                    </div>
                </div>

                <div style={dividerStyle} />

                <div title="Blur Intensity" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                    <div style={{ fontSize: '12px', color: isDark ? '#818cf8' : '#6366f1', display: 'flex' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={blurAmount}
                        onChange={(e) => onBlurAmountChange?.(parseInt(e.target.value))}
                        style={{
                            width: '80px',
                            height: '4px',
                            cursor: 'pointer',
                            accentColor: '#6366f1',
                            WebkitAppearance: 'none',
                            background: isDark ? '#333' : '#eee',
                            borderRadius: '2px',
                            outline: 'none'
                        }}
                    />
                    <div style={{ fontSize: '11px', fontWeight: '500', color: isDark ? '#888' : '#666', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {blurAmount}px
                    </div>
                </div>
            </div>

            <div style={dividerStyle} />

            {/* Inserts */}
            <div style={{ display: 'flex' }}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={insertLink} style={buttonStyle(isLink)} title="Insert Link">
                    <LinkIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => setShowTableDialog(true)} style={buttonStyle(false)} title="Insert Table">
                    <TableIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => setShowEquationDialog(true)} style={buttonStyle(false)} title="Insert Equation">
                    <EquationIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={insertCollapsible} style={buttonStyle(false)} title="Insert Collapsible">
                    <CollapsibleIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={insertHorizontalRule} style={buttonStyle(false)} title="Horizontal Rule">
                    <LineIcon />
                </button>
            </div>

            <div style={dividerStyle} />

            {/* Alignment */}
            <div style={{ display: 'flex' }}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => setAlign('left')} style={buttonStyle(false)} title="Align Left">
                    <AlignLeftIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => setAlign('center')} style={buttonStyle(false)} title="Align Center">
                    <AlignCenterIcon />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => setAlign('right')} style={buttonStyle(false)} title="Align Right">
                    <AlignRightIcon />
                </button>
            </div>

            {/* Dialogs */}
            {/* Equation Dialog */}
            {showEquationDialog && (
                <div style={{ position: 'absolute', top: '45px', left: '100px', background: isDark ? '#1a1a1a' : '#fff', border: `1px solid ${isDark ? '#333' : '#ddd'}`, padding: '12px', borderRadius: '8px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '300px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Insert LaTeX Equation</div>
                    <textarea
                        value={equation}
                        onChange={(e) => setEquation(e.target.value)}
                        rows={3}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#111' : '#fff', color: isDark ? '#fff' : '#000', fontFamily: 'monospace', fontSize: '13px', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => setShowEquationDialog(false)} style={{ padding: '4px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: isDark ? '#aaa' : '#666' }}>Cancel</button>
                        <button onClick={insertEquation} style={{ padding: '6px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Insert</button>
                    </div>
                </div>
            )}

            {/* Link Dialog */}
            {showLinkDialog && (
                <div
                    style={{
                        position: 'absolute',
                        top: '45px',
                        left: '50px',
                        background: isDark ? '#1a1a1a' : '#ffffff',
                        border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
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
                            border: `1px solid ${isDark ? '#333' : '#eee'}`,
                            borderRadius: '4px',
                            background: isDark ? '#111' : '#ffffff',
                            color: isDark ? '#fff' : '#374151',
                            fontSize: '13px',
                            width: '200px',
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && confirmLink()}
                        autoFocus
                    />
                    <button
                        onClick={confirmLink}
                        style={{ padding: '6px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                    >
                        Add
                    </button>
                    <button
                        onClick={() => setShowLinkDialog(false)}
                        style={{ padding: '6px', background: 'transparent', color: isDark ? '#9ca3af' : '#6b7280', border: 'none', fontSize: '13px', cursor: 'pointer' }}
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
                        top: '45px',
                        left: '80px',
                        background: isDark ? '#1a1a1a' : '#ffffff',
                        border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        zIndex: 100,
                    }}
                >
                    <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px' }}>Insert Table</div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Rows</span>
                            <input
                                type="number"
                                value={tableRows}
                                onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                                min={1}
                                max={10}
                                style={{ width: '60px', padding: '6px', border: `1px solid ${isDark ? '#333' : '#eee'}`, borderRadius: '4px', background: isDark ? '#111' : '#ffffff', color: isDark ? '#fff' : '#000' }}
                            />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Cols</span>
                            <input
                                type="number"
                                value={tableCols}
                                onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                                min={1}
                                max={10}
                                style={{ width: '60px', padding: '6px', border: `1px solid ${isDark ? '#333' : '#eee'}`, borderRadius: '4px', background: isDark ? '#111' : '#ffffff', color: isDark ? '#fff' : '#000' }}
                            />
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowTableDialog(false)} style={{ padding: '4px 12px', background: 'transparent', color: isDark ? '#aaa' : '#666', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                        <button onClick={insertTable} style={{ padding: '6px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Insert</button>
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

const EquationIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 3h10M7 21h10M12 3v18M7 12h10" />
        <circle cx="12" cy="12" r="9" />
    </svg>
);

const CollapsibleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const LineIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
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

