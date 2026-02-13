import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { encode } from "@msgpack/msgpack";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCanvasState?: any;
}

export default function ShareModal({ isOpen, onClose, currentCanvasState }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize PartyKit room with current canvas state
  useEffect(() => {
    if (isOpen && !roomId) {
      const initializeShare = async () => {
        setIsInitializing(true);

        // Generate unique room ID (10 characters for readability)
        const newRoomId = nanoid(10);
        const url = `${window.location.origin}/share/${newRoomId}`;

        console.log("🔗 Share URL generated:", url);
        console.log("🔑 Room ID:", newRoomId);

        // Get current canvas state
        const api = (window as any).excalidrawAPI;
        if (api) {
          const elements = api.getSceneElements();
          const appState = api.getAppState();
          const files = api.getFiles();

          console.log("📦 Capturing current canvas state:", {
            elements: elements.length,
            files: Object.keys(files || {}).length
          });

          // Connect to PartyKit and send initial state
          const partyKitHost = import.meta.env.PUBLIC_PARTYKIT_HOST || "astroweb-excalidraw.goatcheese98.partykit.dev";
          const wsUrl = `wss://${partyKitHost}/parties/main/${newRoomId}`;

          console.log("🌐 Connecting to PartyKit:", wsUrl);

          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log("✅ Connected to PartyKit, sending initial state...");

            // Send initial canvas state (MessagePack encoded)
            const message = encode({
              type: "canvas-update",
              elements,
              appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                currentItemStrokeColor: appState.currentItemStrokeColor,
                currentItemBackgroundColor: appState.currentItemBackgroundColor,
                currentItemFillStyle: appState.currentItemFillStyle,
                currentItemStrokeWidth: appState.currentItemStrokeWidth,
                currentItemRoughness: appState.currentItemRoughness,
                currentItemOpacity: appState.currentItemOpacity,
                currentItemFontFamily: appState.currentItemFontFamily,
                currentItemFontSize: appState.currentItemFontSize,
                currentItemTextAlign: appState.currentItemTextAlign,
                currentItemStrokeStyle: appState.currentItemStrokeStyle,
                currentItemRoundness: appState.currentItemRoundness,
              },
              files,
            });

            ws.send(message);
            console.log("✅ Initial state sent to PartyKit (MessagePack)");

            // Close connection after sending initial state
            setTimeout(() => {
              ws.close();
              setIsInitializing(false);
            }, 500);
          };

          ws.onerror = (error) => {
            console.error("❌ Failed to connect to PartyKit:", error);
            setIsInitializing(false);
          };
        } else {
          console.warn("⚠️ Canvas API not ready, share will have empty initial state");
          setIsInitializing(false);
        }

        setRoomId(newRoomId);
        setShareUrl(url);
      };

      initializeShare();
    }
  }, [isOpen, roomId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log("✓ Share URL copied to clipboard");

      // Automatically redirect to shared canvas after copying
      setTimeout(() => {
        console.log("🔗 Redirecting to shared canvas");
        window.location.href = shareUrl;
      }, 300); // Small delay so user sees "Copied!" feedback
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank');
    console.log("🔗 Opening share URL in new tab");
    // Also redirect current tab
    setTimeout(() => {
      window.location.href = shareUrl;
    }, 500);
  };

  const handleClose = () => {
    // Don't reset roomId immediately - keep it for reopen
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Share Canvas</h2>
            <button className="close-button" onClick={handleClose} title="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="modal-body">
            <p className="description">
              Anyone with this link can <strong>view and edit</strong> your canvas in real-time. Sharing automatically enables collaborative editing with live cursors.
            </p>

            <div className="share-url-container">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="share-url-input"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <div className="button-group">
                <button onClick={handleCopy} className="copy-btn">
                  {copied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
                <button onClick={handleOpenInNewTab} className="open-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open
                </button>
              </div>
            </div>

            <div className="info-section">
              <div className="info-item">
                <div className="info-icon synced">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </div>
                <div>
                  <strong>Real-time collaboration features:</strong>
                  <ul>
                    <li>Live cursor tracking</li>
                    <li>Instant canvas sync</li>
                    <li>Markdown notes</li>
                    <li>Generated images</li>
                  </ul>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon local">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <strong>Stays private per user:</strong>
                  <ul>
                    <li>AI chat messages</li>
                  </ul>
                </div>
              </div>

              <div className="warning-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <strong>Public collaboration:</strong> Anyone with the link can edit or clear the canvas.
                  There is no ownership or permission control.
                </div>
              </div>

              <div className="action-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <div>
                  <strong>Version tracking:</strong> A snapshot of the current state is saved when you share. All future changes are synced in real-time to all collaborators.
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={handleClose} className="done-btn">
              Close
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
          backdrop-filter: blur(2px);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          background: var(--color-surface);
          border-radius: 12px;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-2xl);
          max-width: 560px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.2s ease;
          font-family: var(--font-ui);
        }

        @keyframes slideUp {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          border-bottom: 1px solid var(--color-border);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          letter-spacing: -0.01em;
        }

        .close-button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.375rem;
          border-radius: 6px;
          color: var(--color-text-secondary);
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
        }

        .modal-body {
          padding: 1.25rem;
        }

        .description {
          margin: 0 0 1.25rem 0;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .share-url-container {
          margin-bottom: 1.25rem;
        }

        .share-url-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          color: var(--color-text);
          background: var(--color-bg);
          margin-bottom: 0.75rem;
          box-sizing: border-box;
          transition: all 0.15s;
        }

        .share-url-input:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-light);
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
        }

        .copy-btn,
        .open-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.625rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-family: var(--font-ui);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .copy-btn {
          background: var(--color-accent);
          color: white;
          border-color: var(--color-accent);
        }

        .copy-btn:hover {
          background: var(--color-accent-hover);
          border-color: var(--color-accent-hover);
        }

        .open-btn {
          background: var(--color-bg);
          color: var(--color-text);
        }

        .open-btn:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-border-hover);
        }

        .info-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .info-item {
          display: flex;
          gap: 0.875rem;
          align-items: flex-start;
          padding: 0.875rem;
          background: var(--color-bg);
          border-radius: 8px;
          border: 1px solid var(--color-border);
        }

        .info-icon {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }

        .info-icon.synced {
          background: #dbeafe;
          color: #2563eb;
        }

        .info-icon.local {
          background: #fef3c7;
          color: #d97706;
        }

        .info-item strong {
          display: block;
          margin-bottom: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .info-item ul {
          margin: 0;
          padding-left: 1rem;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .info-item li {
          margin-bottom: 0.125rem;
        }

        .warning-box {
          display: flex;
          gap: 0.75rem;
          padding: 0.875rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        .warning-box svg {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .action-box {
          display: flex;
          gap: 0.75rem;
          padding: 0.875rem;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          color: #2563eb;
          font-size: 0.8125rem;
          line-height: 1.5;
          margin-top: 0.5rem;
        }

        .action-box svg {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .modal-footer {
          padding: 1.25rem;
          border-top: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .start-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.75rem 1.25rem;
          background: var(--color-accent);
          color: white;
          border: 1px solid var(--color-accent);
          border-radius: 8px;
          font-family: var(--font-ui);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .start-btn:hover {
          background: var(--color-accent-hover);
          border-color: var(--color-accent-hover);
        }

        .done-btn {
          padding: 0.75rem 1.5rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-family: var(--font-ui);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .done-btn:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-border-hover);
        }

        @media (max-width: 640px) {
          .modal-content {
            max-width: 100%;
            border-radius: 12px;
            max-height: 95vh;
          }

          .modal-header {
            padding: 1rem;
          }

          .modal-header h2 {
            font-size: 1rem;
          }

          .modal-body {
            padding: 1rem;
          }

          .button-group {
            flex-direction: column;
          }

          .info-item {
            flex-direction: column;
            gap: 0.625rem;
          }

          .warning-box {
            flex-direction: column;
            gap: 0.625rem;
          }

          .action-box {
            flex-direction: column;
            gap: 0.625rem;
          }

          .modal-footer {
            flex-direction: column;
            padding: 1rem;
          }

          .start-btn {
            width: 100%;
          }

          .done-btn {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
