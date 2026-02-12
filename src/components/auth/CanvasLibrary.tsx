/**
 * Canvas Library Component
 * Displays user's saved canvases with search, filtering, favorites, tags, grid/list view
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
  metadata?: {
    isFavorite?: boolean;
    tags?: string[];
  };
  sizeBytes?: number;
}

type SortOption = 'recent' | 'alphabetical' | 'favorites';
type ViewMode = 'grid' | 'list';

export function CanvasLibrary() {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  async function toggleFavorite(id: string) {
    try {
      const response = await fetch(`/api/canvas/${id}/favorite`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const { isFavorite } = await response.json();
        setCanvases(canvases.map(c =>
          c.id === id
            ? { ...c, metadata: { ...c.metadata, isFavorite } }
            : c
        ));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
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
      const term = searchTerm.toLowerCase();
      return (
        canvas.title.toLowerCase().includes(term) ||
        canvas.description?.toLowerCase().includes(term) ||
        canvas.metadata?.tags?.some(t => t.includes(term))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'favorites') {
        const aFav = a.metadata?.isFavorite ? 1 : 0;
        const bFav = b.metadata?.isFavorite ? 1 : 0;
        if (bFav !== aFav) return bFav - aFav;
        return b.updatedAt - a.updatedAt;
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      return b.updatedAt - a.updatedAt;
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
            placeholder="Search canvases, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="library-toolbar">
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

          <div className="library-controls">
            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#374151',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="recent">Recent</option>
              <option value="alphabetical">A-Z</option>
              <option value="favorites">Favorites first</option>
            </select>

            {/* View toggle */}
            <div style={{ display: 'flex', gap: '2px', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  background: viewMode === 'grid' ? 'white' : 'transparent',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
                title="Grid view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  background: viewMode === 'list' ? 'white' : 'transparent',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
                title="List view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
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
      ) : viewMode === 'grid' ? (
        <div className="canvas-grid">
          {filteredCanvases.map((canvas) => (
            <div key={canvas.id} className="canvas-card">
              <div className="canvas-thumbnail">
                {canvas.thumbnailUrl ? (
                  <img src={canvas.thumbnailUrl} alt={canvas.title} loading="lazy" />
                ) : (
                  <div className="canvas-thumbnail-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                )}
                {/* Favorite button */}
                <button
                  onClick={(e) => { e.preventDefault(); toggleFavorite(canvas.id); }}
                  className="canvas-favorite-btn"
                  title={canvas.metadata?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"
                    fill={canvas.metadata?.isFavorite ? '#f59e0b' : 'none'}
                    stroke={canvas.metadata?.isFavorite ? '#f59e0b' : 'currentColor'}
                    strokeWidth="2"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
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
                {/* Tags */}
                {canvas.metadata?.tags && canvas.metadata.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {canvas.metadata.tags.map(tag => (
                      <span key={tag} style={{
                        padding: '2px 8px',
                        background: '#f3f4f6',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        color: '#6b7280',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="canvas-meta">
                  <span>v{canvas.version}</span>
                  <span>&bull;</span>
                  <span>{new Date(canvas.updatedAt * 1000).toLocaleDateString()}</span>
                  {canvas.sizeBytes ? (
                    <>
                      <span>&bull;</span>
                      <span>{formatBytes(canvas.sizeBytes)}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="canvas-actions">
                <a href={`/ai-canvas?canvas=${canvas.id}`} className="action-btn action-btn-primary">
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
      ) : (
        /* List view */
        <div className="canvas-list">
          {filteredCanvases.map((canvas) => (
            <div key={canvas.id} className="canvas-list-item">
              <div className="canvas-list-thumb">
                {canvas.thumbnailUrl ? (
                  <img src={canvas.thumbnailUrl} alt={canvas.title} loading="lazy" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {canvas.title}
                  </h3>
                  {canvas.metadata?.isFavorite && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
                  v{canvas.version} &bull; {new Date(canvas.updatedAt * 1000).toLocaleDateString()}
                  {canvas.metadata?.tags && canvas.metadata.tags.length > 0 && (
                    <> &bull; {canvas.metadata.tags.join(', ')}</>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.preventDefault(); toggleFavorite(canvas.id); }}
                  style={{
                    padding: '6px',
                    background: 'none',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#9ca3af',
                  }}
                  title="Toggle favorite"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24"
                    fill={canvas.metadata?.isFavorite ? '#f59e0b' : 'none'}
                    stroke={canvas.metadata?.isFavorite ? '#f59e0b' : 'currentColor'}
                    strokeWidth="2"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
                <a
                  href={`/ai-canvas?canvas=${canvas.id}`}
                  style={{
                    padding: '6px 14px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Open
                </a>
                <button
                  onClick={() => deleteCanvas(canvas.id)}
                  style={{
                    padding: '6px 10px',
                    background: 'none',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
