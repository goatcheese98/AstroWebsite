/**
 * CanvasAvatar — user avatar circle with dropdown menu
 * Positioned at top-left, offset to clear Excalidraw's hamburger menu.
 * Anonymous: generic silhouette → dropdown with grayed options + sign-in
 * Authenticated: profile picture → dropdown with nav links + sign out
 */

import { useState, useEffect, useRef } from 'react';
import { useClerk } from '@clerk/clerk-react';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

interface CanvasAvatarProps {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export default function CanvasAvatar({ user, isAuthenticated, isLoading }: CanvasAvatarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut, openUserProfile } = useClerk();

  // Click-away dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (isLoading) return null;

  const handleSignOut = () => {
    signOut(() => {
      window.location.href = '/';
    });
  };

  const initials = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : '?';

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: isAuthenticated ? '1.5px solid #d8b4fe' : '1.5px solid #e5e7eb',
          background: isAuthenticated
            ? (user?.avatarUrl ? `url(${user.avatarUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #8b5cf6, #7c3aed)')
            : '#f3f4f6',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          outline: 'none',
          transition: 'box-shadow 0.2s',
          boxShadow: isOpen ? '0 0 0 2px rgba(124,58,237,0.2)' : 'none',
        }}
        title={isAuthenticated ? (user?.name || user?.email || 'Account') : 'Guest'}
      >
        {/* Anonymous: silhouette SVG */}
        {!isAuthenticated && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#9ca3af" stroke="none">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
        {/* Authenticated without avatar URL: initials */}
        {isAuthenticated && !user?.avatarUrl && (
          <span style={{ color: 'white', fontSize: '13px', fontWeight: 700, lineHeight: 1 }}>
            {initials}
          </span>
        )}
        {/* Green online dot for authenticated */}
        {isAuthenticated && (
          <div style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
            border: '1.5px solid white',
          }} />
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          <style>{`
            @keyframes avatarMenuIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div
            style={{
              position: 'absolute',
              top: '38px',
              right: '0',
              background: 'white',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              minWidth: '210px',
              zIndex: 10,
              overflow: 'hidden',
              animation: 'avatarMenuIn 0.15s ease',
            }}
          >
            {/* --- Anonymous dropdown --- */}
            {!isAuthenticated && (
              <>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1f2937' }}>Guest User</div>
                </div>
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px' }}>
                  <button
                    onClick={() => { window.location.href = '/login'; }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '9px 14px',
                      background: 'white',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                  </button>
                </div>
              </>
            )}

            {/* --- Authenticated dropdown --- */}
            {isAuthenticated && user && (
              <>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1f2937' }}>
                    {user.name || 'User'}
                  </div>
                  {user.email && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                      {user.email}
                    </div>
                  )}
                </div>
                <div style={{ padding: '6px 0' }}>
                  <a
                    href="/ai-canvas"
                    style={{
                      display: 'block',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: '#374151',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = '#f9fafb'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
                  >
                    Create New Canvas
                  </a>
                  <a
                    href="/dashboard"
                    style={{
                      display: 'block',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: '#374151',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = '#f9fafb'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
                  >
                    Dashboard
                  </a>
                  <button
                    onClick={() => openUserProfile()}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: '#374151',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = '#f9fafb'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
                  >
                    Manage Account
                  </button>
                </div>
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '6px 0' }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: '#ef4444',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = '#fef2f2'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
                  >
                    Sign Out
                  </button>
                </div>
                <div style={{
                  padding: '10px 16px',
                  background: '#f9fafb',
                  borderTop: '1px solid #f3f4f6',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>Secured by</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14C10.866 14 14 10.866 14 7C14 3.13401 10.866 0 7 0Z" fill="#6C47FF" />
                        <path d="M9.10001 4.89999L5.60001 9.79999H4.20001L7.70001 4.89999H9.10001Z" fill="white" />
                      </svg>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>Clerk</span>
                    </div>
                  </div>
                  {import.meta.env.DEV && (
                    <div style={{
                      fontSize: '0.6rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      background: '#f3f4f6',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      Development Mode
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
