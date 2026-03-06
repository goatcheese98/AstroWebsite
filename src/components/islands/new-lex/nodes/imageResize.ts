export type ResizeCorner = 'nw' | 'ne' | 'se' | 'sw';

type CalculateImageResizeOptions = {
  corner: ResizeCorner;
  currentX: number;
  maxWidth?: number;
  minWidth?: number;
  rootWidth?: number;
  startHeight: number;
  startWidth: number;
  startX: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateImageResize({
  corner,
  currentX,
  maxWidth,
  minWidth = 120,
  rootWidth,
  startHeight,
  startWidth,
  startX,
}: CalculateImageResizeOptions): { height: number; width: number } {
  const ratio = startWidth / startHeight;
  const rawDx = currentX - startX;
  const widthDelta = corner === 'ne' || corner === 'se' ? rawDx : -rawDx;
  const widthCap = Math.max(
    minWidth,
    Math.min(maxWidth ?? Number.POSITIVE_INFINITY, (rootWidth ?? Number.POSITIVE_INFINITY) - 32),
  );
  const width = clamp(startWidth + widthDelta, minWidth, widthCap);

  return {
    height: Math.round(width / ratio),
    width: Math.round(width),
  };
}
