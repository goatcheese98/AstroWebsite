/**
 * User Menu Component
 * Displays user info and logout option
 */

import { useUser } from '@clerk/clerk-react';
import CanvasAvatar from '../islands/CanvasAvatar';
import { ClerkWrapper } from './ClerkWrapper';

/**
 * Standard UserMenu - self-contained with ClerkProvider
 * Use this in Astro files or standalone islands
 */
export function UserMenu() {
  return (
    <ClerkWrapper>
      <UserMenuPure />
    </ClerkWrapper>
  );
}

/**
 * Pure UserMenu - expects a parent ClerkProvider
 * Use this inside other React components that already have a provider
 */
export function UserMenuPure() {
  const { user, isLoaded, isSignedIn } = useUser();

  const avatarUser = user ? {
    id: user.id,
    name: user.fullName,
    email: user.primaryEmailAddress?.emailAddress,
    avatarUrl: user.imageUrl,
  } : null;

  return (
    <div className="user-menu">
      <CanvasAvatar
        user={avatarUser}
        isAuthenticated={isSignedIn || false}
        isLoading={!isLoaded}
      />
    </div>
  );
}
