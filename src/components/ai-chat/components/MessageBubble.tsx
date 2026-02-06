/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                       🗨️ MessageBubble.tsx                                   ║
 * ║                    "The Message Presentation"                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🟣 UI Component | 🎨 Visual Element | 🖱️ Interactive             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the visual representation of a single message in the conversation. I appear
 * on the right for user messages (purple bubbles) and on the left for AI messages
 * (white bubbles). If a message contains drawing commands, I show copy buttons
 * so users can grab the JSON or SVG.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users need to:
 * - Distinguish their messages from AI responses (alignment + color)
 * - See when messages were sent (timestamp)
 * - Copy drawing commands for reuse (JSON/SVG buttons)
 * - Read multi-line messages comfortably (proper text wrapping)
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │ MessageList │─────▶│      ME      │─────▶│  Clipboard   │   │
 *      │   │ (renders me)│      │(MessageBubble│      │  (copy btns) │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │           ┌───────────────────┼───────────────────┐            │
 *      │           ▼                   ▼                   ▼            │
 *      │   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
 *      │   │   Message   │    │  CanvasState │    │ exportToSvg │       │
 *      │   │   (data)    │    │  (for SVG)   │    │ (Excalidraw)│       │
 *      │   └─────────────┘    └──────────────┘    └─────────────┘       │
 *      │                                                                  │
 *      │   I RECEIVE: Message object with content, metadata, commands     │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Messages not aligned, copy buttons missing, timestamps wrong
 * - User Impact: Can't tell who said what, can't copy drawing commands
 * - Quick Fix: Check message.role is "user" | "assistant"
 * - Debug: Verify drawingCommand exists in message for copy buttons to show
 * - Common Issue: SVG export fails - check if Excalidraw is loaded
 * 
 * 📦 PROPS I ACCEPT:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ message             │ The message object to display                        │
 * │ canvasState         │ Canvas state for SVG export context                  │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎨 VISUAL FEATURES:
 * - User messages: Right-aligned, purple background, rounded right corners
 * - AI messages: Left-aligned, white background, rounded left corners
 * - Timestamps: Small gray text below each message
 * - Copy buttons: Appear below AI messages with drawing commands
 * 
 * 📋 COPY OPTIONS:
 * - JSON: Raw Excalidraw element data
 * - SVG: Vector graphic export (requires Excalidraw library)
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was inline ~160 lines)
 * 2026-02-02: Made into standalone component for reusability
 * 2026-02-02: Added proper error handling for SVG export
 * 
 * @module MessageBubble
 */

import React, { useState } from "react";
import type { Message } from "../types";
import { MarkdownPreview } from "../../islands/markdown/components/MarkdownPreview";
import { nanoid } from "nanoid";

export interface MessageBubbleProps {
    /** Message data to display */
    message: Message;
    /** Canvas state for SVG export */
    canvasState?: any;
}

/**
 * Action buttons for AI messages - Copy and Add as Note
 */
function MessageActions({
    textContent,
}: {
    textContent: string;
}) {
    const [copied, setCopied] = useState(false);
    const [addedAsNote, setAddedAsNote] = useState(false);

    /**
     * Copy message text to clipboard
     */
    const copyMessage = async () => {
        try {
            await navigator.clipboard.writeText(textContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy message:", err);
        }
    };

    /**
     * Add message as markdown note to canvas
     */
    const addAsNote = async () => {
        try {
            // Dynamically load the markdown note creator
            const excalidrawAPI = (window as any).excalidrawAPI;
            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            // Get viewport center for positioning
            const appState = excalidrawAPI.getAppState();
            const viewportCenterX = appState.width / 2;
            const viewportCenterY = appState.height / 2;

            // Convert viewport center to scene coordinates
            const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
            const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

            // Import converter
            const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");

            const markdownElement = {
                type: "rectangle",
                x: sceneX - 250,
                y: sceneY - 175,
                width: 500,
                height: 350,
                backgroundColor: "#ffffff",
                strokeColor: "transparent",
                strokeWidth: 0,
                roughness: 0,
                opacity: 100,
                fillStyle: "solid",
                id: nanoid(),
                locked: false,
                customData: {
                    type: "markdown",
                    content: textContent,
                },
            };

            const converted = convertToExcalidrawElements([markdownElement]);
            const currentElements = excalidrawAPI.getSceneElements();

            excalidrawAPI.updateScene({
                elements: [...currentElements, ...converted],
            });

            setAddedAsNote(true);
            setTimeout(() => setAddedAsNote(false), 2000);

            console.log("✅ Added AI response as markdown note");
        } catch (err) {
            console.error("Failed to add as note:", err);
        }
    };

    return (
        <div style={{
            display: "flex",
            gap: "6px",
            marginTop: "4px",
            marginLeft: "10px",
            flexWrap: "wrap",
        }}>
            {/* Copy Button */}
            <button
                onClick={copyMessage}
                title="Copy message"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    background: copied ? "#dcfce7" : "var(--color-fill-1, #f3f4f6)",
                    border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: copied ? "#166534" : "var(--color-text-muted, #6b7280)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontWeight: 500,
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "Copied!" : "Copy"}
            </button>

            {/* Add as Note Button */}
            <button
                onClick={addAsNote}
                title="Add as markdown note to canvas"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    background: addedAsNote ? "#dcfce7" : "var(--color-accent, #6366f1)",
                    border: "1px solid var(--color-accent, #6366f1)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: addedAsNote ? "#166534" : "white",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontWeight: 500,
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                {addedAsNote ? "Added!" : "Add as Note"}
            </button>
        </div>
    );
}

