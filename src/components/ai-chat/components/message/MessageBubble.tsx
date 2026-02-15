import type { Message } from "../../types";
import { MessageActions } from "./MessageActions";
import { DrawingActions } from "./DrawingActions";
import { MessageContent } from "./MessageContent";

export interface MessageBubbleProps {
    /** Message data to display */
    message: Message;
    /** Canvas state for SVG export */
    canvasState?: any;
}

/**
 * Single message bubble component
 * 
 * Composed of:
 * - MessageContent: Renders text/images for users, markdown for AI
 * - MessageActions: Copy/Show code buttons for AI text messages
 * - DrawingActions: Add to canvas/Copy JSON/Copy SVG for drawing commands
 */
export function MessageBubble({ message, canvasState }: MessageBubbleProps) {
    const isUser = message.role === "user";
    const hasDrawingCommand = !!message.drawingCommand && Array.isArray(message.drawingCommand);

    // Extract text content for actions
    const textContent = message.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map(c => c.text)
        .join("\n");

    // Format timestamp
    const timestamp = message.metadata.timestamp instanceof Date
        ? message.metadata.timestamp
        : new Date(message.metadata.timestamp);

    return (
        <div className={`message-bubble-wrapper ${isUser ? 'message-bubble-wrapper--user' : 'message-bubble-wrapper--assistant'}`}>
            {/* Message Content */}
            <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--assistant'}`}>
                <MessageContent message={message} isUser={isUser} />
            </div>

            {/* Action Buttons for AI Messages */}
            {!isUser && (
                <MessageActions textContent={textContent} sourceCode={message.sourceCode} />
            )}

            {/* Drawing Command Buttons */}
            {!isUser && hasDrawingCommand && (
                <DrawingActions
                    drawingCommand={message.drawingCommand!}
                    canvasState={canvasState}
                    sourceCode={message.sourceCode}
                />
            )}

            {/* Timestamp */}
            <span className={`message-timestamp ${isUser ? 'message-timestamp--user' : 'message-timestamp--assistant'}`}>
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    );
}

export default MessageBubble;
