import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

export const isClerkEnabled = Boolean(PUBLISHABLE_KEY);

interface ClerkWrapperProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function ClerkWrapper({ children, fallback = null }: ClerkWrapperProps) {
    if (!isClerkEnabled) {
        return <>{fallback}</>;
    }

    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            {children}
        </ClerkProvider>
    );
}
