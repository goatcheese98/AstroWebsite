// Helper to generate unique IDs for Excalidraw elements
export function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
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
