import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode,
} from 'lexical';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import type { HeadingTagType } from '@lexical/rich-text';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list';
import {
  $createCodeNode,
  $isCodeNode,
  CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  CodeNode,
} from '@lexical/code';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { INSERT_EQUATION_COMMAND } from './plugins/EquationPlugin';
import { INSERT_IMAGE_COMMAND, openImageFilePicker } from './plugins/ImagesPlugin';
import {
  $patchStyleText,
  $getSelectionStyleValueForProperty,
  $setBlocksType,
} from '@lexical/selection';

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'number'
  | 'check'
  | 'quote'
  | 'code';

function getBlockType(selection: ReturnType<typeof $getSelection>): BlockType {
  if (!$isRangeSelection(selection)) return 'paragraph';
  const anchor = selection.anchor.getNode();
  const topLevel = anchor.getTopLevelElement();
  if (topLevel === null || topLevel.getType() === 'root') return 'paragraph';

  if ($isHeadingNode(topLevel)) return topLevel.getTag() as BlockType;
  if ($isQuoteNode(topLevel)) return 'quote';
  if ($isCodeNode(topLevel)) return 'code';

  if ($isListNode(topLevel)) {
    const listNode = $getNearestNodeOfType<ListNode>(anchor, ListNode);
    if (listNode) {
      const lt = listNode.getListType();
      if (lt === 'bullet') return 'bullet';
      if (lt === 'number') return 'number';
      if (lt === 'check') return 'check';
    }
  }
  return 'paragraph';
}

const BLOCK_OPTIONS: { value: BlockType; label: string }[] = [
  { value: 'paragraph', label: 'Normal' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'bullet', label: 'Bullet List' },
  { value: 'number', label: 'Numbered List' },
  { value: 'check', label: 'Checklist' },
  { value: 'quote', label: 'Quote' },
  { value: 'code', label: 'Code Block' },
];

// ─── Portal Dropdown ─────────────────────────────────────────────────────────

interface PortalDropdownProps {
  triggerRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  minWidth?: number;
}

function PortalDropdown({
  triggerRef,
  isOpen,
  onClose,
  children,
  minWidth = 160,
}: PortalDropdownProps): React.ReactElement | null {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - minWidth - 8);
      setPos({ top: rect.bottom + 4, left });
    }
  }, [isOpen, triggerRef, minWidth]);

  if (!isOpen || !pos) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop — absorbs clicks outside */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99990 }}
        onClick={onClose}
        onMouseDown={(e) => e.preventDefault()}
      />
      {/* Dropdown panel */}
      <div
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          zIndex: 99991,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: 10,
          boxShadow: '0 6px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          minWidth,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const SigmaIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 4H6l6 8-6 8h12" />
  </svg>
);

const HrIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
);

const RedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 14 20 9 15 4" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
);

const CommentAddIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="12" y1="8" x2="12" y2="14" />
    <line x1="9" y1="11" x2="15" y2="11" />
  </svg>
);

const MarkdownCopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="9" y2="17" />
    <polyline points="7 15 9 13 11 15" />
    <line x1="15" y1="13" x2="15" y2="17" />
    <line x1="13" y1="17" x2="17" y2="17" />
  </svg>
);

const CommentListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="13" y2="13" />
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ImageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const WordCountIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="13" y2="18" />
  </svg>
);

export interface NewLexToolbarProps {
  onRequestComment?: (selectedText: string) => void;
  onToggleCommentsPanel?: () => void;
  isCommentsPanelOpen?: boolean;
  showWordCount?: boolean;
  onToggleWordCount?: () => void;
}

