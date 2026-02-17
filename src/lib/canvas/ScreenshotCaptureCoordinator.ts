/**
 * ScreenshotCaptureCoordinator
 * Pure TypeScript class handling canvas screenshot requests and routing
 * 
 * Responsibilities:
 * - Request ID generation and tracking
 * - Event-based screenshot request dispatch
 * - Response routing by request type (chat vs generation)
 * - State management for active captures
 * 
 * Event-driven architecture for React integration
 */

import { canvasEvents } from "@/lib/events/eventEmitter";

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

/** Internal tracking of pending requests */
interface PendingRequest {
  id: string;
  type: "chat" | "generation";
  startTime: number;
}

interface ScreenshotCaptureEvents {
  "chat-captured": ScreenshotResult;
  "generation-captured": ScreenshotResult;
  "capture-started": { requestId: string; type: "chat" | "generation" };
  error: Error;
}

export class ScreenshotCaptureCoordinator extends EventTarget {
  private activeRequests = new Map<string, PendingRequest>();
  private _isCaptureForChat = false;
  private _chatScreenshotData: string | null = null;
  private _chatRequestId: string | null = null;
  private unsubscribeHandler: (() => void) | null = null;

  // Getters
  get isCaptureForChat(): boolean {
    return this._isCaptureForChat;
  }

  get chatScreenshotData(): string | null {
    return this._chatScreenshotData;
  }

  get chatRequestId(): string | null {
    return this._chatRequestId;
  }

  get pendingRequestCount(): number {
    return this.activeRequests.size;
  }

  // Typed event emitters
  private emit<K extends keyof ScreenshotCaptureEvents>(
    type: K,
    detail: ScreenshotCaptureEvents[K]
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Start listening for screenshot capture events
   */
  startListening(): void {
    if (this.unsubscribeHandler) {
      return; // Already listening
    }

    this.unsubscribeHandler = canvasEvents.on(
      "excalidraw:screenshot-captured",
      (data: unknown) => {
        this.handleScreenshotCaptured(data as ScreenshotResult);
      }
    );
  }

  /**
   * Stop listening for events
   */
  stopListening(): void {
    if (this.unsubscribeHandler) {
      this.unsubscribeHandler();
      this.unsubscribeHandler = null;
    }
  }

  /**
   * Request a screenshot for chat context (low quality, fast)
   * @returns The request ID for tracking
   */
  captureForChat(elementIds?: string[]): string {
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    this._chatRequestId = requestId;
    this._isCaptureForChat = true;
    
    this.activeRequests.set(requestId, {
      id: requestId,
      type: "chat",
      startTime: Date.now(),
    });

    console.log("📸 Requesting chat screenshot:", requestId, "elements:", elementIds?.length || "all");

    canvasEvents.emit("excalidraw:capture-screenshot", {
      elementIds,
      quality: "low",
      requestId,
    });

    this.emit("capture-started", { requestId, type: "chat" });
    return requestId;
  }

  /**
   * Request a screenshot for image generation (high quality)
   * @returns The request ID for tracking
   */
  captureForGeneration(
    elementIds: string[],
    backgroundColor?: string
  ): string {
    const requestId = `generation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    this.activeRequests.set(requestId, {
      id: requestId,
      type: "generation",
      startTime: Date.now(),
    });

    console.log("📸 Requesting generation screenshot:", requestId, "elements:", elementIds.length);

    canvasEvents.emit("excalidraw:capture-screenshot", {
      elementIds,
      quality: "high",
      backgroundColor,
      requestId,
    });

    this.emit("capture-started", { requestId, type: "generation" });
    return requestId;
  }

  /**
   * Handle screenshot capture response
   */
  private handleScreenshotCaptured(result: ScreenshotResult): void {
    if (!result?.requestId) {
      console.warn("⚠️ Received screenshot without requestId");
      return;
    }

    // Check if this is a request we care about
    if (!this.activeRequests.has(result.requestId)) {
      console.log("⏭️ Ignoring screenshot for unknown requestId:", result.requestId);
      return;
    }

    // Get and remove the pending request
    const request = this.activeRequests.get(result.requestId)!;
    this.activeRequests.delete(result.requestId);

    const duration = Date.now() - request.startTime;
    console.log(
      "✅ Screenshot captured:",
      result.requestId,
      "elements:",
      result.elementCount,
      `(${duration}ms)`
    );

    // Route to appropriate handler based on request type
    if (request.type === "chat") {
      this._isCaptureForChat = false;
      this._chatRequestId = null;

      if (!result.error && result.dataURL) {
        this._chatScreenshotData = result.dataURL;
      }

      this.emit("chat-captured", result);
    } else if (request.type === "generation") {
      this.emit("generation-captured", result);
    }
  }

  /**
   * Clear chat screenshot state
   */
  clearChatScreenshot(): void {
    this._chatScreenshotData = null;
    this._isCaptureForChat = false;
    this._chatRequestId = null;
  }

  /**
   * Reset all capture state and clear pending requests
   */
  reset(): void {
    this._chatScreenshotData = null;
    this._isCaptureForChat = false;
    this._chatRequestId = null;
    this.activeRequests.clear();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopListening();
    this.reset();
  }
}
