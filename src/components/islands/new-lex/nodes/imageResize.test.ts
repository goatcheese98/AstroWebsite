import { describe, expect, it } from 'vitest';
import { calculateImageResize } from './imageResize';

describe('calculateImageResize', () => {
  it('grows from the right-side handles with positive horizontal movement', () => {
    expect(
      calculateImageResize({
        corner: 'se',
        currentX: 280,
        startHeight: 100,
        startWidth: 200,
        startX: 200,
      }),
    ).toEqual({
      height: 140,
      width: 280,
    });
  });

  it('grows from the left-side handles when dragging leftward', () => {
    expect(
      calculateImageResize({
        corner: 'sw',
        currentX: 120,
        startHeight: 120,
        startWidth: 240,
        startX: 200,
      }),
    ).toEqual({
      height: 160,
      width: 320,
    });
  });

  it('preserves aspect ratio while shrinking', () => {
    expect(
      calculateImageResize({
        corner: 'ne',
        currentX: 150,
        startHeight: 150,
        startWidth: 300,
        startX: 200,
      }),
    ).toEqual({
      height: 125,
      width: 250,
    });
  });

  it('clamps to the minimum width', () => {
    expect(
      calculateImageResize({
        corner: 'nw',
        currentX: 500,
        minWidth: 120,
        startHeight: 100,
        startWidth: 200,
        startX: 200,
      }),
    ).toEqual({
      height: 60,
      width: 120,
    });
  });

  it('clamps to the editor width and configured max width', () => {
    expect(
      calculateImageResize({
        corner: 'se',
        currentX: 800,
        maxWidth: 500,
        rootWidth: 420,
        startHeight: 100,
        startWidth: 200,
        startX: 200,
      }),
    ).toEqual({
      height: 194,
      width: 388,
    });
  });
});
