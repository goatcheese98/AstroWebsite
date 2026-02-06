/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                       💬 MessageList.tsx                                     ║
 * ║                    "The Conversation Stream"                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 📜 Scroll View | 🎨 Visual Layout             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the scrollable message area where the conversation lives. I display all
 * messages between the user and AI, show loading indicators when the AI is
 * thinking, display errors when things go wrong, and automatically scroll to
 * show new messages as they arrive.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users need to see their conversation history and current status:
 * - See all messages in chronological order
 * - Know when AI is processing (loading spinner)
 * - Be informed of errors without crashing
 * - Always see the latest message (auto-scroll)
 * - Start new conversations (empty state with CTA)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ useAIChat   │─────▶│      ME      │─────▶│MessageBubble│   │
 *      │   │   State     │      │(MessageList) │      │ (children)  │   │
 *      │   │(messages)   │      │              │      │             │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │           ┌───────────────────┼───────────────────┐            │
 *      │           ▼                   ▼                   ▼            │
 *      │   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
 *      │   │   Auto      │    │   Loading    │    │    Error    │       │
 *      │   │  Scroll     │    │  Indicator   │    │   Display   │       │
 *      │   └─────────────┘    └──────────────┘    └─────────────┘       │
 *      │                                                                  │
 *      │   I CONTAIN: MessageBubble components, scroll logic              │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Messages not showing, no auto-scroll, loading spinner stuck
 * - User Impact: Can't see conversation, miss AI responses
 * - Quick Fix: Check messages array is being passed correctly
 * - Debug: Verify messagesEndRef is attached to scroll anchor div
 * - Common Issue: Overflow not set correctly - check flex and overflow styles
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ messages            │ Array of message objects to display                  │
 * │ isLoading           │ Whether AI is currently generating response          │
 * │ error               │ Error message to display (null if no error)          │
 * │ aiProvider          │ Current AI provider (for loading text)               │
 * │ canvasState         │ Canvas state for message context                     │
 * │ scrollRef           │ Ref for auto-scroll anchor element                   │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎨 VISUAL FEATURES:
 * - Scrollable area with padding
 * - Loading spinner with provider name
 * - Error banner in red
 * - Empty state with PathfinderBot avatar
 * - Flex column layout with gap between messages
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~100 lines of message list markup)
 * 2026-02-02: Separated message list from input area
 * 2026-02-02: Added proper forwardRef for scroll management
 * 
 * @module MessageList
 */

import React, { useRef, useEffect, forwardRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";
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
            color: "var(--color-text-muted, #6b7280)",
            textAlign: "center",
        }}>
            <div style={{ marginBottom: "16px" }}>
                <PathfinderBotAvatar size={80} />
            </div>
            <h3 style={{
                margin: "0 0 6px",
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-text, #1f2937)",
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
                border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                borderTopColor: "var(--color-accent, #6366f1)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
            }} />
            <span style={{
                fontSize: "13px",
                color: "var(--color-text-muted, #6b7280)",
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
    function MessageList({ messages, isLoading, error, aiProvider, canvasState }, forwardedRef) {
        const internalRef = useRef<HTMLDivElement>(null);
        const scrollRef = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

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
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                minHeight: 0, // Important for flex child scrolling
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
