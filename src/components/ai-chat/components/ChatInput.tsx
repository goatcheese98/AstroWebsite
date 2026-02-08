/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        ✏️ ChatInput.tsx                                      ║
 * ║                    "The Message Composer"                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | ⌨️ Input Handler | 🎨 Visual Element           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the input area at the bottom of the chat where users type their messages.
 * I include a toolbar with quick actions (templates, image generation), a
 * multi-line textarea for typing, and a send button. I handle keyboard shortcuts
 * and provide context-aware placeholders.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users need to:
 * - Type messages comfortably (multi-line textarea)
 * - Send quickly (Enter key or Send button)
 * - Access templates for common prompts
 * - Generate images from selected elements
 * - Know when they can/cannot send (disabled states)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  User       │─────▶│      ME      │─────▶│ useAIChat   │   │
 *      │   │ (types)     │      │ (ChatInput)  │      │   State     │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │           ┌───────────────────┼───────────────────┐            │
 *      │           ▼                   ▼                   ▼            │
 *      │   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
 *      │   │  Templates  │    │   ImageGen   │    │   handleSend │       │
 *      │   │   Modal     │    │    Modal     │    │             │       │
 *      │   └─────────────┘    └──────────────┘    └─────────────┘       │
 *      │                                                                  │
 *      │   I CALL: onSend, onOpenTemplates, onOpenImageGen                │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Can't type, send button disabled, keyboard shortcuts not working
 * - User Impact: Can't send messages to AI
 * - Quick Fix: Check input and isLoading props
 * - Debug: Verify onKeyDown handler is attached to textarea
 * - Common Issue: Textarea not auto-focusing - check ref usage
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ input               │ Current input value                                  │
 * │ onInputChange       │ Callback when input changes                          │
 * │ onSend              │ Callback when user sends message                     │
 * │ onOpenTemplates     │ Callback to open template modal                      │
 * │ onOpenImageGen      │ Callback to open image generation modal              │
 * │ isLoading           │ Whether AI is processing (disables send)             │
 * │ isGeneratingImage   │ Whether image generation is active                   │
 * │ selectedElements    │ Count of selected elements (for image gen button)    │
 * │ selectedElements    │ Count of selected elements (for image gen button)    │
 * │ contextMode         │ Current context mode (affects placeholder)           │
 * │ keyboardHandler     │ onKeyDown handler from useKeyboardShortcuts          │
 * │ inputRef            │ Ref for textarea element                             │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎨 VISUAL FEATURES:
 * - Toolbar: Templates button + Generate Image button
 * - Textarea: Multi-line, auto-resize, placeholder text
 * - Send button: Green when active, gray when disabled
 * - Keyboard hint: Shows "Enter to send • Shift+Enter for new line"
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~150 lines of input markup)
 * 2026-02-02: Separated input logic from message display
 * 2026-02-02: Added proper ref forwarding for focus management
 * 
 * @module ChatInput
 */

import React, { forwardRef } from "react";

export interface ChatInputProps {
    /** Current input value */
    input: string;
    /** Callback when input changes */
    onInputChange: (value: string) => void;
    /** Callback when user sends message */
    onSend: () => void;
    /** Callback to open template modal */
    onOpenTemplates: () => void;
    /** Whether AI is processing (disables send) */
    isLoading: boolean;
    /** Count of selected elements */
    selectedElementsCount: number;
    /** Current context mode (affects placeholder) */
    contextMode: "all" | "selected";
    /** Callback when context mode changes */
    onContextModeChange?: (mode: "all" | "selected") => void;
    /** Callback to clear selection */
    onClearSelection?: () => void;
    /** onKeyDown handler from useKeyboardShortcuts */
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    /** Whether we're on mobile */
    isMobile?: boolean;
    /** Current AI provider */
    aiProvider?: "kimi" | "claude";
    /** Callback to toggle AI provider */
    onToggleProvider?: () => void;
}

/**
 * Chat input area with toolbar and send button
 */
