import type { CSSProperties } from 'react';
import type { Toast } from '@/stores';

interface ToastNotificationProps {
  toast: Toast;
  isExiting?: boolean;
  onDismiss?: (id: string) => void;
}

const toastMeta: Record<
  Toast['type'],
  { icon: string; accent: string; ring: string; iconBg: string }
> = {
  info: {
    icon: 'i',
    accent: '#3b82f6',
    ring: 'rgba(59, 130, 246, 0.3)',
    iconBg: 'rgba(59, 130, 246, 0.16)',
  },
  success: {
    icon: '✓',
    accent: '#16a34a',
    ring: 'rgba(22, 163, 74, 0.3)',
    iconBg: 'rgba(22, 163, 74, 0.16)',
  },
  error: {
    icon: '!',
    accent: '#dc2626',
    ring: 'rgba(220, 38, 38, 0.3)',
    iconBg: 'rgba(220, 38, 38, 0.16)',
  },
  loading: {
    icon: '',
    accent: '#4f46e5',
    ring: 'rgba(79, 70, 229, 0.3)',
    iconBg: 'rgba(79, 70, 229, 0.12)',
  },
};

export default function ToastNotification({
  toast,
  isExiting = false,
  onDismiss,
}: ToastNotificationProps) {
  const meta = toastMeta[toast.type] ?? toastMeta.info;
  const duration = Math.max(0, toast.duration ?? 3000);
  const showProgress = toast.type !== 'loading' && duration > 0;
  const classes = `aw-toast ${isExiting ? 'aw-toast-exit' : 'aw-toast-enter'}`;

  return (
    <>
      <article
        className={classes}
        role={toast.type === 'error' ? 'alert' : 'status'}
        aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        style={
          {
            '--toast-accent': meta.accent,
            '--toast-ring': meta.ring,
            '--toast-icon-bg': meta.iconBg,
            '--toast-duration': `${duration}ms`,
          } as CSSProperties
        }
      >
        <span className="aw-toast-icon" aria-hidden="true">
          {toast.type === 'loading' ? <span className="aw-toast-spinner" /> : meta.icon}
        </span>
        <p className="aw-toast-message">{toast.message}</p>
        <button
          type="button"
          className="aw-toast-close"
          onClick={() => onDismiss?.(toast.id)}
          aria-label="Dismiss notification"
        >
          ×
        </button>
        {showProgress && <span className="aw-toast-progress" aria-hidden="true" />}
      </article>

      <style>{`
        .aw-toast {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          min-width: min(520px, calc(100vw - 24px));
          max-width: min(520px, calc(100vw - 24px));
          padding: 12px 12px 12px 10px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          border-left: 4px solid var(--toast-accent);
          background: rgba(255, 255, 255, 0.95);
          color: #111827;
          box-shadow: 0 10px 28px -16px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--toast-ring);
          backdrop-filter: blur(6px);
          transform-origin: bottom center;
        }

        .aw-toast-enter {
          animation: aw-toast-in 220ms cubic-bezier(0.17, 0.87, 0.32, 1.12);
        }

        .aw-toast-exit {
          animation: aw-toast-out 220ms ease forwards;
        }

        .aw-toast-icon {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--toast-icon-bg);
          color: var(--toast-accent);
          font-weight: 700;
          font-size: 14px;
          line-height: 1;
          flex-shrink: 0;
        }

        .aw-toast-spinner {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          border: 2px solid var(--toast-accent);
          border-top-color: transparent;
          animation: aw-toast-spin 700ms linear infinite;
        }

        .aw-toast-message {
          margin: 0;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 600;
          text-wrap: pretty;
        }

        .aw-toast-close {
          width: 24px;
          height: 24px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          line-height: 1;
          transition: background-color 120ms ease, color 120ms ease;
        }

        .aw-toast-close:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .aw-toast-progress {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 2px;
          background: var(--toast-accent);
          opacity: 0.65;
          transform-origin: left;
          animation: aw-toast-progress var(--toast-duration) linear forwards;
        }

        @keyframes aw-toast-in {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes aw-toast-out {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
        }

        @keyframes aw-toast-progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        @keyframes aw-toast-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .aw-toast {
            min-width: 100%;
            max-width: 100%;
            border-radius: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .aw-toast-enter,
          .aw-toast-exit,
          .aw-toast-progress,
          .aw-toast-spinner {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
