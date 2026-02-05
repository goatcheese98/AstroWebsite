/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        🖥️ ChatPanel.tsx                                      ║
 * ║                    "The Floating Chat Widget"                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 📐 Layout Container | 🖱️ Interaction Zone      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am a floating chat widget that appears at the bottom right of the screen,
 * similar to customer support chat windows. I have a fixed height and width,
 * rounded corners, and a shadow to appear floating above the canvas.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users need a compact AI chat that:
 * - Doesn't take up the entire side of the screen
 * - Floats above the canvas like a popup
 * - Can be easily opened and closed
 * - Has a familiar chat widget appearance
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
    /** Whether we're on mobile - if true, panel takes full screen */
    isMobile?: boolean;
}

/**
 * Floating chat panel widget
 */
export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(
    function ChatPanel({ isOpen, width, onResizeStart, children, isMobile = false }, ref) {
        if (!isOpen) return null;
        
        // Fixed dimensions for floating chat
        const chatWidth = isMobile ? "100%" : `${width}px`;
        const chatHeight = isMobile ? "100%" : "600px";
        const maxHeight = isMobile ? "100%" : "calc(100vh - 100px)";
        
        return (
            <>
                {/* Mobile Backdrop - tap to close */}
                {isMobile && (
                    <div
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("ai-chat:close-request"));
                        }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0, 0, 0, 0.3)",
                            zIndex: 998,
                            animation: "fadeIn 0.2s ease",
                        }}
                    />
                )}
                
                {/* Main Chat Widget */}
                <div
                    ref={ref}
                    className="ai-chat-container"
                    style={{
                        position: "fixed",
                        right: isMobile ? 0 : "20px",
                        bottom: isMobile ? 0 : "20px",
                        top: isMobile ? 0 : "auto",
                        width: chatWidth,
                        height: chatHeight,
                        maxHeight: maxHeight,
                        background: "var(--color-surface, #ffffff)",
                        border: isMobile ? "none" : "1px solid var(--color-stroke-muted, #e5e7eb)",
                        borderRadius: isMobile ? 0 : "16px",
                        boxShadow: isMobile 
                            ? "-8px 0 30px rgba(0, 0, 0, 0.15)" 
                            : "0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)",
                        zIndex: 999,
                        display: "flex",
                        flexDirection: "column",
                        animation: isMobile ? "slideUp 0.25s ease" : "popIn 0.2s ease",
                        pointerEvents: "auto",
                        overflow: "hidden",
                    }}
                >
                    {children}
                </div>
                
                {/* Animations */}
                <style>{`
                    @keyframes popIn {
                        from { 
                            opacity: 0;
                            transform: scale(0.95) translateY(10px);
                        }
                        to { 
                            opacity: 1;
                            transform: scale(1) translateY(0);
                        }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}</style>
            </>
        );
    }
);

export default ChatPanel;
