/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        🖥️ ChatPanel.tsx                                      ║
 * ║                    "The Chat's Home Container"                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 📐 Layout Container | 🖱️ Interaction Zone      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the physical container that houses the entire AI chat experience. I'm a
 * fixed-position panel that slides in from the right side of the screen. I have
 * a resize handle on my left edge and I cast a shadow to separate myself from
 * the canvas underneath.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users need a dedicated space for AI conversation that:
 * - Doesn't obstruct their drawing (slides in/out)
 * - Can be resized to their preference
 * - Has clear visual boundaries (shadow, border)
 * - Supports all chat interactions without layout issues
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
      │                    ┌─────────────────┐                           │
      │                    │   AIChatContainer │ (my parent - orchestrator)│
      │                    └────────┬────────┘                           │
      │                             │                                    │
      │                             ▼                                    │
      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
      │   │ ResizeHandle│─────▶│      ME      │◀─────│    Shadow   │   │
      │   │   (left)    │      │ (ChatPanel)  │      │   (visual)  │   │
      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
      │                               │                                │
      │           ┌───────────────────┼───────────────────┐            │
      │           ▼                   ▼                   ▼            │
      │   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
      │   │ChatHeader   │    │ MessageList  │    │ ChatInput   │       │
      │   └─────────────┘    └──────────────┘    └─────────────┘       │
      │                                                                  │
      │   I CONTAIN: All chat UI components stacked vertically           │
      │                                                                  │
      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Panel doesn't appear, wrong position, no resize handle
 * - User Impact: Can't access AI chat at all
 * - Quick Fix: Check isOpen prop, verify fixed positioning CSS
 * - Debug: Inspect element - should have position:fixed, right:0
 * - Common Issue: z-index too low - other elements overlay the panel
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isOpen              │ Whether panel should be visible                      │
 * │ width               │ Width in pixels                                      │
 * │ onResizeStart       │ Callback when user grabs resize handle               │
 * │ children            │ All the chat UI components inside                    │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎨 VISUAL FEATURES:
 * - Fixed position on right side
 * - Slide-in animation when opening
 * - Subtle shadow for depth
 * - 4px resize handle on left edge (invisible until hover)
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~40 lines of panel markup)
 * 2026-02-02: Separated container concerns from content concerns
 * 2026-02-02: Added forwardRef for parent component access
 * 
 * @module ChatPanel
 */

import React, { forwardRef } from "react";

export interface ChatPanelProps {
    /** Whether the panel is visible */
    isOpen: boolean;
    /** Current width in pixels */
    width: number;
    /** Callback when user starts dragging resize handle */
    onResizeStart: (e: React.MouseEvent) => void;
    /** All child components */
    children: React.ReactNode;
}

/**
 * Main chat panel container with resize handle
 */
export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(
    function ChatPanel({ isOpen, width, onResizeStart, children }, ref) {
        if (!isOpen) return null;
        
        return (
            <>
                {/* Main Panel */}
                <div
                    ref={ref}
                    className="ai-chat-container"
                    style={{
                        position: "fixed",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: `${width}px`,
                        background: "var(--color-surface, #ffffff)",
                        borderLeft: "1px solid var(--color-stroke-muted, #e5e7eb)",
                        boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.08)",
                        zIndex: 999,
                        display: "flex",
                        flexDirection: "column",
                        animation: "slideIn 0.25s ease",
                        pointerEvents: "auto",
                    }}
                >
                    {children}
                </div>
                
                {/* Resize Handle */}
                <div
                    onMouseDown={onResizeStart}
                    style={{
                        position: "fixed",
                        right: `${width - 2}px`,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        cursor: "ew-resize",
                        zIndex: 1000,
                        background: "transparent",
                        transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-accent, #6366f1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                />
                
                {/* Animations */}
                <style>{`
                    @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                `}</style>
            </>
        );
    }
);

export default ChatPanel;
