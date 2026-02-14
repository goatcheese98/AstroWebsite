/**
 * CanvasNotesLayer
 * Renders markdown notes, web embeds, and rich text notes on top of canvas
 * 
 * These are "overlay" components positioned on the canvas
 */

import { useEffect, useState } from 'react';
import type { ExcalidrawAPI, ExcalidrawElement } from '@/stores/unifiedCanvasStore';

interface CanvasNotesLayerProps {
  api: ExcalidrawAPI | null;
}

interface NoteElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  type: 'markdown' | 'embed' | 'rich-text';
}

export default function CanvasNotesLayer({ api }: CanvasNotesLayerProps) {
  const [notes, setNotes] = useState<NoteElement[]>([]);
  
  // Watch for custom data elements in Excalidraw
  useEffect(() => {
    if (!api) return;
    
    const interval = setInterval(() => {
      const elements = api.getSceneElements();
      const noteElements = elements
        .filter((el: ExcalidrawElement) => 
          el.customData?.type === 'markdown' ||
          el.customData?.type === 'embed' ||
          el.customData?.type === 'rich-text'
        )
        .map((el: ExcalidrawElement) => ({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width || 200,
          height: el.height || 200,
          content: el.customData?.content || '',
          type: el.customData?.type as NoteElement['type'],
        }));
      
      setNotes(noteElements);
    }, 100);
    
    return () => clearInterval(interval);
  }, [api]);
  
  if (notes.length === 0) return null;
  
  return (
    <div 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {notes.map((note) => (
        <div
          key={note.id}
          style={{
            position: 'absolute',
            left: note.x,
            top: note.y,
            width: note.width,
            height: note.height,
            pointerEvents: 'auto',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: 12,
            overflow: 'auto',
          }}
        >
          {/* TODO: Render actual note content based on type */}
          <div style={{ fontSize: 12, color: '#666' }}>
            {note.type}: {note.content.slice(0, 50)}...
          </div>
        </div>
      ))}
    </div>
  );
}
