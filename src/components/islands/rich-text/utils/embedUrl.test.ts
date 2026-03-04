import { describe, expect, it } from 'vitest';
import {
    extractTweetIdFromUrl,
    extractYouTubeVideoId,
    isTweetUrl,
    isYouTubeUrl,
} from './embedUrl';

describe('extractYouTubeVideoId', () => {
    it('extracts IDs from common youtube links', () => {
        expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ');
        expect(extractYouTubeVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(extractYouTubeVideoId('youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for non-video URLs', () => {
        expect(extractYouTubeVideoId('https://youtube.com')).toBeNull();
        expect(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    });
});

describe('extractTweetIdFromUrl', () => {
    it('extracts IDs from twitter and x URL variants', () => {
        expect(extractTweetIdFromUrl('https://x.com/openai/status/1900000000000000000')).toBe('1900000000000000000');
        expect(extractTweetIdFromUrl('https://twitter.com/openai/status/1900000000000000001?s=20')).toBe('1900000000000000001');
        expect(extractTweetIdFromUrl('https://x.com/i/web/status/1900000000000000002')).toBe('1900000000000000002');
    });

    it('returns null for non-status links', () => {
        expect(extractTweetIdFromUrl('https://x.com/openai')).toBeNull();
        expect(extractTweetIdFromUrl('https://example.com/openai/status/1900000000000000003')).toBeNull();
    });
});

describe('url predicates', () => {
    it('detects valid embed links', () => {
        expect(isYouTubeUrl('youtu.be/dQw4w9WgXcQ')).toBe(true);
        expect(isTweetUrl('x.com/i/web/status/1900000000000000004')).toBe(true);
    });

    it('rejects invalid links', () => {
        expect(isYouTubeUrl('youtube.com')).toBe(false);
        expect(isTweetUrl('x.com/openai')).toBe(false);
    });
});

