import { useRef, useEffect, useState } from 'preact/hooks';
import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';

export interface Shape {
  type: 'rectangle' | 'circle' | 'ellipse' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
  options?: Partial<Options>;
}

interface Props {
  shapes: Shape[];
  width?: number;
  height?: number;
  className?: string;
}

export default function RoughDiagram({ shapes, width = 300, height = 200, className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const style = getComputedStyle(document.documentElement);
    const stroke = style.getPropertyValue('--color-stroke').trim();
    const fill = style.getPropertyValue('--color-fill-1').trim();

    const defaultOpts: Partial<Options> = {
      roughness: 1.5,
      bowing: 1,
      strokeWidth: 2,
      stroke,
      fill,
      fillStyle: 'hachure',
      fillWeight: 1.5,
      hachureGap: 6,
    };

    shapes.forEach((shape) => {
      const opts = { ...defaultOpts, ...shape.options };
      let node: SVGGElement;

      switch (shape.type) {
        case 'rectangle':
          node = rc.rectangle(shape.x, shape.y, shape.width || 100, shape.height || 60, opts);
          break;
        case 'circle':
          node = rc.circle(shape.x, shape.y, shape.width || 50, opts);
          break;
        case 'ellipse':
          node = rc.ellipse(shape.x, shape.y, shape.width || 100, shape.height || 60, opts);
          break;
        case 'line':
          node = rc.line(shape.x, shape.y, shape.x2 || shape.x + 100, shape.y2 || shape.y, opts);
          break;
        default:
          return;
      }

      svg.appendChild(node);
    });

    // Watch for theme changes
    const observer = new MutationObserver(() => setThemeKey((k) => k + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, [shapes, themeKey]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      class={className}
      aria-hidden="true"
      role="img"
    />
  );
}
