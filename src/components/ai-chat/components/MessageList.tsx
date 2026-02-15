import React, { useRef, useEffect, forwardRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./message"; // Updated to use new barrel export
import PathfinderBotAvatar from "../PathfinderBotAvatar";

export interface MessageListProps {
    /** Array of messages to display */
    messages: Message[];
    /** Whether AI is processing */
    isLoading: boolean;
    /** Error message (null if none) */
    error: string | null;
    /** Current AI provider for loading text */
    aiProvider: "kimi" | "claude";
    /** Canvas state for message context */
    canvasState?: any;
    /** Whether the preview panel is visible (adds left padding) */
    hasPreviewPanel?: boolean;
}

/**
 * Empty state when no messages exist
 */
function EmptyState() {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--color-text-secondary)",
            textAlign: "center",
        }}>
            <div style={{ marginBottom: "16px" }}>
                <PathfinderBotAvatar size={80} />
            </div>
            <h3 style={{
                margin: "0 0 6px",
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-text)",
            }}>
                Start creating with AI
            </h3>
            <p style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: 1.5,
                maxWidth: "240px",
            }}>
                Describe what to draw or switch to "Selected" mode to work with specific elements
            </p>
        </div>
    );
}

/**
 * Loading indicator while AI thinks
 */
function LoadingIndicator({ provider }: { provider: "kimi" | "claude" }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            background: "var(--color-fill-1, #f3f4f6)",
            borderRadius: "12px",
            alignSelf: "flex-start",
        }}>
            <div style={{
                width: "16px",
                height: "16px",
                border: "2px solid var(--color-border)",
                borderTopColor: "var(--color-accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
            }} />
            <span style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
            }}>
                {provider === "kimi" ? "Kimi is thinking..." : "Claude is thinking..."}
            </span>
            
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

/**
 * Error message display
 */
function ErrorDisplay({ message }: { message: string }) {
    return (
        <div style={{
            padding: "10px 14px",
            background: "var(--color-error-bg, #fef2f2)",
            border: "1px solid var(--color-error, #fecaca)",
            borderRadius: "8px",
            color: "var(--color-error-text, #dc2626)",
            fontSize: "13px",
        }}>
            ⚠️ {message}
        </div>
    );
}

/**
 * Scrollable message list (now with position: relative for overlay support)
 */
export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
    function MessageList({ messages, isLoading, error, aiProvider, canvasState, hasPreviewPanel = false }, forwardedRef) {
        const internalRef = useRef<HTMLDivElement>(null);
        const scrollRef = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

        // Debug logging
        useEffect(() => {
            console.log('📝 MessageList: Rendering with', messages.length, 'messages');
        }, [messages]);

        // Auto-scroll to bottom when messages change or loading state changes
        useEffect(() => {
            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, [messages, isLoading, scrollRef]);

        const hasMessages = messages.length > 0;

        return (
            <div style={{
                flex: 1,
                position: "relative", // Enable absolute positioning for overlay
                overflowY: "auto",
                padding: "18px",
                paddingLeft: hasPreviewPanel ? "252px" : "18px", // Add left padding for preview panel
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                minHeight: 0, // Important for flex child scrolling
                transition: "padding-left 0.2s ease",
            }}>
                {!hasMessages ? (
                    <EmptyState />
                ) : (
                    messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            canvasState={canvasState}
                        />
                    ))
                )}

                {isLoading && <LoadingIndicator provider={aiProvider} />}
                {error && <ErrorDisplay message={error} />}

                {/* Scroll anchor */}
                <div ref={scrollRef} />
            </div>
        );
    }
);

export default MessageList;
