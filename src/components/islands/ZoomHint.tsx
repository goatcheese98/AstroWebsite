import React from 'react';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const modKey = isMac ? '⌘' : 'Ctrl';

interface ZoomHintProps {
  visible: boolean;
  bottom?: number;
}

/**
 * Unified overlay hint shown when the user scrolls over a selected custom canvas
 * element (WebEmbed, MarkdownNote, LexicalNote, KanbanBoard).
 *
 * Tells the user they need to click outside first to use scroll-to-zoom,
 * and advertises the ⌘/Ctrl+scroll shortcut that works without deselecting.
 */
export const ZoomHint: React.FC<ZoomHintProps> = ({ visible, bottom = 12 }) => (
  <div
    style={{
      position: 'absolute',
      bottom,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(15, 23, 42, 0.76)',
      color: '#f1f5f9',
      borderRadius: 20,
      padding: '5px 12px 5px 10px',
      fontSize: 11.5,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.2s ease',
      letterSpacing: '0.01em',
    }}
  >
    {/* Zoom icon */}
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>

    {/* Shortcut badge */}
    <span
      style={{
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 5,
        padding: '1px 5px',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      {modKey}+Scroll
    </span>

    <span style={{ color: 'rgba(241,245,249,0.7)' }}>to pan · or</span>

    <span>click outside first</span>
  </div>
);
