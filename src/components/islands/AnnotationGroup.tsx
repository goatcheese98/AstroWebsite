import { useEffect, useRef } from 'preact/hooks';
import { annotate, annotationGroup } from 'rough-notation';
import type { RoughAnnotationType } from 'rough-notation/lib/model';

interface AnnotationConfig {
  selector: string;
  type: RoughAnnotationType;
  color?: string;
  animationDuration?: number;
  multiline?: boolean;
  strokeWidth?: number;
}

interface Props {
  annotations: AnnotationConfig[];
  sequential?: boolean;
}

export default function AnnotationGroup({ annotations, sequential = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const style = getComputedStyle(document.documentElement);
    const accentColor = style.getPropertyValue('--color-accent').trim();

    const annotationInstances = annotations
      .map((config) => {
        const el = document.querySelector(config.selector);
        if (!el) return null;
        return annotate(el as HTMLElement, {
          type: config.type,
          color: config.color || accentColor,
          animationDuration: reducedMotion ? 0 : (config.animationDuration || 800),
          multiline: config.multiline ?? true,
          strokeWidth: config.strokeWidth || 2,
        });
      })
      .filter(Boolean);

    if (annotationInstances.length === 0) return;

    if (sequential && !reducedMotion) {
      const group = annotationGroup(annotationInstances as any);
      // Trigger on scroll into view
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            group.show();
            observer.disconnect();
          }
        },
        { threshold: 0.3 }
      );

      const target = document.querySelector(annotations[0].selector);
      if (target) observer.observe(target);

      return () => observer.disconnect();
    } else {
      // Show all immediately
      annotationInstances.forEach((a: any) => a.show());
    }
  }, []);

  // This component is purely side-effectful; renders nothing
  return <div ref={containerRef} style={{ display: 'none' }} />;
}
