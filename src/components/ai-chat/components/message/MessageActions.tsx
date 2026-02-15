import { useState } from "react";
import { nanoid } from "nanoid";

interface MessageActionsProps {
    /** Text content to copy */
    textContent: string;
    /** Optional source code (Mermaid/JSON) to show as note */
    sourceCode?: string;
}

/**
 * Action buttons for AI messages - Copy and Show Code
 */
export function MessageActions({ textContent, sourceCode }: MessageActionsProps) {
    const [copied, setCopied] = useState(false);
    const [showingCode, setShowingCode] = useState(false);

    /**
     * Copy message text to clipboard
     */
    const copyMessage = async () => {
        try {
            await navigator.clipboard.writeText(textContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy message:", err);
        }
    };

    /**
     * Show source code (Mermaid or JSON) as markdown note on canvas
     */
    const showCode = async () => {
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
            const codeToShow = sourceCode || textContent;

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
                    content: codeToShow,
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

    const hasSourceCode = !!sourceCode;

    return (
        <div className="flex gap-1.5 mt-1 ml-2.5 flex-wrap">
            {/* Copy Button */}
            <button
                onClick={copyMessage}
                title="Copy message"
                className={`message-action-btn ${copied ? 'message-action-btn--success' : ''}`}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "Copied!" : "Copy"}
            </button>

            {/* Show Code Button */}
            {hasSourceCode && (
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
