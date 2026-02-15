import React, { forwardRef } from "react";

export interface ChatPanelProps {
    /** Whether the panel is visible */
    isOpen: boolean;
    /** Whether the panel is minimized */
    isMinimized?: boolean;
    /** Current width in pixels */
    width: number;
    /** Current height in pixels */
    height?: number;
    /** Callback when user starts dragging resize handle */
    onResizeStart: (e: React.MouseEvent) => void;
    /** Callback when panel should close (backdrop clicked) */
    onClose?: () => void;
    /** All child components */
    children: React.ReactNode;
    /** Whether we're on mobile - if true, panel takes full screen */
    isMobile?: boolean;
}

/**
 * Floating chat panel widget
 * Positioned to the left of the right-side toolbar (88px offset)
 */
export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(
    function ChatPanel({ isOpen, isMinimized = false, width, height = 600, onResizeStart, children, isMobile = false }, ref) {
        if (!isOpen) return null;

        // Minimized state - show as a compact pill at the bottom right
        if (isMinimized && !isMobile) {
            return (
                <div
                    ref={ref}
                    className="ai-chat-container minimized"
                    style={{
                        position: "fixed",
                        right: "88px", // Position to the left of the right toolbar
                        bottom: "20px",
                        zIndex: 999,
                        animation: "popIn 0.2s ease",
                        pointerEvents: "auto",
                    }}
                >
                    {children}
                </div>
            );
        }

        // Dimensions for floating chat
        const chatWidth = isMobile ? "100%" : `${width}px`;
        const chatHeight = isMobile ? "100%" : `${height}px`;
        const maxHeight = isMobile ? "100%" : "calc(100vh - 100px)";

        return (
            <>
                {/* Mobile Backdrop - tap to close */}
                {isMobile && (
                    <div
                        onClick={() => {
                            onClose?.();
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
                        right: isMobile ? 0 : "88px", // Position to the left of the right toolbar
                        bottom: isMobile ? 0 : "20px",
                        top: isMobile ? 0 : "auto",
                        width: chatWidth,
                        height: chatHeight,
                        maxHeight: maxHeight,
                        minHeight: "300px",
                        background: "var(--color-surface, #ffffff)",
                        border: isMobile ? "none" : "1px solid var(--color-border)",
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
                    {/* Vertical Resize Handle (top edge) */}
                    {!isMobile && (
                        <div
                            onMouseDown={onResizeStart}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "8px",
                                cursor: "ns-resize",
                                zIndex: 1000,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <div style={{
                                width: "40px",
                                height: "4px",
                                background: "var(--color-border)",
                                borderRadius: "2px",
                                transition: "background 0.15s",
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "var(--color-accent)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "var(--color-border)";
                                }}
                            />
                        </div>
                    )}

                    {children}
                </div>
            </>
        );
    }
);

export default ChatPanel;
