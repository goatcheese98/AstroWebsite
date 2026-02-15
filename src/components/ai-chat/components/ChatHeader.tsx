import React from "react";

export interface ChatHeaderProps {
    /** Callback to close the panel */
    onClose: () => void;
    /** Callback to minimize the panel */
    onMinimize?: () => void;
}

/**
 * Chat panel header with minimize and close buttons
 * 
 * Uses CSS classes from global.css:
 * - panel-header: flex row with border-bottom
 * - btn-icon: icon button with hover effect
 * - flex + items-center + gap-2: layout utilities
 */
export function ChatHeader({ onClose, onMinimize }: ChatHeaderProps) {
    return (
        <div className="panel-header">
            {/* Left side - Minimize button */}
            <div className="flex items-center gap-2">
                {onMinimize && (
                    <button
                        onClick={onMinimize}
                        title="Minimize"
                        className="btn-icon"
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
                className="btn-icon"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export default ChatHeader;
