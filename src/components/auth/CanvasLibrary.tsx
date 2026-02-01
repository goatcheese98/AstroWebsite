/**
 * Canvas Library Component
 * Displays user's saved canvases with search and filtering
 */

import { useState, useEffect } from 'react';

interface Canvas {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export function CanvasLibrary() {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    loadCanvases();
  }, []);

  async function loadCanvases() {
    try {
      const response = await fetch('/api/canvas/list?limit=100', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCanvases(data.canvases);
      } else if (response.status === 401) {
        setError('Please login to view your canvases');
      } else {
        setError('Failed to load canvases');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteCanvas(id: string) {
    if (!confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/canvas/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setCanvases(canvases.filter((c) => c.id !== id));
      } else {
        alert('Failed to delete canvas');
      }
    } catch (err) {
      alert('Network error');
    }
  }

  const filteredCanvases = canvases
    .filter((canvas) => {
      if (filter === 'public') return canvas.isPublic;
      if (filter === 'private') return !canvas.isPublic;
      return true;
    })
    .filter((canvas) => {
      if (!searchTerm) return true;
      return (
        canvas.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        canvas.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

  if (loading) {
    return (
      <div className="canvas-library">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading canvases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canvas-library">
        <div className="error-state">
          <p>{error}</p>
          <a href="/login" className="btn-primary">
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-library">
      <div className="library-header">
        <div className="library-search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search canvases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="library-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({canvases.length})
          </button>
          <button
            className={`filter-btn ${filter === 'public' ? 'active' : ''}`}
            onClick={() => setFilter('public')}
          >
            Public ({canvases.filter((c) => c.isPublic).length})
          </button>
          <button
            className={`filter-btn ${filter === 'private' ? 'active' : ''}`}
            onClick={() => setFilter('private')}
          >
            Private ({canvases.filter((c) => !c.isPublic).length})
          </button>
        </div>
      </div>

      {filteredCanvases.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h3>No canvases found</h3>
          <p>
            {searchTerm
              ? 'Try a different search term'
              : 'Create your first canvas to get started'}
          </p>
          <a href="/" className="btn-primary">
            Create Canvas
          </a>
        </div>
      ) : (
        <div className="canvas-grid">
          {filteredCanvases.map((canvas) => (
            <div key={canvas.id} className="canvas-card">
              <div className="canvas-thumbnail">
                {canvas.thumbnailUrl ? (
                  <img src={canvas.thumbnailUrl} alt={canvas.title} />
                ) : (
                  <div className="canvas-thumbnail-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                )}
                {canvas.isPublic && (
                  <div className="canvas-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    Public
                  </div>
                )}
              </div>

              <div className="canvas-info">
                <h3 className="canvas-title">{canvas.title}</h3>
                {canvas.description && (
                  <p className="canvas-description">{canvas.description}</p>
                )}
                <div className="canvas-meta">
                  <span>Version {canvas.version}</span>
                  <span>•</span>
                  <span>{new Date(canvas.updatedAt * 1000).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="canvas-actions">
                <a href={`/?canvas=${canvas.id}`} className="action-btn action-btn-primary">
                  Open
                </a>
                <button
                  onClick={() => deleteCanvas(canvas.id)}
                  className="action-btn action-btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
