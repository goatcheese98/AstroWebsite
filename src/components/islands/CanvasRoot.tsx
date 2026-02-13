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
    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <div className="canvas-container" style={{ width: '100%', height: '100%', position: 'relative', background: '#ffffff' }}>
                <ExcalidrawCanvas />
                <CanvasApp />
            </div>
        </ClerkProvider>
    );
}
