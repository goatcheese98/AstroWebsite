import { useEffect, useState, useRef, useCallback } from "react";
import { nanoid } from "nanoid";

// Dynamically import Excalidraw to avoid SSR issues
let ExcalidrawModule: any = null;
let convertToExcalidrawElements: any = null;

const loadExcalidraw = async () => {
  if (!ExcalidrawModule) {
    const mod = await import("@excalidraw/excalidraw");
    ExcalidrawModule = mod.Excalidraw;
    convertToExcalidrawElements = mod.convertToExcalidrawElements;
    // Import CSS
    await import("@excalidraw/excalidraw/index.css");
  }
  return { Excalidraw: ExcalidrawModule, convertToExcalidrawElements };
};

// Lazy-loaded MarkdownNote
let MarkdownNote: any = null;

const loadMarkdownNote = async () => {
  if (!MarkdownNote) {
    const mod = await import("./MarkdownNote");
    MarkdownNote = mod.MarkdownNote;
  }
  return { MarkdownNote };
};

export default function ExcalidrawCanvas() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [ExcalidrawComponent, setExcalidrawComponent] = useState<any>(null);
    const [MarkdownNoteComponent, setMarkdownNoteComponent] = useState<any>(null);

    // Use refs to avoid triggering re-renders from RAF loop
    const viewStateRef = useRef({ scrollX: 0, scrollY: 0, zoom: { value: 1 } });
    const markdownElementsRef = useRef<any[]>([]);
    const markdownNoteRefsRef = useRef<Map<string, any>>(new Map());

    // State for triggering React re-renders (updated at controlled intervals)
    const [, forceUpdate] = useState({});
    const [markdownElements, setMarkdownElements] = useState<any[]>([]);

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
        
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        // Get initial theme from document
        const currentTheme = document.documentElement.getAttribute("data-theme");
        setTheme(currentTheme === "dark" ? "dark" : "light");

        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "data-theme") {
                    const newTheme = document.documentElement.getAttribute("data-theme");
                    setTheme(newTheme === "dark" ? "dark" : "light");
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    // RAF polling loop - no setState, just ref updates
    useEffect(() => {
        if (!excalidrawAPI) return;

        let rafId: number;
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 8; // Update React state at ~120fps for ultra-smooth overlay sync

        const pollExcalidrawState = (timestamp: number) => {
            try {
                const elements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();

                // Always update refs (no re-render)
                viewStateRef.current = {
                    scrollX: appState.scrollX,
                    scrollY: appState.scrollY,
                    zoom: appState.zoom,
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

    // Listen for drawing commands from the AI chat (supports both old and new event names)
    useEffect(() => {
        const handleDrawCommand = async (event: any) => {
            console.log("🖼️ Canvas received draw command:", event.detail);

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            const { elements } = event.detail;
            if (elements && Array.isArray(elements)) {
                console.log(`📝 Converting ${elements.length} skeleton elements`);

                try {
                    // Ensure convertToExcalidrawElements is loaded
                    const { convertToExcalidrawElements: converter } = await loadExcalidraw();
                    
                    // Convert skeleton elements to full Excalidraw elements
                    const excalidrawElements = converter(elements);
                    console.log("✅ Converted elements:", excalidrawElements);

                    // Get current scene elements
                    const currentElements = excalidrawAPI.getSceneElements();

                    // Add new elements to scene
                    excalidrawAPI.updateScene({
                        elements: [...currentElements, ...excalidrawElements],
                    });

                    // Scroll to fit all content
                    excalidrawAPI.scrollToContent([...currentElements, ...excalidrawElements], {
                        fitToContent: true,
                    });

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

                // Get viewport center for positioning
                const appState = excalidrawAPI.getAppState();
                const centerX = appState.scrollX + appState.width / 2;
                const centerY = appState.scrollY + appState.height / 2;

                // Load converter
                const { convertToExcalidrawElements: converter } = await loadExcalidraw();

                // Create Excalidraw image element
                const imageElement = converter([
                    {
                        type: "image",
                        x: centerX - 50, // Center the 100x100 image
                        y: centerY - 50,
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
                // Get viewport center for positioning
                const appState = excalidrawAPI.getAppState();
                const centerX = appState.scrollX + appState.width / 2;
                const centerY = appState.scrollY + appState.height / 2;

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
                        x: centerX - (maxWidth / 2), // Center the image
                        y: centerY - (maxHeight / 2),
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
            console.log("📸 Capturing screenshot for image generation...");

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                window.dispatchEvent(new CustomEvent("excalidraw:screenshot-captured", {
                    detail: { error: "Canvas not ready" },
                }));
                return;
            }

            try {
                const { elementIds, quality = "high" } = event.detail || {};
                
                // Get all elements and filter if specific IDs provided
                const allElements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();
                
                let elementsToCapture = allElements;
                
                // If specific element IDs provided, filter to just those
                if (elementIds && Array.isArray(elementIds) && elementIds.length > 0) {
                    elementsToCapture = allElements.filter((el: any) => elementIds.includes(el.id));
                }
                
                if (elementsToCapture.length === 0) {
                    console.warn("⚠️ No elements to capture");
                    window.dispatchEvent(new CustomEvent("excalidraw:screenshot-captured", {
                        detail: { error: "No elements to capture" },
                    }));
                    return;
                }

                // Dynamically import exportToCanvas
                const { exportToCanvas } = await import("@excalidraw/excalidraw");
                
                // Export to canvas with appropriate quality
                const canvas = await exportToCanvas({
                    elements: elementsToCapture,
                    appState: {
                        ...appState,
                        exportBackground: true,
                        exportWithDarkMode: false,
                        exportScale: quality === "high" ? 2 : 1,
                    },
                    files: excalidrawAPI.getFiles(),
                });

                // Convert to base64
                const dataURL = canvas.toDataURL("image/png");
                
                console.log(`✅ Screenshot captured: ${dataURL.length} chars`);
                
                // Dispatch event with the screenshot
                window.dispatchEvent(new CustomEvent("excalidraw:screenshot-captured", {
                    detail: { 
                        dataURL, 
                        elementCount: elementsToCapture.length,
                        elementIds: elementsToCapture.map((el: any) => el.id),
                    },
                }));
            } catch (err) {
                console.error("❌ Error capturing screenshot:", err);
                window.dispatchEvent(new CustomEvent("excalidraw:screenshot-captured", {
                    detail: { error: err instanceof Error ? err.message : "Unknown error" },
                }));
            }
        };

        window.addEventListener("excalidraw:capture-screenshot", handleCaptureScreenshot);
        
        return () => {
            window.removeEventListener("excalidraw:capture-screenshot", handleCaptureScreenshot);
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
            backgroundColor: "transparent",
            strokeColor: "transparent",
            strokeWidth: 0,
            roughness: 0,
            opacity: 100,
            fillStyle: "solid",
            id: nanoid(),
            locked: true, // Prevent Excalidraw selection handles
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
        >
            <ExcalidrawComponent
                theme={theme}
                excalidrawAPI={(api: any) => {
                    setExcalidrawAPI(api);
                    // Make API globally available for debugging and other components
                    if (typeof window !== "undefined") {
                        (window as any).excalidrawAPI = api;
                    }
                }}
                initialData={{
                    appState: {
                        viewBackgroundColor: "transparent",
                        gridSize: 0, // Remove grid dots (0 = no grid)
                    },
                }}
                UIOptions={{
                    canvasActions: {
                        changeViewBackgroundColor: true,
                        clearCanvas: true,
                        loadScene: true,
                        saveToActiveFile: true,
                        toggleTheme: false,
                        saveAsImage: true,
                    },
                }}
                onChange={(elements: any[], appState: any) => {
                    // Update view state ref without triggering React renders
                    viewStateRef.current = {
                        scrollX: appState.scrollX,
                        scrollY: appState.scrollY,
                        zoom: appState.zoom,
                    };
                }}
                renderTopRightUI={() => (
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
