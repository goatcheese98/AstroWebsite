import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

const HINT_DURATION_MS = 1800;

/** Shared canvas selector — tries the interactive canvas first, then falls back. */
function getExcalidrawCanvas(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('.excalidraw__canvas.interactive') ??
    document.querySelector<HTMLElement>('.excalidraw canvas:last-of-type') ??
    document.querySelector<HTMLElement>('.excalidraw canvas') ??
    document.querySelector<HTMLElement>('.excalidraw')
  );
}

/**
 * Forward a wheel event to Excalidraw as a ZOOM gesture (ctrlKey=true).
 * Used for Ctrl+scroll / pinch pass-through so Excalidraw's own handler runs.
 */
function zoomCanvas(e: WheelEvent) {
  const canvas = getExcalidrawCanvas();
  if (!canvas) return;
  canvas.dispatchEvent(
    new WheelEvent('wheel', {
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      deltaMode: e.deltaMode,
      ctrlKey: true,
      clientX: e.clientX,
      clientY: e.clientY,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}

/**
 * Forward a wheel event to Excalidraw as a PAN gesture (no ctrlKey).
 * Excalidraw pans on deltaX (horizontal) and deltaY (vertical) when ctrlKey is absent.
 * Used for ⌘+scroll so the user can pan the canvas without deselecting the element.
 */
function panCanvas(e: WheelEvent) {
  const canvas = getExcalidrawCanvas();
  if (!canvas) return;
  canvas.dispatchEvent(
    new WheelEvent('wheel', {
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      deltaMode: e.deltaMode,
      ctrlKey: false,
      shiftKey: e.shiftKey,
      clientX: e.clientX,
      clientY: e.clientY,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}

/**
 * Unified wheel-event handler for custom canvas overlay elements.
 *
 * - ctrlKey (pinch / Ctrl+scroll) → forward to Excalidraw as zoom
 * - metaKey / ⌘+scroll            → forward to Excalidraw as pan (horizontal + vertical)
 * - plain scroll while selected   → block + show hint
 *
 * Uses a non-passive addEventListener so preventDefault() reliably works.
 *
 * @param containerRef   Outermost div ref of the overlay element.
 * @param hintCondition  When true, plain scroll shows the hint.
 * @param panCondition   When true, ⌘/meta+scroll pans the canvas.
 *                       Defaults to hintCondition; pass separately for MarkdownNote
 *                       where panning should work even in scroll/edit mode.
 */
export function useZoomHint(
  containerRef: RefObject<HTMLElement | null>,
  hintCondition: boolean,
  panCondition?: boolean,
) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track conditions in refs so the stable listener never needs to be re-attached
  const hintRef = useRef(hintCondition);
  const panRef = useRef(panCondition ?? hintCondition);
  useEffect(() => { hintRef.current = hintCondition; }, [hintCondition]);
  useEffect(() => { panRef.current = panCondition ?? hintCondition; }, [panCondition, hintCondition]);

  // Global capture-phase listener: when this element is selected (panRef.current),
  // intercept ⌘+wheel events fired anywhere on the page — including on the Excalidraw
  // canvas itself — so the cursor moving off the element while ⌘ is held doesn't
  // trigger Excalidraw's own zoom. We forward them as pan instead.
  useEffect(() => {
    const handleGlobalMetaWheel = (e: WheelEvent) => {
      if (!e.metaKey) return;
      if (!panRef.current) return;
      // Events that land on our own element are handled by the element-level listener below
      if (containerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      panCanvas(e);
    };
    document.addEventListener('wheel', handleGlobalMetaWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', handleGlobalMetaWheel, { capture: true });
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // ctrlKey: pinch-to-zoom or Ctrl+scroll — forward as zoom so Excalidraw handles it
      if (e.ctrlKey) {
        if (!panRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        zoomCanvas(e);
        return;
      }

      // metaKey (⌘ on Mac): pan the canvas horizontally / vertically
      if (e.metaKey) {
        if (!panRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        panCanvas(e);
        return;
      }

      // Plain scroll: let it propagate naturally (content inside the element scrolls
      // as expected). The hint is informational only — we don't consume the event.
      if (!hintRef.current) return;
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), HINT_DURATION_MS);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { visible };
}
