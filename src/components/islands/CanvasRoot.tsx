/**
 * CanvasRoot - Backward Compatibility Wrapper
 * 
 * @deprecated Use CanvasContainer from '@/components/canvas' directly instead.
 * This component is kept for gradual migration only.
 * 
 * Before:
 *   import CanvasRoot from './CanvasRoot';
 *   <CanvasRoot />
 * 
 * After:
 *   import { CanvasContainer } from '@/components/canvas';
 *   <CanvasContainer />
 */

import { useState, useEffect } from "react";
import { CanvasContainer } from '../canvas';

export default function CanvasRoot() {
    const [shouldClearOnMount, setShouldClearOnMount] = useState(false);

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

            // Signal that we should clear on mount
            setShouldClearOnMount(true);
        }
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#ffffff' }}>
            <CanvasContainer shouldClearOnMount={shouldClearOnMount} />
        </div>
    );
}
