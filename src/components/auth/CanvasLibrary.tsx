/**
 * Canvas Library Component
 * Premium dashboard UI with grid/list views, renaming, and detailed metadata
 */

import { useState, useEffect, useRef } from 'react';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { ClerkWrapper } from './ClerkWrapper';

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
  return (
    <ClerkWrapper>
      <CanvasLibraryPure />
    </ClerkWrapper>
  );
}

export function CanvasLibraryPure() {
  const { isSignedIn, isLoaded } = useUser();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // UI State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        loadCanvases();
      } else {
        setLoading(false);
        setError('Please sign in to view your dashboard');
      }
    }
  }, [isLoaded, isSignedIn]);

  async function loadCanvases() {
    try {
      const response = await fetch('/api/canvas/list?limit=100', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCanvases(data.canvases);
      } else {
        setError('Failed to load canvases');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`/api/canvas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
        credentials: 'include'
      });
      if (res.ok) {
        setCanvases(canvases.map(c => c.id === id ? { ...c, title: newTitle } : c));
      }
    } catch (err) {
      console.error('Rename failed', err);
    }
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
      await fetch(`/api/canvas/${id}`, { method: 'DELETE', credentials: 'include' });
      setCanvases(canvases.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  }

  async function handleToggleFavorite(id: string) {
    try {
      const res = await fetch(`/api/canvas/${id}/favorite`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const { isFavorite } = await res.json();
        setCanvases(canvases.map(c => c.id === id ? { ...c, metadata: { ...c.metadata, isFavorite } } : c));
      }
    } catch (err) {
      console.error('Favorite toggle failed', err);
    }
  }

  async function handleDownloadJSON(id: string, title: string) {
    try {
      const res = await fetch(`/api/canvas/${id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.canvasData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/yi, '_')}.canvas.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed', err);
    }
    setMenuOpenId(null);
  }

  // Filtering & Sorting
  const filtered = canvases
    .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'favorites') return (b.metadata?.isFavorite ? 1 : 0) - (a.metadata?.isFavorite ? 1 : 0) || b.updatedAt - a.updatedAt;
      if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
      return b.updatedAt - a.updatedAt;
    });

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;
  if (error) return (
    <div className="error-center">
      <h3>{error}</h3>
      <SignInButton mode="modal"><button className="btn-primary">Sign In</button></SignInButton>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search your canvases..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="controls">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
            <option value="recent">Recent</option>
            <option value="alphabetical">Name (A-Z)</option>
            <option value="favorites">Favorites</option>
          </select>

          <div className="view-toggle">
            <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            </button>
            <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-graphic">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
          </div>
          <h3>No canvases found</h3>
          <p>Create a new canvas to get started with your next big idea.</p>
          <a href="/ai-canvas" className="btn-primary large">Create New Canvas</a>
        </div>
      ) : (
        <div className={`canvas-grid ${viewMode}`}>
          {filtered.map(canvas => (
            <div key={canvas.id} className="canvas-card" onMouseLeave={() => setMenuOpenId(null)}>

              {/* Thumbnail Area */}
              <a href={`/ai-canvas?canvas=${canvas.id}`} className="card-thumb">
                {canvas.thumbnailUrl ? (
                  <img src={canvas.thumbnailUrl} alt={canvas.title} loading="lazy" />
                ) : (
                  <div className="placeholder-thumb">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}

                {/* Favorite Overlay Button */}
                <button
                  className={`fav-btn ${canvas.metadata?.isFavorite ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleFavorite(canvas.id); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={canvas.metadata?.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              </a>

              {/* Info Area */}
              <div className="card-content">
                <div className="card-header">
                  {editingId === canvas.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      autoFocus
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => handleRename(canvas.id, editTitle)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(canvas.id, editTitle)}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <h3 title="Double click to rename" onDoubleClick={() => { setEditingId(canvas.id); setEditTitle(canvas.title); }}>
                      {canvas.title}
                    </h3>
                  )}

                  <div className="menu-container" ref={menuOpenId === canvas.id ? menuRef : null}>
                    <button
                      className="menu-trigger"
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === canvas.id ? null : canvas.id); }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                    {menuOpenId === canvas.id && (
                      <div className="dropdown-menu">
                        <button onClick={() => { setEditingId(canvas.id); setEditTitle(canvas.title); setMenuOpenId(null); }}>Rename</button>
                        <button onClick={() => handleDownloadJSON(canvas.id, canvas.title)}>Download JSON</button>
                        <div className="divider" />
                        <button className="delete" onClick={() => { handleDelete(canvas.id); setMenuOpenId(null); }}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-meta">
                  <span className="date">{new Date(canvas.updatedAt * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span className="dot">•</span>
                  <span className="size">{formatBytes(canvas.sizeBytes || 0)}</span>
                  {canvas.isPublic && <span className="badge">Public</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        /* --- General Layout --- */
        .dashboard-container {
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1f2937;
        }

        .loading-state, .error-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }

        .spinner {
          width: 40px; height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s infinite linear;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* --- Toolbar --- */
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .search-bar {
          position: relative;
          flex: 1;
          max-width: 400px;
        }
        .search-bar svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .search-bar input {
          width: 100%;
          padding: 10px 16px 10px 40px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-bar input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        select {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          color: #374151;
          background: white;
          cursor: pointer;
        }
        .view-toggle {
          display: flex;
          background: #f3f4f6;
          padding: 3px;
          border-radius: 8px;
          gap: 2px;
        }
        .view-toggle button {
          display: flex;
          padding: 6px;
          border: none;
          background: transparent;
          border-radius: 6px;
          color: #6b7280;
          cursor: pointer;
        }
        .view-toggle button.active {
          background: white;
          color: #1f2937;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        /* --- Grid Layout --- */
        .canvas-grid.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 24px;
          width: 100%;
        }

        /* --- List Layout --- */
        .canvas-grid.list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .canvas-grid.list .canvas-card {
          display: flex;
          flex-direction: row;
          align-items: center;
          height: 72px;
        }
        .canvas-grid.list .card-thumb {
          width: 80px;
          height: 100%;
          border-bottom: none;
        }
        .canvas-grid.list .card-content {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 16px;
        }
        .canvas-grid.list .card-meta {
          margin-top: 0;
        }

        /* --- Card Styles --- */
        .canvas-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          /* overflow: hidden; Removed to allow dropdown to show */
          transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s;
          position: relative;
        }
        .canvas-grid.grid .canvas-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08); /* Premium shadow */
          border-color: #d1d5db;
          z-index: 5; /* Bring forwarded on hover */
        }

        /* Thumbnail */
        .card-thumb {
          display: block;
          width: 100%;
          aspect-ratio: 16/9;
          background: #f9fafb;
          position: relative;
          color: inherit;
          text-decoration: none;
          overflow: hidden;
          border-bottom: 1px solid #f3f4f6;
          border-top-left-radius: 11px;
          border-top-right-radius: 11px;
        }
        .card-thumb img {
            width: 100%; height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
        }
        .canvas-card:hover .card-thumb img {
            transform: scale(1.05); /* Subtle zoom */
        }
        .placeholder-thumb {
            width: 100%; height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #d1d5db;
            background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
            background-size: 20px 20px;
        }

        /* Floating Fav Button */
        .fav-btn {
          position: absolute;
          top: 10px; right: 10px;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: white;
          border: 1px solid #e5e7eb;
          display: flex; 
          align-items: center; 
          justify-content: center;
          color: #9ca3af;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .canvas-card:hover .fav-btn, .fav-btn.active {
          opacity: 1;
        }
        .fav-btn.active {
          color: #f59e0b;
          border-color: #fcd34d;
        }
        .fav-btn:hover {
          transform: scale(1.1);
          color: #f59e0b;
        }

        /* Card Content */
        .card-content {
          padding: 16px;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
        }
        .card-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: text;
        }
        .card-header input {
            padding: 2px 4px;
            margin: -3px -5px; /* Visual compensation */
            border: 1px solid #6366f1;
            border-radius: 4px;
            font-size: 15px;
            font-weight: 600;
            width: 100%;
        }
        
        /* Menu */
        .menu-container { position: relative; }
        .menu-trigger {
          background: transparent; border: none;
          color: #9ca3af; cursor: pointer;
          padding: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .canvas-card:hover .menu-trigger, .menu-trigger:focus, .menu-container:hover .menu-trigger {
          opacity: 1;
        }
        .dropdown-menu {
          position: absolute;
          top: 100%; right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          min-width: 140px;
          z-index: 10;
          padding: 4px;
          animation: fadeIn 0.1s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .dropdown-menu button {
          display: block; width: 100%; text-align: left;
          padding: 8px 12px;
          font-size: 13px;
          background: transparent; border: none;
          color: #374151;
          cursor: pointer;
          border-radius: 4px;
        }
        .dropdown-menu button:hover { background: #f3f4f6; }
        .dropdown-menu button.delete { color: #ef4444; }
        .dropdown-menu button.delete:hover { background: #fef2f2; }
        .divider { height: 1px; background: #e5e7eb; margin: 4px 0; }

        .card-meta {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #6b7280;
        }
        .dot { margin: 0 4px; opacity: 0.5; }
        .badge {
          margin-left: auto;
          background: #ecfdf5;
          color: #059669;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        /* --- Empty State --- */
        .empty-state {
          text-align: center;
          padding: 64px 24px;
        }
        .empty-graphic {
          color: #d1d5db;
          margin-bottom: 24px;
        }
        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .empty-state p {
          color: #6b7280;
          margin-bottom: 24px;
        }
        .btn-primary {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s;
          display: inline-block;
        }
        .btn-primary:hover { background: #4338ca; }
        .btn-primary.large { padding: 12px 24px; font-size: 16px; }

        @media (max-width: 640px) {
          .toolbar { flex-direction: column; align-items: stretch; }
          .search-bar { max-width: none; }
          .controls { justify-content: space-between; }
        }
      `}</style>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  const k = 1024;
  const sizes = ['KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
