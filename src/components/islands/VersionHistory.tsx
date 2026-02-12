/**
 * VersionHistory — slide-out panel showing version list
 * Click to preview, "Restore" to set as current canvas state
 */

import { useState, useEffect } from 'react';

interface Version {
  id: string;
  version: number;
  r2Key: string;
  createdAt: number;
}

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string | null;
}

export default function VersionHistory({ isOpen, onClose, canvasId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !canvasId) return;

    setLoading(true);
    fetch(`/api/canvas/${canvasId}/versions`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setVersions(data.versions || []);
      })
      .catch(err => console.error('Failed to load versions:', err))
      .finally(() => setLoading(false));
  }, [isOpen, canvasId]);

  const handleRestore = async (version: Version) => {
    if (!canvasId) return;
    setRestoring(version.version);

    try {
      // Load version data
      const res = await fetch(`/api/canvas/${canvasId}/versions?version=${version.version}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to load version');
      const data = await res.json();

      if (data.canvasData) {
        // Dispatch event to load into canvas
        window.dispatchEvent(new CustomEvent('canvas:load-state', {
          detail: {
            state: {
              canvas: data.canvasData,
              chat: { messages: [], aiProvider: 'kimi', contextMode: 'all' },
              images: { history: [] },
            }
          }
        }));

        // Also save as current version via auto-save
        window.dispatchEvent(new CustomEvent('canvas:data-change'));

        onClose();
      }
    } catch (err) {
      console.error('Restore failed:', err);
    } finally {
      setRestoring(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 1050,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '340px',
        maxWidth: '90vw',
        background: 'white',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 1051,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>
            Version History
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '4px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Version list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9ca3af' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No saved versions yet</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>
                Use "Save Version" to create a snapshot
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {versions.map(v => (
                <div
                  key={v.id}
                  style={{
                    padding: '14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>
                      Version {v.version}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
                      {new Date(v.createdAt * 1000).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(v)}
                    disabled={restoring === v.version}
                    style={{
                      padding: '6px 12px',
                      background: restoring === v.version ? '#e5e7eb' : '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#374151',
                      cursor: restoring === v.version ? 'wait' : 'pointer',
                    }}
                  >
                    {restoring === v.version ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
