/**
 * User Menu Component
 * Displays user info and logout option
 */

import { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch current session
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/get-session', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              avatarUrl: data.user.image,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, []);

  useEffect(() => {
    // Close menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  if (loading) {
    return (
      <div className="user-menu-loading">
        <div className="skeleton-avatar"></div>
      </div>
    );
  }

  if (!user) {
    // Not logged in - show login button
    return (
      <div className="auth-buttons">
        <a href="/login" className="btn-secondary">
          Sign In
        </a>
        <a href="/signup" className="btn-primary">
          Sign Up
        </a>
      </div>
    );
  }

  // Logged in - show user menu
  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name || user.email} className="user-avatar" />
        ) : (
          <div className="user-avatar-placeholder">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
        )}
        <span className="user-name">{user.name || user.email}</span>
        <svg
          className={`dropdown-icon ${isOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-info">
              <div className="user-info-name">{user.name || 'User'}</div>
              <div className="user-info-email">{user.email}</div>
            </div>
          </div>

          <div className="user-menu-divider"></div>

          <nav className="user-menu-nav">
            <a href="/dashboard" className="menu-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="2" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Dashboard
            </a>

            <a href="/canvases" className="menu-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              My Canvases
            </a>

            <a href="/settings" className="menu-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.5 3.5L11.5 4.5M4.5 11.5L3.5 12.5M12.5 12.5L11.5 11.5M4.5 4.5L3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Settings
            </a>
          </nav>

          <div className="user-menu-divider"></div>

          <button onClick={handleLogout} className="menu-item logout-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5C2 2.67157 2.67157 2 3.5 2H6M11 11L14 8M14 8L11 5M14 8H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
