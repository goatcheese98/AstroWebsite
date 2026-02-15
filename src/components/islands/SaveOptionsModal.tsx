/**
 * Save Options Modal
 * For authenticated users: primary = cloud save, secondary = export
 * For anonymous users: primary = sign in prompt, secondary = download
 */

export interface SaveOptions {
    compressed: boolean;
    excludeHistory?: boolean;
}

interface SaveOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: SaveOptions) => void;
    elementCount: number;
    messageCount: number;
    imageCount: number;
    isAuthenticated?: boolean;
    onCloudSave?: () => void;
}

export default function SaveOptionsModal({
    isOpen,
    onClose,
    onConfirm,
    elementCount,
    messageCount,
    imageCount,
    isAuthenticated = false,
    onCloudSave,
}: SaveOptionsModalProps) {
    if (!isOpen) return null;

    const handleCompressedFull = () => {
        onConfirm({ compressed: true, excludeHistory: false });
    };

    const handleCompressedNoHistory = () => {
        onConfirm({ compressed: true, excludeHistory: true });
    };

    const handleFull = () => {
        onConfirm({ compressed: false, excludeHistory: false });
    };

    return (
        <div
            className="modal-overlay"
            style={{ padding: '20px' }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal-content" style={{ maxWidth: '420px' }}>
                <h3 className="modal-title" style={{ marginBottom: '8px' }}>
                    Save Canvas
                </h3>

                <p className="text-text-secondary text-sm mb-5">
                    {isAuthenticated
                        ? "Your canvas auto-saves to the cloud. Export a local copy below:"
                        : "Sign in to save your work to the cloud, or download a local copy:"}
                </p>

                <div className="flex flex-col gap-2 mb-5">
                    {/* Cloud save (authenticated) or Sign in prompt (anonymous) */}
                    {isAuthenticated ? (
                        onCloudSave && (
                            <button
                                onClick={() => {
                                    onCloudSave();
                                    onClose();
                                }}
                                className="save-option-btn save-option-btn--cloud"
                            >
                                <div className="save-option-btn__icon save-option-btn__icon--cloud">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                                        <polyline points="16 16 12 12 8 16"/>
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="save-option-btn__title">Save to Cloud Now</div>
                                    <div className="save-option-btn__desc">Force an immediate cloud save.</div>
                                </div>
                            </button>
                        )
                    ) : (
                        <a
                            href="/login"
                            className="save-option-btn save-option-btn--primary"
                        >
                            <div className="save-option-btn__icon save-option-btn__icon--primary">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                                    <polyline points="16 16 12 12 8 16"/>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="save-option-btn__title">Sign in to save to cloud</div>
                                <div className="save-option-btn__desc">Your canvas will be preserved and synced across devices.</div>
                            </div>
                        </a>
                    )}

                    {/* Divider */}
                    <div className="divider-with-text">
                        <div className="divider-line" />
                        <span className="divider-text">Export to file</span>
                        <div className="divider-line" />
                    </div>

                    {/* Option 1: Compressed Full */}
                    <button
                        onClick={handleCompressedFull}
                        className="save-option-btn save-option-btn--default"
                    >
                        <div className="save-option-btn__icon save-option-btn__icon--default">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="save-option-btn__title">Compressed — Full</div>
                            <div className="save-option-btn__desc">Everything included. ~25-30% smaller. Best for backups.</div>
                        </div>
                    </button>

                    {/* Option 2: Compressed without History */}
                    <button
                        onClick={handleCompressedNoHistory}
                        className="save-option-btn save-option-btn--default"
                    >
                        <div className="save-option-btn__icon save-option-btn__icon--default">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                                <line x1="8" y1="3" x2="16" y2="3" strokeWidth="3" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="save-option-btn__title">
                                Compressed — No Image History
                                <span className="badge badge--success">Smallest</span>
                            </div>
                            <div className="save-option-btn__desc">Excludes generated image gallery. ~50%+ smaller.</div>
                        </div>
                    </button>

                    {/* Option 3: Full Size */}
                    <button
                        onClick={handleFull}
                        className="save-option-btn save-option-btn--default"
                    >
                        <div className="save-option-btn__icon save-option-btn__icon--default">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="save-option-btn__title">Full Size (Readable JSON)</div>
                            <div className="save-option-btn__desc">Human-readable format. Use for debugging or manual editing.</div>
                        </div>
                    </button>
                </div>

                {/* Stats */}
                <div className="stats-bar mb-4">
                    <span>{elementCount} elements</span>
                    <span>&bull;</span>
                    <span>{messageCount} messages</span>
                    <span>&bull;</span>
                    <span>{imageCount} images</span>
                </div>

                {/* Cancel */}
                <button onClick={onClose} className="btn-cancel">
                    Cancel
                </button>
            </div>
        </div>
    );
}
