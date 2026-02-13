/**
 * CanvasStatusBadge — bottom-center status indicator
 * Anonymous: purple "Local" pill → click opens LocalFeaturePopover
 * Authenticated: cloud save status pill with save version button
 */

import { useState, useEffect } from 'react';

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

interface CanvasStatusBadgeProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  autoSave: {
    isSaving: boolean;
    error: string | null;
    lastSaved: Date | null;
    saveNow: () => Promise<void>;
  };
  canvasId: string | null;
  onSaveVersion: () => void;
  onLocalClick: () => void;
  onLogin?: () => void;
}

export default function CanvasStatusBadge({
  isAuthenticated,
  isLoading,
  autoSave,
  canvasId,
  onSaveVersion,
  onLocalClick,
  onLogin,
}: CanvasStatusBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  // Re-render periodically to update "Saved Xm ago" text
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !autoSave.lastSaved) return;
    const interval = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoSave.lastSaved]);

  if (isLoading) return null;

  // --- Anonymous: purple "Local" badge with login ---
  if (!isAuthenticated) {
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
          background: '#faf5ff',
          border: '1.5px solid #d8b4fe',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#7c3aed',
          zIndex: 50,
          fontFamily: 'var(--font-hand, sans-serif)',
          boxShadow: '0 1px 4px rgba(124,58,237,0.10)',
        }}
      >
        {/* Laptop icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
        <span>Local Only</span>
        {/* Login button */}
        <button
          onClick={onLogin}
          style={{
            marginLeft: '4px',
            padding: '2px 10px',
            background: '#7c3aed',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.7rem',
            color: 'white',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#6d28d9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#7c3aed';
          }}
        >
          Login to Save
        </button>
      </div>
    );
  }

  // --- Authenticated: cloud save status ---
  const strokeColor = autoSave.isSaving
    ? '#7c3aed'
    : autoSave.error
    ? '#ef4444'
    : '#22c55e';

  const statusText = autoSave.isSaving
    ? 'Saving...'
    : autoSave.error
    ? 'Save error'
    : autoSave.lastSaved
    ? `Saved ${getTimeAgo(autoSave.lastSaved)}`
    : 'Cloud sync active';

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
      {/* Cloud icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
      <span>{statusText}</span>
      {/* Save Version micro-button */}
      <button
        onClick={onSaveVersion}
        style={{
          marginLeft: '2px',
          padding: '2px 8px',
          background: 'transparent',
          border: '1px solid #d1d5db',
          borderRadius: '10px',
          fontSize: '0.7rem',
          color: '#6b7280',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontWeight: 600,
          transition: 'border-color 0.2s',
        }}
        title="Save a named version snapshot"
      >
        Save Version
      </button>
    </div>
  );
}
