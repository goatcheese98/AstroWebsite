import { exportToCanvas, exportToSvg } from "@excalidraw/excalidraw";

export interface MarkdownNoteRef {
    exportAsImage: () => Promise<{
        imageData: string;
        position: { x: number; y: number; width: number; height: number; angle: number };
    }>;
}

export async function exportCanvasWithMarkdown(
    excalidrawAPI: any,
    markdownNoteRefs: Map<string, MarkdownNoteRef>,
    format: "png" | "svg"
): Promise<Blob> {
    // 1. Get base Excalidraw export (filter out markdown rectangles as they're invisible)
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();

    // Filter out markdown elements to avoid confusion in export
    const nonMarkdownElements = elements.filter((el: any) => el.customData?.type !== "markdown");

    const baseCanvas = await exportToCanvas({
        elements: nonMarkdownElements,
        appState,
        files,
    });

    // 2. Export each markdown note overlay
    const markdownImages = await Promise.all(
        Array.from(markdownNoteRefs.entries()).map(async ([id, ref]) => {
            try {
                if (!ref?.exportAsImage) return null;
                return await ref.exportAsImage();
            } catch (err) {
                console.error(`Failed to export markdown note ${id}:`, err);
                return null;
            }
        })
    );

    // 3. Composite markdown notes onto base canvas
    const ctx = baseCanvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    // Get canvas bounds for proper positioning
    const bounds = appState.scrollX !== undefined && appState.scrollY !== undefined
        ? { scrollX: appState.scrollX, scrollY: appState.scrollY }
        : { scrollX: 0, scrollY: 0 };

    for (const mdImage of markdownImages.filter(Boolean)) {
        if (!mdImage) continue;

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = mdImage.imageData;
        });

        // Calculate position relative to canvas bounds
        const canvasX = mdImage.position.x - bounds.scrollX;
        const canvasY = mdImage.position.y - bounds.scrollY;

        // Apply transformations (position, rotation)
        ctx.save();
        ctx.translate(canvasX + mdImage.position.width / 2, canvasY + mdImage.position.height / 2);
        ctx.rotate(mdImage.position.angle);
        ctx.drawImage(
            img,
            -mdImage.position.width / 2,
            -mdImage.position.height / 2,
            mdImage.position.width,
            mdImage.position.height
        );
        ctx.restore();
    }

    // 4. Convert to blob
    return new Promise((resolve, reject) => {
        baseCanvas.toBlob((blob: Blob | null) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("Failed to create blob from canvas"));
            }
        }, "image/png");
    });
}
