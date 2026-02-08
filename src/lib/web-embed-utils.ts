/**
 * Web Embed Utilities
 * Handles URL conversion and embed strategies for web embeds
 */

// Known embed-friendly URL patterns
const EMBED_PATTERNS = [
    // YouTube - match various YouTube URL formats
    {
        pattern: /(?:(?:youtube\.com\/watch\?v=)|(?:youtu\.be\/)|(?:youtube\.com\/embed\/)|(?:youtube\.com\/v\/)|(?:youtube\.com\/shorts\/))([a-zA-Z0-9_-]+)/,
        convert: (id: string) => `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`,
    },
    // YouTube homepage or domain without video ID
    {
        pattern: /^https?:\/\/(?:www\.)?youtube\.com\/?$/,
        convert: () => null, // Return null to use proxy for homepage
    },
    // Vimeo
    {
        pattern: /vimeo\.com\/(\d+)/,
        convert: (id: string) => `https://player.vimeo.com/video/${id}`,
    },
    // Figma
    {
        pattern: /figma\.com\/file\/([a-zA-Z0-9]+)/,
        convert: (id: string) => `https://www.figma.com/embed?embed_host=astroweb&url=https://www.figma.com/file/${id}`,
    },
    // CodePen
    {
        pattern: /codepen\.io\/([^/]+)\/pen\/([^/]+)/,
        convert: (user: string, pen: string) => `https://codepen.io/${user}/embed/${pen}`,
    },
    // StackBlitz
    {
        pattern: /stackblitz\.com\/edit\/([^?]+)/,
        convert: (project: string) => `https://stackblitz.com/edit/${project}?embed=1`,
    },
    // Google Docs/Sheets/Slides (view mode)
    {
        pattern: /docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/,
        convert: (type: string, id: string) => `https://docs.google.com/${type}/d/${id}/preview`,
    },
    // Wikipedia - always use mobile version for better iframe support
    {
        pattern: /(?:en\.)?wikipedia\.org\/wiki\/(.+)/,
        convert: (article: string) => `https://en.m.wikipedia.org/wiki/${article}`,
    },
    // Wikipedia mobile - keep as-is
    {
        pattern: /(?:en\.)?m\.wikipedia\.org\/wiki\/(.+)/,
        convert: (article: string) => `https://en.m.wikipedia.org/wiki/${article}`,
    },
    // Excalidraw libraries
    {
        pattern: /excalidraw\.com\/\?library=([^&]+)/,
        convert: (lib: string) => `https://excalidraw.com/?library=${lib}`,
    },
];

/**
 * Convert a URL to an embed-friendly version
 * Returns null if no conversion is possible
 */
export function convertToEmbedUrl(url: string): string | null {
    for (const { pattern, convert } of EMBED_PATTERNS) {
        const match = url.match(pattern);
        if (match) {
            const result = convert(...match.slice(1));
            // If convert returns null, continue to next pattern
            if (result === null) continue;
            return result;
        }
    }
    return null;
}

/**
 * Check if a URL is known to work in iframes
 */
export function isKnownEmbeddable(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // List of domains that work well in iframes
        const embeddableDomains = [
            'vimeo.com',
            'figma.com',
            'codepen.io',
            'stackblitz.com',
            'docs.google.com',
            'm.wikipedia.org',
            'excalidraw.com',
            'wikipedia.org',
            'wikimedia.org',
            'archive.org',
            'replit.com',
            'glitch.com',
            'observablehq.com',
            'notion.site',
            'loom.com',
            'canva.com',
        ];

        // YouTube embeds work, but only the /embed/ URLs
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
            return url.includes('/embed/') || url.includes('/watch?v=') || url.includes('youtu.be/');
        }

        return embeddableDomains.some(domain => hostname.includes(domain));
    } catch {
        return false;
    }
}

/**
 * Sites that are known to NOT work in iframes
 */
const BLOCKED_SITES = [
    { domain: 'google.com', message: 'Google doesn\'t allow embedding. Click "Open in New Tab" to visit the site.' },
    { domain: 'youtube.com', message: 'YouTube homepage doesn\'t work in embeds. Try pasting a specific video URL (e.g., youtube.com/watch?v=...)' },
    { domain: 'facebook.com', message: 'Facebook doesn\'t allow embedding due to security policies.' },
    { domain: 'twitter.com', message: 'Twitter/X doesn\'t allow embedding. Try using Twitter\'s embed tools instead.' },
    { domain: 'instagram.com', message: 'Instagram doesn\'t allow embedding due to security policies.' },
    { domain: 'gmail.com', message: 'Gmail doesn\'t allow embedding due to security policies.' },
    { domain: 'drive.google.com', message: 'Google Drive files don\'t work in embeds. Try using Google Docs/Sheets/Slides publish links instead.' },
    { domain: 'search.brave.com', message: 'Search engines don\'t allow embedding. Click "Open in New Tab" to search.' },
];

