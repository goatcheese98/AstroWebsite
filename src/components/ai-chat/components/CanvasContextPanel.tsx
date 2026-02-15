import React from "react";
import type { CanvasElementSnapshot } from "../types";

export interface CanvasContextPanelProps {
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
 * Get icon for element type
 */
function getElementTypeIcon(type: string): string {
    switch (type) {
        case "rectangle": return "▭";
        case "diamond": return "◇";
        case "ellipse": return "○";
        case "text": return "T";
        case "arrow": return "→";
        case "line": return "/";
        default: return "◆";
    }
}

/**
 * Canvas context selection panel
 */
export function CanvasContextPanel({
    contextMode,
    onContextModeChange,
    selectedElements,
    elementSnapshots,
    canvasElementCount,
    onClearSelection,
}: CanvasContextPanelProps) {
    const isAllMode = contextMode === "all";
    const isSelectedMode = contextMode === "selected";
    const hasSelected = selectedElements.length > 0;
    const hasSnapshots = elementSnapshots.size > 0;

    // Calculate element type counts for "All" mode summary
    const elementCounts = React.useMemo(() => {
        if (!elementSnapshots.size) return {};
        const counts: Record<string, number> = {};
        elementSnapshots.forEach((snapshot) => {
            counts[snapshot.type] = (counts[snapshot.type] || 0) + 1;
        });
        return counts;
    }, [elementSnapshots]);

    return (
        <div style={{
            padding: "14px 18px",
            background: "var(--color-fill-1, #f3f4f6)",
            borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
            flexShrink: 0,
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
            }}>
                <span style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--color-text-muted, #6b7280)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                }}>
                    Canvas Context
                </span>
                {canvasElementCount > 0 && (
                    <span style={{
                        fontSize: "11px",
                        color: "var(--color-text-muted, #6b7280)",
                    }}>
                        {canvasElementCount} elements
                    </span>
                )}
            </div>

            {/* Mode Toggle */}
            <div style={{
                display: "flex",
                background: "var(--color-surface, #ffffff)",
                borderRadius: "8px",
                padding: "3px",
                border: "1px solid var(--color-stroke-muted, #e5e7eb)",
            }}>
                {/* All Elements Button */}
                <button
                    onClick={() => {
                        onContextModeChange("all");
                        onClearSelection();
                    }}
                    style={{
                        flex: 1,
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: isAllMode ? "1px solid #047857" : "1px solid #fca5a5",
                        background: isAllMode ? "#059669" : "#fee2e2",
                        color: isAllMode ? "white" : "#9ca3af",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                >
                    All Elements
                </button>

                {/* Selected Elements Button */}
                <button
                    onClick={() => onContextModeChange("selected")}
                    style={{
                        flex: 1,
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: isSelectedMode ? "1px solid #059669" : "1px solid #fca5a5",
                        background: isSelectedMode ? "#10b981" : "#fee2e2",
                        color: isSelectedMode ? "white" : "#9ca3af",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                >
                    Selected ({selectedElements.length})
                </button>
            </div>

            {/* Selection Tip */}
            {isSelectedMode && (
                <div style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    background: "var(--color-surface, #ffffff)",
                    borderRadius: "6px",
                    border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                }}>
                    <div style={{
                        fontSize: "11px",
                        color: "var(--color-text-muted, #6b7280)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                        💡 Hold <strong>Shift</strong> to multi-select items on canvas
                    </div>
                </div>
            )}

            {/* Selected Elements Preview */}
            {isSelectedMode && hasSelected && hasSnapshots && (
                <div style={{
                    marginTop: "10px",
                    padding: "10px",
                    background: "var(--color-surface, #ffffff)",
                    borderRadius: "8px",
                    border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    maxHeight: "120px",
                    overflowY: "auto",
                }}>
                    <div style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                    }}>
                        {Array.from(elementSnapshots.values()).map((snapshot) => (
                            <div
                                key={snapshot.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "5px 10px",
                                    background: "var(--color-fill-2, #e5e7eb)",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                }}
                            >
                                <span style={{ fontSize: "12px" }}>
                                    {getElementTypeIcon(snapshot.type)}
                                </span>
                                <span style={{
                                    maxWidth: "80px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}>
                                    {snapshot.text || snapshot.type}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Elements Summary */}
            {isAllMode && canvasElementCount > 0 && Object.keys(elementCounts).length > 0 && (
                <div style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "var(--color-text-muted, #6b7280)",
                }}>
                    {Object.entries(elementCounts)
                        .slice(0, 4)
                        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                        .join(', ')}
                </div>
            )}
        </div>
    );
}

export default CanvasContextPanel;