/**
 * Copy buttons for drawing commands
 */
function CopyButtons({
    drawingCommand,
    canvasState,
}: {
    drawingCommand: any[];
    canvasState?: any;
}) {
    const [copiedJson, setCopiedJson] = useState(false);
    const [copiedSvg, setCopiedSvg] = useState(false);
    const [addedToCanvas, setAddedToCanvas] = useState(false);
    
    /**
     * Copy JSON to clipboard
     */
    const copyJson = async () => {
        try {
            const jsonStr = JSON.stringify(drawingCommand, null, 2);
            await navigator.clipboard.writeText(jsonStr);
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 2000);
        } catch (err) {
            console.error("Failed to copy JSON:", err);
        }
    };
    
    /**
     * Copy SVG to clipboard
     */
    const copySvg = async () => {
        try {
            // Dynamically import exportToSvg
            const { exportToSvg } = await import("@excalidraw/excalidraw");
            
            const appState = {
                exportBackground: true,
                exportWithDarkMode: false,
                exportScale: 1,
                ...canvasState?.appState,
            };
            
            const svg = await exportToSvg({
                elements: drawingCommand,
                appState,
                files: canvasState?.files || {},
            });
            
            const svgData = svg.outerHTML;
            await navigator.clipboard.writeText(svgData);
            setCopiedSvg(true);
            setTimeout(() => setCopiedSvg(false), 2000);
        } catch (err) {
            console.error("Failed to copy SVG:", err);
        }
    };
    
    /**
     * Add drawing directly to canvas
     */
    const addToCanvas = () => {
        try {
            // Dispatch event to add elements to canvas
            window.dispatchEvent(new CustomEvent("excalidraw:draw", {
                detail: { elements: drawingCommand, isModification: false },
            }));
            setAddedToCanvas(true);
            setTimeout(() => setAddedToCanvas(false), 2000);
        } catch (err) {
            console.error("Failed to add to canvas:", err);
        }
    };
    
    return (
        <div style={{
            display: "flex",
            gap: "6px",
            marginTop: "4px",
            marginLeft: "10px",
            flexWrap: "wrap",
        }}>
            {/* Add to Canvas Button */}
            <button
                onClick={addToCanvas}
                title="Add to Canvas"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    background: addedToCanvas ? "#dcfce7" : "var(--color-accent, #6366f1)",
                    border: "1px solid var(--color-accent, #6366f1)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: addedToCanvas ? "#166534" : "white",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontWeight: 500,
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                {addedToCanvas ? "Added!" : "Add to Canvas"}
            </button>
            
            {/* JSON Copy Button */}
            <button
                onClick={copyJson}
                title="Copy JSON"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    background: copiedJson ? "#dcfce7" : "var(--color-fill-1, #f3f4f6)",
                    border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: copiedJson ? "#166534" : "var(--color-text-muted, #6b7280)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
                {copiedJson ? "Copied!" : "JSON"}
            </button>
            
            {/* SVG Copy Button */}
            <button
                onClick={copySvg}
                title="Copy SVG"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    background: copiedSvg ? "#dcfce7" : "var(--color-fill-1, #f3f4f6)",
                    border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: copiedSvg ? "#166534" : "var(--color-text-muted, #6b7280)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
                {copiedSvg ? "Copied!" : "SVG"}
            </button>
        </div>
    );
}

/**
 * Single message bubble component
 */
