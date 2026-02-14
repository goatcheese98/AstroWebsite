import { useState, useEffect } from "react";
import { ClerkProvider } from '@clerk/clerk-react';
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
    // Detect new canvas intent
    const [isNewCanvas] = useState(() => {
        if (typeof window === 'undefined') return false;
        return new URLSearchParams(window.location.search).get('new') === 'true';
    });

    // Clear local Excalidraw state if needed
    useEffect(() => {
        if (isNewCanvas) {
            // Clear internal Excalidraw keys
            localStorage.removeItem('excalidraw');
            localStorage.removeItem('excalidraw-state');
            localStorage.removeItem('version-files');
            localStorage.removeItem('version-data');
            // Clear our custom persistence key
            localStorage.removeItem('excalidraw-canvas-data');

            // Clean up URL
            window.history.replaceState({}, '', '/ai-canvas');
        }
    }, [isNewCanvas]);

    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <div className="canvas-container" style={{ width: '100%', height: '100%', position: 'relative', background: '#ffffff' }}>
                <ExcalidrawCanvas shouldClearOnMount={isNewCanvas} />
                <CanvasApp />
            </div>
        </ClerkProvider>
    );
}
