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
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank');
    console.log("🔗 Opening share URL in new tab");
  };

  const handleStartCollaborating = () => {
    // Redirect to share URL so creator also uses shared canvas
    console.log("🔗 Redirecting to shared canvas");
    window.location.href = shareUrl;
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
            <h2>🌐 Share Canvas</h2>
            <button className="close-button" onClick={handleClose} title="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="modal-body">
            <p className="description">
              Anyone with this link can <strong>view and edit</strong> your canvas in real-time.
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
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
                <button onClick={handleOpenInNewTab} className="open-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Open
                </button>
              </div>
            </div>

            <div className="info-section">
              <div className="info-item">
                <div className="info-icon synced">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </div>
                <div>
                  <strong>Auto-synced features:</strong>
                  <ul>
                    <li>✓ Drawing elements</li>
                    <li>✓ Markdown notes</li>
                    <li>✓ Generated images</li>
                  </ul>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon local">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <strong>Local only:</strong>
                  <ul>
                    <li>🔒 AI chat messages (private per user)</li>
                  </ul>
                </div>
              </div>

              <div className="warning-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <strong>Public collaboration:</strong> Anyone with the link can edit or clear the canvas.
                  There is no ownership or permission control.
                </div>
              </div>

              <div className="action-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <div>
                  <strong>Important:</strong> To sync your future edits, click "Start Collaborating" below to switch to the shared canvas. Otherwise, continue editing here and only the current state will be shared.
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={handleStartCollaborating} className="start-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Start Collaborating
            </button>
            <button onClick={handleClose} className="done-btn">
              Done
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
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
          backdrop-filter: blur(4px);
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
          background: white;
          border-radius: 16px;
          border: 3px solid var(--color-stroke, #333);
          box-shadow: 6px 6px 0 var(--color-stroke, #333);
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease;
          font-family: var(--font-hand, sans-serif);
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
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
          padding: 1.5rem;
          border-bottom: 2px solid var(--color-stroke-muted, #e5e5e5);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text, #333);
        }

        .close-button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          color: var(--color-text-muted, #666);
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: var(--color-text, #333);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .description {
          margin: 0 0 1.5rem 0;
          font-size: 0.95rem;
          color: var(--color-text-muted, #666);
          line-height: 1.6;
        }

        .share-url-container {
          margin-bottom: 1.5rem;
        }

        .share-url-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--color-stroke, #333);
          border-radius: 8px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.85rem;
          color: var(--color-text, #333);
          background: var(--color-fill-1, #f8f9fa);
          margin-bottom: 0.75rem;
          box-sizing: border-box;
        }

        .share-url-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
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
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: 2px solid var(--color-stroke, #333);
          border-radius: 8px;
          font-family: var(--font-hand, sans-serif);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 2px 2px 0 var(--color-stroke, #333);
        }

        .copy-btn {
          background: #667eea;
          color: white;
        }

        .copy-btn:hover {
          background: #5568d3;
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 var(--color-stroke, #333);
        }

        .copy-btn:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0 var(--color-stroke, #333);
        }

        .open-btn {
          background: white;
          color: var(--color-text, #333);
        }

        .open-btn:hover {
          background: var(--color-fill-1, #f8f9fa);
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 var(--color-stroke, #333);
        }

        .open-btn:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0 var(--color-stroke, #333);
        }

        .info-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .info-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          padding: 1rem;
          background: var(--color-fill-1, #f8f9fa);
          border-radius: 8px;
          border: 2px solid var(--color-stroke-muted, #e5e5e5);
        }

        .info-icon {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }

        .info-icon.synced {
          background: #e3f2ff;
          color: #1971c2;
        }

        .info-icon.local {
          background: #fff9db;
          color: #fab005;
        }

        .info-item strong {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .info-item ul {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.85rem;
          color: var(--color-text-muted, #666);
          line-height: 1.6;
        }

        .info-item li {
          margin-bottom: 0.25rem;
        }

        .warning-box {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #fff5f5;
          border: 2px solid #ffc9c9;
          border-radius: 8px;
          color: #c92a2a;
          font-size: 0.85rem;
          line-height: 1.6;
        }

        .warning-box svg {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .action-box {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #e3f2ff;
          border: 2px solid #74c0fc;
          border-radius: 8px;
          color: #1971c2;
          font-size: 0.85rem;
          line-height: 1.6;
          margin-top: 1rem;
        }

        .action-box svg {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 2px solid var(--color-stroke-muted, #e5e5e5);
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .start-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: #667eea;
          color: white;
          border: 2px solid var(--color-stroke, #333);
          border-radius: 8px;
          font-family: var(--font-hand, sans-serif);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 3px 3px 0 var(--color-stroke, #333);
        }

        .start-btn:hover {
          background: #5568d3;
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0 var(--color-stroke, #333);
        }

        .start-btn:active {
          transform: translate(1px, 1px);
          box-shadow: 2px 2px 0 var(--color-stroke, #333);
        }

        .done-btn {
          padding: 0.75rem 2rem;
          background: white;
          border: 2px solid var(--color-stroke, #333);
          border-radius: 8px;
          font-family: var(--font-hand, sans-serif);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 2px 2px 0 var(--color-stroke, #333);
        }

        .done-btn:hover {
          background: var(--color-fill-1, #f8f9fa);
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 var(--color-stroke, #333);
        }

        .done-btn:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0 var(--color-stroke, #333);
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
            font-size: 1.25rem;
          }

          .modal-body {
            padding: 1rem;
          }

          .button-group {
            flex-direction: column;
          }

          .info-item {
            flex-direction: column;
            gap: 0.75rem;
          }

          .warning-box {
            flex-direction: column;
            gap: 0.75rem;
          }

          .action-box {
            flex-direction: column;
            gap: 0.75rem;
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
