/**
 * CollabDialog — Live collaboration dialog.
 *
 * Matches the UI/UX of excalidraw.com's "Live collaboration" modal:
 *   - Name input (persisted across sessions)
 *   - Shareable room link with copy button
 *   - QR code of the link
 *   - Start / Stop session button
 *   - E2E encryption notice
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface CollabDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isCollaborating: boolean;
  roomLink: string | null;
  username: string;
  onUsernameChange: (name: string) => void;
  onStartSession: () => Promise<void>;
  onStopSession: () => void;
}

export default function CollabDialog({
  isOpen,
  onClose,
  isCollaborating,
  roomLink,
  username,
  onUsernameChange,
  onStartSession,
  onStopSession,
}: CollabDialogProps) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Generate QR code whenever the room link changes.
  useEffect(() => {
    if (!roomLink) { setQrDataUrl(null); return; }
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(roomLink, { width: 200, margin: 2, color: { dark: "#000", light: "#fff" } })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    });
  }, [roomLink]);

  // Focus name input when dialog opens.
  useEffect(() => {
    if (isOpen) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    if (!roomLink) return;
    await navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomLink]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      await onStartSession();
    } finally {
      setStarting(false);
    }
  }, [onStartSession]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Live collaboration"
        onKeyDown={handleKeyDown}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 2001,
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
          padding: "28px 32px 24px",
          width: "min(520px, calc(100vw - 32px))",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "var(--ui-font, system-ui, sans-serif)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1a1a2e" }}>
            Live collaboration
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              color: "#6b7280",
              lineHeight: 1,
              fontSize: 20,
            }}
          >
            ×
          </button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            Your name
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1.5px solid #e5e7eb",
              background: "#f9fafb",
              fontSize: "0.95rem",
              color: "#1a1a2e",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* Link — only visible when a session is active */}
        {isCollaborating && roomLink && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Link
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  readOnly
                  value={roomLink}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #e5e7eb",
                    background: "#f3f4f6",
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    outline: "none",
                    boxSizing: "border-box",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  style={{
                    flexShrink: 0,
                    padding: "10px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: copied ? "#22c55e" : "#6366f1",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* QR code */}
            {qrDataUrl && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{
                  padding: 12,
                  border: "1.5px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  display: "inline-block",
                }}>
                  <img
                    src={qrDataUrl}
                    alt="QR code for collaboration link"
                    width={160}
                    height={160}
                    style={{ display: "block" }}
                  />
                </div>
              </div>
            )}

            {/* E2E encryption notice */}
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: "0.8rem",
              color: "#15803d",
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              🔒 The session is end-to-end encrypted and fully private. Not even our server can see what you draw.
            </div>

            {/* Session info */}
            <div style={{
              fontSize: "0.78rem",
              color: "#9ca3af",
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              Stopping the session will disconnect you from the room, but you'll be able to
              continue working locally.
            </div>
          </>
        )}

        {/* Action button */}
        {isCollaborating ? (
          <button
            onClick={onStopSession}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "2px solid #fca5a5",
              background: "#fff",
              color: "#dc2626",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fff";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Stop session
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={starting}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "none",
              background: starting ? "#a5b4fc" : "#6366f1",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: starting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.15s",
            }}
          >
            {starting ? (
              "Starting…"
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Start collaboration
              </>
            )}
          </button>
        )}
      </div>
    </>
  );
}
