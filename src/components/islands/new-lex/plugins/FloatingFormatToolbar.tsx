import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $patchStyleText,
  $getSelectionStyleValueForProperty,
} from '@lexical/selection';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOLBAR_HEIGHT = 34;
const OFFSET_Y = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computePosition(rect: DOMRect, toolbarWidth: number) {
  let top = rect.top - TOOLBAR_HEIGHT - OFFSET_Y;
  if (top < 8) top = rect.bottom + OFFSET_Y;
  let left = rect.left + rect.width / 2 - toolbarWidth / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));
  return { top, left };
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

const LinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function FloatingFormatToolbar(): React.ReactElement {
  const [editor] = useLexicalComposerContext();

  // Toolbar DOM ref — position & visibility managed via direct style mutations.
  // These properties are intentionally NOT in the JSX style prop so React
  // never overwrites our direct DOM updates during re-renders.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);

  // Format states — fine as React state; they only update on Lexical changes, not during pan.
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [textColor, setTextColor] = useState('#000000');

  // Color picker
  const [showColors, setShowColors] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, left: 0 });
  const colorBtnRef = useRef<HTMLButtonElement>(null);

  const TEXT_COLORS = [
    '#000000', '#374151', '#dc2626', '#ea580c',
    '#ca8a04', '#16a34a', '#2563eb', '#7c3aed',
  ];

  // ── Start hidden before first paint ────────────────────────────────────────
  useLayoutEffect(() => {
    if (toolbarRef.current) {
      toolbarRef.current.style.visibility = 'hidden';
      toolbarRef.current.style.top = '0px';
      toolbarRef.current.style.left = '0px';
    }
  }, []);

  // ── rAF loop: zero-lag position tracking ───────────────────────────────────
  // Directly mutates style.top/left — bypasses React render cycle entirely,
  // so the toolbar tracks the selection even during canvas panning.
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      if (isVisibleRef.current && toolbarRef.current) {
        const domSel = window.getSelection();
        if (domSel && domSel.rangeCount > 0) {
          const rect = domSel.getRangeAt(0).getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            const toolbarWidth = toolbarRef.current.offsetWidth || 300;
            const { top, left } = computePosition(rect, toolbarWidth);
            toolbarRef.current.style.top = `${top}px`;
            toolbarRef.current.style.left = `${left}px`;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── selectionchange: instant hide when selection collapses ─────────────────
  // Fires synchronously when the DOM selection changes — catches clicks outside
  // the editor immediately, before Lexical's async update listener runs.
  useEffect(() => {
    const onSelectionChange = () => {
      const domSel = window.getSelection();
      if (!domSel || domSel.isCollapsed || domSel.rangeCount === 0 || domSel.toString().trim() === '') {
        if (toolbarRef.current) toolbarRef.current.style.visibility = 'hidden';
        isVisibleRef.current = false;
        setShowColors(false);
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  // ── Lexical selection sync ──────────────────────────────────────────────────
  const syncState = useCallback(() => {
    const selection = $getSelection();

    if (
      !$isRangeSelection(selection) ||
      selection.isCollapsed() ||
      selection.getTextContent().length === 0
    ) {
      if (toolbarRef.current) toolbarRef.current.style.visibility = 'hidden';
      isVisibleRef.current = false;
      setShowColors(false);
      return;
    }

    setIsBold(selection.hasFormat('bold'));
    setIsItalic(selection.hasFormat('italic'));
    setIsUnderline(selection.hasFormat('underline'));
    setIsStrikethrough(selection.hasFormat('strikethrough'));
    setIsSubscript(selection.hasFormat('subscript'));
    setIsSuperscript(selection.hasFormat('superscript'));
    setTextColor($getSelectionStyleValueForProperty(selection, 'color', '#000000'));

    const node = selection.anchor.getNode();
    setIsLink($isLinkNode(node.getParent()) || $isLinkNode(node));

    // Show toolbar and set initial position (rAF keeps it accurate after this)
    if (toolbarRef.current) {
      const domSel = window.getSelection();
      if (domSel && domSel.rangeCount > 0) {
        const rect = domSel.getRangeAt(0).getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          const toolbarWidth = toolbarRef.current.offsetWidth || 300;
          const { top, left } = computePosition(rect, toolbarWidth);
          toolbarRef.current.style.top = `${top}px`;
          toolbarRef.current.style.left = `${left}px`;
          toolbarRef.current.style.visibility = 'visible';
          isVisibleRef.current = true;
        }
      }
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => syncState());
    });
  }, [editor, syncState]);

  // ── Text transform ─────────────────────────────────────────────────────────
  const applyTextTransform = useCallback(
    (transform: 'uppercase' | 'lowercase' | 'capitalize') => {
      editor.update(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;
        const current = $getSelectionStyleValueForProperty(sel, 'text-transform', '');
        $patchStyleText(sel, { 'text-transform': current === transform ? '' : transform });
      });
    },
    [editor],
  );

  // ── Styles ─────────────────────────────────────────────────────────────────
  const btn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    padding: 0,
    border: 'none',
    borderRadius: 5,
    background: active ? 'rgba(15,23,42,0.08)' : 'transparent',
    color: active ? '#111827' : '#4b5563',
    cursor: 'pointer',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    transition: 'background 0.1s',
  });

  const sep: React.CSSProperties = {
    width: 1,
    alignSelf: 'stretch',
    margin: '5px 2px',
    background: '#e5e7eb',
    flexShrink: 0,
  };

  // Always render so toolbarRef is always attached.
  // visibility / top / left are managed via direct DOM mutations above —
  // intentionally absent from the style prop so React never resets them.
  return ReactDOM.createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '2px 5px',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 9,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* B */}
      <button type="button" style={{ ...btn(isBold), fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 14 }}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} title="Bold (⌘B)">B</button>
      {/* I */}
      <button type="button" style={{ ...btn(isItalic), fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 14 }}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} title="Italic (⌘I)">I</button>
      {/* U */}
      <button type="button" style={{ ...btn(isUnderline), textDecoration: 'underline', fontSize: 13 }}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} title="Underline (⌘U)">U</button>
      {/* S */}
      <button type="button" style={{ ...btn(isStrikethrough), textDecoration: 'line-through', fontSize: 13 }}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} title="Strikethrough">S</button>

      <div style={sep} />

      {/* Superscript */}
      <button type="button" style={{ ...btn(isSuperscript), fontSize: 11 }}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')} title="Superscript">
        x<sup style={{ fontSize: 8 }}>2</sup>
      </button>
      {/* Subscript */}
      <button type="button" style={{ ...btn(isSubscript), fontSize: 11 }}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')} title="Subscript">
        x<sub style={{ fontSize: 8 }}>2</sub>
      </button>

      <div style={sep} />

      {/* Case transforms */}
      <button type="button" style={{ ...btn(false), fontSize: 11, letterSpacing: '-0.01em', minWidth: 26 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyTextTransform('uppercase')} title="UPPERCASE">
        AA
      </button>
      <button type="button" style={{ ...btn(false), fontSize: 11, letterSpacing: '-0.01em', minWidth: 26 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyTextTransform('lowercase')} title="lowercase">
        aa
      </button>
      <button type="button" style={{ ...btn(false), fontSize: 11, letterSpacing: '-0.01em', minWidth: 26 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyTextTransform('capitalize')} title="Capitalize">
        Aa
      </button>

      <div style={sep} />

      {/* Link */}
      <button type="button" style={btn(isLink)}
        onClick={() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, isLink ? null : 'https://')}
        title={isLink ? 'Remove link' : 'Add link'}>
        <LinkIcon />
      </button>

      <div style={sep} />

      {/* Text color */}
      <button
        ref={colorBtnRef}
        type="button"
        style={{ ...btn(showColors), flexDirection: 'column', gap: 2, padding: '2px 5px', width: 'auto', height: 28 }}
        onClick={() => {
          if (colorBtnRef.current) {
            const r = colorBtnRef.current.getBoundingClientRect();
            setColorPickerPos({ top: r.bottom + 4, left: r.left });
          }
          setShowColors((v) => !v);
        }}
        title="Text color"
      >
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'serif', lineHeight: 1.1 }}>A</span>
        <span style={{ width: 12, height: 2.5, background: textColor || '#000', borderRadius: 1 }} />
      </button>

      {showColors && ReactDOM.createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
            onClick={() => setShowColors(false)} onMouseDown={(e) => e.preventDefault()} />
          <div
            style={{
              position: 'fixed',
              top: colorPickerPos.top,
              left: colorPickerPos.left,
              zIndex: 99999,
              display: 'flex',
              gap: 5,
              padding: '7px 9px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 9,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.update(() => {
                    const sel = $getSelection();
                    if ($isRangeSelection(sel)) $patchStyleText(sel, { color: c });
                  });
                  setShowColors(false);
                }}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: c,
                  border: c === textColor ? '2.5px solid #374151' : '1.5px solid #d1d5db',
                  cursor: 'pointer', padding: 0,
                }}
                title={c}
              />
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>,
    document.body,
  );
}
