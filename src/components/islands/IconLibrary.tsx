/**
 * IconLibrary - Simplified Icon Panel
 * 
 * A clean icon browser using Iconify API with inline SVG rendering.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore, useExcalidrawAPISafe } from '@/stores';
import { nanoid } from 'nanoid';

// Working icon names from heroicons
const DEFAULT_ICONS = [
  'home', 'user', 'cog', 'magnifying-glass', 'heart', 'star', 
  'calendar', 'clock', 'folder', 'document', 'photo', 'envelope',
  'phone', 'check', 'x-mark', 'plus', 'minus', 'arrow-right',
  'arrow-left', 'pencil', 'trash', 'clipboard', 'link', 'bars-3'
];

interface IconLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IconLibrary({ isOpen, onClose }: IconLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [icons, setIcons] = useState<string[]>(DEFAULT_ICONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgCache, setSvgCache] = useState<Record<string, string>>({});
  
  const searchTimeoutRef = useRef<number | null>(null);
  const api = useExcalidrawAPISafe();
  const addToast = useStore((state) => state.addToast);
  const [isInserting, setIsInserting] = useState(false);

  // Fetch icon SVG on demand
  const fetchIconSvg = useCallback(async (iconName: string): Promise<string | null> => {
    if (svgCache[iconName]) return svgCache[iconName];
    
    try {
      const response = await fetch(
        `https://api.iconify.design/heroicons/${iconName}.svg?height=32`
      );
      if (!response.ok) return null;
      const svg = await response.text();
      setSvgCache(prev => ({ ...prev, [iconName]: svg }));
      return svg;
    } catch {
      return null;
    }
  }, [svgCache]);

  // Preload visible icons
  useEffect(() => {
    icons.forEach(icon => fetchIconSvg(icon));
  }, [icons, fetchIconSvg]);

  // Search icons when query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setIcons(DEFAULT_ICONS);
      setError(null);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=36&prefix=heroicons`
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        if (data.icons && data.icons.length > 0) {
          const iconNames = data.icons.map((fullName: string) => {
            const parts = fullName.split(':');
            return parts.length > 1 ? parts[1] : fullName;
          });
          setIcons(iconNames.slice(0, 36));
        } else {
          setIcons([]);
        }
      } catch (err) {
        setError('Failed to search icons');
        setIcons([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Insert icon into canvas
  const handleIconClick = useCallback(async (iconName: string) => {
    if (!api) {
      addToast('Canvas not ready', 'error');
      return;
    }

    setIsInserting(true);
    
    try {
      const response = await fetch(
        `https://api.iconify.design/heroicons/${iconName}.svg?height=200`
      );

      if (!response.ok) {
        throw new Error(`Icon not found: ${iconName}`);
      }

      const svgText = await response.text();
      
      // Insert directly using Excalidraw API
      const appState = api.getAppState();
      const viewportCenterX = (appState.width || 800) / 2;
      const viewportCenterY = (appState.height || 600) / 2;
      const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
      const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

      const fileId = nanoid();
      const elementId = nanoid();
      
      // Create the image element
      const newElement = {
        id: elementId,
        type: 'image',
        x: sceneX - 100,
        y: sceneY - 100,
        width: 200,
        height: 200,
        angle: 0,
        strokeColor: 'transparent',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roundness: null,
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a0',
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Date.now(),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        fileId,
        status: 'saved',
        scale: [1, 1],
      };

      // Add file using Excalidraw's addFiles API
      const fileData = {
        id: fileId,
        mimeType: 'image/svg+xml',
        dataURL: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`,
      };

      api.addFiles([fileData]);
      
      const currentElements = api.getSceneElements();
      api.updateScene({ elements: [...currentElements, newElement] });
      
      // Simple toast without checkmark emoji
      addToast(`Icon "${iconName}" added`, 'success', 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to insert icon';
      addToast(message, 'error');
      console.error('Icon insertion error:', err);
    } finally {
      setIsInserting(false);
    }
  }, [api, addToast]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        right: 20,
        top: 80,
        width: 320,
        maxHeight: 'calc(100vh - 120px)',
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Icons</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              fontSize: 18,
              color: '#6b7280',
            }}
          >
            ×
          </button>
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Icon Grid */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: 12,
      }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>
            {error}
          </div>
        ) : icons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            No icons found
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}>
            {icons.map((iconName) => {
              const svgHtml = svgCache[iconName];
              return (
                <button
                  key={iconName}
                  onClick={() => handleIconClick(iconName)}
                  disabled={isInserting}
                  title={iconName}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: 8,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: 'white',
                    cursor: isInserting ? 'not-allowed' : 'pointer',
                    opacity: isInserting ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  {svgHtml ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: svgHtml }}
                      style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                  ) : (
                    <div style={{ 
                      width: 28, 
                      height: 28, 
                      background: '#f3f4f6',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#9ca3af',
                    }}>
                      ⋯
                    </div>
                  )}
                  <span style={{ 
                    fontSize: 10, 
                    color: '#6b7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}>
                    {iconName}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ 
        padding: 10, 
        borderTop: '1px solid #e5e7eb',
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
      }}>
        {icons.length} icons • Heroicons
      </div>
    </div>
  );
}