export function MessageBubble({ message, canvasState }: MessageBubbleProps) {
    const isUser = message.role === "user";
    const hasDrawingCommand = !!message.drawingCommand && Array.isArray(message.drawingCommand);

    // Extract text content from message
    const textContent = message.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map(c => c.text)
        .join("\n");

    // Extract image content from message
    const imageContent = message.content
        .filter((c): c is { type: "image"; url: string } => c.type === "image")
        .map(c => c.url);

    // Determine theme for markdown rendering
    const isDark = typeof document !== 'undefined' &&
        document.documentElement.getAttribute('data-theme') === 'dark';

    // Dummy checkbox toggle handler (AI messages are read-only)
    const handleCheckboxToggle = () => {
        // No-op for AI messages
    };

    return (
        <div style={{
            alignSelf: isUser ? "flex-end" : "flex-start",
            maxWidth: "88%",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
        }}>
            {/* Message Content */}
            <div style={{
                padding: "12px 16px",
                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: isUser
                    ? "var(--color-accent, #6366f1)"
                    : "var(--color-surface, #ffffff)",
                color: isUser ? "white" : "var(--color-text, #1f2937)",
                boxShadow: isUser
                    ? "0 1px 4px rgba(99, 102, 241, 0.2)"
                    : "0 1px 3px rgba(0, 0, 0, 0.06)",
                fontSize: "13px",
                lineHeight: 1.55,
                whiteSpace: isUser ? "pre-wrap" : "normal",
                border: isUser ? "none" : "1px solid var(--color-stroke-muted, #e5e7eb)",
            }}>
                {isUser ? (
                    // User messages: plain text and images
                    <>
                        {textContent}
                        {imageContent.length > 0 && (
                            <div style={{
                                marginTop: textContent ? "8px" : "0",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                            }}>
                                {imageContent.map((url, index) => (
                                    <img
                                        key={index}
                                        src={url}
                                        alt="Shared image"
                                        style={{
                                            maxWidth: "100%",
                                            maxHeight: "300px",
                                            objectFit: "contain",
                                            borderRadius: "8px",
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    // AI messages: rendered markdown
                    <div
                        className="ai-message-markdown"
                        style={{
                            fontSize: "13px",
                            lineHeight: 1.55,
                        }}
                    >
                        <MarkdownPreview
                            content={textContent}
                            onCheckboxToggle={handleCheckboxToggle}
                            isDark={isDark}
                        />
                        <style>{`
                            .ai-message-markdown {
                                overflow-wrap: break-word;
                                word-wrap: break-word;
                            }

                            /* Adjust spacing for markdown elements in chat */
                            .ai-message-markdown p {
                                margin: 0 0 0.75em 0;
                            }

                            .ai-message-markdown p:last-child {
                                margin-bottom: 0;
                            }

                            .ai-message-markdown h1,
                            .ai-message-markdown h2,
                            .ai-message-markdown h3,
                            .ai-message-markdown h4,
                            .ai-message-markdown h5,
                            .ai-message-markdown h6 {
                                margin: 0.5em 0 0.5em 0;
                                line-height: 1.3;
                            }

                            .ai-message-markdown h1:first-child,
                            .ai-message-markdown h2:first-child,
                            .ai-message-markdown h3:first-child,
                            .ai-message-markdown h4:first-child,
                            .ai-message-markdown h5:first-child,
                            .ai-message-markdown h6:first-child {
                                margin-top: 0;
                            }

                            .ai-message-markdown ul,
                            .ai-message-markdown ol {
                                margin: 0.5em 0;
                                padding-left: 1.5em;
                            }

                            .ai-message-markdown li {
                                margin: 0.25em 0;
                            }

                            .ai-message-markdown code {
                                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                                font-size: 0.9em;
                                padding: 0.15em 0.3em;
                                background: rgba(0, 0, 0, 0.05);
                                border-radius: 3px;
                            }

                            .ai-message-markdown pre {
                                margin: 0.75em 0;
                            }

                            .ai-message-markdown blockquote {
                                margin: 0.75em 0;
                                padding-left: 1em;
                                border-left: 3px solid rgba(0, 0, 0, 0.1);
                                color: rgba(0, 0, 0, 0.7);
                            }

                            .ai-message-markdown table {
                                border-collapse: collapse;
                                width: 100%;
                                margin: 0.75em 0;
                                font-size: 0.95em;
                            }

                            .ai-message-markdown th,
                            .ai-message-markdown td {
                                border: 1px solid rgba(0, 0, 0, 0.1);
                                padding: 0.4em 0.6em;
                                text-align: left;
                            }

                            .ai-message-markdown th {
                                background: rgba(0, 0, 0, 0.03);
                                font-weight: 600;
                            }

                            .ai-message-markdown a {
                                color: #6366f1;
                                text-decoration: none;
                            }

                            .ai-message-markdown a:hover {
                                text-decoration: underline;
                            }

                            .ai-message-markdown hr {
                                border: none;
                                border-top: 1px solid rgba(0, 0, 0, 0.1);
                                margin: 1em 0;
                            }
                        `}</style>
                    </div>
                )}
            </div>

            {/* Action Buttons for AI Messages */}
            {!isUser && (
                <MessageActions textContent={textContent} />
            )}

            {/* Additional Drawing Command Buttons */}
            {!isUser && hasDrawingCommand && (
                <CopyButtons
                    drawingCommand={message.drawingCommand!}
                    canvasState={canvasState}
                />
            )}

            {/* Timestamp */}
            <span style={{
                fontSize: "10px",
                color: "var(--color-text-muted, #6b7280)",
                marginLeft: isUser ? "auto" : "10px",
                marginRight: isUser ? "10px" : "auto",
            }}>
                {message.metadata.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </span>
        </div>
    );
}

export default MessageBubble;
