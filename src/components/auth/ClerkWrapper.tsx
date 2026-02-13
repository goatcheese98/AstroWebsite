import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key");
}

export function ClerkWrapper({ children }: { children: ReactNode }) {
    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            {children}
        </ClerkProvider>
    );
}
