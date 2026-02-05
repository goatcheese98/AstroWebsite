import { useEffect, useState, useRef, useCallback } from "react";
import { nanoid } from "nanoid";
import { useMobileDetection } from "../ai-chat/hooks/useMobileDetection";
import { useLongPress } from "../../hooks/useLongPress";
import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to avoid SSR issues
let ExcalidrawModule: any = null;
let convertToExcalidrawElements: any = null;

const loadExcalidraw = async () => {
    if (!ExcalidrawModule) {
        const mod = await import("@excalidraw/excalidraw");
        ExcalidrawModule = mod.Excalidraw;
        convertToExcalidrawElements = mod.convertToExcalidrawElements;
    }
    return { Excalidraw: ExcalidrawModule, convertToExcalidrawElements };
};

// Lazy-loaded MarkdownNote
let MarkdownNote: any = null;

const loadMarkdownNote = async () => {
    if (!MarkdownNote) {
        const mod = await import("./markdown");
        MarkdownNote = mod.MarkdownNote;
    }
    return { MarkdownNote };
};

const STORAGE_KEY = "excalidraw-canvas-data";
const STORAGE_VERSION = 1;

export default function ExcalidrawCanvas() {
    const { isMobile, isPhone } = useMobileDetection();
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [ExcalidrawComponent, setExcalidrawComponent] = useState<any>(null);
    const [MarkdownNoteComponent, setMarkdownNoteComponent] = useState<any>(null);
    const [initialCanvasData, setInitialCanvasData] = useState<any>(null);

    // Use refs to avoid triggering re-renders from RAF loop
    const viewStateRef = useRef({ scrollX: 0, scrollY: 0, zoom: { value: 1 } });
    const markdownElementsRef = useRef<any[]>([]);
    const markdownNoteRefsRef = useRef<Map<string, any>>(new Map());
    const saveTimeoutRef = useRef<number | null>(null);

    // State for triggering React re-renders (updated at controlled intervals)
    const [, forceUpdate] = useState({});
    const [markdownElements, setMarkdownElements] = useState<any[]>([]);

    // Load saved canvas data from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.version === STORAGE_VERSION) {
                    setInitialCanvasData(data.canvasData);
                    console.log("✅ Restored canvas from localStorage");
                } else {
                    console.log("⚠️ Canvas data version mismatch, starting fresh");
                }
            }
        } catch (err) {
            console.error("Failed to load canvas data:", err);
        }
    }, []);

    // Load components on mount
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const [{ Excalidraw }, { MarkdownNote }] = await Promise.all([
                    loadExcalidraw(),
                    loadMarkdownNote()
                ]);

                if (mounted) {
                    setExcalidrawComponent(() => Excalidraw);
                    setMarkdownNoteComponent(() => MarkdownNote);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Failed to load Excalidraw:", err);
            }
        };

        init();

        return () => {
            mounted = false;
            // Clear any pending save on unmount
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Save canvas to localStorage with debouncing
    const saveToLocalStorage = useCallback((elements: any[], appState: any, files: any) => {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce save by 1 second
        saveTimeoutRef.current = window.setTimeout(() => {
            try {
                const dataToSave = {
                    version: STORAGE_VERSION,
                    canvasData: {
                        elements,
                        appState: {
                            viewBackgroundColor: appState.viewBackgroundColor,
                            currentItemStrokeColor: appState.currentItemStrokeColor,
                            currentItemBackgroundColor: appState.currentItemBackgroundColor,
                            currentItemFillStyle: appState.currentItemFillStyle,
                            currentItemStrokeWidth: appState.currentItemStrokeWidth,
                            currentItemRoughness: appState.currentItemRoughness,
                            currentItemOpacity: appState.currentItemOpacity,
                            currentItemFontFamily: appState.currentItemFontFamily,
                            currentItemFontSize: appState.currentItemFontSize,
                            currentItemTextAlign: appState.currentItemTextAlign,
                            currentItemStrokeStyle: appState.currentItemStrokeStyle,
                            currentItemRoundness: appState.currentItemRoundness,
                        },
                        files,
                    },
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
                console.log("💾 Canvas auto-saved");
            } catch (err) {
                console.error("Failed to save canvas:", err);
            }
        }, 1000);
    }, []);

    useEffect(() => {
        // Force light theme always, regardless of document theme
        setTheme("light");

        // Keep watching for any theme changes and force back to light
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "data-theme") {
                    // Always force light mode
                    setTheme("light");
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    // RAF polling loop - update view state and selection state
    useEffect(() => {
        if (!excalidrawAPI) return;

        let rafId: number;
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 8; // Update React state at ~120fps for ultra-smooth overlay sync

        const pollExcalidrawState = (timestamp: number) => {
            try {
                const elements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();

                // Update refs with full appState including selection
                viewStateRef.current = {
                    scrollX: appState.scrollX,
                    scrollY: appState.scrollY,
                    zoom: appState.zoom,
                    selectedElementIds: appState.selectedElementIds,
                };

                const mdElements = elements.filter(
                    (el: any) => el.customData?.type === "markdown" && !el.isDeleted
                );
                markdownElementsRef.current = mdElements;

                // Only trigger React update at controlled intervals
                if (timestamp - lastUpdateTime > UPDATE_INTERVAL) {
                    setMarkdownElements([...mdElements]); // Create new array to trigger render
                    lastUpdateTime = timestamp;
                }
            } catch (err) {
                console.error("Error polling Excalidraw state:", err);
            }

            rafId = requestAnimationFrame(pollExcalidrawState);
        };

        rafId = requestAnimationFrame(pollExcalidrawState);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [excalidrawAPI]);

    // Migration: Unlock existing markdown notes to enable arrow binding
    useEffect(() => {
        if (!excalidrawAPI) return;

        const elements = excalidrawAPI.getSceneElements();
        let needsUpdate = false;

        const updatedElements = elements.map((el: any) => {
            // Check if this is a markdown note that's locked
            if (el.customData?.type === 'markdown' && el.locked === true) {
                needsUpdate = true;
                return {
                    ...el,
                    locked: false, // Unlock to allow arrow binding
                    version: (el.version || 0) + 1,
                    versionNonce: Date.now(),
                };
            }
            return el;
        });

        if (needsUpdate) {
            excalidrawAPI.updateScene({ elements: updatedElements });
            console.log("🔓 Migrated existing markdown notes to enable arrow binding");
        }
    }, [excalidrawAPI]);

    // Listen for drawing commands from the AI chat (supports both old and new event names)
    useEffect(() => {
        const handleDrawCommand = async (event: any) => {
            console.log("🖼️ Canvas received draw command:", event.detail);

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            const { elements, isModification } = event.detail;
            if (elements && Array.isArray(elements)) {
                console.log(`📝 Converting ${elements.length} skeleton elements`);

                try {
                    // Ensure convertToExcalidrawElements is loaded
                    const { convertToExcalidrawElements: converter } = await loadExcalidraw();

                    let elementsToConvert = elements;

                    // Only center elements if this is NOT a modification (adding to existing elements)
                    if (!isModification) {
                        // Get viewport center for positioning - convert to scene coordinates
                        const appState = excalidrawAPI.getAppState();
                        const viewportCenterX = appState.width / 2;
                        const viewportCenterY = appState.height / 2;

                        // Convert viewport center to scene coordinates
                        const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
                        const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

                        // Calculate bounding box of elements to center them
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        elements.forEach((el: any) => {
                            if (el.x < minX) minX = el.x;
                            if (el.y < minY) minY = el.y;
                            if (el.x + (el.width || 0) > maxX) maxX = el.x + (el.width || 0);
                            if (el.y + (el.height || 0) > maxY) maxY = el.y + (el.height || 0);
                        });

                        // Calculate center of elements
                        const elementsCenterX = (minX + maxX) / 2;
                        const elementsCenterY = (minY + maxY) / 2;

                        // Offset elements to center them at viewport center
                        const offsetX = sceneX - elementsCenterX;
                        const offsetY = sceneY - elementsCenterY;

                        elementsToConvert = elements.map((el: any) => ({
                            ...el,
                            x: el.x + offsetX,
                            y: el.y + offsetY,
                        }));

                        console.log("✅ Elements will be centered at viewport center");
                    } else {
                        console.log("✅ Modification mode: using original element positions");
                    }

                    // Convert skeleton elements to full Excalidraw elements
                    const excalidrawElements = converter(elementsToConvert);
                    console.log("✅ Converted elements successfully");

                    // Get current scene elements
                    const currentElements = excalidrawAPI.getSceneElements();

                    // Add new elements to scene
                    excalidrawAPI.updateScene({
                        elements: [...currentElements, ...excalidrawElements],
                    });

                    // Dispatch event with new element IDs for selection
                    const newElementIds = excalidrawElements.map((el: any) => el.id).filter(Boolean);
                    if (newElementIds.length > 0) {
                        window.dispatchEvent(new CustomEvent("excalidraw:elements-added", {
                            detail: { elementIds: newElementIds },
                        }));
                        console.log("📣 Dispatched elements-added event with IDs:", newElementIds);
                    }

                    console.log("🎨 Scene updated with new elements");
                } catch (err) {
                    console.error("❌ Error converting elements:", err);
                }
            } else {
                console.error("❌ Invalid elements data:", elements);
            }
        };

        // Support both old and new event names for backward compatibility
        window.addEventListener("ai-draw-command", handleDrawCommand);
        window.addEventListener("excalidraw:draw", handleDrawCommand);

        console.log("👂 Canvas listening for draw commands");

        return () => {
            console.log("👋 Canvas stopped listening for draw commands");
            window.removeEventListener("ai-draw-command", handleDrawCommand);
            window.removeEventListener("excalidraw:draw", handleDrawCommand);
        };
    }, [excalidrawAPI]);

    // Listen for element update commands from AI chat (modifies existing elements)
    useEffect(() => {
        const handleUpdateElements = (event: any) => {
            console.log("🔄 Canvas received update elements command:", event.detail);

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            const { elements } = event.detail;
            if (!elements || !Array.isArray(elements) || elements.length === 0) {
                console.error("❌ Invalid elements data for update:", elements);
                return;
            }

            try {
                // Get current scene elements
                const currentElements = excalidrawAPI.getSceneElements();

                // Create a map of updated elements by id
                const updatesById = new Map();
                elements.forEach((el: any) => {
                    if (el.id) {
                        updatesById.set(el.id, el);
                    }
                });

                console.log(`📝 Applying updates to ${updatesById.size} elements`);

                // Update existing elements with new properties
                const updatedElements = currentElements.map((el: any) => {
                    const update = updatesById.get(el.id);
                    if (update) {
                        // Merge update into existing element (preserve id, version, etc.)
                        return {
                            ...el,
                            ...update,
                            id: el.id, // Preserve original ID
                            version: (el.version || 0) + 1, // Increment version
                            versionNonce: Date.now(),
                            updated: Date.now(),
                        };
                    }
                    return el;
                });

                // Update scene with modified elements
                excalidrawAPI.updateScene({
                    elements: updatedElements,
                });

                console.log("✅ Elements updated successfully");
            } catch (err) {
                console.error("❌ Error updating elements:", err);
            }
        };

        window.addEventListener("excalidraw:update-elements", handleUpdateElements);

        console.log("👂 Canvas listening for element update commands");

        return () => {
            console.log("👋 Canvas stopped listening for element update commands");
            window.removeEventListener("excalidraw:update-elements", handleUpdateElements);
        };
    }, [excalidrawAPI]);

    // Handle requests for canvas state
    useEffect(() => {
        const handleGetState = () => {
            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready for state request");
                return;
            }

            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();

            window.dispatchEvent(new CustomEvent("excalidraw:state-update", {
                detail: {
                    elements,
                    appState,
                },
            }));

            console.log("📤 Broadcasted canvas state");
        };

        window.addEventListener("excalidraw:get-state", handleGetState);

        return () => {
            window.removeEventListener("excalidraw:get-state", handleGetState);
        };
    }, [excalidrawAPI]);

    // Broadcast canvas state changes periodically
    useEffect(() => {
        if (!excalidrawAPI) return;

        const broadcastState = () => {
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();

            window.dispatchEvent(new CustomEvent("excalidraw:state-update", {
                detail: {
                    elements,
                    appState,
                },
            }));
        };

        // Broadcast state periodically (when canvas changes)
        const interval = setInterval(broadcastState, 1000);

        return () => clearInterval(interval);
    }, [excalidrawAPI]);

    // Handle SVG insertion from library
    useEffect(() => {
        const handleInsertSVG = async (event: any) => {
            console.log("📚 Inserting SVG from library:", event.detail);

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            const { svgPath } = event.detail;

            try {
                // Fetch the SVG content
                const response = await fetch(svgPath);
                const svgText = await response.text();

                // Get viewport center for positioning - convert to scene coordinates
                const appState = excalidrawAPI.getAppState();
                const viewportCenterX = appState.width / 2;
                const viewportCenterY = appState.height / 2;

                // Convert viewport center to scene coordinates
                const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
                const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

                // Load converter
                const { convertToExcalidrawElements: converter } = await loadExcalidraw();

                // Create Excalidraw image element
                const imageElement = converter([
                    {
                        type: "image",
                        x: sceneX - 50, // Center the 100x100 image in viewport
                        y: sceneY - 50,
                        width: 100,
                        height: 100,
                        fileId: svgPath, // Use path as unique ID
                    },
                ]);

                // Add to canvas
                const currentElements = excalidrawAPI.getSceneElements();
                const files = excalidrawAPI.getFiles();

                // Create blob URL for SVG
                const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
                const svgUrl = URL.createObjectURL(svgBlob);

                // Add the SVG as a file
                const newFiles = {
                    ...files,
                    [svgPath]: {
                        mimeType: "image/svg+xml",
                        id: svgPath,
                        dataURL: svgUrl,
                        created: Date.now(),
                    },
                };

                excalidrawAPI.updateScene({
                    elements: [...currentElements, ...imageElement],
                });

                excalidrawAPI.addFiles(Object.values(newFiles));

                console.log("✅ SVG inserted successfully");
            } catch (err) {
                console.error("❌ Error inserting SVG:", err);
            }
        };

        window.addEventListener("excalidraw:insert-svg", handleInsertSVG);

        return () => {
            window.removeEventListener("excalidraw:insert-svg", handleInsertSVG);
        };
    }, [excalidrawAPI]);

    // Handle image insertion (from AI generation or other sources)
    useEffect(() => {
        const handleInsertImage = async (event: any) => {
            console.log("🖼️ Inserting image into canvas:", event.detail);

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            const { imageData, type = "png", width, height } = event.detail;

            try {
                // Get viewport center for positioning - convert to scene coordinates
                const appState = excalidrawAPI.getAppState();
                const viewportCenterX = appState.width / 2;
                const viewportCenterY = appState.height / 2;

                // Convert viewport center to scene coordinates
                const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
                const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

                // Load converter
                const { convertToExcalidrawElements: converter } = await loadExcalidraw();

                // Create unique file ID
                const fileId = `generated-${Date.now()}`;

                // Calculate dimensions - use provided or default to natural aspect
                // Default max width of 400px, maintain aspect ratio
                const maxWidth = width || 400;
                const maxHeight = height || 400;

                // Create Excalidraw image element with proper dimensions
                const imageElement = converter([
                    {
                        type: "image",
                        x: sceneX - (maxWidth / 2), // Center the image in viewport
                        y: sceneY - (maxHeight / 2),
                        width: maxWidth,
                        height: maxHeight,
                        fileId: fileId,
                    },
                ]);

                // Add to canvas
                const currentElements = excalidrawAPI.getSceneElements();

                // Add the image as a file
                const newFile = {
                    mimeType: `image/${type}`,
                    id: fileId,
                    dataURL: imageData,
                    created: Date.now(),
                };

                excalidrawAPI.updateScene({
                    elements: [...currentElements, ...imageElement],
                });

                excalidrawAPI.addFiles([newFile]);

                console.log("✅ Image inserted successfully");
            } catch (err) {
                console.error("❌ Error inserting image:", err);
            }
        };

        window.addEventListener("excalidraw:insert-image", handleInsertImage);

        return () => {
            window.removeEventListener("excalidraw:insert-image", handleInsertImage);
        };
    }, [excalidrawAPI]);

    // Handle screenshot/capture requests for AI image generation
    useEffect(() => {
        const handleCaptureScreenshot = async (event: any) => {
            const { elementIds, quality = "high", backgroundColor, requestId } = event.detail || {};
            console.log("📸 Canvas received screenshot request:", {
                requestId,
                quality,
                elementIds: elementIds?.length || 0,
                backgroundColor
            });

            if (!excalidrawAPI) {
                console.error("⚠️ Excalidraw API not ready yet");
                window.dispatchEvent(new CustomEvent("excalidraw:screenshot-captured", {
                    detail: { error: "Canvas not ready", requestId },
                }));
                return;
            }

            try {
                // Get all elements and filter if specific IDs provided
                const allElements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();

                console.log("📊 Canvas state:", {
                    totalElements: allElements.length,
                    requestedElements: elementIds?.length || 0,
                });

                let elementsToCapture = allElements;

                // If specific element IDs provided, filter to just those
                if (elementIds && Array.isArray(elementIds) && elementIds.length > 0) {
                    elementsToCapture = allElements.filter((el: any) => elementIds.includes(el.id));
                    console.log("🎯 Filtered to", elementsToCapture.length, "elements");
                }

                if (elementsToCapture.length === 0) {
                    console.error("⚠️ No elements to capture");
                    window.dispatchEvent(new CustomEvent("excalidraw:screenshot-captured", {
                        detail: { error: "No elements to capture", requestId },
                    }));
                    return;
                }

                console.log("🔄 Starting export to canvas...");

                // Dynamically import exportToCanvas
                const { exportToCanvas } = await import("@excalidraw/excalidraw");

                // Prepare app state with custom background if provided
                const exportAppState: any = {
                    ...appState,
                    exportBackground: true,
                    exportWithDarkMode: false,
                    exportScale: quality === "high" ? 2 : 1,
                };

                // If custom background color provided, use it
                if (backgroundColor) {
                    exportAppState.viewBackgroundColor = backgroundColor;
                }

                // Export to canvas with appropriate quality
                const canvas = await exportToCanvas({
                    elements: elementsToCapture,
                    appState: exportAppState,
                    files: excalidrawAPI.getFiles(),
                });

                // Convert to base64
                const dataURL = canvas.toDataURL("image/png");

                console.log(`✅ Screenshot captured successfully:`, {
                    requestId,
                    dataLength: dataURL.length,
                    elementCount: elementsToCapture.length,
                });

                // Dispatch event with the screenshot
                window.dispatchEvent(new CustomEvent("excalidraw:screenshot-captured", {
                    detail: {
                        dataURL,
                        elementCount: elementsToCapture.length,
                        elementIds: elementsToCapture.map((el: any) => el.id),
                        requestId,
                    },
                }));
            } catch (err) {
                console.error("❌ Error capturing screenshot:", err);
                window.dispatchEvent(new CustomEvent("excalidraw:screenshot-captured", {
                    detail: {
                        error: err instanceof Error ? err.message : "Unknown error",
                        requestId,
                    },
                }));
            }
        };

        window.addEventListener("excalidraw:capture-screenshot", handleCaptureScreenshot);

        return () => {
            window.removeEventListener("excalidraw:capture-screenshot", handleCaptureScreenshot);
        };
    }, [excalidrawAPI]);

    // Handle paste events for mobile and clipboard paste
    useEffect(() => {
        const handlePaste = async (event: ClipboardEvent) => {
            // Only handle if we're on the canvas
            const target = event.target as HTMLElement;
            const isOnCanvas = target.closest('.excalidraw-wrapper') !== null;

            if (!isOnCanvas) return;

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready for paste");
                return;
            }

            const clipboardData = event.clipboardData;
            if (!clipboardData) return;

            console.log("📋 Paste event detected on canvas");

            // Try to get text/SVG data first
            const textData = clipboardData.getData('text/plain');
            const htmlData = clipboardData.getData('text/html');

            // Check if it's SVG
            if (textData && (textData.includes('<svg') || textData.includes('<?xml'))) {
                event.preventDefault();
                console.log("📋 Pasting SVG from clipboard");

                try {
                    // Create a blob from the SVG
                    const svgBlob = new Blob([textData], { type: 'image/svg+xml' });
                    const svgUrl = URL.createObjectURL(svgBlob);

                    // Generate unique ID for the SVG
                    const svgId = `pasted-svg-${Date.now()}`;

                    // Get viewport center for positioning
                    const appState = excalidrawAPI.getAppState();
                    const viewportCenterX = appState.width / 2;
                    const viewportCenterY = appState.height / 2;
                    const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
                    const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

                    // Load converter
                    const { convertToExcalidrawElements: converter } = await loadExcalidraw();

                    // Create image element
                    const imageElement = converter([
                        {
                            type: "image",
                            x: sceneX - 100,
                            y: sceneY - 100,
                            width: 200,
                            height: 200,
                            fileId: svgId,
                        },
                    ]);

                    const currentElements = excalidrawAPI.getSceneElements();
                    const files = excalidrawAPI.getFiles();

                    excalidrawAPI.updateScene({
                        elements: [...currentElements, ...imageElement],
                    });

                    excalidrawAPI.addFiles([{
                        mimeType: "image/svg+xml",
                        id: svgId,
                        dataURL: svgUrl,
                        created: Date.now(),
                    }]);

                    console.log("✅ SVG pasted successfully");
                } catch (err) {
                    console.error("❌ Error pasting SVG:", err);
                }
                return;
            }

            // Check for image data
            const items = Array.from(clipboardData.items);
            const imageItem = items.find(item => item.type.startsWith('image/'));

            if (imageItem) {
                event.preventDefault();
                console.log("📋 Pasting image from clipboard");

                try {
                    const blob = imageItem.getAsFile();
                    if (!blob) return;

                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const imageData = e.target?.result as string;
                        if (!imageData) return;

                        // Get image dimensions
                        const img = new Image();
                        img.onload = async () => {
                            const aspectRatio = img.width / img.height;
                            const maxWidth = 400;
                            const width = Math.min(img.width, maxWidth);
                            const height = width / aspectRatio;

                            // Dispatch insert image event
                            window.dispatchEvent(new CustomEvent("excalidraw:insert-image", {
                                detail: {
                                    imageData,
                                    type: blob.type.replace('image/', ''),
                                    width,
                                    height,
                                },
                            }));
                        };
                        img.src = imageData;
                    };
                    reader.readAsDataURL(blob);
                } catch (err) {
                    console.error("❌ Error pasting image:", err);
                }
            }
        };

        // Add paste listener to document (needed for mobile context menu paste)
        document.addEventListener('paste', handlePaste);

        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, [excalidrawAPI]);

    // Handle drag-and-drop for canvas state files
    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            // Check if any files are .rj files
            const hasCanvasFile = Array.from(e.dataTransfer?.items || []).some(
                item => item.kind === 'file' && item.type === 'application/json' || 
                        (item.kind === 'file' && (item.getAsFile()?.name?.endsWith('.rj')))
            );
            
            if (hasCanvasFile) {
                e.preventDefault();
                e.dataTransfer!.dropEffect = 'copy';
            }
        };

        const handleDrop = async (e: DragEvent) => {
            const files = Array.from(e.dataTransfer?.files || []);
            const canvasFile = files.find(f => f.name.endsWith('.rj'));
            
            if (canvasFile) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("📂 Canvas state file dropped:", canvasFile.name);
                
                // Import and use the state manager
                const { loadCanvasStateFromFile } = await import('../../lib/canvas-state-manager');
                const result = await loadCanvasStateFromFile(canvasFile);
                
                if (result.success && result.state) {
                    // Dispatch event to load the state
                    window.dispatchEvent(new CustomEvent('canvas:load-state', {
                        detail: { state: result.state },
                    }));
                    
                    // Also dispatch to chat components
                    window.dispatchEvent(new CustomEvent('chat:load-messages', {
                        detail: { messages: result.state.chat.messages },
                    }));
                    
                    if (result.state.chat.aiProvider) {
                        window.dispatchEvent(new CustomEvent('chat:set-provider', {
                            detail: { provider: result.state.chat.aiProvider },
                        }));
                    }
                    
                    console.log('✅ Canvas state loaded from drop');
                } else {
                    console.error('❌ Failed to load canvas state:', result.error);
                    alert(`Failed to load: ${result.error}`);
                }
            }
        };

        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('drop', handleDrop);

        return () => {
            document.removeEventListener('dragover', handleDragOver);
            document.removeEventListener('drop', handleDrop);
        };
    }, []);

    // Handle loading canvas state from file
    useEffect(() => {
        const handleLoadState = (event: CustomEvent<{ state: any }>) => {
            const { state } = event.detail;
            if (!state?.canvas || !excalidrawAPI) {
                console.warn("⚠️ Cannot load state: missing canvas data or API");
                return;
            }

            console.log("📂 ExcalidrawCanvas loading state from file...");

            try {
                // Update scene with loaded elements and app state
                const { elements, appState, files } = state.canvas;

                // Update the scene
                excalidrawAPI.updateScene({
                    elements: elements || [],
                    appState: appState || {},
                });

                // Add files if present
                if (files && Object.keys(files).length > 0) {
                    excalidrawAPI.addFiles(Object.values(files));
                }

                console.log("✅ ExcalidrawCanvas state loaded:", {
                    elements: elements?.length || 0,
                    files: Object.keys(files || {}).length,
                });
            } catch (err) {
                console.error("❌ Error loading canvas state:", err);
            }
        };

        window.addEventListener("canvas:load-state", handleLoadState as EventListener);

        return () => {
            window.removeEventListener("canvas:load-state", handleLoadState as EventListener);
        };
    }, [excalidrawAPI]);

    // Expose markdown note refs for export functionality
    useEffect(() => {
        // Store refs in window object for access by export functions
        (window as any).getMarkdownNoteRefs = () => markdownNoteRefsRef.current;
    }, []);

    // Handle creating new markdown element
    const handleCreateMarkdown = useCallback(async () => {
        if (!excalidrawAPI) return;

        const { convertToExcalidrawElements: converter } = await loadExcalidraw();

        // Get viewport center for proper positioning
        const appState = excalidrawAPI.getAppState();
        const viewportCenterX = appState.width / 2;
        const viewportCenterY = appState.height / 2;

        // Convert viewport center to scene coordinates
        const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
        const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

        const newElement = {
            type: "rectangle",
            x: sceneX - 250,
            y: sceneY - 175,
            width: 500,
            height: 350,
            backgroundColor: "#ffffff", // White background (will be covered by overlay)
            strokeColor: "transparent", // Transparent stroke
            strokeWidth: 0,
            roughness: 0,
            opacity: 100, // Normal opacity
            fillStyle: "solid",
            id: nanoid(),
            locked: false, // Allow arrow binding - selection is handled by our custom overlay
            customData: {
                type: "markdown",
                content: "# 📝 New Note\n\nDouble-click to edit this note.\n\n## Markdown Supported\n- **Bold** and *italic* text\n- Lists and checkboxes\n- Code blocks with syntax highlighting\n- Tables, links, and more!\n\n```javascript\nconst example = \"Hello World\";\n```",
            },
        };

        const converted = converter([newElement]);
        const currentElements = excalidrawAPI.getSceneElements();

        excalidrawAPI.updateScene({
            elements: [...currentElements, ...converted],
        });

        console.log("✅ Created new markdown note at viewport center");
    }, [excalidrawAPI]);

    // Handle markdown content update - signature matches MarkdownNote's onChange prop
    const handleMarkdownUpdate = useCallback((elementId: string, newContent: string) => {
        if (!excalidrawAPI) return;

        const elements = excalidrawAPI.getSceneElements();
        const updatedElements = elements.map((el: any) => {
            if (el.id === elementId) {
                return {
                    ...el,
                    customData: {
                        ...el.customData,
                        content: newContent,
                    },
                };
            }
            return el;
        });

        excalidrawAPI.updateScene({ elements: updatedElements });
    }, [excalidrawAPI]);

    // Register markdown note ref
    const registerMarkdownNoteRef = useCallback((id: string, ref: any) => {
        if (ref) {
            markdownNoteRefsRef.current.set(id, ref);
        } else {
            markdownNoteRefsRef.current.delete(id);
        }
    }, []);

    // Long press handler for mobile context menu - MUST be called before any early returns
    const longPressHandlers = useLongPress({
        onContextMenu: (event) => {
            // On mobile, trigger the native context menu
            if (isMobile && event.target instanceof HTMLElement) {
                // Focus the canvas first to ensure paste works
                const canvas = document.querySelector('.excalidraw-wrapper canvas') as HTMLCanvasElement;
                if (canvas) {
                    canvas.focus();
                }
            }
        },
        delay: 600, // Slightly faster than default for better UX
        disabled: !isMobile, // Only enable on mobile
    });

    if (isLoading || !ExcalidrawComponent) {
        return (
            <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--color-bg)"
            }}>
                <div style={{ textAlign: "center" }}>
                    <div className="loading-spinner" style={{
                        width: "40px",
                        height: "40px",
                        border: "3px solid var(--color-stroke-muted)",
                        borderTopColor: "var(--color-accent)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 1rem"
                    }} />
                    <p style={{ color: "var(--color-text-muted)" }}>Loading canvas...</p>
                </div>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
            }}
            // Add long-press support for mobile context menu
            {...(isMobile ? longPressHandlers.handlers : {})}
        >
            <style>{`
                /* Hide Excalidraw's native selection UI for markdown notes */
                .excalidraw-container .excalidraw__canvas {
                    /* Ensure canvas doesn't show selection borders for locked elements */
                }
                
                /* Hide selection border and handles */
                .excalidraw-container .selection-border,
                .excalidraw-container .selection-dots,
                .excalidraw-container [data-testid="selection-border"],
                .excalidraw-container [data-testid="selection-dots"] {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                }

                /* Markdown note overlay styles */
                .markdown-note-container {
                    /* Ensure notes are above canvas but don't interfere with drag */
                    /* pointerEvents is controlled via JS - 'none' when not editing */
                }

                .markdown-note-container [data-note-id] {
                    /* Smooth scrolling for content */
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                }

                /* Hide scrollbar for cleaner look but allow scrolling */
                .markdown-note-container [data-note-id]::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                .markdown-note-container [data-note-id]::-webkit-scrollbar-track {
                    background: transparent;
                }

                .markdown-note-container [data-note-id]::-webkit-scrollbar-thumb {
                    background: rgba(129, 140, 248, 0.3);
                    border-radius: 3px;
                }

                .markdown-note-container [data-note-id]::-webkit-scrollbar-thumb:hover {
                    background: rgba(129, 140, 248, 0.5);
                }

                /* Prevent browser zoom on markdown notes - let Excalidraw handle it */
                .markdown-note-container {
                    touch-action: none;
                }

                /* Excalidraw UI layer boost - ensure internal palettes stay above custom MD notes */
                .excalidraw .layer-ui__wrapper,
                .excalidraw .excalidraw-context-menu {
                    z-index: 10 !important;
                }

                /* Mobile: Ensure context menu works and prevent browser zoom */
                @media (hover: none) and (pointer: coarse) {
                    .excalidraw-wrapper {
                        touch-action: manipulation;
                        -webkit-touch-callout: default;
                        -webkit-user-select: auto;
                        user-select: auto;
                    }
                    
                    .excalidraw-wrapper canvas {
                        touch-action: manipulation;
                        -webkit-touch-callout: default;
                    }
                }
            `}</style>
            <ExcalidrawComponent
                theme={theme}
                excalidrawAPI={(api: any) => {
                    setExcalidrawAPI(api);
                    // Make API globally available for debugging and other components
                    if (typeof window !== "undefined") {
                        (window as any).excalidrawAPI = api;
                    }
                }}
                initialData={initialCanvasData || {
                    appState: {
                        viewBackgroundColor: "transparent",
                        gridSize: 0, // Remove grid dots (0 = no grid)
                    },
                }}
                UIOptions={{
                    canvasActions: {
                        changeViewBackgroundColor: !isMobile, // Disable on mobile
                        clearCanvas: true,
                        loadScene: !isMobile, // Disable on mobile
                        saveToActiveFile: !isMobile, // Disable on mobile
                        toggleTheme: false,
                        saveAsImage: true,
                    },
                }}
                onPointerDown={(event: any, pointerState: any) => {
                    // Check if clicking on a markdown element
                    // If so, we want to prevent Excalidraw from entering text editing mode
                    const elements = excalidrawAPI?.getSceneElements?.() || [];
                    const appState = excalidrawAPI?.getAppState?.();

                    if (!appState) return;

                    // Convert pointer to scene coordinates
                    const sceneX = (event.clientX / appState.zoom.value) - appState.scrollX;
                    const sceneY = (event.clientY / appState.zoom.value) - appState.scrollY;

                    // Check if pointer is over any markdown element
                    const markdownElement = elements.find((el: any) => {
                        if (el.customData?.type !== 'markdown' || el.isDeleted) return false;

                        // Simple hit test (assuming no rotation for simplicity)
                        return sceneX >= el.x &&
                            sceneX <= el.x + el.width &&
                            sceneY >= el.y &&
                            sceneY <= el.y + el.height;
                    });

                    if (markdownElement) {
                        // Select the markdown element instead of entering text mode
                        excalidrawAPI.selectShape({
                            id: markdownElement.id,
                        });
                    }
                }}
                onDoubleClick={(event: any, pointerState: any) => {
                    // Prevent Excalidraw's native text editing when double-clicking on markdown
                    const elements = excalidrawAPI?.getSceneElements?.() || [];
                    const appState = excalidrawAPI?.getAppState?.();

                    if (!appState) return false;

                    // Convert pointer to scene coordinates
                    const sceneX = (event.clientX / appState.zoom.value) - appState.scrollX;
                    const sceneY = (event.clientY / appState.zoom.value) - appState.scrollY;

                    // Check if double-click is on a markdown element
                    const markdownElement = elements.find((el: any) => {
                        if (el.customData?.type !== 'markdown' || el.isDeleted) return false;

                        return sceneX >= el.x &&
                            sceneX <= el.x + el.width &&
                            sceneY >= el.y &&
                            sceneY <= el.y + el.height;
                    });

                    if (markdownElement) {
                        // Dispatch event to trigger markdown edit mode
                        window.dispatchEvent(new CustomEvent('markdown:edit', {
                            detail: { elementId: markdownElement.id }
                        }));
                        // Return false to prevent Excalidraw's default text editing
                        return false;
                    }

                    // Allow default behavior for non-markdown elements
                    return true;
                }}
                onChange={(elements: any[], appState: any) => {
                    // Update view state ref without triggering React renders
                    viewStateRef.current = {
                        scrollX: appState.scrollX,
                        scrollY: appState.scrollY,
                        zoom: appState.zoom,
                    };

                    // Auto-save to localStorage
                    if (excalidrawAPI) {
                        const files = excalidrawAPI.getFiles();

                        // If canvas is empty, clear localStorage
                        if (elements.length === 0) {
                            localStorage.removeItem(STORAGE_KEY);
                            console.log("🗑️ Canvas cleared - localStorage removed");
                        } else {
                            saveToLocalStorage(elements, appState, files);
                        }
                    }
                }}
                renderTopRightUI={() => (
                    // Only show "+ Add Note" on desktop - it's resource intensive
                    !isMobile ? (
                        <button
                            style={{
                                background: "var(--color-primary, #6366f1)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                padding: "6px 12px",
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                fontWeight: 600,
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                            }}
                            onClick={handleCreateMarkdown}
                        >
                            + Add Note
                        </button>
                    ) : null
                )}
            />

            {/* Render MarkdownNote overlays for each markdown element */}
            {MarkdownNoteComponent && markdownElements.map((element) => (
                <MarkdownNoteComponent
                    key={element.id}
                    element={element}
                    appState={viewStateRef.current}
                    onChange={handleMarkdownUpdate}
                    ref={(ref: any) => registerMarkdownNoteRef(element.id, ref)}
                />
            ))}
        </div>
    );
}
