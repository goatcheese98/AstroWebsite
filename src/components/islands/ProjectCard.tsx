import { useRef, useEffect, useState } from 'preact/hooks';
import rough from 'roughjs';

interface Props {
  title: string;
  fillColor?: string;
  children?: any;
}

export default function ProjectCard({ title, fillColor, children }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [themeKey, setThemeKey] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = svgRef.current;
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const style = getComputedStyle(document.documentElement);
    const stroke = style.getPropertyValue('--color-stroke').trim();

    let fill = style.getPropertyValue('--color-fill-1').trim();
    if (fillColor) {
      const varMatch = fillColor.match(/var\(([^)]+)\)/);
      if (varMatch) {
        fill = style.getPropertyValue(varMatch[1]).trim() || fill;
      }
    }

    const { width, height } = containerRef.current.getBoundingClientRect();
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const border = rc.rectangle(2, 2, width - 4, height - 4, {
      roughness: hovered ? 2 : 1.5,
      bowing: hovered ? 1.5 : 1,
      strokeWidth: 2,
      stroke,
      fill: hovered ? fill : 'transparent',
      fillStyle: 'hachure',
      fillWeight: 1,
      hachureGap: 8,
      seed: 42,
    });
    svg.appendChild(border);

    const observer = new MutationObserver(() => setThemeKey((k) => k + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, [themeKey, hovered, fillColor]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', padding: '1.5rem', cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        ref={svgRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
