import { useRef, useEffect, useState } from 'preact/hooks';
import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';

interface Skill {
  name: string;
  level: number;
  fillColor?: string;
}

interface Props {
  skills: Skill[];
}

const BAR_HEIGHT = 28;
const BAR_GAP = 16;
const LABEL_WIDTH = 130;
const CHART_PADDING = 10;

export default function SkillsChart({ skills }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [themeKey, setThemeKey] = useState(0);
  const [visible, setVisible] = useState(false);

  const chartHeight = skills.length * (BAR_HEIGHT + BAR_GAP) + CHART_PADDING * 2;
  const chartWidth = 500;

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const style = getComputedStyle(document.documentElement);
    const stroke = style.getPropertyValue('--color-stroke').trim();
    const text = style.getPropertyValue('--color-text').trim();
    const muted = style.getPropertyValue('--color-text-muted').trim();

    const barAreaWidth = chartWidth - LABEL_WIDTH - CHART_PADDING * 2;

    skills.forEach((skill, i) => {
      const y = CHART_PADDING + i * (BAR_HEIGHT + BAR_GAP);
      const barWidth = (skill.level / 100) * barAreaWidth;

      // Read CSS variable value for fill color
      let fillColor = style.getPropertyValue('--color-fill-1').trim();
      if (skill.fillColor) {
        const varMatch = skill.fillColor.match(/var\(([^)]+)\)/);
        if (varMatch) {
          fillColor = style.getPropertyValue(varMatch[1]).trim() || fillColor;
        } else {
          fillColor = skill.fillColor;
        }
      }

      const barOpts: Partial<Options> = {
        roughness: 1.5,
        bowing: 1,
        strokeWidth: 1.5,
        stroke,
        fill: fillColor,
        fillStyle: 'hachure',
        fillWeight: 1.5,
        hachureGap: 5,
      };

      // Draw bar
      const bar = rc.rectangle(LABEL_WIDTH, y, barWidth, BAR_HEIGHT, barOpts);
      svg.appendChild(bar);

      // Add label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(LABEL_WIDTH - 10));
      label.setAttribute('y', String(y + BAR_HEIGHT / 2 + 5));
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', text);
      label.setAttribute('font-size', '14');
      label.setAttribute('font-family', "'Excalifont', 'Virgil', cursive");
      label.textContent = skill.name;
      svg.appendChild(label);

      // Add percentage
      const pct = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      pct.setAttribute('x', String(LABEL_WIDTH + barWidth + 8));
      pct.setAttribute('y', String(y + BAR_HEIGHT / 2 + 5));
      pct.setAttribute('fill', muted);
      pct.setAttribute('font-size', '12');
      pct.setAttribute('font-family', "'Comic Shanns', monospace");
      pct.textContent = `${skill.level}%`;
      svg.appendChild(pct);
    });

    setVisible(true);

    // Watch theme changes
    const observer = new MutationObserver(() => setThemeKey((k) => k + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, [skills, themeKey]);

  return (
    <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      <svg
        ref={svgRef}
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMinYMin meet"
        aria-label="Skills chart"
        role="img"
      />
    </div>
  );
}
