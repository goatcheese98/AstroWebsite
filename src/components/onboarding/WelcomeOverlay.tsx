/**
 * WelcomeOverlay — first-visit only, minimal design
 * Options: blank canvas, browse templates, sign in
 */

import { useState, useEffect } from 'react';

interface WelcomeOverlayProps {
  onStartBlank: () => void;
  onBrowseTemplates: () => void;
  onSignIn: () => void;
  onDismiss?: () => void;
}

const VISITED_KEY = 'astroweb-visited';

export default function WelcomeOverlay({ onStartBlank, onBrowseTemplates, onSignIn, onDismiss }: WelcomeOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(VISITED_KEY)) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = (action: () => void) => {
    localStorage.setItem(VISITED_KEY, '1');
    setIsVisible(false);
    onDismiss?.();
    action();
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 1100,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '360px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        border: '1px solid #eee',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5" style={{ margin: '0 auto' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 8v8M8 12h8" strokeLinecap="round" />
          </svg>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
          Welcome to AI Canvas
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 24px', lineHeight: 1.4 }}>
          A minimal workspace for diagrams and ideas powered by AI.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => handleDismiss(onStartBlank)}
            style={{
              padding: '12px',
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#000'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#111827'}
          >
            Start with blank canvas
          </button>

          <button
            onClick={() => handleDismiss(onBrowseTemplates)}
            style={{
              padding: '12px',
              background: '#f9fafb',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
          >
            Browse templates
          </button>

          <button
            onClick={() => handleDismiss(onSignIn)}
            style={{
              marginTop: '12px',
              background: 'none',
              color: '#6b7280',
              border: 'none',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            Sign in to your account
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
