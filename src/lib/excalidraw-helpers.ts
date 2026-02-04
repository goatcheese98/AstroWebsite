import { nanoid } from "nanoid";

// Helper to generate unique IDs for Excalidraw elements
export function generateId(): string {
    return nanoid();
}

// Helper to create a basic Excalidraw element template
export function createExcalidrawElement(
    type: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: any = {}
) {
    return {
        id: generateId(),
        type,
        x,
        y,
        width,
        height,
        strokeColor: options.strokeColor || "#1e1e1e",
        backgroundColor: options.backgroundColor || "transparent",
        fillStyle: options.fillStyle || "solid",
        strokeWidth: options.strokeWidth || 2,
        roughness: options.roughness || 1,
        opacity: options.opacity || 100,
        angle: options.angle || 0,
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        ...options,
    };
}

/**
 * Creates a markdown note element for the Excalidraw canvas
 * @param x - X position
 * @param y - Y position
 * @param content - Markdown content
 * @param options - Optional size and other properties
 */
export function createMarkdownNote(
    x: number,
    y: number,
    content: string,
    options?: {
        width?: number;
        height?: number;
    }
) {
    return {
        id: generateId(),
        type: "rectangle" as const,
        x,
        y,
        width: options?.width || 500,
        height: options?.height || 400,
        strokeColor: "transparent",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        roughness: 0,
        strokeWidth: 0,
        locked: false, // Allow arrow binding
        customData: {
            type: "markdown",
            content,
        },
    };
}
