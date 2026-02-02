/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    🎯 CanvasContextPanel.tsx                                 ║
 * ║                    "The Context Selector"                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 🎛️ Control Panel | 📊 Info Display            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the control panel that lets users choose what canvas context to send to the AI.
 * I provide a toggle between "All Elements" (entire canvas) and "Selected" (specific
 * items). When in "Selected" mode, I show preview chips of what's selected and tips
 * for multi-selection.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users often want to ask the AI about specific parts of their drawing, not the
 * entire canvas. I provide that control:
 * - "All" mode: AI sees everything (good for overall feedback)
 * - "Selected" mode: AI sees only chosen elements (good for targeted questions)
 * - Visual preview: Users confirm what's being sent to AI
 * - Multi-selection tips: Users learn Shift+click to select multiple items
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  Excalidraw │─────▶│      ME      │◀─────│   User      │   │
 *      │   │ (selection  │      │(CanvasContext│      │  (toggles)  │   │
 *      │   │   changes)  │      │   Panel)     │      │             │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │           ┌───────────────────┼───────────────────┐            │
 *      │           ▼                   ▼                   ▼            │
 *      │   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
 *      │   │setContextMode│   │clearSelection│    │ Element     │       │
 *      │   │  ("all"/    │    │ (when switch │    │ Snapshots   │       │
 *      │   │"selected")  │    │  to "all")   │    │  (preview)  │       │
 *      │   └─────────────┘    └──────────────┘    └─────────────┘       │
 *      │                                                                  │
 *      │   I DISPLAY: Selected element count, element type icons          │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Toggle doesn't switch modes, preview chips missing, wrong counts
 * - User Impact: AI gets wrong context, confusing user experience
 * - Quick Fix: Check contextMode prop values are exactly "all" | "selected"
 * - Debug: Verify selectedElements array is being passed correctly
 * - Common Issue: Snapshots Map not updating - check elementSnapshots prop
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ contextMode         │ Current mode ("all" | "selected")                    │
 * │ onContextModeChange │ Callback when user toggles mode                    │
 * │ selectedElements    │ Array of selected element IDs                        │
 * │ elementSnapshots    │ Map of element ID → snapshot data                    │
 * │ canvasElementCount  │ Total number of elements on canvas                   │
 * │ onClearSelection    │ Callback to clear selection (when switching to all)  │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎨 VISUAL FEATURES:
 * - Mode toggle: Two buttons side by side
 * - "All" button: Green when active
 * - "Selected" button: Shows count, green when active
 * - Element chips: Show type icon + text preview
 * - Selection tip: Shift+click hint when in selected mode
 * 
 * 🔣 TYPE ICONS:
 * - Rectangle: ▭
 * - Diamond: ◇
 * - Ellipse: ○
 * - Text: T
 * - Arrow: →
 * - Line: /
 * - Other: ◆
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~150 lines of context UI)
 * 2026-02-02: Separated context selection from message list
 * 2026-02-02: Added proper TypeScript types for element snapshots
 * 
 * @module CanvasContextPanel
 */

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
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            <path d="M2 17l10 5 10-5"/>
                            <path d="M2 12l10 5 10-5"/>
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
