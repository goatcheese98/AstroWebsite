/**
 * CanvasAvatarConnected
 *
 * Thin bridge between Clerk and CanvasAvatar.
 * - Wraps with ClerkProvider so it works as a standalone React island
 * - Reads auth state via useUser / useClerk hooks (always fresh, client-side)
 * - Owns the "Save to Cloud" action
 */

import { useUser, useClerk } from '@clerk/clerk-react';
import { useState } from 'react';
import { ClerkWrapper } from '../auth/ClerkWrapper';
import CanvasAvatar from '../islands/CanvasAvatar';
import { useUnifiedCanvasStore } from '@/stores';

function CanvasAvatarInner() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { canvasTitle, addToast } = useUnifiedCanvasStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToCloud = async () => {
    if (isSaving) return;

    const api = (window as any).excalidrawAPI;
    if (!api) {
      addToast('Canvas not ready', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const canvasData = {
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
      };

      const res = await fetch('/api/canvas/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: canvasTitle || 'Untitled Canvas', canvasData }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || 'Save failed');
      }

      addToast('Saved to cloud — view it in your Dashboard', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save to cloud', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarUser = user
    ? {
        id: user.id,
        name: user.fullName,
        email: user.primaryEmailAddress?.emailAddress,
        avatarUrl: user.imageUrl,
      }
    : null;

  return (
    <CanvasAvatar
      user={avatarUser}
      isAuthenticated={!!isSignedIn}
      isLoading={!isLoaded}
      signOut={signOut}
      openUserProfile={openUserProfile}
      onSaveToCloud={handleSaveToCloud}
      isSavingToCloud={isSaving}
    />
  );
}

export default function CanvasAvatarConnected() {
  return (
    <ClerkWrapper>
      <CanvasAvatarInner />
    </ClerkWrapper>
  );
}
