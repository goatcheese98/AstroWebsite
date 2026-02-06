/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    🎯 CanvasContextOverlay.tsx                               ║
 * ║                 "The Compact Context Indicator"                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 📊 Info Overlay | 💫 Translucent              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * 👤 WHO AM I?
 * I am a small, translucent overlay that floats at the top of the chat message area,
 * showing canvas context information without taking up dedicated screen space.
 * I'm minimal, unobtrusive, and provide quick context at a glance.
 *
 * @module CanvasContextOverlay
 */

import React from "react";
import type { CanvasElementSnapshot } from "../types";

export interface CanvasContextOverlayProps {
    /** Current context mode */
    contextMode: "all" | "selected";
    /** Callback when mode changes */
    onContextModeChange: (mode: "all" | "selected") => void;
    /** Selected element IDs */
    selectedElements: string[];
    /** Element snapshots for display */
    elementSnapshots: Map<string, CanvasElementSnapshot>;
    /** Total canvas element count */
    canvasElementCount: number;
    /** Callback to clear selection */
    onClearSelection: () => void;
}

/**
 * Compact translucent canvas context overlay
 */
export function CanvasContextOverlay({
    contextMode,
    onContextModeChange,
    selectedElements,
    elementSnapshots,
    canvasElementCount,
    onClearSelection,
}: CanvasContextOverlayProps) {
    const isAllMode = contextMode === "all";
    const isSelectedMode = contextMode === "selected";

    // Calculate element type counts for summary
    const elementCounts = React.useMemo(() => {
        if (!elementSnapshots.size) return {};
        const counts: Record<string, number> = {};
        elementSnapshots.forEach((snapshot) => {
            counts[snapshot.type] = (counts[snapshot.type] || 0) + 1;
        });
        return counts;
    }, [elementSnapshots]);

    // Build summary text
    const summaryText = React.useMemo(() => {
        if (isSelectedMode && selectedElements.length > 0) {
            const types = Object.entries(elementCounts)
                .slice(0, 2)
                .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                .join(', ');
            return types || `${selectedElements.length} selected`;
        } else if (isAllMode && canvasElementCount > 0) {
            const types = Object.entries(elementCounts)
                .slice(0, 2)
                .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                .join(', ');
            return types || `${canvasElementCount} elements`;
        }
        return null;
    }, [isSelectedMode, isAllMode, selectedElements, canvasElementCount, elementCounts]);

    if (!summaryText) return null;

    return (
        <div
            style={{
                position: "absolute",
                top: "12px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "16px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                fontSize: "11px",
                fontWeight: 500,
                color: "#374151",
                zIndex: 1,
                pointerEvents: "none",
                transition: "all 0.2s ease",
            }}
        >
            {/* Summary Text */}
            {summaryText}
        </div>
    );
}

export default CanvasContextOverlay;
