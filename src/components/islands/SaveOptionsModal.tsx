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
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: "var(--color-surface)",
                    borderRadius: "12px",
                    padding: "24px",
                    width: "90%",
                    maxWidth: "420px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                }}
            >
                <h3
                    style={{
                        margin: "0 0 8px 0",
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        color: "var(--color-text)",
                    }}
                >
                    Save Canvas
                </h3>

                <p
                    style={{
                        margin: "0 0 20px 0",
                        fontSize: "0.875rem",
                        color: "var(--color-text-secondary)",
                    }}
                >
                    {isAuthenticated
                        ? "Your canvas auto-saves to the cloud. Export a local copy below:"
                        : "Sign in to save your work to the cloud, or download a local copy:"}
                </p>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        marginBottom: "20px",
                    }}
                >
                    {/* Cloud save (authenticated) or Sign in prompt (anonymous) */}
                    {isAuthenticated ? (
                        onCloudSave && (
                            <button
                                onClick={() => {
                                    onCloudSave();
                                    onClose();
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "12px",
                                    padding: "14px",
                                    border: "2px solid #22c55e",
                                    borderRadius: "8px",
                                    backgroundColor: "rgba(34, 197, 94, 0.08)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.2s",
                                }}
                            >
                                <div
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "8px",
                                        backgroundColor: "#22c55e",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                                        <polyline points="16 16 12 12 8 16"/>
                                    </svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9rem", marginBottom: "2px" }}>
                                        Save to Cloud Now
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: "1.3" }}>
                                        Force an immediate cloud save.
                                    </div>
                                </div>
                            </button>
                        )
                    ) : (
                        <a
                            href="/login"
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "12px",
                                padding: "14px",
                                border: "2px solid var(--color-primary, #6366f1)",
                                borderRadius: "8px",
                                backgroundColor: "var(--color-primary-light, rgba(99,102,241,0.1))",
                                cursor: "pointer",
                                textAlign: "left",
                                textDecoration: "none",
                                transition: "all 0.2s",
                            }}
                        >
                            <div
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--color-accent)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                                    <polyline points="16 16 12 12 8 16"/>
                                </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "var(--color-text, #1f2937)", fontSize: "0.9rem", marginBottom: "2px" }}>
                                    Sign in to save to cloud
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #6b7280)", lineHeight: "1.3" }}>
                                    Your canvas will be preserved and synced across devices.
                                </div>
                            </div>
                        </a>
                    )}

                    {/* Divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                        <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Export to file</span>
                        <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                    </div>

                    {/* Option 1: Compressed Full */}
                    <button
                        onClick={handleCompressedFull}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            padding: "14px",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            backgroundColor: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border-hover)";
                            e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border)";
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "var(--color-surface-hover)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--color-text, #1f2937)", fontSize: "0.9rem", marginBottom: "2px" }}>
                                Compressed — Full
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #6b7280)", lineHeight: "1.3" }}>
                                Everything included. ~25-30% smaller. Best for backups.
                            </div>
                        </div>
                    </button>

                    {/* Option 2: Compressed without History */}
                    <button
                        onClick={handleCompressedNoHistory}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            padding: "14px",
                            border: "2px solid var(--color-border, #e5e7eb)",
                            borderRadius: "8px",
                            backgroundColor: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border-hover, #d1d5db)";
                            e.currentTarget.style.backgroundColor = "var(--color-bg-hover, rgba(0,0,0,0.02))";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border, #e5e7eb)";
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "var(--color-bg-tertiary, #f3f4f6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted, #6b7280)" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                                <line x1="8" y1="3" x2="16" y2="3" strokeWidth="3" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--color-text, #1f2937)", fontSize: "0.9rem", marginBottom: "2px" }}>
                                Compressed — No Image History
                                <span style={{ marginLeft: "6px", padding: "2px 6px", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, backgroundColor: "#22c55e", color: "white", borderRadius: "4px", verticalAlign: "middle" }}>Smallest</span>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #6b7280)", lineHeight: "1.3" }}>
                                Excludes generated image gallery. ~50%+ smaller.
                            </div>
                        </div>
                    </button>

                    {/* Option 3: Full Size */}
                    <button
                        onClick={handleFull}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            padding: "14px",
                            border: "2px solid var(--color-border, #e5e7eb)",
                            borderRadius: "8px",
                            backgroundColor: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border-hover, #d1d5db)";
                            e.currentTarget.style.backgroundColor = "var(--color-bg-hover, rgba(0,0,0,0.02))";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border, #e5e7eb)";
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "var(--color-bg-tertiary, #f3f4f6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted, #6b7280)" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--color-text, #1f2937)", fontSize: "0.9rem", marginBottom: "2px" }}>
                                Full Size (Readable JSON)
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #6b7280)", lineHeight: "1.3" }}>
                                Human-readable format. Use for debugging or manual editing.
                            </div>
                        </div>
                    </button>
                </div>

                {/* Stats */}
                <div
                    style={{
                        display: "flex",
                        gap: "16px",
                        padding: "12px 16px",
                        backgroundColor: "var(--color-surface-hover)",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        fontSize: "0.875rem",
                        color: "var(--color-text-secondary)",
                    }}
                >
                    <span>{elementCount} elements</span>
                    <span>&bull;</span>
                    <span>{messageCount} messages</span>
                    <span>&bull;</span>
                    <span>{imageCount} images</span>
                </div>

                {/* Cancel */}
                <button
                    onClick={onClose}
                    style={{
                        width: "100%",
                        padding: "10px",
                        border: "none",
                        borderRadius: "8px",
                        backgroundColor: "transparent",
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
