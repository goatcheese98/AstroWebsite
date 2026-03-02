/**
 * DOM helpers for in-note word-level search highlighting.
 * Used by MarkdownNote and LexicalNote.
 *
 * For Markdown: DOM <mark> injection (React owns the DOM, safe to mutate).
 * For Lexical:  CSS Custom Highlight API — zero DOM mutations, so Lexical's
 *               MutationObserver never fires and won't revert the highlights.
 *
 * Two-color scheme:
 *   · All matches   → light yellow (#fef9c3)
 *   · Active match  → bright yellow (#fde047)
 */

const MARK_CLASS = 'canvas-search-hl';
const LEXICAL_HIGHLIGHT_NAME = 'lexical-search-hl';
const LEXICAL_ACTIVE_HIGHLIGHT_NAME = 'lexical-search-hl-active';

// ── CSS Custom Highlight API (Lexical) ──────────────────────────────────────

/** Inject the ::highlight rules once. Keyed by data-attr so HMR reloads don't duplicate it. */
function ensureCSSHighlightStyle() {
  if (document.head.querySelector('style[data-lexical-hl]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-lexical-hl', '');
  style.textContent = [
    `::highlight(${LEXICAL_HIGHLIGHT_NAME}) { background-color: #fef9c3; color: inherit; }`,
    `::highlight(${LEXICAL_ACTIVE_HIGHLIGHT_NAME}) { background-color: #fde047; color: inherit; }`,
  ].join('\n');
  document.head.appendChild(style);
}

/** Clear any existing CSS Custom Highlights for Lexical notes. */
export function clearLexicalHighlight(): void {
  if (typeof CSS !== 'undefined' && CSS.highlights) {
    CSS.highlights.delete(LEXICAL_HIGHLIGHT_NAME);
    CSS.highlights.delete(LEXICAL_ACTIVE_HIGHLIGHT_NAME);
  }
}

/**
 * Apply CSS Custom Highlight API highlights for Lexical notes.
 * Walks all text nodes inside `container`, creates Range objects for every
 * match, and registers them as a named CSS highlight — no DOM mutations.
 *
 * All matches get a light yellow highlight; the match at `matchIndex` gets
 * a bright yellow highlight on top. Returns that range for scrolling, or null.
 */
export function applyLexicalHighlight(
  container: HTMLElement,
  query: string,
  matchIndex = 0,
): Range | null {
  clearLexicalHighlight();
  if (!query.trim()) return null;
  if (typeof CSS === 'undefined' || !CSS.highlights) return null;

  ensureCSSHighlightStyle();

  const q = query.toLowerCase();
  // @ts-ignore — CSS Highlight API not yet in all TS libs
  const hl = new Highlight();
  const allRanges: Range[] = [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent || '';
    const lo = text.toLowerCase();
    let idx = lo.indexOf(q);
    while (idx !== -1) {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + query.length);
      hl.add(range);
      allRanges.push(range);
      idx = lo.indexOf(q, idx + query.length);
    }
  }

  if (allRanges.length === 0) return null;

  // @ts-ignore
  CSS.highlights.set(LEXICAL_HIGHLIGHT_NAME, hl);

  // Layer the active highlight on top of the base one
  const activeRange = allRanges[matchIndex] ?? allRanges[0];
  // @ts-ignore
  const activeHl = new Highlight();
  activeHl.add(activeRange);
  // @ts-ignore
  CSS.highlights.set(LEXICAL_ACTIVE_HIGHLIGHT_NAME, activeHl);

  return activeRange;
}

/** Remove all search highlight marks from a container, restoring text nodes. */
export function clearSearchHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll(`mark.${MARK_CLASS}`);
  if (marks.length === 0) return;
  const parents = new Set<Node>();
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
    parents.add(parent);
  });
  // Batch normalize — one pass per unique parent instead of one per mark
  parents.forEach((p) => (p as Element).normalize());
}

/**
 * Walk text nodes in `container`, wrap every occurrence of `query` in a
 * <mark class="canvas-search-hl"> element.
 *
 * All matches get a light yellow background; the match at `activeMatchIndex`
 * gets a bright yellow background and is scrolled into view.
 *
 * Returns the active mark element, or null if no match found.
 */
export function applySearchHighlights(
  container: HTMLElement,
  query: string,
  activeMatchIndex = 0,
): HTMLElement | null {
  if (!query.trim()) return null;
  const q = query.toLowerCase();
  let globalCount = 0;
  let activeMark: HTMLElement | null = null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      // Skip invisible/structural nodes and already-marked text
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
      if (parent.classList.contains(MARK_CLASS)) return NodeFilter.FILTER_REJECT;
      return (node.textContent?.toLowerCase().includes(q))
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  // Collect first so we don't mutate during traversal
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) textNodes.push(node as Text);

  for (const textNode of textNodes) {
    const text = textNode.textContent || '';
    const lo = text.toLowerCase();
    let cursor = 0;
    let matchIdx = lo.indexOf(q, cursor);
    if (matchIdx === -1) continue;

    const fragment = document.createDocumentFragment();
    while (matchIdx !== -1) {
      if (matchIdx > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, matchIdx)));
      }
      const mark = document.createElement('mark');
      mark.className = MARK_CLASS;
      const isActive = globalCount === activeMatchIndex;
      mark.style.cssText = isActive
        ? 'background:#fde047;color:inherit;border-radius:2px;padding:0 1px;'
        : 'background:#fef9c3;color:inherit;border-radius:2px;padding:0 1px;';
      mark.textContent = text.slice(matchIdx, matchIdx + query.length);
      fragment.appendChild(mark);
      if (isActive) activeMark = mark;
      globalCount++;
      cursor = matchIdx + query.length;
      matchIdx = lo.indexOf(q, cursor);
    }
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  if (activeMark) {
    activeMark.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  return activeMark;
}
