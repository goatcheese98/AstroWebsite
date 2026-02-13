import { useEffect, useState } from 'react';

export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error';
}

interface ToastNotificationProps {
    toast: Toast | null;
}

export default function ToastNotification({ toast }: ToastNotificationProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (toast) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    if (!toast || !visible) return null;

    const colors = {
        info: { bg: '#3b82f6', icon: 'ℹ️' },
        warning: { bg: '#f59e0b', icon: '⚠️' },
        error: { bg: '#ef4444', icon: '❌' },
    };

    const style = colors[toast.type];

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
