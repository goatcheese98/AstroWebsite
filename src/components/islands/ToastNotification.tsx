import { useEffect, useState } from 'react';

export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'loading';
}

interface ToastNotificationProps {
    toast: Toast | null;
    onRemove?: (id: string) => void;
}

export default function ToastNotification({ toast, onRemove }: ToastNotificationProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (toast) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                onRemove?.(toast.id);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast, onRemove]);

    if (!toast || !visible) return null;

    const colors: Record<Toast['type'], { bg: string; icon: string }> = {
        info: { bg: '#3b82f6', icon: 'ℹ️' },
        success: { bg: '#22c55e', icon: '✅' },
        warning: { bg: '#f59e0b', icon: '⚠️' },
        error: { bg: '#ef4444', icon: '❌' },
        loading: { bg: '#6366f1', icon: '⏳' },
    };

    const style = colors[toast.type] ?? colors.info;

    return (
        <>
            <div
                className="toast-notification"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    backgroundColor: style.bg,
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    fontWeight: 500,
                    zIndex: 1000000,
                    animation: 'slideIn 0.3s ease-out',
                    maxWidth: '400px',
                }}
            >
                <span style={{ fontSize: '18px' }}>{style.icon}</span>
                <span>{toast.message}</span>
            </div>

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </>
    );
}
