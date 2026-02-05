/**
 * Save Options Modal
 * Allows user to choose between different save formats
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
}

export default function SaveOptionsModal({
    isOpen,
    onClose,
    onConfirm,
    elementCount,
    messageCount,
    imageCount,
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
                    backgroundColor: "var(--color-bg, white)",
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
                        color: "var(--color-text, #1f2937)",
                    }}
                >
                    Save Canvas State
                </h3>
                
                <p
                    style={{
                        margin: "0 0 20px 0",
                        fontSize: "0.875rem",
                        color: "var(--color-text-muted, #6b7280)",
                    }}
                >
                    Choose how you want to save your canvas:
                </p>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        marginBottom: "20px",
                    }}
                >
                    {/* Option 1: Compressed Full */}
                    <button
                        onClick={handleCompressedFull}
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
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--color-primary-light-hover, rgba(99,102,241,0.15))";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--color-primary-light, rgba(99,102,241,0.1))";
                        }}
                    >
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "var(--color-primary, #6366f1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: "var(--color-text, #1f2937)",
                                    fontSize: "0.9rem",
                                    marginBottom: "2px",
                                }}
                            >
                                Compressed — Full
                            </div>
                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    color: "var(--color-text-muted, #6b7280)",
                                    lineHeight: "1.3",
                                }}
                            >
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
                            border: "2px solid var(--color-success, #22c55e)",
                            borderRadius: "8px",
                            backgroundColor: "rgba(34, 197, 94, 0.08)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.08)";
                        }}
                    >
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "var(--color-success, #22c55e)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                                <line x1="8" y1="3" x2="16" y2="3" strokeWidth="3" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: "var(--color-text, #1f2937)",
                                    fontSize: "0.9rem",
                                    marginBottom: "2px",
                                }}
                            >
                                Compressed — Without Image History
                                <span
                                    style={{
                                        marginLeft: "6px",
                                        padding: "2px 6px",
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        backgroundColor: "var(--color-success, #22c55e)",
                                        color: "white",
                                        borderRadius: "4px",
                                        verticalAlign: "middle",
                                    }}
                                >
                                    Smallest
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    color: "var(--color-text-muted, #6b7280)",
                                    lineHeight: "1.3",
                                }}
                            >
                                Excludes generated image gallery. ~50%+ smaller. 
                                Canvas images and everything else preserved.
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
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--color-text-muted, #6b7280)"
                                strokeWidth="2"
                            >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: "var(--color-text, #1f2937)",
                                    fontSize: "0.9rem",
                                    marginBottom: "2px",
                                }}
                            >
                                Full Size (Readable JSON)
                            </div>
                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    color: "var(--color-text-muted, #6b7280)",
                                    lineHeight: "1.3",
                                }}
                            >
                                Human-readable format. Largest size. 
                                Use for debugging or manual editing.
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
                        backgroundColor: "var(--color-bg-secondary, #f9fafb)",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        fontSize: "0.875rem",
                        color: "var(--color-text-muted, #6b7280)",
                    }}
                >
                    <span>{elementCount} elements</span>
                    <span>•</span>
                    <span>{messageCount} messages</span>
                    <span>•</span>
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
                        color: "var(--color-text-muted, #6b7280)",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-bg-hover, rgba(0,0,0,0.05))";
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
