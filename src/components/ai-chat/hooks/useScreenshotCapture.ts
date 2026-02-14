/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    📸 useScreenshotCapture.ts                                ║
 * ║                    "The Canvas Photographer"                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔵 Custom Hook | 🟢 State Manager | ⚡ Event Coordinator         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the camera operator for the Excalidraw canvas. When the AI needs to "see"
 * what the user has drawn, I'm the one who coordinates the screenshot capture.
 * I handle two types of photos: chat context screenshots (low-res, fast) and
 * image generation screenshots (high-res, detailed).
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * AI models can't see the canvas directly - they need images. I ensure:
 * - Screenshots are captured at the right quality for the use case
 * - Selected elements are highlighted in the capture
 * - Request/response matching prevents screenshot mix-ups
 * - Chat and image generation don't interfere with each other
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │   Chat      │─────▶│      ME      │◀─────│   ImageGen  │   │
 *      │   │  (request)  │      │(useScreenshot│      │  (request)  │   │
 *      │   └─────────────┘      │   Capture)   │      └─────────────┘   │
 *      │                        └──────┬───────┘                          │
 *      │                               │                                  │
 *      │                               ▼                                  │
 *      │                  ┌─────────────────────┐                        │
 *      │                  │   Excalidraw API    │                        │
 *      │                  │  (window events)    │                        │
 *      │                  └──────────┬──────────┘                        │
 *      │                             │                                    │
 *      │                             ▼                                    │
 *      │                  excalidraw:screenshot-captured                  │
 *      │                             │                                    │
 *      │                             ▼                                    │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │   Chat      │◀─────│      ME      │─────▶│   ImageGen  │   │
 *      │   │  (receive)  │      │ (route by    │      │  (receive)  │   │
 *      │   └─────────────┘      │  requestId)  │      └─────────────┘   │
 *      │                        └──────────────┘                          │
 *      │                                                                  │
 *      │   I SEND EVENT: excalidraw:capture-screenshot                   │
 *      │   I LISTEN TO:  excalidraw:screenshot-captured                  │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Screenshots never arrive, wrong screenshot used, infinite waiting
 * - User Impact: AI can't see canvas, image generation fails
 * - Quick Fix: Check if Excalidraw API is initialized: (window as any).excalidrawAPI
 * - Debug: Look for "📸" logs in console, verify requestId matching
 * - Common Issue: Event listener not attached before dispatch - I fix this by attaching early
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isCaptureForChat    │ Whether current capture is for chat context          │
 * │ chatScreenshotData  │ Base64 data URL for chat screenshot                  │
 * │ chatRequestId       │ Request ID to match chat screenshot response         │
 * │ activeRequestIds    │ Set of pending screenshot requests                   │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - captureForChat(): Request a low-quality screenshot for AI context
 * - captureForGeneration(): Request a high-quality screenshot for image gen
 * - clearChatScreenshot(): Reset chat screenshot state
 * 
 * 🔑 KEY CONCEPT: Request ID Matching
 * Since screenshots are async (event-based), we use unique request IDs to ensure
 * the right screenshot goes to the right consumer. This prevents race conditions
 * when both chat and image generation request screenshots simultaneously.
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~80 lines of screenshot logic)
 * 2026-02-02: Separated chat capture from image generation capture concerns
 * 2026-02-02: Added proper TypeScript types for screenshot quality levels
 * 
 * @module useScreenshotCapture
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { eventBus } from "../../../lib/events";

/** Quality level for screenshot capture */
export type ScreenshotQuality = "low" | "high" | "preview";

/** Options for requesting a screenshot */
export interface ScreenshotRequestOptions {
    /** Element IDs to include (undefined = full canvas) */
    elementIds?: string[];
    /** Quality preset */
    quality: ScreenshotQuality;
    /** Unique ID to match response */
    requestId: string;
    /** Background color override */
    backgroundColor?: string;
}

/** Result from a screenshot capture */
export interface ScreenshotResult {
    /** Base64 data URL of the image */
    dataURL: string;
    /** Number of elements captured */
    elementCount: number;
    /** Original request ID */
    requestId: string;
    /** Error message if failed */
    error?: string;
}

export interface UseScreenshotCaptureOptions {
    /** Callback when chat screenshot is captured */
    onChatScreenshot?: (result: ScreenshotResult) => void;
    /** Callback when generation screenshot is captured */
    onGenerationScreenshot?: (result: ScreenshotResult) => void;
}

