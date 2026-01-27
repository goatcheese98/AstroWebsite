/**
 * Spatial analysis utilities for intelligent element positioning on the Excalidraw canvas
 */

export interface CanvasSpatialData {
    viewport: {
        centerX: number;
        centerY: number;
        zoom: number;
    };
    boundingBox: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        width: number;
        height: number;
    } | null;
    emptySpaces: {
        rightX: number;
        rightY: number;
        belowX: number;
        belowY: number;
    } | null;
    quadrants: {
        topLeft: number;
        topRight: number;
        bottomLeft: number;
        bottomRight: number;
    };
    suggestedPosition: {
        x: number;
        y: number;
        reason: string;
    };
}

/**
 * Analyzes the canvas layout and returns spatial information for intelligent positioning
 */
export function analyzeCanvasLayout(
    elements: any[],
    appState: any
): CanvasSpatialData {
    // Get viewport information
    const viewport = {
        centerX: appState.scrollX + appState.width / 2,
        centerY: appState.scrollY + appState.height / 2,
        zoom: appState.zoom?.value || 1,
    };

    // If canvas is empty, suggest starting position
    if (!elements || elements.length === 0) {
        return {
            viewport,
            boundingBox: null,
            emptySpaces: null,
            quadrants: {
                topLeft: 0,
                topRight: 0,
                bottomLeft: 0,
                bottomRight: 0,
            },
            suggestedPosition: {
                x: 100,
                y: 100,
                reason: "Canvas is empty, starting at top-left",
            },
        };
    }

    // Calculate bounding box of all elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach((element) => {
        if (element.x < minX) minX = element.x;
        if (element.y < minY) minY = element.y;
        if (element.x + element.width > maxX) maxX = element.x + element.width;
        if (element.y + element.height > maxY) maxY = element.y + element.height;
    });

    const boundingBox = {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };

    // Calculate empty spaces (positions to place new elements)
    const padding = 100; // Space between elements
    const emptySpaces = {
        rightX: maxX + padding,
        rightY: minY,
        belowX: minX,
        belowY: maxY + padding,
    };

    // Analyze element distribution across quadrants (relative to viewport)
    const quadrants = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
    };

    elements.forEach((element) => {
        const elementCenterX = element.x + element.width / 2;
        const elementCenterY = element.y + element.height / 2;

        if (elementCenterX < viewport.centerX && elementCenterY < viewport.centerY) {
            quadrants.topLeft++;
        } else if (elementCenterX >= viewport.centerX && elementCenterY < viewport.centerY) {
            quadrants.topRight++;
        } else if (elementCenterX < viewport.centerX && elementCenterY >= viewport.centerY) {
            quadrants.bottomLeft++;
        } else {
            quadrants.bottomRight++;
        }
    });

    // Determine suggested position based on existing elements
    let suggestedPosition: { x: number; y: number; reason: string };

    // Find the least occupied quadrant
    const quadrantCounts = [
        { name: "topLeft", count: quadrants.topLeft, x: viewport.centerX - 200, y: viewport.centerY - 200 },
        { name: "topRight", count: quadrants.topRight, x: viewport.centerX + 200, y: viewport.centerY - 200 },
        { name: "bottomLeft", count: quadrants.bottomLeft, x: viewport.centerX - 200, y: viewport.centerY + 200 },
        { name: "bottomRight", count: quadrants.bottomRight, x: viewport.centerX + 200, y: viewport.centerY + 200 },
    ];

    quadrantCounts.sort((a, b) => a.count - b.count);
    const leastOccupiedQuadrant = quadrantCounts[0];

    // Prefer placing to the right of existing content if there's space
    if (boundingBox.width < 1500) {
        suggestedPosition = {
            x: emptySpaces.rightX,
            y: emptySpaces.rightY,
            reason: "Placing to the right of existing content",
        };
    } else {
        // If canvas is wide, place below
        suggestedPosition = {
            x: emptySpaces.belowX,
            y: emptySpaces.belowY,
            reason: "Placing below existing content",
        };
    }

    return {
        viewport,
        boundingBox,
        emptySpaces,
        quadrants,
        suggestedPosition,
    };
}

/**
 * Formats spatial data into a human-readable description for the AI
 */
export function formatSpatialDescription(spatialData: CanvasSpatialData): string {
    const { viewport, boundingBox, suggestedPosition, quadrants } = spatialData;

    if (!boundingBox) {
        return `The canvas is currently empty. Start drawing at position (100, 100).`;
    }

    const lines = [
        `Canvas viewport center: (${Math.round(viewport.centerX)}, ${Math.round(viewport.centerY)})`,
        `Existing content occupies: X: ${Math.round(boundingBox.minX)} to ${Math.round(boundingBox.maxX)}, Y: ${Math.round(boundingBox.minY)} to ${Math.round(boundingBox.maxY)}`,
        `Content dimensions: ${Math.round(boundingBox.width)} × ${Math.round(boundingBox.height)}`,
        `Suggested position for new elements: (${Math.round(suggestedPosition.x)}, ${Math.round(suggestedPosition.y)}) - ${suggestedPosition.reason}`,
        `Element distribution: Top-left: ${quadrants.topLeft}, Top-right: ${quadrants.topRight}, Bottom-left: ${quadrants.bottomLeft}, Bottom-right: ${quadrants.bottomRight}`,
    ];

    return lines.join("\n");
}

/**
 * Calculates a position relative to existing elements
 * @param direction - "right", "left", "below", "above", "center"
 */
export function calculateRelativePosition(
    spatialData: CanvasSpatialData,
    direction: "right" | "left" | "below" | "above" | "center" = "right",
    offset: number = 100
): { x: number; y: number } {
    if (!spatialData.boundingBox) {
        return { x: 100, y: 100 };
    }

    const { boundingBox, viewport } = spatialData;

    switch (direction) {
        case "right":
            return {
                x: boundingBox.maxX + offset,
                y: boundingBox.minY,
            };
        case "left":
            return {
                x: boundingBox.minX - offset - 200, // Assume element width ~200
                y: boundingBox.minY,
            };
        case "below":
            return {
                x: boundingBox.minX,
                y: boundingBox.maxY + offset,
            };
        case "above":
            return {
                x: boundingBox.minX,
                y: boundingBox.minY - offset - 100, // Assume element height ~100
            };
        case "center":
            return {
                x: viewport.centerX - 100, // Center horizontally (assuming element width ~200)
                y: viewport.centerY - 50,  // Center vertically (assuming element height ~100)
            };
        default:
            return spatialData.suggestedPosition;
    }
}