export default function NewLexToolbar({
  onRequestComment,
  onToggleCommentsPanel,
  isCommentsPanelOpen,
  showWordCount,
  onToggleWordCount,
}: NewLexToolbarProps): React.ReactElement {
  const [editor] = useLexicalComposerContext();

  const [blockType, setBlockType] = useState<BlockType>('paragraph');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('auto');

  // Dropdown open state
  const [openDropdown, setOpenDropdown] = useState<
    'text-color' | 'highlight' | 'table' | 'equation' | null
  >(null);

  // Refs for portal positioning
  const textColorRef = useRef<HTMLButtonElement>(null);
  const highlightRef = useRef<HTMLButtonElement>(null);
  const tableRef = useRef<HTMLButtonElement>(null);
  const equationRef = useRef<HTMLButtonElement>(null);

  // Table / equation inputs
  const [tableRows, setTableRows] = useState('3');
  const [tableCols, setTableCols] = useState('3');
  const [equationValue, setEquationValue] = useState('');
  const [equationInline, setEquationInline] = useState(true);

  const [mdCopied, setMdCopied] = useState(false);

  const closeDropdown = useCallback(() => setOpenDropdown(null), []);
  const toggleDropdown = useCallback(
    (name: typeof openDropdown) =>
      setOpenDropdown((prev) => (prev === name ? null : name)),
    [],
  );

  // ── Toolbar state sync ──────────────────────────────────────────────────────
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    setIsBold(selection.hasFormat('bold'));
    setIsItalic(selection.hasFormat('italic'));
    setIsUnderline(selection.hasFormat('underline'));
    setIsStrikethrough(selection.hasFormat('strikethrough'));
    setIsSubscript(selection.hasFormat('subscript'));
    setIsSuperscript(selection.hasFormat('superscript'));

    const bt = getBlockType(selection);
    setBlockType(bt);

    if (bt === 'code') {
      const anchor = selection.anchor.getNode();
      const codeNode = $getNearestNodeOfType<CodeNode>(anchor, CodeNode);
      setCodeLanguage(codeNode?.getLanguage() ?? 'plain');
    }

    const node = selection.anchor.getNode();
    setIsLink($isLinkNode(node.getParent()) || $isLinkNode(node));
    setTextColor($getSelectionStyleValueForProperty(selection, 'color', '#000000'));
    setHighlightColor($getSelectionStyleValueForProperty(selection, 'background-color', ''));
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar());
      }),
    );
  }, [editor, updateToolbar]);

  // ── Block type conversion ───────────────────────────────────────────────────
  const applyBlockType = useCallback(
    (type: BlockType) => {
      // List toggle: clicking the active list type removes it
      const LIST_COMMANDS: Partial<Record<BlockType, typeof INSERT_UNORDERED_LIST_COMMAND>> = {
        bullet: INSERT_UNORDERED_LIST_COMMAND,
        number: INSERT_ORDERED_LIST_COMMAND,
        check: INSERT_CHECK_LIST_COMMAND,
      };
      if (type in LIST_COMMANDS) {
        if (blockType === type) {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        } else {
          editor.dispatchCommand(LIST_COMMANDS[type]!, undefined);
        }
        return;
      }

      // Non-list blocks: use $setBlocksType for correct multi-paragraph handling
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        if (type === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else if (type === 'h1' || type === 'h2' || type === 'h3') {
          $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
        } else if (type === 'quote') {
          $setBlocksType(selection, () => $createQuoteNode());
        } else if (type === 'code') {
          $setBlocksType(selection, () => $createCodeNode('auto'));
        }
      });
    },
    [editor, blockType],
  );

  // ── Color actions ───────────────────────────────────────────────────────────
  const applyTextColor = useCallback(
    (color: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) $patchStyleText(selection, { color });
      });
      closeDropdown();
    },
    [editor, closeDropdown],
  );

  const applyHighlight = useCallback(
    (color: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, { 'background-color': color || 'transparent' });
        }
      });
      closeDropdown();
    },
    [editor, closeDropdown],
  );

  // ── Table / equation ────────────────────────────────────────────────────────
  const insertTable = useCallback(() => {
    const rows = parseInt(tableRows, 10);
    const cols = parseInt(tableCols, 10);
    if (rows >= 1 && cols >= 1) {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        rows: String(rows),
        columns: String(cols),
      });
    }
    closeDropdown();
  }, [editor, tableRows, tableCols, closeDropdown]);

  const insertEquation = useCallback(() => {
    if (equationValue.trim()) {
      editor.dispatchCommand(INSERT_EQUATION_COMMAND, {
        equation: equationValue.trim(),
        inline: equationInline,
      });
      setEquationValue('');
    }
    closeDropdown();
  }, [editor, equationValue, equationInline, closeDropdown]);

  const handleLinkToggle = useCallback(() => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, isLink ? null : 'https://');
  }, [editor, isLink]);

  const insertImage = useCallback(() => {
    openImageFilePicker((payload) => {
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    });
  }, [editor]);

  const copyAsMarkdown = useCallback(() => {
    editor.getEditorState().read(() => {
      const md = $convertToMarkdownString(TRANSFORMERS);
      navigator.clipboard.writeText(md).then(() => {
        setMdCopied(true);
        setTimeout(() => setMdCopied(false), 1800);
      });
    });
  }, [editor]);

  const applyTextTransform = useCallback(
    (transform: 'uppercase' | 'lowercase' | 'capitalize') => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const current = $getSelectionStyleValueForProperty(selection, 'text-transform', '');
        $patchStyleText(selection, { 'text-transform': current === transform ? '' : transform });
      });
    },
    [editor],
  );

  // ── Styles ──────────────────────────────────────────────────────────────────
  const btn = (active: boolean, title?: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    minWidth: 28,
    padding: '0 6px',
    border: 'none',
    borderRadius: 6,
    background: active ? 'rgba(15,23,42,0.09)' : 'transparent',
    color: active ? '#111827' : '#4b5563',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    lineHeight: 1,
    flexShrink: 0,
    transition: 'background 0.1s, color 0.1s',
  });

  const divider: React.CSSProperties = {
    width: 1,
    alignSelf: 'stretch',
    margin: '4px 3px',
    background: '#e5e7eb',
    flexShrink: 0,
  };

  const TEXT_COLORS = [
    '#000000', '#374151', '#6b7280', '#9ca3af',
    '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
    '#2563eb', '#7c3aed', '#db2777', '#0891b2',
  ];

  const HIGHLIGHT_COLORS = [
    '', '#fef9c3', '#fed7aa', '#fecaca',
    '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fce7f3',
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '4px 8px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa',
        overflowX: 'auto',
        overflowY: 'visible',
        flexShrink: 0,
        flexWrap: 'nowrap',
        minHeight: 38,
        scrollbarWidth: 'none',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Undo / Redo — first because most frequently needed */}
      <button
        type="button"
        style={btn(false)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        title="Undo (⌘Z)"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        style={btn(false)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        title="Redo (⌘⇧Z)"
      >
        <RedoIcon />
      </button>

      <div style={divider} />

      {/* Block type */}
      <select
        value={blockType}
        onChange={(e) => applyBlockType(e.target.value as BlockType)}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          height: 28,
          padding: '0 24px 0 8px',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          background: '#fff',
          color: '#374151',
          cursor: 'pointer',
          flexShrink: 0,
          appearance: 'auto',
          marginRight: 2,
        }}
      >
        {BLOCK_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Language selector — code blocks only */}
      {blockType === 'code' && (
        <select
          value={codeLanguage}
          onChange={(e) => {
            const lang = e.target.value;
            setCodeLanguage(lang);
            editor.update(() => {
              const sel = $getSelection();
              if (!$isRangeSelection(sel)) return;
              const codeNode = $getNearestNodeOfType<CodeNode>(
                sel.anchor.getNode(),
                CodeNode,
              );
              codeNode?.setLanguage(lang);
            });
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            height: 28,
            padding: '0 24px 0 8px',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            background: codeLanguage === 'auto' ? '#f0fdf4' : '#f1f5f9',
            color: codeLanguage === 'auto' ? '#15803d' : '#374151',
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: '"Fira Code", monospace',
            marginRight: 2,
          }}
        >
          {/* Auto-detect always first */}
          <option value="auto">✦ Auto-detect</option>
          <optgroup label="──────────────">
            {Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </optgroup>
          {/* Extra Prism-supported languages not in the default map */}
          <optgroup label="More">
            <option value="bash">Bash / Shell</option>
            <option value="go">Go</option>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="ruby">Ruby</option>
            <option value="kotlin">Kotlin</option>
            <option value="php">PHP</option>
          </optgroup>
        </select>
      )}

      <div style={divider} />

      {/* Format buttons */}
      <button
        type="button"
        style={{ ...btn(isBold), fontWeight: 700, fontFamily: 'serif', fontSize: 14 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="Bold (⌘B)"
      >
        B
      </button>
      <button
        type="button"
        style={{ ...btn(isItalic), fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 14 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="Italic (⌘I)"
      >
        I
      </button>
      <button
        type="button"
        style={{ ...btn(isUnderline), textDecoration: 'underline', fontSize: 14 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Underline (⌘U)"
      >
        U
      </button>
      <button
        type="button"
        style={{ ...btn(isStrikethrough), textDecoration: 'line-through', fontSize: 14 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        title="Strikethrough"
      >
        S
      </button>

      <div style={divider} />

      {/* Superscript / Subscript */}
      <button
        type="button"
        style={{ ...btn(isSuperscript), fontSize: 11 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')}
        title="Superscript"
      >
        x<sup style={{ fontSize: 8 }}>2</sup>
      </button>
      <button
        type="button"
        style={{ ...btn(isSubscript), fontSize: 11 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')}
        title="Subscript"
      >
        x<sub style={{ fontSize: 8 }}>2</sub>
      </button>

      <div style={divider} />

      {/* Case transforms */}
      <button
        type="button"
        style={{ ...btn(false), fontSize: 11, letterSpacing: '-0.01em' }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyTextTransform('uppercase')}
        title="UPPERCASE"
      >
        AA
      </button>
      <button
        type="button"
        style={{ ...btn(false), fontSize: 11, letterSpacing: '-0.01em' }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyTextTransform('lowercase')}
        title="lowercase"
      >
        aa
      </button>
      <button
        type="button"
        style={{ ...btn(false), fontSize: 11, letterSpacing: '-0.01em' }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyTextTransform('capitalize')}
        title="Capitalize"
      >
        Aa
      </button>

      <div style={divider} />

      {/* Text color */}
      <button
        ref={textColorRef}
        type="button"
        style={{ ...btn(openDropdown === 'text-color'), flexDirection: 'column', gap: 2, padding: '3px 5px', height: 28 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleDropdown('text-color')}
        title="Text color"
      >
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1, fontFamily: 'serif' }}>A</span>
        <span style={{ width: 14, height: 2.5, background: textColor || '#000', borderRadius: 1 }} />
      </button>
      <PortalDropdown
        triggerRef={textColorRef}
        isOpen={openDropdown === 'text-color'}
        onClose={closeDropdown}
        minWidth={136}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              onMouseDown={(e) => { e.preventDefault(); applyTextColor(c); }}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: c,
                border: c === textColor ? '2.5px solid #374151' : '1.5px solid #d1d5db',
                cursor: 'pointer', padding: 0,
              }}
              title={c}
            />
          ))}
        </div>
      </PortalDropdown>

      {/* Highlight color */}
      <button
        ref={highlightRef}
        type="button"
        style={{ ...btn(openDropdown === 'highlight'), flexDirection: 'column', gap: 2, padding: '3px 5px', height: 28 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleDropdown('highlight')}
        title="Highlight color"
      >
        <span style={{ fontSize: 11, lineHeight: 1.3, color: '#374151' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
            <path d="M12 3l1.5 4.5H18l-3.75 2.75 1.5 4.5L12 12 8.25 14.75l1.5-4.5L6 7.5h4.5z"/>
          </svg>
        </span>
        <span style={{ width: 14, height: 2.5, background: highlightColor || '#e5e7eb', borderRadius: 1 }} />
      </button>
      <PortalDropdown
        triggerRef={highlightRef}
        isOpen={openDropdown === 'highlight'}
        onClose={closeDropdown}
        minWidth={128}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {HIGHLIGHT_COLORS.map((c, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); applyHighlight(c); }}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: c || 'linear-gradient(135deg, #fff 45%, #e2e8f0 45%, #e2e8f0 55%, #fff 55%)',
                border: c === highlightColor ? '2.5px solid #374151' : '1.5px solid #d1d5db',
                cursor: 'pointer', padding: 0,
              }}
              title={c || 'None'}
            />
          ))}
        </div>
      </PortalDropdown>

      <div style={divider} />

      {/* Link */}
      <button
        type="button"
        style={btn(isLink)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleLinkToggle}
        title="Toggle link (⌘K)"
      >
        <LinkIcon />
      </button>

      {/* Table */}
      <button
        ref={tableRef}
        type="button"
        style={btn(openDropdown === 'table')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleDropdown('table')}
        title="Insert table"
      >
        <TableIcon />
      </button>
      <PortalDropdown
        triggerRef={tableRef}
        isOpen={openDropdown === 'table'}
        onClose={closeDropdown}
        minWidth={170}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Insert table
          </p>
          {(['Rows', 'Cols'] as const).map((label) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ color: '#6b7280', width: 36 }}>{label}</span>
              <input
                type="number"
                min="1"
                max="50"
                value={label === 'Rows' ? tableRows : tableCols}
                onChange={(e) =>
                  label === 'Rows' ? setTableRows(e.target.value) : setTableCols(e.target.value)
                }
                style={{
                  width: 56, padding: '4px 6px',
                  border: '1px solid #e5e7eb', borderRadius: 5,
                  fontSize: 13, color: '#374151', background: '#fff',
                }}
              />
            </div>
          ))}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertTable}
            style={{
              background: '#111827', color: '#fff', border: 'none',
              borderRadius: 6, padding: '6px 0', fontSize: 13,
              fontWeight: 500, cursor: 'pointer', width: '100%',
            }}
          >
            Insert
          </button>
        </div>
      </PortalDropdown>

      {/* Equation */}
      <button
        ref={equationRef}
        type="button"
        style={btn(openDropdown === 'equation')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleDropdown('equation')}
        title="Insert equation"
      >
        <SigmaIcon />
      </button>
      <PortalDropdown
        triggerRef={equationRef}
        isOpen={openDropdown === 'equation'}
        onClose={closeDropdown}
        minWidth={220}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Insert equation
          </p>
          <input
            type="text"
            value={equationValue}
            onChange={(e) => setEquationValue(e.target.value)}
            placeholder="e.g. x^2 + y^2 = r^2"
            autoFocus
            style={{
              padding: '6px 8px',
              border: '1px solid #e5e7eb', borderRadius: 5,
              fontSize: 13, fontFamily: '"Fira Code", monospace',
              color: '#374151',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') insertEquation(); }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={equationInline}
              onChange={(e) => setEquationInline(e.target.checked)}
            />
            Inline
          </label>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertEquation}
            style={{
              background: '#111827', color: '#fff', border: 'none',
              borderRadius: 6, padding: '6px 0', fontSize: 13,
              fontWeight: 500, cursor: 'pointer', width: '100%',
            }}
          >
            Insert
          </button>
        </div>
      </PortalDropdown>

      {/* Horizontal rule */}
      <button
        type="button"
        style={btn(false)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
        title="Horizontal divider"
      >
        <HrIcon />
      </button>

      {/* Image insert */}
      <button
        type="button"
        style={btn(false)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={insertImage}
        title="Insert image"
      >
        <ImageIcon />
      </button>

      {/* Copy as Markdown */}
      <button
        type="button"
        style={{
          ...btn(mdCopied),
          fontSize: 11,
          fontFamily: '"IBM Plex Sans", sans-serif',
          gap: 4,
          paddingLeft: 7,
          paddingRight: 7,
          color: mdCopied ? '#16a34a' : undefined,
        }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={copyAsMarkdown}
        title="Copy note as Markdown"
      >
        <MarkdownCopyIcon />
        {mdCopied ? 'Copied!' : 'MD'}
      </button>

      {/* Word count toggle */}
      {onToggleWordCount && (
        <button
          type="button"
          style={btn(!!showWordCount)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleWordCount}
          title={showWordCount ? 'Hide word count' : 'Show word count'}
        >
          <WordCountIcon />
        </button>
      )}

      {/* Comment buttons — spacer pushes them to the right */}
      {(onRequestComment || onToggleCommentsPanel) && (
        <>
          <div style={{ flex: 1 }} />
          <div style={divider} />

          {onRequestComment && (
            <button
              type="button"
              style={btn(false)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const text = editor.getEditorState().read(() => {
                  const sel = $getSelection();
                  return $isRangeSelection(sel) ? sel.getTextContent() : '';
                });
                onRequestComment(text);
              }}
              title="Add comment"
            >
              <CommentAddIcon />
            </button>
          )}

          {onToggleCommentsPanel && (
            <button
              type="button"
              style={btn(!!isCommentsPanelOpen)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleCommentsPanel}
              title={isCommentsPanelOpen ? 'Hide comments' : 'Show comments'}
            >
              <CommentListIcon />
            </button>
          )}
        </>
      )}
    </div>
  );
}
