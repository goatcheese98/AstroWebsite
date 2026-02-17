/**
 * ChatCoordinator - Pure TypeScript chat orchestration
 * 
 * Handles all chat business logic:
 * - Canvas context preparation
 * - Message formatting and sending
 * - Response parsing (Mermaid, JSON, embeds)
 * - Error handling
 * 
 * No React dependencies - can be used anywhere
 */

import { nanoid } from "nanoid";
import type {
  AIProvider,
  ContextMode,
  ChatMessage,
  CanvasState,
  SendMessageRequest,
  ParsedResponse,
  ChatError,
} from "./types";

export interface ChatCoordinatorOptions {
  provider: AIProvider;
  onMessage: (message: ChatMessage) => void;
  onError: (error: ChatError) => void;
  onLoadingChange: (loading: boolean) => void;
}

/**
 * Coordinates AI chat operations
 * Pure TypeScript - framework agnostic
 */
export class ChatCoordinator {
  private provider: AIProvider;
  private onMessage: (message: ChatMessage) => void;
  private onError: (error: ChatError) => void;
  private onLoadingChange: (loading: boolean) => void;
  private abortController: AbortController | null = null;

  constructor(options: ChatCoordinatorOptions) {
    this.provider = options.provider;
    this.onMessage = options.onMessage;
    this.onError = options.onError;
    this.onLoadingChange = options.onLoadingChange;
  }

  /**
   * Update the AI provider
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /**
   * Get the current provider
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Toggle between Kimi and Claude
   */
  toggleProvider(): AIProvider {
    this.provider = this.provider === "kimi" ? "claude" : "kimi";
    return this.provider;
  }

  /**
   * Generate canvas description for AI context
   */
  getCanvasDescription(
    canvasState: CanvasState | null,
    selectedWebEmbed?: { url: string; title: string } | null
  ): string {
    if (!canvasState?.elements?.length) {
      return "The canvas is currently empty.";
    }

    const counts: Record<string, number> = {};
    let webEmbedCount = 0;

    for (const el of canvasState.elements) {
      counts[el.type] = (counts[el.type] || 0) + 1;
      if (el.customData?.type === "web-embed") {
        webEmbedCount++;
      }
    }

    const desc = Object.entries(counts)
      .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
      .join(", ");

    let description = `Canvas has ${canvasState.elements.length} elements: ${desc}`;

    if (selectedWebEmbed) {
      description += `\n\nSelected Web Embed: ${selectedWebEmbed.url}`;
      description += `\nThe user has a web page embedded that they may want you to analyze or reference.`;
    }

    return description;
  }

  /**
   * Build the context message based on selection mode
   */
  private buildContextMessage(
    request: SendMessageRequest
  ): { contextMessage: string; elementData: string; isModifying: boolean } {
    const {
      contextMode,
      selectedElements = [],
      getSelectionContext,
      canvasState,
    } = request;

    if (
      contextMode === "selected" &&
      selectedElements.length > 0 &&
      getSelectionContext
    ) {
      const selectionContext = getSelectionContext();
      let elementData = "";

      if (canvasState?.elements) {
        const selectedElementData = canvasState.elements.filter((el: any) =>
          selectedElements.includes(el.id)
        );
        if (selectedElementData.length > 0) {
          elementData = `\n\nSELECTED ELEMENTS DATA (JSON - MODIFY THESE, PRESERVE IDs):\n${JSON.stringify(
            selectedElementData,
            null,
            2
          )}`;
        }
      }

      return {
        contextMessage: `\n\n[Working with ${selectedElements.length} selected elements:\n${selectionContext}]`,
        elementData,
        isModifying: elementData.length > 0,
      };
    }

    return {
      contextMessage: `\n\n[Canvas has ${canvasState?.elements?.length || 0} total elements]`,
      elementData: "",
      isModifying: false,
    };
  }

  /**
   * Create a user message object
   */
  private createUserMessage(
    content: string,
    screenshotData: string | null | undefined,
    canvasState: CanvasState | null,
    selectedElements: string[]
  ): ChatMessage {
    const messageContent: ChatMessage["content"] = [
      { type: "text", text: content },
    ];

    if (screenshotData) {
      messageContent.push({ type: "image", url: screenshotData });
    }

    return {
      id: nanoid(),
      role: "user",
      content: messageContent,
      metadata: {
        timestamp: new Date(),
        canvasContext: {
          elementCount: canvasState?.elements?.length || 0,
          selectedElementIds: selectedElements,
          viewport: canvasState?.appState || { scrollX: 0, scrollY: 0, zoom: 1 },
        },
      },
      reactions: [],
      status: "sent",
    };
  }

