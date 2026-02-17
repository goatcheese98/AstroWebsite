import { useState } from "react";

interface MessageActionsProps {
  textContent: string;
}

/**
 * Action buttons for AI text messages
 * - Copy: Copies the text content to clipboard
 */
export function MessageActions({ textContent }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    if (!textContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  if (!textContent?.trim()) return null;

  return (
    <div className="flex gap-1.5 mt-1 ml-2.5">
      <button
        onClick={copyMessage}
        title="Copy message"
        className={`message-action-btn ${copied ? 'message-action-btn--success' : ''}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default MessageActions;
