import { useState } from "react";
import { nanoid } from "nanoid";

interface DrawingActionsProps {
    /** Drawing command elements */
    drawingCommand: any[];
    /** Canvas state for export */
    canvasState?: any;
    /** Optional source code */
    sourceCode?: string;
}

/**
 * Action buttons for drawing commands
 * - Add to Canvas
 * - Copy JSON
 * - Copy SVG
 * - Show Code
 */
export function DrawingActions({ drawingCommand, canvasState, sourceCode }: DrawingActionsProps) {
    const [copiedJson, setCopiedJson] = useState(false);
    const [copiedSvg, setCopiedSvg] = useState(false);
    const [addedToCanvas, setAddedToCanvas] = useState(false);
    const [showingCode, setShowingCode] = useState(false);

    /**
     * Copy JSON to clipboard
     */
    const copyJson = async () => {
        try {
            const jsonStr = JSON.stringify(drawingCommand, null, 2);
            await navigator.clipboard.writeText(jsonStr);
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 2000);
        } catch (err) {
            console.error("Failed to copy JSON:", err);
        }
    };

    /**
     * Copy SVG to clipboard
     */
    const copySvg = async () => {
        try {
            if (!drawingCommand?.length) {
                console.error("No drawing command to copy");
                return;
            }

            const { exportToSvg } = await import("@excalidraw/excalidraw");
            const appState = {
                exportBackground: true,
                exportWithDarkMode: false,
                exportScale: 1,
                ...canvasState?.appState,
            };

            const svg = await exportToSvg({
                elements: drawingCommand,
                appState,
                files: canvasState?.files || {},
            });

            if (!svg?.outerHTML) {
                console.error("SVG export returned empty result");
                return;
            }

            await navigator.clipboard.writeText(svg.outerHTML);
            setCopiedSvg(true);
            setTimeout(() => setCopiedSvg(false), 2000);
        } catch (err) {
            console.error("Failed to copy SVG:", err);
        }
    };

    /**
     * Add drawing directly to canvas
     */
    const addToCanvas = () => {
        try {
            if (!drawingCommand?.length) {
                console.error("No drawing command to add to canvas");
                return;
            }

            window.dispatchEvent(new CustomEvent("excalidraw:draw", {
                detail: { elements: drawingCommand, isModification: false },
            }));
            setAddedToCanvas(true);
            setTimeout(() => setAddedToCanvas(false), 2000);
        } catch (err) {
            console.error("Failed to add to canvas:", err);
        }
    };

    /**
     * Show source code as markdown note on canvas
     */
    const showCode = async () => {
        if (!sourceCode) return;

        try {
            const excalidrawAPI = (window as any).excalidrawAPI;
            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            const appState = excalidrawAPI.getAppState();
            const viewportCenterX = appState.width / 2;
            const viewportCenterY = appState.height / 2;
            const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
            const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

            const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");

            const markdownElement = {
                type: "rectangle",
                x: sceneX - 250,
                y: sceneY - 175,
                width: 500,
                height: 350,
                backgroundColor: "#f8f9fa",
                strokeColor: "transparent",
                strokeWidth: 0,
                roughness: 0,
                opacity: 100,
                fillStyle: "solid",
                id: nanoid(),
                locked: false,
                customData: {
                    type: "markdown",
                    content: sourceCode,
                },
            };

            const converted = convertToExcalidrawElements([markdownElement]);
            const currentElements = excalidrawAPI.getSceneElements();

            excalidrawAPI.updateScene({
                elements: [...currentElements, ...converted],
            });

            setShowingCode(true);
            setTimeout(() => setShowingCode(false), 2000);

            console.log("✅ Added source code as markdown note");
        } catch (err) {
            console.error("Failed to show code:", err);
        }
    };

    return (
        <div className="flex gap-1.5 mt-1 ml-2.5 flex-wrap">
            {/* Add to Canvas Button */}
            <button
                onClick={addToCanvas}
                title="Add to Canvas"
                className={`message-action-btn message-action-btn--primary ${addedToCanvas ? 'message-action-btn--success' : ''}`}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                {addedToCanvas ? "Added!" : "Add to Canvas"}
            </button>

            {/* JSON Copy Button */}
            <button
                onClick={copyJson}
                title="Copy JSON"
                className={`message-action-btn ${copiedJson ? 'message-action-btn--success' : ''}`}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
                {copiedJson ? "Copied!" : "JSON"}
            </button>

            {/* SVG Copy Button */}
            <button
                onClick={copySvg}
                title="Copy SVG"
                className={`message-action-btn ${copiedSvg ? 'message-action-btn--success' : ''}`}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
                {copiedSvg ? "Copied!" : "SVG"}
            </button>

            {/* Show Code Button */}
            {sourceCode && (
                <button
                    onClick={showCode}
                    title="Show source code (Mermaid/JSON) as note"
                    className={`message-action-btn message-action-btn--primary ${showingCode ? 'message-action-btn--success' : ''}`}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                    </svg>
                    {showingCode ? "Added!" : "Show Code"}
                </button>
            )}
        </div>
    );
}
