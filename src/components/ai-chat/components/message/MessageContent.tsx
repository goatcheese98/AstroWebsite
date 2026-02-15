import type { Message } from "../../types";
import { MarkdownPreview } from "../../../islands/markdown/components/MarkdownPreview";

interface MessageContentProps {
    /** Message data */
    message: Message;
    /** Whether this is a user message */
    isUser: boolean;
}

/**
 * Renders message content - user messages (plain text + images) or AI messages (markdown)
 */
export function MessageContent({ message, isUser }: MessageContentProps) {
    // Extract text content
    const textContent = message.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map(c => c.text)
        .join("\n");

    // Extract image content
    const imageContent = message.content
        .filter((c): c is { type: "image"; url: string } => c.type === "image")
        .map(c => c.url);

    // Determine theme for markdown
    const isDark = typeof document !== 'undefined' &&
        document.documentElement.getAttribute('data-theme') === 'dark';

    // Dummy checkbox handler (AI messages are read-only)
    const handleCheckboxToggle = () => {};

    if (isUser) {
        return (
            <>
                {textContent}
                {imageContent.length > 0 && (
                    <div className="message-images">
                        {imageContent.map((url, index) => (
                            <img
                                key={index}
                                src={url}
                                alt="Shared image"
                                className="message-image"
                            />
                        ))}
                    </div>
                )}
            </>
        );
    }

    // AI message with markdown
    return (
        <div className="ai-message-markdown">
            <MarkdownPreview
                content={textContent}
                onCheckboxToggle={handleCheckboxToggle}
                isDark={isDark}
            />
        </div>
    );
}
