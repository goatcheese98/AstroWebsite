/**
 * CanvasSearch — two-tab search overlay (Ctrl+F)
 *
 * Canvas tab: searches Excalidraw text/frame elements
 * Notes tab:  searches markdown content + lexical rich-text state
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useExcalidrawAPISafe } from '@/stores';
import { isOverlayCustomDataType } from './overlay-registry';

type SearchTab = 'canvas' | 'notes';

interface CanvasResult {
  elementId: string;
  preview: string;
  label: 'Text' | 'Frame' | 'Label';
}

interface NoteResult {
  elementId: string;
  noteType: 'markdown' | 'lexical' | 'newlex';
  preview: string;
  matchIndex: number;
}

type AnyResult = CanvasResult | NoteResult;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

// Cache extracted text keyed by lexicalState string identity — avoids repeated
// JSON.parse + tree walks on every keystroke when notes haven't changed.
const lexicalTextCache = new Map<string, string>();

function extractLexicalText(raw: string): string {
  const cached = lexicalTextCache.get(raw);
  if (cached !== undefined) return cached;
  let result = '';
  try {
    const state = JSON.parse(raw);
    const parts: string[] = [];
    function walk(node: Record<string, unknown>) {
      if (typeof node.text === 'string') parts.push(node.text);
      if (Array.isArray(node.children)) {
        (node.children as Record<string, unknown>[]).forEach(walk);
      }
    }
    if (state.root) walk(state.root as Record<string, unknown>);
    result = parts.join(' ');
  } catch { /* ignore */ }
  // Evict oldest entry if cache grows large (e.g. many edits in a long session)
  if (lexicalTextCache.size > 200) lexicalTextCache.delete(lexicalTextCache.keys().next().value!);
  lexicalTextCache.set(raw, result);
  return result;
}

function snippet(text: string, query: string, ctx = 55, startPos?: number): string {
  const lo = text.toLowerCase();
  const idx = startPos !== undefined ? startPos : lo.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, ctx * 2) + (text.length > ctx * 2 ? '…' : '');
  const s = Math.max(0, idx - ctx);
  const e = Math.min(text.length, idx + query.length + ctx);
  return (s > 0 ? '…' : '') + text.slice(s, e) + (e < text.length ? '…' : '');
}