export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
    function ChatInput({
        input,
        onInputChange,
        onSend,
        onOpenTemplates,
        isLoading,
        selectedElementsCount,
        contextMode,
        onContextModeChange,
        onClearSelection,
        onKeyDown,
        isMobile = false,
        aiProvider = "claude",
        onToggleProvider,
    }, ref) {
        const hasInput = input.trim().length > 0;
        const canSend = hasInput && !isLoading;
        const hasSelection = selectedElementsCount > 0;
        const isKimi = aiProvider === "kimi";
        
        // Context-aware placeholder - shorter on mobile
        const placeholder = isMobile 
            ? "Ask AI to draw..."
            : contextMode === "selected" && hasSelection
                ? `Ask about ${selectedElementsCount} selected elements...`
                : "Ask AI to draw, create Mermaid diagrams, or explain...";
        
        return (
            <div style={{
                padding: isMobile ? "12px 16px 16px" : "14px 18px 18px",
                background: "var(--color-bg, #fafafa)",
                borderTop: "1px solid var(--color-stroke-muted, #e5e7eb)",
                flexShrink: 0,
                // Ensure input area is above mobile keyboard
                paddingBottom: isMobile ? "max(16px, env(safe-area-inset-bottom))" : "18px",
            }}>
                {/* Toolbar */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isMobile ? "6px" : "8px",
                    marginBottom: isMobile ? "8px" : "10px",
                    // Horizontal scroll on mobile if needed
                    overflowX: isMobile ? "auto" : undefined,
                    flexWrap: isMobile ? "nowrap" : undefined,
                }}>
                    {/* Templates Button */}
                    {/* Left side - Templates + Mode Toggle */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}>
                        <button
                            onClick={onOpenTemplates}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: isMobile ? "8px 12px" : "5px 10px",
                                background: "transparent",
                                border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                borderRadius: "6px",
                                fontSize: isMobile ? "13px" : "11px",
                                color: "var(--color-text-muted, #6b7280)",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                flexShrink: 0,
                                minHeight: isMobile ? "36px" : undefined,
                                touchAction: "manipulation",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "var(--color-accent, #6366f1)";
                                e.currentTarget.style.background = "var(--color-accent-light, #e0e7ff)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--color-stroke-muted, #e5e7eb)";
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            <span>⚡</span>
                            {isMobile ? "Quick" : "Templates"}
                        </button>

                        {/* Selected/All Mode Toggle - Selected on left */}
                        {onContextModeChange && (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px",
                                background: "var(--color-fill-1, #f3f4f6)",
                                borderRadius: "6px",
                                border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            }}>
                                <button
                                    onClick={() => onContextModeChange("selected")}
                                    title="Use selected elements only"
                                    style={{
                                        padding: isMobile ? "6px 10px" : "4px 8px",
                                        borderRadius: "4px",
                                        border: "none",
                                        background: contextMode === "selected" ? "#10b981" : "transparent",
                                        color: contextMode === "selected" ? "white" : "#6b7280",
                                        fontSize: isMobile ? "12px" : "10px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                        minHeight: isMobile ? "32px" : undefined,
                                    }}
                                >
                                    Selected
                                </button>
                                <button
                                    onClick={() => {
                                        onContextModeChange("all");
                                        // Select all canvas elements when switching to "all" mode
                                        const api = (window as any).excalidrawAPI;
                                        if (api) {
                                            const elements = api.getSceneElements();
                                            const allElementIds = elements.reduce((acc: Record<string, boolean>, el: any) => {
                                                acc[el.id] = true;
                                                return acc;
                                            }, {});
                                            api.updateScene({
                                                appState: {
                                                    ...api.getAppState(),
                                                    selectedElementIds: allElementIds,
                                                },
                                            });
                                        }
                                    }}
                                    title="Use all canvas elements (selects all)"
                                    style={{
                                        padding: isMobile ? "6px 10px" : "4px 8px",
                                        borderRadius: "4px",
                                        border: "none",
                                        background: contextMode === "all" ? "#10b981" : "transparent",
                                        color: contextMode === "all" ? "white" : "#6b7280",
                                        fontSize: isMobile ? "12px" : "10px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                        minHeight: isMobile ? "32px" : undefined,
                                    }}
                                >
                                    All
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right side - Model Selector */}
                    {onToggleProvider && (
                        <button
                            onClick={onToggleProvider}
                            title={`Click to switch to ${isKimi ? "Claude" : "Kimi K2.5"}`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: isMobile ? "8px 12px" : "5px 10px",
                                background: isKimi ? "#10b981" : "#f97316",
                                border: isKimi ? "1px solid #059669" : "1px solid #ea580c",
                                borderRadius: "6px",
                                fontSize: isMobile ? "13px" : "11px",
                                color: "white",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                flexShrink: 0,
                                minHeight: isMobile ? "36px" : undefined,
                                touchAction: "manipulation",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = isKimi ? "#059669" : "#ea580c";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = isKimi ? "#10b981" : "#f97316";
                            }}
                        >
                            {isKimi ? "Kimi K2.5" : "Claude"}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M7 17L17 7M17 7H7M17 7V17" />
                            </svg>
                        </button>
                    )}
                </div>
                
                {/* Input Area */}
                <div style={{
                    position: "relative",
                    display: "flex",
                    gap: "8px",
                }}>
                    <textarea
                        ref={ref}
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        rows={isMobile ? 1 : 2}
                        style={{
                            flex: 1,
                            padding: isMobile ? "12px 14px" : "10px 14px",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            borderRadius: "10px",
                            background: "var(--color-surface, #ffffff)",
                            fontSize: isMobile ? "16px" : "13px", // 16px prevents iOS zoom
                            lineHeight: 1.5,
                            resize: "none",
                            outline: "none",
                            fontFamily: "inherit",
                            minHeight: isMobile ? "44px" : undefined, // Touch-friendly height
                            // Improve mobile typing experience
                            WebkitAppearance: "none",
                        }}
                        // Mobile-specific attributes
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="sentences"
                    />
                    
                    {/* Send Button */}
                    <button
                        onClick={onSend}
                        disabled={!canSend}
                        style={{
                            alignSelf: "flex-end",
                            padding: isMobile ? "12px 20px" : "10px 18px",
                            background: canSend ? "#059669" : "#fee2e2",
                            color: canSend ? "white" : "#9ca3af",
                            border: canSend ? "1px solid #047857" : "1px solid #fca5a5",
                            borderRadius: "8px",
                            fontSize: isMobile ? "15px" : "13px",
                            fontWeight: 600,
                            cursor: canSend ? "pointer" : "not-allowed",
                            transition: "all 0.15s",
                            boxShadow: canSend ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
                            minHeight: isMobile ? "44px" : undefined, // Touch-friendly
                            minWidth: isMobile ? "70px" : undefined,
                            touchAction: "manipulation",
                        }}
                        onMouseEnter={(e) => {
                            if (canSend) {
                                e.currentTarget.style.background = "#047857";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (canSend) {
                                e.currentTarget.style.background = "#059669";
                            }
                        }}
                    >
                        {isMobile ? "➤" : "Send"}
                    </button>
                </div>
                
                {/* Keyboard Hint - hidden on mobile */}
                {!isMobile && (
                    <div style={{
                        marginTop: "6px",
                        fontSize: "10px",
                        color: "var(--color-text-muted, #6b7280)",
                    }}>
                        Enter to send • Shift+Enter for new line • ESC to close
                    </div>
                )}
                
                {/* Animation */}
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }
);

export default ChatInput;
