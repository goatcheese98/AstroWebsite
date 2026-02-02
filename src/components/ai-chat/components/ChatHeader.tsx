/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        🎩 ChatHeader.tsx                                     ║
 * ║                    "The Chat's Title Bar"                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 🎨 Visual Element | 🖱️ Interactive             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the header bar at the top of the chat panel. I display the title "AI Assistant",
 * show which AI provider is active (Kimi or Claude) with a clickable badge to switch,
 * and provide the close button (X) for dismissing the panel.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users need to:
 * - Know which AI they're talking to (provider badge)
 * - Switch providers if one is overloaded (click badge)
 * - Close the panel easily (X button)
 * - See the panel title at a glance
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
 *      │   │toggleProvider│   │   onClose    │    │   Badge     │       │
 *      │   │ (clickable) │    │   (X btn)    │    │  (visual)   │       │
 *      │   └─────────────┘    └──────────────┘    └─────────────┘       │
 *      │                                                                  │
 *      │   I CALL: onClose, toggleProvider                                │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Provider badge not clickable, close button missing, wrong colors
 * - User Impact: Can't switch AI providers, can't close panel
 * - Quick Fix: Check onClose and toggleProvider props are passed correctly
 * - Debug: Verify aiProvider prop is "kimi" | "claude"
 * - Common Issue: Colors hardcoded instead of CSS variables
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ aiProvider          │ Current AI provider ("kimi" | "claude")              │
 * │ onToggleProvider    │ Callback when user clicks provider badge             │
 * │ onClose             │ Callback when user clicks close button               │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎨 VISUAL FEATURES:
 * - Title: "AI Assistant" with chat bubble emoji
 * - Provider badge: Green for Kimi, darker green for Claude
 * - Badge shows swap icon (↗) to indicate clickability
 * - Close button: X icon with hover effect
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~80 lines of header markup)
 * 2026-02-02: Separated header concerns from other panel sections
 * 2026-02-02: Added proper hover states and transitions
 * 
 * @module ChatHeader
 */

import React from "react";

export interface ChatHeaderProps {
    /** Current AI provider */
    aiProvider: "kimi" | "claude";
    /** Callback to switch providers */
    onToggleProvider: () => void;
    /** Callback to close the panel */
    onClose: () => void;
}

/**
 * Chat panel header with title, provider badge, and close button
 */
export function ChatHeader({ aiProvider, onToggleProvider, onClose }: ChatHeaderProps) {
    const isKimi = aiProvider === "kimi";
    
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
            background: "var(--color-bg, #fafafa)",
            flexShrink: 0,
        }}>
            {/* Title & Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>💬</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h2 style={{
                        margin: 0,
                        fontFamily: "var(--font-hand, sans-serif)",
                        fontSize: "17px",
                        fontWeight: 600,
                        color: "var(--color-text, #1f2937)",
                    }}>
                        AI Assistant
                    </h2>
                    
                    {/* Provider Badge - Clickable */}
                    <button
                        onClick={onToggleProvider}
                        title={`Click to switch to ${isKimi ? "Claude (premium)" : "Kimi"}`}
                        style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            background: isKimi ? "#10b981" : "#047857",
                            color: "white",
                            borderRadius: "4px",
                            fontWeight: 500,
                            border: isKimi ? "1px solid #059669" : "1px solid #065f46",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = isKimi ? "#059669" : "#065f46";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = isKimi ? "#10b981" : "#047857";
                        }}
                    >
                        {isKimi ? "Kimi K2.5" : "Claude"}
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M7 17L17 7M17 7H7M17 7V17" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* Close Button */}
            <button
                onClick={onClose}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px",
                    borderRadius: "6px",
                    color: "var(--color-text-muted, #6b7280)",
                    transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-fill-1, #f3f4f6)";
                    e.currentTarget.style.color = "var(--color-text, #1f2937)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-text-muted, #6b7280)";
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
