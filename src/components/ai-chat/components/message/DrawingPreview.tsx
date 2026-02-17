/**
 * DrawingPreview - Renders a preview of Excalidraw elements in chat
 * 
 * Shows a visual representation of drawing commands inline,
 * giving users a preview before adding to canvas.
 */

import { useEffect, useRef } from 'react';

interface DrawingPreviewProps {
  elements: any[];
  maxWidth?: number;
  maxHeight?: number;
}

export function DrawingPreview({ 
  elements, 
  maxWidth = 280, 
  maxHeight = 200 
}: DrawingPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderPreview = async () => {
      if (!canvasRef.current || !elements?.length) return;

      try {
        // Dynamically import Excalidraw's exportToSvg for preview rendering
        const { exportToSvg } = await import('@excalidraw/excalidraw');
        
        const svg = await exportToSvg({
          elements: elements.map(el => ({
            ...el,
            // Ensure elements have required properties
            opacity: el.opacity ?? 100,
            strokeWidth: el.strokeWidth ?? 1,
            roughness: el.roughness ?? 1,
          })),
          appState: {
            exportBackground: true,
            exportWithDarkMode: false,
            exportScale: 1,
            viewBackgroundColor: '#f8f9fa',
          },
          files: {},
        });

        if (!svg) return;

        // Convert SVG to canvas for display
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get SVG dimensions
        const svgRect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : 
          { width: parseFloat(svg.getAttribute('width') || '0'), 
            height: parseFloat(svg.getAttribute('height') || '0') };
        
        const svgWidth = svgRect.width || 800;
        const svgHeight = svgRect.height || 600;

        // Calculate scale to fit within max dimensions
        const scaleX = maxWidth / svgWidth;
        const scaleY = maxHeight / svgHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        const finalWidth = svgWidth * scale;
        const finalHeight = svgHeight * scale;

        canvas.width = finalWidth;
        canvas.height = finalHeight;

        // Clear canvas
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, finalWidth, finalHeight);

        // Convert SVG to image and draw
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } catch (err) {
        console.error('Failed to render drawing preview:', err);
      }
    };

    renderPreview();
  }, [elements, maxWidth, maxHeight]);

  if (!elements?.length) return null;

  return (
    <div 
      style={{
        background: '#f8f9fa',
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
        marginBottom: 8,
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: maxHeight,
          borderRadius: 4,
        }}
      />
    </div>
  );
}

export default DrawingPreview;
