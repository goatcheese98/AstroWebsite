import { useState } from "react";
import { useStore } from "@/stores";

interface DrawingActionsProps {
  drawingCommand: any[];
  canvasState?: any;
}

/**
 * Action buttons for drawing commands
 * - Add to Canvas (primary action)
 * - Copy JSON (for debugging/advanced use)
 * - Copy SVG (for export)
 */
export function DrawingActions({ drawingCommand, canvasState }: DrawingActionsProps) {
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [addedToCanvas, setAddedToCanvas] = useState(false);
  const dispatchCommand = useStore((state) => state.dispatchCommand);

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

  const copySvg = async () => {
    try {
      if (!drawingCommand?.length) return;

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

      if (!svg?.outerHTML) return;

      await navigator.clipboard.writeText(svg.outerHTML);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch (err) {
      console.error("Failed to copy SVG:", err);
    }
  };

  const addToCanvas = async () => {
    try {
      if (!drawingCommand?.length) return;

      await dispatchCommand("drawElements", {
        elements: drawingCommand,
        isModification: false,
      });

      setAddedToCanvas(true);
      setTimeout(() => setAddedToCanvas(false), 2000);
    } catch (err) {
      console.error("Failed to add to canvas:", err);
    }
  };

  return (
    <div className="flex gap-1.5 mt-1 ml-2.5 flex-wrap">
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
    </div>
  );
}

export default DrawingActions;
