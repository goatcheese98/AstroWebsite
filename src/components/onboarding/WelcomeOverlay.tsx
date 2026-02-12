/**
 * WelcomeOverlay — first-visit only, minimal design
 * Options: blank canvas, browse templates, sign in
 */

import { useState, useEffect } from 'react';

interface WelcomeOverlayProps {
  onStartBlank: () => void;
  onBrowseTemplates: () => void;
  onSignIn: () => void;
}

const VISITED_KEY = 'astroweb-visited';

export default function WelcomeOverlay({ onStartBlank, onBrowseTemplates, onSignIn }: WelcomeOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(VISITED_KEY)) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = (action: () => void) => {
    localStorage.setItem(VISITED_KEY, '1');
    setIsVisible(false);
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
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 1100,
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px 32px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ marginBottom: '8px', fontSize: '2rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ margin: '0 auto' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <path d="M12 8v8M8 12h8" strokeLinecap="round"/>
          </svg>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', margin: '0 0 8px' }}>
          Welcome to AstroWeb
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: '0 0 28px', lineHeight: 1.5 }}>
          AI-powered canvas for diagrams, wireframes, and ideas.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => handleDismiss(onStartBlank)}
            style={{
              padding: '14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.15s',
            }}
          >
            Start with blank canvas
          </button>

          <button
            onClick={() => handleDismiss(onBrowseTemplates)}
            style={{
              padding: '14px',
              background: 'white',
              color: '#374151',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            Browse templates
          </button>

          <button
            onClick={() => handleDismiss(onSignIn)}
            style={{
              padding: '10px',
              background: 'none',
              color: '#6b7280',
              border: 'none',
              fontSize: '0.9rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
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
