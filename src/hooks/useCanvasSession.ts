/**
 * useCanvasSession — resolves auth state + determines canvas persistence mode
 */

import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';

export interface CanvasSessionUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface CanvasSession {
  user: CanvasSessionUser | null;
  canvasId: string | null;
  isAnonymous: boolean;
  anonymousId: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  setCanvasId: (id: string | null) => void;
}

const ANONYMOUS_ID_KEY = 'astroweb-anonymous-id';

function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = nanoid();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

export function useCanvasSession(): CanvasSession {
  const [user, setUser] = useState<CanvasSessionUser | null>(null);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anonymousId] = useState(() => getOrCreateAnonymousId());

  // Check for canvas ID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCanvasId = params.get('canvas');
    if (urlCanvasId) {
      setCanvasId(urlCanvasId);
    }
  }, []);

  // Check auth state
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/get-session', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.user && !cancelled) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || undefined,
              avatarUrl: data.user.image || undefined,
            });
          }
        }
      } catch {
        // Not authenticated, stay anonymous
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkSession();
    return () => { cancelled = true; };
  }, []);

  const updateCanvasId = useCallback((id: string | null) => {
    setCanvasId(id);
    // Update URL without reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('canvas', id);
      } else {
        url.searchParams.delete('canvas');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return {
    user,
    canvasId,
    isAnonymous: !user,
    anonymousId,
    isLoading,
    isAuthenticated: !!user,
    setCanvasId: updateCanvasId,
  };
}
