/**
 * Shared image compression utility.
 * Used by both the markdown note editor and the canvas file compressor.
 */

const MAX_IMAGE_SIDE = 1600;   // px — max width or height after scaling
const JPEG_QUALITY = 0.82;
const COMPRESS_THRESHOLD = 80 * 1024; // skip if already < 80 KB (encoded chars ≈ bytes)

/**
 * Compress an image data URL: scale down to MAX_IMAGE_SIDE on the longest side,
 * then encode as WebP (with transparency) or JPEG at JPEG_QUALITY.
 * Returns the smaller of compressed vs original so quality is never degraded for
 * already-small images.
 */
export const compressImageDataUrl = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
        if (dataUrl.length < COMPRESS_THRESHOLD) { resolve(dataUrl); return; }

        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
                const ratio = Math.min(MAX_IMAGE_SIDE / width, MAX_IMAGE_SIDE / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(dataUrl); return; }
            ctx.drawImage(img, 0, 0, width, height);

            // Try WebP first (best ratio, supports transparency)
            const webp = canvas.toDataURL('image/webp', 0.85);
            if (webp.startsWith('data:image/webp') && webp.length < dataUrl.length) {
                resolve(webp);
                return;
            }

            // Fallback: JPEG (no transparency but excellent compression)
            const jpeg = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
            resolve(jpeg.length < dataUrl.length ? jpeg : dataUrl);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
