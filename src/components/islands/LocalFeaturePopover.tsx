/**
 * LocalFeaturePopover — gentle sign-in nudge popover
 * Appears above the "Local" badge when clicked.
 * Shows benefits of signing in without forcing it.
 */

import { useEffect, useRef } from 'react';

interface LocalFeaturePopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LocalFeaturePopover({ isOpen, onClose }: LocalFeaturePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click-away dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid closing immediately from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignIn = () => {
    window.location.href = '/login';
  };

  return (
    <>
      <style>{`
        @keyframes popoverFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          bottom: '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          maxWidth: '300px',
          width: '90vw',
          padding: '24px',
          zIndex: 60,
          animation: 'popoverFadeIn 0.2s ease',
        }}
      >
        {/* Caret arrow pointing down */}
        <div
          style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '12px',
            height: '12px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderTop: 'none',
            borderLeft: 'none',
          }}
        />

        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: '#111827',
          fontFamily: 'var(--font-ui, sans-serif)',
        }}>
          You're working locally
        </h3>

        <p style={{
          margin: '0 0 20px 0',
          fontSize: '0.8rem',
          color: '#6b7280',
          lineHeight: 1.5,
        }}>
          Your canvas is saved in this browser. Sign in to unlock:
        </p>

        {/* Benefits list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {/* Cloud save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
            <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>Auto-save to the cloud</span>
          </div>
          {/* Multiple canvases */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>Multiple canvases</span>
          </div>
          {/* Version history */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>Version history</span>
          </div>
        </div>

        {/* Sign in with Google button */}
        <button
          onClick={handleSignIn}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 16px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#111827',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '12px',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#9ca3af';
            (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
            (e.currentTarget as HTMLButtonElement).style.background = 'white';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>

        {/* Continue locally link */}
        <button
          onClick={onClose}
          style={{
            display: 'block',
            width: '100%',
            background: 'none',
            border: 'none',
            fontSize: '0.8rem',
            color: '#9ca3af',
            cursor: 'pointer',
            textAlign: 'center',
            padding: '4px',
            fontWeight: 500,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#6b7280'}
          onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
        >
          Continue locally
        </button>
      </div>
    </>
  );
}
