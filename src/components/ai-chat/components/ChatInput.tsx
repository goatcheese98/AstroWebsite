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
 * │ isCapturing         │ Whether screenshot capture is active                 │
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
    /** Callback to open image generation modal */
    onOpenImageGen: () => void;
    /** Whether AI is processing (disables send) */
    isLoading: boolean;
    /** Whether image generation is active */
    isGeneratingImage: boolean;
    /** Whether screenshot capture is active */
    isCapturing: boolean;
    /** Count of selected elements */
    selectedElementsCount: number;
    /** Current context mode (affects placeholder) */
    contextMode: "all" | "selected";
    /** onKeyDown handler from useKeyboardShortcuts */
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
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
        onOpenImageGen,
        isLoading,
        isGeneratingImage,
        isCapturing,
        selectedElementsCount,
        contextMode,
        onKeyDown,
    }, ref) {
        const hasInput = input.trim().length > 0;
        const canSend = hasInput && !isLoading;
        const hasSelection = selectedElementsCount > 0;
        const isImageGenActive = isGeneratingImage || isCapturing;
        
        // Context-aware placeholder
        const placeholder = contextMode === "selected" && hasSelection
            ? `Ask about ${selectedElementsCount} selected elements...`
            : "Ask AI to draw, explain, or modify...";
        
        return (
            <div style={{
                padding: "14px 18px 18px",
                background: "var(--color-bg, #fafafa)",
                borderTop: "1px solid var(--color-stroke-muted, #e5e7eb)",
                flexShrink: 0,
            }}>
                {/* Toolbar */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                }}>
                    {/* Templates Button */}
                    <button
                        onClick={onOpenTemplates}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 10px",
                            background: "transparent",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: "var(--color-text-muted, #6b7280)",
                            cursor: "pointer",
                            transition: "all 0.15s",
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
                        Templates
                    </button>
                    
                    {/* Generate Image Button */}
                    <button
                        onClick={() => {
                            if (!hasSelection) {
                                // Show error - need selection first
                                return;
                            }
                            onOpenImageGen();
                        }}
                        disabled={isImageGenActive}
                        title={hasSelection 
                            ? "Generate realistic image from selected elements" 
                            : "Select elements on the canvas to generate an image"
                        }
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 10px",
                            background: isImageGenActive || !hasSelection ? "#fee2e2" : "#059669",
                            border: hasSelection && !isImageGenActive
                                ? "1px solid #047857"
                                : "1px solid #fca5a5",
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: isImageGenActive || !hasSelection ? "#9ca3af" : "white",
                            cursor: isImageGenActive ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease",
                            fontWeight: 500,
                            boxShadow: hasSelection && !isImageGenActive
                                ? "0 0 0 3px rgba(5, 150, 105, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)"
                                : "none",
                        }}
                        onMouseEnter={(e) => {
                            if (hasSelection && !isImageGenActive) {
                                e.currentTarget.style.background = "#047857";
                                e.currentTarget.style.boxShadow = "0 0 0 4px rgba(5, 150, 105, 0.15), 0 2px 6px rgba(0, 0, 0, 0.15)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (hasSelection && !isImageGenActive) {
                                e.currentTarget.style.background = "#059669";
                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(5, 150, 105, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)";
                            }
                        }}
                    >
                        {isCapturing ? (
                            <>
                                <div style={{
                                    width: "10px",
                                    height: "10px",
                                    border: "2px solid rgba(255,255,255,0.3)",
                                    borderTopColor: "white",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                }} />
                                Capturing...
                            </>
                        ) : isGeneratingImage ? (
                            <>
                                <div style={{
                                    width: "10px",
                                    height: "10px",
                                    border: "2px solid rgba(255,255,255,0.3)",
                                    borderTopColor: "white",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                }} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                Generate Image
                            </>
                        )}
                    </button>
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
                        rows={2}
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            borderRadius: "10px",
                            background: "var(--color-surface, #ffffff)",
                            fontSize: "13px",
                            lineHeight: 1.5,
                            resize: "none",
                            outline: "none",
                            fontFamily: "inherit",
                        }}
                    />
                    
                    {/* Send Button */}
                    <button
                        onClick={onSend}
                        disabled={!canSend}
                        style={{
                            alignSelf: "flex-end",
                            padding: "10px 18px",
                            background: canSend ? "#059669" : "#fee2e2",
                            color: canSend ? "white" : "#9ca3af",
                            border: canSend ? "1px solid #047857" : "1px solid #fca5a5",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: canSend ? "pointer" : "not-allowed",
                            transition: "all 0.15s",
                            boxShadow: canSend ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
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
                        Send
                    </button>
                </div>
                
                {/* Keyboard Hint */}
                <div style={{
                    marginTop: "6px",
                    fontSize: "10px",
                    color: "var(--color-text-muted, #6b7280)",
                }}>
                    Enter to send • Shift+Enter for new line • ESC to close
                </div>
                
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
