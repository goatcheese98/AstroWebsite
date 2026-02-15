/**
 * CanvasStatusBadge — bottom-center status indicator
 * Shows save status and collaboration info
 */

import { useState, useEffect } from 'react';
import { useUnifiedCanvasStore } from '@/stores';

function getTimeAgo(date: Date | null): string {
  if (!date) return 'never';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

interface CanvasStatusBadgeProps {
  isDirty?: boolean;
  lastSaved?: Date | null;
  isSharedMode?: boolean;
  isConnected?: boolean;
  activeUsers?: number;
}

export default function CanvasStatusBadge({
  isDirty: propIsDirty,
  lastSaved: propLastSaved,
  isSharedMode,
  isConnected,
  activeUsers,
}: CanvasStatusBadgeProps) {
  const store = useUnifiedCanvasStore();
  const { lastSaved: storeLastSaved, isDirty: storeIsDirty } = store;
  
  // Use props if provided, otherwise use store
  const lastSaved = propLastSaved ?? storeLastSaved;
  const isDirty = propIsDirty ?? storeIsDirty;
  
  const [, setTick] = useState(0);

  // Re-render periodically to update "Saved Xm ago" text
  useEffect(() => {
    if (!lastSaved) return;
    const interval = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Build status text
  let statusText = 'Cloud sync active';
  let strokeColor = '#22c55e';
  
  if (isDirty) {
    statusText = 'Unsaved changes';
    strokeColor = '#f59f00';
  } else if (lastSaved) {
    statusText = `Saved ${getTimeAgo(lastSaved)}`;
    strokeColor = '#22c55e';
  }

  // Add collaboration status
  if (isSharedMode) {
    if (isConnected) {
      statusText += ` • ${activeUsers || 1} user${(activeUsers || 1) > 1 ? 's' : ''} online`;
    } else {
      statusText += ' • Offline';
      strokeColor = '#ef4444';
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 14px',
        background: 'white',
        border: '1.5px solid #e5e7eb',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#6b7280',
        zIndex: 50,
        fontFamily: 'var(--font-hand, sans-serif)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      {/* Status dot */}
      <svg width="10" height="10" viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="4" fill={strokeColor} />
      </svg>
      <span>{statusText}</span>
    </div>
  );
}
