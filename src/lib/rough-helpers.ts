import type { Options } from 'roughjs/bin/core';

export function getThemeColors(): { stroke: string; fill: string; bg: string } {
  const style = getComputedStyle(document.documentElement);
  return {
    stroke: style.getPropertyValue('--color-stroke').trim(),
    fill: style.getPropertyValue('--color-fill-1').trim(),
    bg: style.getPropertyValue('--color-bg').trim(),
  };
}

export function defaultRoughOptions(overrides?: Partial<Options>): Options {
  const colors = getThemeColors();
  return {
    roughness: 1.5,
    bowing: 1,
    strokeWidth: 2,
    stroke: colors.stroke,
    fill: colors.fill,
    fillStyle: 'hachure',
    fillWeight: 1.5,
    hachureGap: 6,
    ...overrides,
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
