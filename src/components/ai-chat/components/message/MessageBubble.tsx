import type { Message } from "../../types";
import { DrawingActions } from "./DrawingActions";
import { DrawingPreview } from "./DrawingPreview";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./MessageContent";

export interface MessageBubbleProps {
  message: Message;
  canvasState?: any;
}

/**
 * Single message bubble component
 * 
 * Composed of:
 * - MessageContent: Renders text/images
 * - DrawingPreview: Visual preview for drawing commands (shown inline)
 * - DrawingActions: Add to canvas, Copy JSON, Copy SVG (only for drawings)
 * - MessageActions: Copy button (only for regular text messages)
 */
export function MessageBubble({ message, canvasState }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasDrawingCommand = !!message.drawingCommand && Array.isArray(message.drawingCommand);

  // Extract text content for copy action
  const textContent = message.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map(c => c.text)
    .join("\n");

  const timestamp = message.metadata.timestamp instanceof Date
    ? message.metadata.timestamp
    : new Date(message.metadata.timestamp);

  return (
    <div className={`message-bubble-wrapper ${isUser ? 'message-bubble-wrapper--user' : 'message-bubble-wrapper--assistant'}`}>
      {/* Message Content */}
      <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--assistant'}`}>
        <MessageContent message={message} isUser={isUser} />
        
        {/* Inline Drawing Preview */}
        {hasDrawingCommand && (
          <DrawingPreview elements={message.drawingCommand!} />
        )}
      </div>

      {/* Actions for AI messages */}
      {!isUser && (
        <>
          {/* Drawing Actions - only for drawing commands */}
          {hasDrawingCommand ? (
            <DrawingActions
              drawingCommand={message.drawingCommand!}
              canvasState={canvasState}
            />
          ) : (
            /* Copy action for regular text messages */
            <MessageActions textContent={textContent} />
          )}
        </>
      )}

      {/* Timestamp */}
      <span className={`message-timestamp ${isUser ? 'message-timestamp--user' : 'message-timestamp--assistant'}`}>
        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

export default MessageBubble;
