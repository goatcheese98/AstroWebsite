/**
 * Web Embed Utilities
 * Handles URL conversion and embed strategies for web embeds
 */

// Known embed-friendly URL patterns
const EMBED_PATTERNS = [
    // YouTube
    {
        pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
        convert: (id: string) => `https://www.youtube.com/embed/${id}`,
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
    // Wikipedia (mobile version allows framing)
    {
        pattern: /wikipedia\.org\/wiki\/(.+)/,
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
            return convert(...match.slice(1));
        }
    }
    return null;
}

/**
 * Check if a URL is known to work in iframes
 */
export function isKnownEmbeddable(url: string): boolean {
    const embeddableDomains = [
        'youtube.com',
        'youtu.be',
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

    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return embeddableDomains.some(domain => hostname.includes(domain));
    } catch {
        return false;
    }
}

/**
 * Smart URL enhancer - handles search queries and embed conversion
 */
export function enhanceUrl(input: string): { url: string; isSearch: boolean; embedUrl?: string } {
    let url = input.trim();

    if (!url) return { url: '', isSearch: false };

    // Check if it looks like a search query
    const isSearch = !url.includes('.') || url.includes(' ');

    if (isSearch) {
        // Convert to DuckDuckGo search (iframe-friendly)
        const searchQuery = encodeURIComponent(url);
        const searchUrl = `https://duckduckgo.com/?q=${searchQuery}&ia=web`;
        return { url: searchUrl, isSearch: true };
    }

    // Add https:// if no protocol
    if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
    }

    // Security: Block dangerous protocols
    if (url.match(/^(javascript|data|vbscript|file|ftp):/i)) {
        return { url: '', isSearch: false };
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
        // We use the 'main' party (default) with a specific 'proxy' room
        // The onRequest handler in server.ts intercepts this regardless of room
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
