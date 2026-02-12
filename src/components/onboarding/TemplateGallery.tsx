/**
 * TemplateGallery — grid of starter templates
 * Loads pre-built Excalidraw JSON into the canvas
 */

import { useState } from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  elements: any[];
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch',
    icon: 'M12 8v8M8 12h8',
    elements: [],
  },
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Process flow diagram',
    icon: 'M4 4h6v6H4zM14 4h6v6h-6zM9 14h6v6H9zM7 10v4M17 10v4M12 10v4',
    elements: [
      { id: 'fc1', type: 'rectangle', x: 200, y: 50, width: 160, height: 60, strokeColor: '#1e1e1e', backgroundColor: '#a5d8ff', fillStyle: 'solid', roundness: { type: 3 }, customData: { label: 'Start' } },
      { id: 'fc2', type: 'diamond', x: 220, y: 170, width: 120, height: 80, strokeColor: '#1e1e1e', backgroundColor: '#b2f2bb', fillStyle: 'solid', customData: { label: 'Decision?' } },
      { id: 'fc3', type: 'rectangle', x: 400, y: 185, width: 140, height: 50, strokeColor: '#1e1e1e', backgroundColor: '#ffd8a8', fillStyle: 'solid', roundness: { type: 3 }, customData: { label: 'Process A' } },
      { id: 'fc4', type: 'rectangle', x: 50, y: 185, width: 140, height: 50, strokeColor: '#1e1e1e', backgroundColor: '#d0bfff', fillStyle: 'solid', roundness: { type: 3 }, customData: { label: 'Process B' } },
      { id: 'fc5', type: 'rectangle', x: 200, y: 310, width: 160, height: 60, strokeColor: '#1e1e1e', backgroundColor: '#ffc9c9', fillStyle: 'solid', roundness: { type: 3 }, customData: { label: 'End' } },
    ],
  },
  {
    id: 'wireframe',
    name: 'Wireframe',
    description: 'UI layout wireframe',
    icon: 'M3 3h18v18H3zM3 9h18M9 9v12',
    elements: [
      { id: 'wf1', type: 'rectangle', x: 50, y: 50, width: 500, height: 400, strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid' },
      { id: 'wf2', type: 'rectangle', x: 50, y: 50, width: 500, height: 60, strokeColor: '#1e1e1e', backgroundColor: '#e9ecef', fillStyle: 'solid' },
      { id: 'wf3', type: 'rectangle', x: 50, y: 110, width: 150, height: 340, strokeColor: '#868e96', backgroundColor: '#f8f9fa', fillStyle: 'solid' },
      { id: 'wf4', type: 'rectangle', x: 220, y: 130, width: 310, height: 200, strokeColor: '#dee2e6', backgroundColor: '#f8f9fa', fillStyle: 'solid', roundness: { type: 3 } },
    ],
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'Brainstorm and organize ideas',
    icon: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v6M12 15v6M3 12h6M15 12h6',
    elements: [
      { id: 'mm1', type: 'ellipse', x: 230, y: 170, width: 120, height: 60, strokeColor: '#1e1e1e', backgroundColor: '#a5d8ff', fillStyle: 'solid', customData: { label: 'Main Idea' } },
      { id: 'mm2', type: 'ellipse', x: 80, y: 50, width: 100, height: 50, strokeColor: '#1e1e1e', backgroundColor: '#b2f2bb', fillStyle: 'solid', customData: { label: 'Topic 1' } },
      { id: 'mm3', type: 'ellipse', x: 400, y: 50, width: 100, height: 50, strokeColor: '#1e1e1e', backgroundColor: '#ffd8a8', fillStyle: 'solid', customData: { label: 'Topic 2' } },
      { id: 'mm4', type: 'ellipse', x: 80, y: 300, width: 100, height: 50, strokeColor: '#1e1e1e', backgroundColor: '#d0bfff', fillStyle: 'solid', customData: { label: 'Topic 3' } },
      { id: 'mm5', type: 'ellipse', x: 400, y: 300, width: 100, height: 50, strokeColor: '#1e1e1e', backgroundColor: '#ffc9c9', fillStyle: 'solid', customData: { label: 'Topic 4' } },
    ],
  },
];

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (elements: any[]) => void;
}

export default function TemplateGallery({ isOpen, onClose, onSelectTemplate }: TemplateGalleryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (template: Template) => {
    onSelectTemplate(template.elements);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '560px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Choose a Template
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 16px',
                border: hoveredId === template.id ? '2px solid #6366f1' : '2px solid #e5e7eb',
                borderRadius: '12px',
                background: hoveredId === template.id ? '#f5f3ff' : 'white',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={hoveredId === template.id ? '#6366f1' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
                <path d={template.icon} />
              </svg>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937', marginBottom: '4px' }}>
                {template.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {template.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