export interface UseScreenshotCaptureReturn {
    /** Whether we're waiting for a chat screenshot */
    isCaptureForChat: boolean;
    /** The captured chat screenshot data */
    chatScreenshotData: string | null;
    /** Current chat request ID */
    chatRequestId: string | null;

    // Actions
    /** Request a screenshot for chat context */
    captureForChat: (elementIds?: string[]) => string;
    /** Request a screenshot for image generation */
    captureForGeneration: (elementIds: string[], backgroundColor?: string) => string;
    /** Clear the chat screenshot */
    clearChatScreenshot: () => void;
    /** Reset all capture state */
    reset: () => void;
}

export function useScreenshotCapture(
    options: UseScreenshotCaptureOptions = {}
): UseScreenshotCaptureReturn {
    const { onChatScreenshot, onGenerationScreenshot } = options;

    // === 📸 Chat Capture State ===
    const [isCaptureForChat, setIsCaptureForChat] = useState(false);
    const [chatScreenshotData, setChatScreenshotData] = useState<string | null>(null);
    const chatRequestIdRef = useRef<string | null>(null);

    // === 🔄 Active Request Tracking ===
    const activeRequestIdsRef = useRef<Set<string>>(new Set());

    /**
     * Request a screenshot for chat context (low quality, fast)
     */
    const captureForChat = useCallback((elementIds?: string[]): string => {
        const requestId = `chat-${Date.now()}`;
        chatRequestIdRef.current = requestId;
        activeRequestIdsRef.current.add(requestId);
        setIsCaptureForChat(true);

        console.log("📸 Requesting chat screenshot:", requestId, "elements:", elementIds?.length || "all");

        eventBus.emit("excalidraw:capture-screenshot", {
            elementIds,
            quality: "low",
            requestId,
        });

        return requestId;
    }, []);

    /**
     * Request a screenshot for image generation (high quality)
     */
    const captureForGeneration = useCallback((
        elementIds: string[],
        backgroundColor?: string
    ): string => {
        const requestId = `generation-${Date.now()}`;
        activeRequestIdsRef.current.add(requestId);

        console.log("📸 Requesting generation screenshot:", requestId, "elements:", elementIds.length);

        eventBus.emit("excalidraw:capture-screenshot", {
            elementIds,
            quality: "high",
            backgroundColor,
            requestId,
        });

        return requestId;
    }, []);

    /**
     * Clear chat screenshot state
     */
    const clearChatScreenshot = useCallback(() => {
        setChatScreenshotData(null);
        setIsCaptureForChat(false);
        chatRequestIdRef.current = null;
    }, []);

    /**
     * Reset all capture state
     */
    const reset = useCallback(() => {
        setChatScreenshotData(null);
        setIsCaptureForChat(false);
        chatRequestIdRef.current = null;
        activeRequestIdsRef.current.clear();
    }, []);

    /**
     * Listen for screenshot capture events and route to appropriate handler
     */
    useEffect(() => {
        const unsubscribe = eventBus.on("excalidraw:screenshot-captured", (data) => {
            const detail = data;

            if (!detail?.requestId) {
                console.warn("⚠️ Received screenshot without requestId");
                return;
            }

            // Check if this is a request we care about
            if (!activeRequestIdsRef.current.has(detail.requestId)) {
                console.log("⏭️ Ignoring screenshot for unknown requestId:", detail.requestId);
                return;
            }

            // Remove from active requests
            activeRequestIdsRef.current.delete(detail.requestId);

            console.log("✅ Screenshot captured:", detail.requestId, "elements:", detail.elementCount);

            // Route to appropriate handler based on requestId prefix
            if (detail.requestId.startsWith("chat-")) {
                setIsCaptureForChat(false);
                chatRequestIdRef.current = null;

                if (!detail.error && detail.dataURL) {
                    setChatScreenshotData(detail.dataURL);
                }

                onChatScreenshot?.(detail as ScreenshotResult);
            } else if (detail.requestId.startsWith("generation-")) {
                onGenerationScreenshot?.(detail as ScreenshotResult);
            }
        });

        return unsubscribe;
    }, [onChatScreenshot, onGenerationScreenshot]);

    return {
        isCaptureForChat,
        chatScreenshotData,
        chatRequestId: chatRequestIdRef.current,

        captureForChat,
        captureForGeneration,
        clearChatScreenshot,
        reset,
    };
}

export default useScreenshotCapture;