function stripHtml(text: string): string {
  return text
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: '#4338ca', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export default function CanvasSearch({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<SearchTab>('notes');
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [highlightBox, setHighlightBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const settleTimerRef = useRef<number | null>(null);   // delay before dispatching highlight / computing bbox
  const ringDismissTimerRef = useRef<number | null>(null); // auto-dismiss the canvas ring overlay
  const inputRef = useRef<HTMLInputElement>(null);
  const api = useExcalidrawAPISafe();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      // Clear all in-note highlights when search panel closes
      window.dispatchEvent(new CustomEvent('canvas:note-search-clear'));
    }
  }, [isOpen]);

  // ── canvas results ──────────────────────────────────────────────────────────
  const canvasResults = useMemo((): CanvasResult[] => {
    if (!api || !query.trim() || tab !== 'canvas') return [];
    const q = query.toLowerCase();
    const results: CanvasResult[] = [];
    for (const el of api.getSceneElements()) {
      if (el.isDeleted) continue;
      const e = el as Record<string, unknown>;
      // skip custom note/embed overlays
      const cd = e.customData as Record<string, unknown> | undefined;
      if (isOverlayCustomDataType(cd?.type)) continue;
      const text =
        typeof e.text === 'string' ? e.text :
        typeof e.name === 'string' ? e.name :
        typeof e.label === 'string' ? e.label : '';
      if (!text || !text.toLowerCase().includes(q)) continue;
      const label: CanvasResult['label'] =
        el.type === 'frame' ? 'Frame' :
        (e.label !== undefined ? 'Label' : 'Text');
      results.push({ elementId: el.id, preview: snippet(text, query), label });
    }
    return results;
  }, [api, query, tab]);

  // ── notes results ───────────────────────────────────────────────────────────
  const notesResults = useMemo((): NoteResult[] => {
    if (!api || !query.trim() || tab !== 'notes') return [];
    const q = query.toLowerCase();
    const results: NoteResult[] = [];
    for (const el of api.getSceneElements()) {
      if (el.isDeleted) continue;
      const cd = (el as Record<string, unknown>).customData as Record<string, unknown> | undefined;
      if (!cd) continue;
      if (cd.type === 'markdown' && typeof cd.content === 'string') {
        const content = cd.content;
        const lo = content.toLowerCase();
        let offset = 0, matchIdx = 0, pos: number;
        while ((pos = lo.indexOf(q, offset)) !== -1) {
          results.push({ elementId: el.id, noteType: 'markdown', preview: snippet(content, query, 55, pos), matchIndex: matchIdx });
          offset = pos + q.length;
          matchIdx++;
        }
      } else if (cd.type === 'lexical' && typeof cd.lexicalState === 'string') {
        const text = extractLexicalText(cd.lexicalState);
        const lo = text.toLowerCase();
        let offset = 0, matchIdx = 0, pos: number;
        while ((pos = lo.indexOf(q, offset)) !== -1) {
          results.push({ elementId: el.id, noteType: 'lexical', preview: snippet(text, query, 55, pos), matchIndex: matchIdx });
          offset = pos + q.length;
          matchIdx++;
        }
      } else if (cd.type === 'newlex' && typeof cd.content === 'string') {
        const text = stripHtml(cd.content);
        const lo = text.toLowerCase();
        let offset = 0, matchIdx = 0, pos: number;
        while ((pos = lo.indexOf(q, offset)) !== -1) {
          results.push({ elementId: el.id, noteType: 'newlex', preview: snippet(text, query, 55, pos), matchIndex: matchIdx });
          offset = pos + q.length;
          matchIdx++;
        }
      }
    }
    return results;
  }, [api, query, tab]);

  const results: AnyResult[] = tab === 'canvas' ? canvasResults : notesResults;

  // ── navigate to result ──────────────────────────────────────────────────────
  const goTo = useCallback((result: AnyResult) => {
    if (!api) return;
    const el = api.getSceneElements().find(e => e.id === result.elementId);
    if (!el) return;

    const isNote = 'noteType' in result;

    // Notes are large — just pan without changing zoom.
    // Canvas elements zoom to fit but cap at 50% of viewport so it never over-zooms.
    if (isNote) {
      api.scrollToContent([el], { fitToViewport: false, animate: true });
    } else {
      api.scrollToContent([el], { fitToViewport: true, viewportZoomFactor: 0.5, animate: true });
      // Clear any in-note highlights when going to a canvas element
      window.dispatchEvent(new CustomEvent('canvas:note-search-clear'));
    }

    api.updateScene({ appState: { selectedElementIds: { [el.id]: true } } });

    if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current);
    if (ringDismissTimerRef.current !== null) clearTimeout(ringDismissTimerRef.current);
    setHighlightBox(null);

    if (isNote) {
      // Dispatch word-level highlight event after scroll settles
      settleTimerRef.current = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('canvas:note-search-highlight', {
          detail: { elementId: result.elementId, query, matchIndex: (result as NoteResult).matchIndex },
        }));
      }, 300);
    } else {
      // Flash a highlight ring for canvas elements
      settleTimerRef.current = window.setTimeout(() => {
        const appState = api.getAppState();
        const zoom = appState.zoom.value;
        const offsetLeft = (appState as Record<string, unknown>).offsetLeft as number ?? 0;
        const offsetTop  = (appState as Record<string, unknown>).offsetTop  as number ?? 0;
        setHighlightBox({
          x: (el.x + appState.scrollX) * zoom + offsetLeft,
          y: (el.y + appState.scrollY) * zoom + offsetTop,
          w: el.width  * zoom,
          h: el.height * zoom,
        });
        ringDismissTimerRef.current = window.setTimeout(() => setHighlightBox(null), 1800);
      }, 500);
    }
  }, [api, query]);

  const navigate = useCallback((dir: 1 | -1) => {
    if (!results.length) return;
    const next = (activeIdx + dir + results.length) % results.length;
    setActiveIdx(next);
    goTo(results[next]);
  }, [results, activeIdx, goTo]);

  // ── keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        if (results.length) goTo(results[activeIdx]);
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); navigate(1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, onClose, navigate]);

  useEffect(() => { setActiveIdx(0); }, [results.length]);

  if (!isOpen) return null;

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <>
    <div style={{
      position: 'fixed',
      top: 68,
      right: 16,
      width: 440,
      maxHeight: 'calc(100vh - 110px)',
      background: 'rgba(255,255,255,0.55)',
      borderRadius: 16,
      boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 300,
      border: '1px solid rgba(0,0,0,0.06)',
      backdropFilter: 'blur(16px)',
    }}>
      {/* ── input row ── */}
      <div style={{
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid #f3f4f6',
      }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
          <button
            onClick={() => { setTab('canvas'); setActiveIdx(0); }}
            title="Search canvas elements (text, frames)"
            style={tabBtnStyle(tab === 'canvas')}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            onClick={() => { setTab('notes'); setActiveIdx(0); }}
            title="Search inside notes (markdown & rich text)"
            style={tabBtnStyle(tab === 'notes')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
          placeholder={tab === 'canvas' ? 'Search canvas text and frames…' : 'Search notes content…'}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 15,
            background: 'transparent',
            color: '#111827',
            minWidth: 0,
          }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', padding: '5px 9px', borderRadius: 7, color: '#6b7280', fontSize: 15, lineHeight: 1, flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      {/* ── results ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!query.trim() && (
          <p style={{ margin: 0, padding: '24px 18px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            {tab === 'notes'
              ? 'Search inside markdown, rich text, and NewLex notes'
              : 'Search text labels and frames on the canvas'}
          </p>
        )}
        {query.trim() && results.length === 0 && (
          <p style={{ margin: 0, padding: '32px 18px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            No results
          </p>
        )}
        {results.map((r, i) => {
          const isNote = 'noteType' in r;
          const isActive = i === activeIdx;
          return (
            <button
              key={isNote ? `${r.elementId}-${(r as NoteResult).matchIndex}` : `${r.elementId}-${i}`}
              onClick={() => { goTo(r); setActiveIdx(i); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 16px',
                border: 'none',
                borderBottom: '1px solid #f9fafb',
                background: isActive ? '#f5f3ff' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                color: '#374151',
                lineHeight: 1.55,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#fafafa'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Badge */}
              {isNote ? (
                <span style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color:
                    r.noteType === 'markdown'
                      ? '#7c3aed'
                      : r.noteType === 'newlex'
                        ? '#0f766e'
                        : '#2563eb',
                  marginBottom: 3,
                }}>
                  {r.noteType === 'markdown'
                    ? 'Markdown'
                    : r.noteType === 'newlex'
                      ? 'NewLex'
                      : 'Rich Text'}
                </span>
              ) : (
                <span style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  marginBottom: 3,
                }}>
                  {r.label}
                </span>
              )}
              <br />
              <Highlighted text={r.preview} query={query} />
            </button>
          );
        })}
      </div>

      {/* ── footer ── */}
      {query.trim() && results.length > 0 && (
        <div style={{
          padding: '7px 14px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#9ca3af',
          flexShrink: 0,
        }}>
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => navigate(-1)} style={navBtnStyle} title="Previous (↑)">↑</button>
            <button onClick={() => navigate(1)} style={navBtnStyle} title="Next (↓ / Enter)">↓</button>
          </div>
        </div>
      )}

    </div>

    {/* Highlight ring — rendered outside the panel so it overlays the canvas */}
    {highlightBox && (
      <div
        style={{
          position: 'fixed',
          left:   highlightBox.x - 4,
          top:    highlightBox.y - 4,
          width:  highlightBox.w + 8,
          height: highlightBox.h + 8,
          border: '2.5px solid #6366f1',
          borderRadius: 6,
          pointerEvents: 'none',
          zIndex: 299,
          animation: 'search-ring-pulse 1.8s ease-out forwards',
        }}
      />
    )}

    <style>{`
      @keyframes search-ring-pulse {
        0%   { opacity: 1; box-shadow: 0 0 0 0 rgba(99,102,241,0.5), 0 0 12px rgba(99,102,241,0.3); }
        60%  { opacity: 1; box-shadow: 0 0 0 8px rgba(99,102,241,0), 0 0 20px rgba(99,102,241,0.15); }
        100% { opacity: 0; box-shadow: 0 0 0 12px rgba(99,102,241,0), 0 0 0 rgba(99,102,241,0); }
      }
    `}</style>
    </>
  );
}

// ── style helpers ─────────────────────────────────────────────────────────────

function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#ffffff' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '5px 8px',
    borderRadius: 6,
    color: active ? '#6366f1' : '#6b7280',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s',
  };
}

const navBtnStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: 'none',
  cursor: 'pointer',
  padding: '3px 9px',
  borderRadius: 5,
  fontSize: 12,
  color: '#374151',
  lineHeight: 1.2,
};
