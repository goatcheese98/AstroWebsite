/**
 * IconLibrary - Icon Panel with Style Switcher
 * 
 * Browse Heroicons with 4 style options: Outline, Solid, Mini (20px), Micro (16px)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore, useExcalidrawAPISafe } from '@/stores';
import { nanoid } from 'nanoid';

type IconStyle = 'outline' | 'solid' | 'mini' | 'micro';

interface StyleOption {
  id: IconStyle;
  label: string;
  suffix: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { id: 'outline', label: 'Outline', suffix: '' },
  { id: 'solid', label: 'Solid', suffix: '-solid' },
  { id: 'mini', label: 'Mini', suffix: '-20-solid' },
  { id: 'micro', label: 'Micro', suffix: '-16-solid' },
];

const CORE_ICONS = [
  'home', 'user', 'users', 'cog', 'magnifying-glass', 'bell', 'heart', 'star', 
  'calendar', 'clock', 'folder', 'folder-open', 'document', 'document-text', 
  'photo', 'envelope', 'paper-airplane', 'inbox', 'trash', 'archive-box',
  'check', 'x-mark', 'plus', 'minus', 'arrow-right', 'arrow-left', 
  'arrow-up', 'arrow-down', 'arrow-up-right', 'arrow-down-right',
  'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down',
  'pencil', 'pencil-square', 'link', 'clipboard', 'clipboard-document',
  'bookmark', 'bookmark-slash', 'adjustments-horizontal', 'adjustments-vertical',
  'phone', 'chat-bubble-left', 'chat-bubble-left-right', 'chat-bubble-bottom-center-text',
  'megaphone', 'share', 'paper-clip', 'envelope-open',
  'bars-3', 'bars-4', 'squares-2x2', 'squares-plus', 'list-bullet', 'table-cells',
  'window', 'computer-desktop', 'device-tablet', 'device-phone-mobile',
  'play', 'pause', 'play-pause', 'stop', 'backward', 'forward',
  'speaker-wave', 'speaker-x-mark', 'microphone', 'video-camera',
  'camera', 'sun', 'moon', 'cloud', 'cloud-arrow-down', 'cloud-arrow-up',
  'shopping-cart', 'credit-card', 'banknotes', 'receipt-percent', 'receipt-refund',
  'tag', 'key', 'lock-closed', 'lock-open', 'shield-check', 'shield-exclamation',
  'wrench', 'scissors', 'briefcase', 'building-office', 'building-office-2',
  'map', 'map-pin', 'flag', 'fire', 'bolt', 'eye', 'eye-slash', 'finger-print',
  'wallet', 'gift', 'cake', 'beaker', 'bug-ant', 'code-bracket', 'command-line',
  'cube', 'database', 'server', 'wifi',
  'arrow-path', 'arrow-uturn-left', 'arrow-uturn-right', 'arrow-top-right-on-square',
  'arrows-pointing-in', 'arrows-pointing-out', 'arrows-up-down',
  'check-circle', 'x-circle', 'exclamation-circle', 'exclamation-triangle',
  'information-circle', 'question-mark-circle', 'minus-circle', 'plus-circle',
];

interface IconLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IconLibrary({ isOpen, onClose }: IconLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [iconStyle, setIconStyle] = useState<IconStyle>('outline');
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [iconColor, setIconColor] = useState('#000000');
  const [insertSize, setInsertSize] = useState(160);
  const [roughness, setRoughness] = useState(0);
  const [icons, setIcons] = useState<string[]>(CORE_ICONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgCache, setSvgCache] = useState<Record<string, string | null>>({});
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [isInserting, setIsInserting] = useState(false);
  
  const svgCacheRef = useRef<Record<string, string | null>>({});
  const searchTimeoutRef = useRef<number | null>(null);
  const api = useExcalidrawAPISafe();
  const addToast = useStore((state) => state.addToast);

  const currentSuffix = STYLE_OPTIONS.find(s => s.id === iconStyle)?.suffix || '';

  const getFullIconName = useCallback((baseName: string) => {
    return baseName + currentSuffix;
  }, [currentSuffix]);

  // Load icons when list or style changes
  useEffect(() => {
    if (!isOpen) return;
    
    const loadIcons = async () => {
      const suffix = STYLE_OPTIONS.find(s => s.id === iconStyle)?.suffix || '';
      const batchSize = 16;
      
      for (let i = 0; i < icons.length; i += batchSize) {
        const batch = icons.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (baseName) => {
            const fullName = baseName + suffix;
            const cacheKey = `${iconStyle}:${baseName}`;
            
            if (cacheKey in svgCacheRef.current) return;
            
            try {
              const response = await fetch(`https://api.iconify.design/heroicons/${fullName}.svg`);
              
              if (!response.ok) {
                svgCacheRef.current[cacheKey] = null;
                setSvgCache(prev => ({ ...prev, [cacheKey]: null }));
                return;
              }
              
              const svg = await response.text();
              svgCacheRef.current[cacheKey] = svg;
              setSvgCache(prev => ({ ...prev, [cacheKey]: svg }));
            } catch {
              svgCacheRef.current[cacheKey] = null;
              setSvgCache(prev => ({ ...prev, [cacheKey]: null }));
            }
          })
        );
        
        if (i + batchSize < icons.length) {
          await new Promise(r => setTimeout(r, 50));
        }
      }
    };
    
    loadIcons();
  }, [icons, iconStyle, isOpen]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setIcons(CORE_ICONS);
      setError(null);
    }
  }, [isOpen]);

  // Search functionality
  useEffect(() => {
    if (!isOpen) return;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setIcons(CORE_ICONS);
      setError(null);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=32&prefix=heroicons`
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        if (data.icons && data.icons.length > 0) {
          const baseNames = data.icons
            .map((fullName: string) => {
              const parts = fullName.split(':');
              const name = parts.length > 1 ? parts[1] : fullName;
              return name
                .replace(/-16-solid$/, '')
                .replace(/-20-solid$/, '')
                .replace(/-solid$/, '');
            })
            .filter((name: string, index: number, arr: string[]) => arr.indexOf(name) === index);
          
          setIcons(baseNames.slice(0, 32));
        } else {
          setIcons([]);
        }
      } catch {
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
  }, [searchQuery, iconStyle, isOpen]);

  // Insert icon into canvas
  const handleIconClick = useCallback(async (baseName: string) => {
    if (!api) {
      addToast('Canvas not ready', 'error');
      return;
    }

    setIsInserting(true);
    
    const fullName = getFullIconName(baseName);
    
    try {
      const response = await fetch(`https://api.iconify.design/heroicons/${fullName}.svg`);

      if (!response.ok) {
        throw new Error(`Icon not found: ${fullName}`);
      }

      let svgText = await response.text();
      if (iconStyle === 'outline') {
        svgText = svgText.replace(/stroke-width="[^"]*"/, `stroke-width="${strokeWidth}"`);
        svgText = svgText.replace(/stroke="currentColor"/g, `stroke="${iconColor}"`);
      } else {
        svgText = svgText.replace(/fill="currentColor"/g, `fill="${iconColor}"`);
      }
      if (roughness > 0) {
        const scale = roughness * 3;
        const seed = Math.floor(Math.random() * 100);
        const filterDef = `<defs><filter id="ril-rough" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="${seed}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
        svgText = svgText.replace(/(<svg[^>]*)(>)/, `$1 filter="url(#ril-rough)"$2${filterDef}`);
      }

      const appState = api.getAppState();
      const viewportCenterX = (appState.width || 800) / 2;
      const viewportCenterY = (appState.height || 600) / 2;
      const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
      const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

      const fileId = nanoid();
      const elementId = nanoid();
      const half = insertSize / 2;

      const newElement = {
        id: elementId,
        type: 'image',
        x: sceneX - half,
        y: sceneY - half,
        width: insertSize,
        height: insertSize,
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

      const fileData = {
        id: fileId,
        mimeType: 'image/svg+xml',
        dataURL: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`,
      };

      api.addFiles([fileData]);
      
      const currentElements = api.getSceneElements();
      api.updateScene({ elements: [...currentElements, newElement] });
      
      addToast(`Added "${baseName}"`, 'success', 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to insert icon';
      addToast(message, 'error');
      console.error('Icon insertion error:', err);
    } finally {
      setIsInserting(false);
    }
  }, [api, addToast, getFullIconName, iconStyle, strokeWidth, iconColor, insertSize, roughness]);

  const handleStyleChange = useCallback((newStyle: IconStyle) => {
    setIconStyle(newStyle);
    setSearchQuery('');
    setIcons(CORE_ICONS);
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        right: 54,
        top: 80,
        width: 340,
        maxHeight: 'calc(100vh - 100px)',
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Icons</h3>
          <button 
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 16,
              color: '#6b7280',
              lineHeight: 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: 4, 
          marginBottom: 12,
          padding: 4,
          background: '#f3f4f6',
          borderRadius: 10,
        }}>
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              onClick={() => handleStyleChange(style.id)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: 'none',
                background: iconStyle === style.id ? '#ffffff' : 'transparent',
                color: iconStyle === style.id ? '#111827' : '#6b7280',
                fontSize: 13,
                fontWeight: iconStyle === style.id ? 600 : 500,
                cursor: 'pointer',
                boxShadow: iconStyle === style.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {style.label}
            </button>
          ))}
        </div>

        {iconStyle === 'outline' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Stroke
              </label>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', minWidth: 28, textAlign: 'right' }}>
                {strokeWidth}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.25"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
            />
          </div>
        )}

        {/* Color */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Color
            </label>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'monospace' }}>
              {iconColor.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {['#000000', '#374151', '#6b7280', '#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6'].map((preset) => (
              <button
                key={preset}
                onClick={() => setIconColor(preset)}
                title={preset}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: preset,
                  border: iconColor === preset ? '2px solid #6366f1' : '2px solid transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  outline: iconColor === preset ? '2px solid #e0e7ff' : 'none',
                  outlineOffset: 1,
                }}
              />
            ))}
            <input
              type="color"
              value={iconColor}
              onChange={(e) => setIconColor(e.target.value)}
              title="Custom color"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                padding: 1,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {/* Size */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Size
            </label>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', minWidth: 40, textAlign: 'right' }}>
              {insertSize}px
            </span>
          </div>
          <input
            type="range"
            min="48"
            max="400"
            step="8"
            value={insertSize}
            onChange={(e) => setInsertSize(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
          />
        </div>

        {/* Rough */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Rough
            </label>
            <span style={{ fontSize: 12, fontWeight: 600, color: roughness > 0 ? '#6366f1' : '#9ca3af', minWidth: 28, textAlign: 'right' }}>
              {roughness === 0 ? 'Off' : roughness}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={roughness}
            onChange={(e) => setRoughness(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
            width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder={`Search ${iconStyle} icons...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              fontSize: 14,
              boxSizing: 'border-box',
              background: '#f9fafb',
              outline: 'none',
              transition: 'all 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.background = '#ffffff';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.background = '#f9fafb';
            }}
          />
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '0 16px 16px',
      }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            <div style={{ 
              width: 32, 
              height: 32, 
              border: '3px solid #e5e7eb', 
              borderTopColor: '#6366f1', 
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            Searching icons...
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
            gap: 6,
          }}>
            {icons.map((baseName) => {
              const cacheKey = `${iconStyle}:${baseName}`;
              const svgHtml = svgCache[cacheKey];
              const hasFailed = svgHtml === null;
              const isLoading = !(cacheKey in svgCache) && !hasFailed;
              const isHovered = hoveredIcon === baseName;
              
              return (
                <button
                  key={baseName}
                  onClick={() => handleIconClick(baseName)}
                  onMouseEnter={() => setHoveredIcon(baseName)}
                  onMouseLeave={() => setHoveredIcon(null)}
                  disabled={isInserting}
                  title={baseName}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: 8,
                    border: `1px solid ${isHovered ? '#6366f1' : '#e5e7eb'}`,
                    borderRadius: 10,
                    background: isHovered ? '#f5f3ff' : '#ffffff',
                    cursor: isInserting ? 'not-allowed' : 'pointer',
                    opacity: isInserting ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {svgHtml ? (
                    <div
                      className="icon-svg-preview"
                      dangerouslySetInnerHTML={{ __html: svgHtml }}
                      style={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isHovered ? '#6366f1' : iconColor,
                      }}
                    />
                  ) : hasFailed ? (
                    <div style={{ 
                      width: 24, 
                      height: 24, 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      fontSize: 14,
                    }}>
                      !
                    </div>
                  ) : (
                    <div style={{ 
                      width: 24, 
                      height: 24, 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{ 
                        width: 16, 
                        height: 16, 
                        border: '2px solid #e5e7eb', 
                        borderTopColor: '#9ca3af', 
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ 
        padding: '10px 16px', 
        borderTop: '1px solid #f3f4f6',
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{icons.length} icons</span>
        <span style={{ color: '#6366f1', fontWeight: 500 }}>Heroicons v2</span>
      </div>

      {/* Hidden filter definition for live preview */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="icon-rough-preview" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={roughness * 3} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .icon-svg-preview svg {
          stroke-width: ${iconStyle === 'outline' ? strokeWidth : undefined} !important;
          filter: ${roughness > 0 ? 'url(#icon-rough-preview)' : 'none'};
        }
      `}</style>
    </div>
  );
}
