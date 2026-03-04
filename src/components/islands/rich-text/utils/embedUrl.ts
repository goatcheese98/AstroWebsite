const HAS_PROTOCOL_REGEX = /^[a-z][a-z\d+\-.]*:\/\//i;
const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function toUrl(input: string): URL | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const candidate = HAS_PROTOCOL_REGEX.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        return new URL(candidate);
    } catch {
        return null;
    }
}

function isYouTubeHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return (
        host === 'youtube.com' ||
        host.endsWith('.youtube.com') ||
        host === 'youtu.be' ||
        host.endsWith('.youtu.be') ||
        host === 'youtube-nocookie.com' ||
        host.endsWith('.youtube-nocookie.com')
    );
}

function isTweetHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return (
        host === 'twitter.com' ||
        host.endsWith('.twitter.com') ||
        host === 'x.com' ||
        host.endsWith('.x.com')
    );
}

export function extractYouTubeVideoId(url: string): string | null {
    const parsed = toUrl(url);
    if (!parsed || !isYouTubeHost(parsed.hostname)) {
        return null;
    }

    let candidate: string | null = null;
    const host = parsed.hostname.toLowerCase();

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
        candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (parsed.pathname === '/watch') {
        candidate = parsed.searchParams.get('v');
    } else {
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length >= 2 && ['embed', 'shorts', 'v', 'live'].includes(segments[0])) {
            candidate = segments[1];
        }
    }

    if (!candidate || !YOUTUBE_VIDEO_ID_REGEX.test(candidate)) {
        return null;
    }

    return candidate;
}

export function extractTweetIdFromUrl(url: string): string | null {
    const parsed = toUrl(url);
    if (!parsed || !isTweetHost(parsed.hostname)) {
        return null;
    }

    const path = parsed.pathname.replace(/\/+$/, '');
    const match = path.match(/\/(?:i\/web\/status|[^/]+\/status(?:es)?)\/(\d+)/i);
    return match ? match[1] : null;
}

export function isYouTubeUrl(url: string): boolean {
    return extractYouTubeVideoId(url) !== null;
}

export function isTweetUrl(url: string): boolean {
    return extractTweetIdFromUrl(url) !== null;
}

