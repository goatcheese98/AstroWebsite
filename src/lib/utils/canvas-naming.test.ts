import { describe, it, expect } from 'vitest';
import { generateCanvasName, isUntitledCanvas } from './canvas-naming';

describe('Canvas Naming Utilities', () => {
    describe('generateCanvasName', () => {
        it('returns "Untitled Canvas" when no existing titles', () => {
            const existing: string[] = [];
            const result = generateCanvasName(existing);
            expect(result).toBe('Untitled Canvas');
        });

        it('returns "Untitled Canvas 2" when "Untitled Canvas" exists', () => {
            const existing = ['Untitled Canvas'];
            const result = generateCanvasName(existing);
            expect(result).toBe('Untitled Canvas 2');
        });

        it('returns "Untitled Canvas 3" when "Untitled Canvas" and "Untitled Canvas 2" exist', () => {
            const existing = ['Untitled Canvas', 'Untitled Canvas 2'];
            const result = generateCanvasName(existing);
            expect(result).toBe('Untitled Canvas 3');
        });

        it('finds the max number and increments it', () => {
            const existing = ['Untitled Canvas 10', 'Generic Project'];
            const result = generateCanvasName(existing);
            expect(result).toBe('Untitled Canvas 11');
        });

        it('ignores non-titled canvases', () => {
            const existing = ['My Great Design', 'Architecture Diagram'];
            const result = generateCanvasName(existing);
            expect(result).toBe('Untitled Canvas');
        });

        it('handles gaps in numbering correctly by taking max', () => {
            const existing = ['Untitled Canvas', 'Untitled Canvas 5'];
            const result = generateCanvasName(existing);
            expect(result).toBe('Untitled Canvas 6');
        });
    });

    describe('isUntitledCanvas', () => {
        it('returns true for untitled canvas titles', () => {
            expect(isUntitledCanvas('Untitled Canvas')).toBe(true);
            expect(isUntitledCanvas('Untitled Canvas 5')).toBe(true);
        });

        it('returns false for custom titles', () => {
            expect(isUntitledCanvas('My Design')).toBe(false);
            expect(isUntitledCanvas('Not an Untitled Canvas')).toBe(false);
        });
    });
});
