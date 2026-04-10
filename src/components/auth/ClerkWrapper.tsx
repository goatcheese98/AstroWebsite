import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

const BUILD_TIME_PUBLISHABLE_KEY = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

function getInjectedPublishableKey() {
    if (typeof document === 'undefined') {
        return null;
    }

    return document
        .querySelector<HTMLScriptElement>('script[data-clerk-js-script]')
        ?.getAttribute('data-clerk-publishable-key') ?? null;
}

export const isClerkEnabled = Boolean(BUILD_TIME_PUBLISHABLE_KEY);

interface ClerkWrapperProps {
    children: ReactNode;
    fallback?: ReactNode;
    publishableKey?: string | null;
}

export function ClerkWrapper({ children, fallback = null, publishableKey = null }: ClerkWrapperProps) {
    const [resolvedPublishableKey, setResolvedPublishableKey] = useState(
        () => publishableKey || BUILD_TIME_PUBLISHABLE_KEY || getInjectedPublishableKey()
    );

    useEffect(() => {
        if (resolvedPublishableKey) {
            return;
        }

        setResolvedPublishableKey(getInjectedPublishableKey());
    }, [resolvedPublishableKey]);

    if (!resolvedPublishableKey) {
        return <>{fallback}</>;
    }

    return (
        <ClerkProvider publishableKey={resolvedPublishableKey}>
            {children}
        </ClerkProvider>
    );
}
