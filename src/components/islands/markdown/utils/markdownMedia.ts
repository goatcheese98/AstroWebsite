import type React from 'react';
import { defaultUrlTransform } from 'react-markdown';
import { compressImageDataUrl } from '@/lib/image-compression';

export { compressImageDataUrl };
export const MD_IMAGE_PREFIX = 'md-img://';
const IMAGE_MIME_PREFIX = 'image/';

export interface HandleImagePasteOptions {
    event: React.ClipboardEvent<HTMLTextAreaElement>;
    value: string;
    onChange: (nextValue: string) => void;
    onImageAdd: (id: string, dataUrl: string) => void;
}

// Module-level cache: dataUrl → blob objectUrl
// Lives for the browser session — no cleanup needed for a canvas app
const objectUrlCache = new Map<string, string>();

const genImageId = (): string =>
    `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Failed to read image'));
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
        reader.readAsDataURL(blob);
    });


/** Convert a data URL to a blob:// Object URL (faster rendering, avoids base64 per-frame decode). */
const dataUrlToObjectUrl = (dataUrl: string): string => {
    const comma = dataUrl.indexOf(',');
    if (comma === -1) throw new Error('Invalid data URL');
    const header = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    const mime = header.match(/data:([^;]+)/)?.[1];
    if (!mime?.startsWith('image/')) throw new Error('Not an image data URL');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
};

/**
 * Pre-warm the object URL cache for all images in a note.
 * Call this before or during render so the blob URLs are ready.
 */
export const prewarmImageCache = (images: Record<string, string>): void => {
    for (const dataUrl of Object.values(images)) {
        if (objectUrlCache.has(dataUrl)) continue;
        try {
            objectUrlCache.set(dataUrl, dataUrlToObjectUrl(dataUrl));
        } catch {
            // mark as invalid so we don't retry
            objectUrlCache.set(dataUrl, '');
        }
    }
};

const toSafeAltText = (fileName?: string): string => {
    const raw = (fileName || 'image').replace(/\.[a-z0-9]+$/i, '');
    const cleaned = raw.trim().replace(/[^\w.-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || 'image';
};

const insertMarkdownAtCursor = (
    target: HTMLTextAreaElement,
    value: string,
    src: string,
    onChange: (nextValue: string) => void,
    altText?: string,
) => {
    const start = target.selectionStart ?? value.length;
    const end = target.selectionEnd ?? value.length;
    const imageMarkdown = `![${toSafeAltText(altText)}](${src})`;
    const prefix = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    const suffix = end < value.length && value[end] !== '\n' ? '\n' : '';
    const insertion = `${prefix}${imageMarkdown}${suffix}`;
    onChange(`${value.slice(0, start)}${insertion}${value.slice(end)}`);
    requestAnimationFrame(() => {
        const caret = start + insertion.length;
        target.setSelectionRange(caret, caret);
    });
};

const extractExcalidrawDataUrl = (text: string): string | null => {
    if (!text.includes('"excalidraw/clipboard"')) return null;
    try {
        const parsed = JSON.parse(text);
        if (parsed?.type !== 'excalidraw/clipboard') return null;
        const imageEl = (parsed.elements || []).find((el: any) => el.type === 'image' && el.fileId);
        const file = parsed.files?.[imageEl?.fileId];
        return (typeof file?.dataURL === 'string' ? file.dataURL : null);
    } catch {
        return text.match(/"dataURL"\s*:\s*"(data:image[^"]+)"/)?.[1]?.replace(/\\\//g, '/') ?? null;
    }
};

const extractImageSrcFromHtml = (html: string): string | null => {
    if (!html) return null;
    return new DOMParser().parseFromString(html, 'text/html').querySelector('img')?.getAttribute('src')?.trim() ?? null;
};

export const handleImagePasteAsMarkdown = async ({
    event,
    value,
    onChange,
    onImageAdd,
}: HandleImagePasteOptions): Promise<boolean> => {
    const cd = event.clipboardData;
    if (!cd) return false;
    const target = event.currentTarget;

    // 1. Image file (screenshot, drag-drop, downloaded .png, etc.)
    const imageItem = Array.from(cd.items).find(i => i.kind === 'file' && i.type.startsWith(IMAGE_MIME_PREFIX));
    if (imageItem) {
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return false;
        const raw = await readBlobAsDataUrl(file);
        const dataUrl = await compressImageDataUrl(raw);
        const id = genImageId();
        onImageAdd(id, dataUrl);
        insertMarkdownAtCursor(target, value, `${MD_IMAGE_PREFIX}${id}`, onChange, file.name);
        return true;
    }

    // 2. Excalidraw clipboard
    const text = cd.getData('text/plain');
    if (text.includes('"excalidraw/clipboard"')) {
        event.preventDefault();
        const raw = extractExcalidrawDataUrl(text);
        if (raw) {
            const dataUrl = await compressImageDataUrl(raw);
            const id = genImageId();
            onImageAdd(id, dataUrl);
            insertMarkdownAtCursor(target, value, `${MD_IMAGE_PREFIX}${id}`, onChange, 'canvas-image');
        }
        return true;
    }

    // 3. Image copied from another browser tab
    const html = cd.getData('text/html');
    const htmlSrc = extractImageSrcFromHtml(html);
    if (htmlSrc) {
        event.preventDefault();
        if (htmlSrc.startsWith('data:image/')) {
            const dataUrl = await compressImageDataUrl(htmlSrc);
            const id = genImageId();
            onImageAdd(id, dataUrl);
            insertMarkdownAtCursor(target, value, `${MD_IMAGE_PREFIX}${id}`, onChange);
        } else {
            // External URL — embed directly (no storage needed)
            insertMarkdownAtCursor(target, value, htmlSrc, onChange);
        }
        return true;
    }

    return false;
};

export const markdownUrlTransform = (url: string): string => {
    const trimmed = url.trim();
    if (trimmed.startsWith(MD_IMAGE_PREFIX) || trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
        return trimmed;
    }
    return defaultUrlTransform(trimmed);
};

/**
 * Resolve an image src for rendering.
 * - md-img://id  → blob:// object URL from cache (fast), or undefined if not found
 * - anything else → pass through
 */
export const resolveMarkdownImageSrc = (src: string | undefined, images?: Record<string, string>): string | undefined => {
    if (!src) return undefined;
    const trimmed = src.trim();
    if (!trimmed.startsWith(MD_IMAGE_PREFIX)) return trimmed || undefined;

    const id = trimmed.slice(MD_IMAGE_PREFIX.length);
    const dataUrl = images?.[id];
    if (!dataUrl) return undefined;

    // Return cached object URL
    if (objectUrlCache.has(dataUrl)) {
        const cached = objectUrlCache.get(dataUrl)!;
        return cached || undefined; // empty string = previously failed
    }

    // Create and cache synchronously (called during render, but only once per unique image)
    try {
        const objectUrl = dataUrlToObjectUrl(dataUrl);
        objectUrlCache.set(dataUrl, objectUrl);
        return objectUrl;
    } catch {
        objectUrlCache.set(dataUrl, ''); // mark invalid
        return undefined;
    }
};