/**
 * Smart URL enhancer - handles search queries and embed conversion
 */
export function enhanceUrl(input: string): { url: string; isSearch: boolean; embedUrl?: string; warning?: string } {
    let url = input.trim();

    if (!url) return { url: '', isSearch: false };

    // Check if it looks like a search query
    const isSearch = !url.includes('.') || url.includes(' ');

    if (isSearch) {
        // Search engines don't allow embedding - show warning
        const searchQuery = encodeURIComponent(url);
        const googleUrl = `https://www.google.com/search?q=${searchQuery}`;
        return {
            url: googleUrl,
            isSearch: true,
            warning: 'Search engines don\'t allow embedding. Click "Open in New Tab" to search in your browser.'
        };
    }

    // Add https:// if no protocol
    if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
    }

    // Security: Block dangerous protocols
    if (url.match(/^(javascript|data|vbscript|file|ftp):/i)) {
        return { url: '', isSearch: false };
    }

    // Check if it's a blocked site
    try {
        const urlObj = new URL(url);
        const blocked = BLOCKED_SITES.find(site => urlObj.hostname.includes(site.domain));

        // Special case: YouTube videos are OK, but not the homepage
        if (blocked && blocked.domain === 'youtube.com') {
            if (!url.includes('/watch?v=') && !url.includes('/embed/') && !url.includes('youtu.be/')) {
                return { url, isSearch: false, warning: blocked.message };
            }
        } else if (blocked && blocked.domain === 'google.com') {
            // Google search is OK (we convert it), but not the homepage
            if (!url.includes('/search?')) {
                return { url, isSearch: false, warning: blocked.message };
            }
        } else if (blocked) {
            return { url, isSearch: false, warning: blocked.message };
        }
    } catch (e) {
        // Invalid URL, continue
    }

    // Try to convert to embed-friendly URL
    let embedUrl = convertToEmbedUrl(url);

    // If no native embed URL found, use the CORS proxy
    if (!embedUrl) {
        // Determine PartyKit host
        const isDev = import.meta.env.DEV;
        const host = isDev
            ? "localhost:1999"
            : (import.meta.env.PUBLIC_PARTYKIT_HOST || "astroweb-excalidraw.goatcheese98.partykit.dev");
        const protocol = isDev ? "http" : "https";

        // Construct proxy URL
        embedUrl = `${protocol}://${host}/parties/main/proxy?url=${encodeURIComponent(url)}`;
    }

    return { url, isSearch: false, embedUrl };
}

/**
 * Get a screenshot/preview URL for a website
 * Uses external screenshot services
 */
export function getScreenshotUrl(url: string): string {
    // Using microlink.io screenshot API (free tier available)
    // You could also use: screenshotapi.net, screenshotlayer.com, etc.
    const encodedUrl = encodeURIComponent(url);
    return `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&embed=screenshot.url`;
}

/**
 * Sites that reliably work in iframes
 */
export const RELIABLE_EMBED_SITES = [
    { name: 'YouTube', pattern: 'youtube.com', example: 'youtube.com/watch?v=...' },
    { name: 'Vimeo', pattern: 'vimeo.com', example: 'vimeo.com/...' },
    { name: 'Figma', pattern: 'figma.com', example: 'figma.com/file/...' },
    { name: 'CodePen', pattern: 'codepen.io', example: 'codepen.io/user/pen/...' },
    { name: 'StackBlitz', pattern: 'stackblitz.com', example: 'stackblitz.com/edit/...' },
    { name: 'Google Docs', pattern: 'docs.google.com', example: 'docs.google.com/document/d/...' },
    { name: 'Wikipedia', pattern: 'wikipedia.org', example: 'en.wikipedia.org/wiki/...' },
    { name: 'Excalidraw', pattern: 'excalidraw.com', example: 'excalidraw.com/?library=...' },
    { name: 'Loom', pattern: 'loom.com', example: 'loom.com/share/...' },
    { name: 'Notion', pattern: 'notion.site', example: '...notion.site/...' },
];

export default {
    convertToEmbedUrl,
    isKnownEmbeddable,
    enhanceUrl,
    getScreenshotUrl,
    RELIABLE_EMBED_SITES,
};
