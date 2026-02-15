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
 * 
 * Uses CSS classes from global.css:
 * - panel-footer: bottom section styling
 * - toolbar: flex row for button groups
 * - btn-secondary, provider-badge, btn-primary: button variants
 * - toggle-group, toggle-btn: mode selection
 * - input-field: textarea styling
 * - help-text: keyboard hint
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
            <div 
                className="panel-footer"
                style={{
                    padding: isMobile ? "12px 16px 16px" : "14px 18px 18px",
                    paddingBottom: isMobile ? "max(16px, env(safe-area-inset-bottom))" : "18px",
                }}
            >
                {/* Toolbar */}
                <div 
                    className="toolbar"
                    style={{
                        gap: isMobile ? "6px" : "8px",
                        marginBottom: isMobile ? "8px" : "10px",
                        overflowX: isMobile ? "auto" : undefined,
                        flexWrap: isMobile ? "nowrap" : undefined,
                    }}
                >
                    {/* Left side - Templates + Mode Toggle */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onOpenTemplates}
                            className="btn-secondary"
                            style={{
                                padding: isMobile ? "8px 12px" : "5px 10px",
                                fontSize: isMobile ? "13px" : "11px",
                                minHeight: isMobile ? "36px" : undefined,
                                touchAction: "manipulation",
                            }}
                        >
                            <span>⚡</span>
                            {isMobile ? "Quick" : "Templates"}
                        </button>

                        {/* Selected/All Mode Toggle */}
                        {onContextModeChange && (
                            <div className="toggle-group">
                                <button
                                    onClick={() => onContextModeChange("selected")}
                                    title="Use selected elements only"
                                    className="toggle-btn"
                                    data-active={contextMode === "selected"}
                                    style={{
                                        padding: isMobile ? "6px 10px" : "4px 8px",
                                        fontSize: isMobile ? "12px" : "10px",
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
                                    className="toggle-btn"
                                    data-active={contextMode === "all"}
                                    style={{
                                        padding: isMobile ? "6px 10px" : "4px 8px",
                                        fontSize: isMobile ? "12px" : "10px",
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
                            className="provider-badge"
                            data-provider={aiProvider}
                            style={{
                                padding: isMobile ? "8px 12px" : "5px 10px",
                                fontSize: isMobile ? "13px" : "11px",
                                minHeight: isMobile ? "36px" : undefined,
                                touchAction: "manipulation",
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
                <div className="flex gap-2 relative">
                    <textarea
                        ref={ref}
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        rows={isMobile ? 1 : 2}
                        className="input-field"
                        style={{
                            padding: isMobile ? "12px 14px" : "10px 14px",
                            fontSize: isMobile ? "16px" : "13px",
                            minHeight: isMobile ? "44px" : undefined,
                            WebkitAppearance: "none",
                        }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="sentences"
                    />
                    
                    {/* Send Button */}
                    <button
                        onClick={onSend}
                        disabled={!canSend}
                        className="btn-primary self-end"
                        style={{
                            padding: isMobile ? "12px 20px" : "10px 18px",
                            fontSize: isMobile ? "15px" : "13px",
                            minHeight: isMobile ? "44px" : undefined,
                            minWidth: isMobile ? "70px" : undefined,
                            touchAction: "manipulation",
                        }}
                    >
                        {isMobile ? "➤" : "Send"}
                    </button>
                </div>
                
                {/* Keyboard Hint - hidden on mobile */}
                {!isMobile && (
                    <div className="help-text">
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