  /**
   * Send a message to the AI
   */
  async sendMessage(request: SendMessageRequest): Promise<void> {
    const { content, screenshotData, selectedElements = [], history } = request;

    if (!content.trim()) {
      return;
    }

    this.onLoadingChange(true);

    try {
      // Build context
      const { contextMessage, elementData, isModifying } =
        this.buildContextMessage(request);
      const fullContent = content + contextMessage + elementData;

      // Create and emit user message
      const userMessage = this.createUserMessage(
        content,
        screenshotData,
        request.canvasState,
        selectedElements
      );
      this.onMessage(userMessage);

      // Prepare API request
      const canvasDescription = this.getCanvasDescription(
        request.canvasState,
        null // TODO: Pass selectedWebEmbed from request
      );

      const selectionContext =
        selectedElements.length > 0 && request.getSelectionContext
          ? `\n\nCurrently selected elements (${selectedElements.length}):\n${request.getSelectionContext()}`
          : "";

      const endpoint =
        this.provider === "kimi" ? "/api/chat-kimi" : "/api/chat";
      const model =
        this.provider === "kimi"
          ? "kimi-k2.5"
          : "claude-sonnet-4-20250514";

      console.log(
        `🤖 Sending to ${this.provider === "kimi" ? "Kimi K2.5" : "Claude"}...`
      );

      // Create abort controller for cancellation
      this.abortController = new AbortController();

      // Send request
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...history.map((m) => ({
              role: m.role,
              content: m.content
                .map((c) => (c.type === "text" ? c.text : ""))
                .join("\n"),
            })),
            { role: "user", content: fullContent },
          ],
          model,
          canvasState: {
            description: canvasDescription + selectionContext,
            elementCount: request.canvasState?.elements?.length || 0,
            selectedElements:
              selectedElements.length > 0
                ? `User has selected ${selectedElements.length} elements${
                    request.getSelectionContext
                      ? ": " + request.getSelectionContext()
                      : ""
                  }`
                : "No specific elements selected",
            isModifyingElements: isModifying,
          },
          screenshot: screenshotData,
        }),
        signal: this.abortController.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleAPIError(data, response.status);
        return;
      }

      console.log(`✅ ${this.provider} response received`);

      // Parse and emit assistant message
      const parsed = await this.parseResponse(data.message, model);
      this.emitAssistantMessage(parsed, model);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Request aborted");
        return;
      }

      console.error("Send message error:", err);
      this.onError({
        message:
          err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      this.abortController = null;
      this.onLoadingChange(false);
    }
  }

  /**
   * Handle API errors
   */
  private handleAPIError(data: any, status: number): void {
    console.error(`❌ ${this.provider} API error:`, data);
    const errorMessage =
      data.details || data.error || `${this.provider} API failed`;
    const isOverloaded =
      errorMessage.toLowerCase().includes("overload") ||
      errorMessage.toLowerCase().includes("too many requests") ||
      status === 429;

    if (isOverloaded) {
      const otherProvider = this.provider === "kimi" ? "claude" : "kimi";
      this.onError({
        message: `${this.provider} is currently overloaded. Click the provider badge to switch to ${otherProvider} instead.`,
        isOverloaded: true,
        suggestedProvider: otherProvider,
      });
    } else {
      this.onError({ message: errorMessage });
    }
  }

  /**
   * Parse AI response for drawing commands, Mermaid diagrams, etc.
   */
  private async parseResponse(
    message: string,
    model: string
  ): Promise<ParsedResponse> {
    let displayMessage = message;
    let drawingCommand: any[] | undefined;
    let sourceCode: string | undefined;
    let embedUrl: string | undefined;

    // Check for Mermaid diagrams
    const mermaidMatch = message.match(/```mermaid\s*\n([\s\S]*?)\n```/);
    if (mermaidMatch) {
      try {
        sourceCode = mermaidMatch[0];
        const { convertMermaidToCanvas } = await import(
          "@/lib/mermaid-converter"
        );
        const { elements } = await convertMermaidToCanvas(mermaidMatch[1]);

        if (elements?.length > 0) {
          drawingCommand = elements;
          displayMessage = message.replace(
            mermaidMatch[0],
            "\n\n✅ **Mermaid diagram converted to editable shapes**\n"
          );
          console.log(
            `🧜‍♀️ Converted Mermaid to ${elements.length} Excalidraw elements`
          );
        }
      } catch (err) {
        console.error("Failed to convert Mermaid diagram:", err);
        sourceCode = undefined;
      }
    }

    // Check for JSON drawing commands
    if (!drawingCommand) {
      const jsonMatch =
        message.match(/```json\s*\n([\s\S]*?)\n```/) ||
        message.match(/```\s*\n([\s\S]*?)\n```/) ||
        message.match(/\[\s*\{[\s\S]*?\}\s*\]/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (Array.isArray(parsed)) {
            drawingCommand = parsed;
            sourceCode = jsonMatch[0];
            displayMessage = message.replace(
              jsonMatch[0],
              "\n\n✅ **Drawing command received**\n"
            );
          }
        } catch (err) {
          console.error("Failed to parse drawing command:", err);
        }
      }
    }

    // Check for web embed command
    const embedMatch = message.match(/EMBED:\s*(https?:\/\/\S+)/i);
    if (embedMatch) {
      embedUrl = embedMatch[1];
      console.log("🌐 Web embed requested:", embedUrl);
      displayMessage = displayMessage.replace(
        embedMatch[0],
        "\n\n✅ **Web page embedded**\n"
      );
      sourceCode = embedMatch[0];
    }

    return {
      displayMessage,
      drawingCommand,
      sourceCode,
      embedUrl,
    };
  }

  /**
   * Emit assistant message
   */
  private emitAssistantMessage(
    parsed: ParsedResponse,
    model: string
  ): void {
    const assistantMessage: ChatMessage = {
      id: nanoid(),
      role: "assistant",
      content: [{ type: "text", text: parsed.displayMessage }],
      metadata: {
        timestamp: new Date(),
        model,
        provider: this.provider,
      },
      reactions: [],
      status: "sent",
      drawingCommand: parsed.drawingCommand,
      sourceCode: parsed.sourceCode,
    };

    this.onMessage(assistantMessage);

    // Emit web embed event if present
    if (parsed.embedUrl) {
      // This is a side effect - could be moved to a separate event bus
      // or handled by the caller
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("canvas:create-web-embed", {
            detail: { url: parsed.embedUrl },
          })
        );
      }
    }
  }

  /**
   * Abort the current request
   */
  abort(): void {
    this.abortController?.abort();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.abort();
  }
}

/**
 * Factory function to create a ChatCoordinator instance
 */
export function createChatCoordinator(
  options: ChatCoordinatorOptions
): ChatCoordinator {
  return new ChatCoordinator(options);
}
