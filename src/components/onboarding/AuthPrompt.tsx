/**
 * AuthPrompt — non-intrusive bottom banner prompting sign-in
 * Triggers after 2 minutes of activity OR 5+ elements drawn OR clicking "Save"
 * Dismissible per session
 */

import { useState, useEffect, useRef } from 'react';
import { authClient } from '@/lib/auth-client';

interface AuthPromptProps {
  elementCount: number;
  onSaveAttempt?: boolean;
}

export default function AuthPrompt({ elementCount, onSaveAttempt }: AuthPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('astroweb-auth-prompt-dismissed')) {
      setIsDismissed(true);
      return;
    }

    // Show after 2 minutes
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 120_000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Show if 5+ elements drawn
  useEffect(() => {
    if (elementCount >= 5 && !isDismissed) {
      setIsVisible(true);
    }
  }, [elementCount, isDismissed]);

  // Show on save attempt
  useEffect(() => {
    if (onSaveAttempt && !isDismissed) {
      setIsVisible(true);
    }
  }, [onSaveAttempt, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem('astroweb-auth-prompt-dismissed', '1');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.href,
      });
    } catch {
      setLoading(false);
    }
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 20px',
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      zIndex: 998,
      maxWidth: '480px',
      width: '90%',
      animation: 'slideUp 0.3s ease',
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ flexShrink: 0 }}>
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>

      <span style={{ flex: 1, fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
        Sign in to save your work to the cloud
      </span>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#374151',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.2s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </button>

      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          color: '#9ca3af',
          lineHeight: 0,
        }}
        title="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
