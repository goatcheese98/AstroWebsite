import { useState, useEffect } from "react";
import { ClerkProvider } from '@clerk/clerk-react';
import { ExcalidrawProvider } from '../../context';
import ExcalidrawCanvas from './ExcalidrawCanvas';
import CanvasApp from './CanvasApp';

// Load key from environment (Vite automatically replaces import.meta.env)
const PUBLISHABLE_KEY = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key");
}

/**
 * CanvasRoot: Wrapper for the entire canvas application
 * Ensures shared React context and Clerk provider if needed
 */
export default function CanvasRoot() {
    const [key, setKey] = useState(0); // Force remount key
    const [isReady, setIsReady] = useState(true);

    // Listen for URL changes to detect new canvas request
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const isNewCanvas = new URLSearchParams(window.location.search).get('new') === 'true';

        if (isNewCanvas) {
            console.log('🧹 New canvas requested - clearing storage');

            // Clear internal Excalidraw keys
            localStorage.removeItem('excalidraw');
            localStorage.removeItem('excalidraw-state');
            localStorage.removeItem('version-files');
            localStorage.removeItem('version-data');

            // Clear our custom persistence key
            localStorage.removeItem('excalidraw-canvas-data');

            // Clear image history
            localStorage.removeItem('excalidraw-image-history');

            // Clear current canvas ID from session
            sessionStorage.removeItem('astroweb-current-canvas-id');

            // Clean up URL (keep canvas clean without ?new=true)
            window.history.replaceState({}, '', '/ai-canvas');

            // Force ExcalidrawCanvas to remount with fresh state
            setKey(prev => prev + 1);
        }
    }, []); // Run only once on mount

    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <ExcalidrawProvider>
                <div className="canvas-container" style={{ width: '100%', height: '100%', position: 'relative', background: '#ffffff' }}>
                    {isReady && <ExcalidrawCanvas key={key} />}
                    <CanvasApp key={`app-${key}`} />
                </div>
            </ExcalidrawProvider>
        </ClerkProvider>
    );
}
