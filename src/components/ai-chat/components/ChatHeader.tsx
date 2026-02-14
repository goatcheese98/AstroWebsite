/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        🎩 ChatHeader.tsx                                     ║
 * ║                    "The Chat's Title Bar"                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 🎨 Visual Element | 🖱️ Interactive             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the header bar at the top of the chat panel. I provide the minimize 
 * and close buttons for controlling the panel state.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users need to:
 * - Minimize the chat to a compact button
 * - Close the panel easily (X button)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  ChatPanel  │─────▶│      ME      │─────▶│    User     │   │
 *      │   │ (parent)    │      │ (ChatHeader) │      │  (sees me)  │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │           ┌───────────────────┼───────────────────┐            │
 *      │           ▼                   ▼                   ▼            │
 *      │   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
 *      │   │  onMinimize │    │   onClose    │    │   Title     │       │
 *      │   │  (button)   │    │   (X btn)    │    │  (visual)   │       │
 *      │   └─────────────┘    └──────────────┘    └─────────────┘       │
 *      │                                                                  │
 *      │   I CALL: onClose, onMinimize                                    │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Close button missing, minimize not working
 * - User Impact: Can't control panel state
 * - Quick Fix: Check onClose and onMinimize props are passed correctly
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ onClose             │ Callback when user clicks close button               │
 * │ onMinimize          │ Callback when user clicks minimize button            │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎨 VISUAL FEATURES:
 * - Title: "AI Assistant" 
 * - Minimize button: _ icon with hover effect
 * - Close button: X icon with hover effect
 * 
 * @module ChatHeader
 */

import React from "react";

export interface ChatHeaderProps {
    /** Callback to close the panel */
    onClose: () => void;
    /** Callback to minimize the panel */
    onMinimize?: () => void;
}

/**
 * Chat panel header with minimize and close buttons
 */
export function ChatHeader({ onClose, onMinimize }: ChatHeaderProps) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            flexShrink: 0,
        }}>
            {/* Left side - Minimize button */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {onMinimize && (
                    <button
                        onClick={onMinimize}
                        title="Minimize"
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            color: "var(--color-text-secondary)",
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--color-surface-hover)";
                            e.currentTarget.style.color = "var(--color-text)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--color-text-secondary)";
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14" />
                        </svg>
                    </button>
                )}
                
                {/* Title */}
                <span style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--color-text)",
                }}>
                    AI Assistant
                </span>
            </div>

            {/* Right side - Close button */}
            <button
                onClick={onClose}
                title="Close"
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px",
                    borderRadius: "6px",
                    color: "var(--color-text-secondary)",
                    transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-surface-hover)";
                    e.currentTarget.style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export default ChatHeader;
