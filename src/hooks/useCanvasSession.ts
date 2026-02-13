/**
 * useCanvasSession — resolves auth state + determines canvas persistence mode
 */

import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useUser } from '@clerk/clerk-react';

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
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [anonymousId] = useState(() => getOrCreateAnonymousId());

  const user: CanvasSessionUser | null = isSignedIn && clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    name: clerkUser.fullName || clerkUser.username || undefined,
    avatarUrl: clerkUser.imageUrl,
  } : null;

  // Check for canvas ID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCanvasId = params.get('canvas');
    if (urlCanvasId) {
      setCanvasId(urlCanvasId);
    }
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
    isAnonymous: !isSignedIn,
    anonymousId,
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
    setCanvasId: updateCanvasId,
  };
}
