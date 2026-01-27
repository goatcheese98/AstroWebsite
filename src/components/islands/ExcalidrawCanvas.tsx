import "@excalidraw/excalidraw/index.css";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { useEffect, useState } from "react";

export default function ExcalidrawCanvas() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

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

    // Listen for drawing commands from the AI chat
    useEffect(() => {
        const handleDrawCommand = (event: any) => {
            console.log("🖼️ Canvas received draw command:", event.detail);

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            const { elements } = event.detail;
            if (elements && Array.isArray(elements)) {
                console.log(`📝 Converting ${elements.length} skeleton elements`);

                try {
                    // Convert skeleton elements to full Excalidraw elements
                    const fullElements = convertToExcalidrawElements(elements);
                    console.log("✨ Converted elements:", fullElements);

                    // Get current elements and add new ones
                    const currentElements = excalidrawAPI.getSceneElements();
                    console.log(`📋 Current canvas has ${currentElements.length} elements`);

                    excalidrawAPI.updateScene({
                        elements: [...currentElements, ...fullElements],
                    });

                    // Scroll to fit all content
                    excalidrawAPI.scrollToContent([...currentElements, ...fullElements], {
                        fitToContent: true,
                    });

                    console.log("✅ Canvas updated successfully");
                } catch (err) {
                    console.error("❌ Error converting/adding elements:", err);
                }
            } else {
                console.error("❌ Invalid elements data:", elements);
            }
        };

        // Handle requests for canvas state
        const handleGetState = () => {
            if (excalidrawAPI) {
                const elements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();

                window.dispatchEvent(new CustomEvent("excalidraw:state-update", {
                    detail: {
                        elements,
                        appState,
                    },
                }));
            }
        };

        // Handle SVG insertion from library
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

                // Create an image element from the SVG
                const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
                const svgUrl = URL.createObjectURL(svgBlob);

                // Load image to get dimensions
                const img = new Image();
                img.onload = () => {
                    // Create Excalidraw image element
                    const imageElement = convertToExcalidrawElements([
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
                };
                img.src = svgUrl;
            } catch (err) {
                console.error("❌ Error inserting SVG:", err);
            }
        };

        // Handle image insertion (from Nano Banana or other sources)
        const handleInsertImage = async (event: any) => {
            console.log("🖼️ Inserting image into canvas:", event.detail);

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            const { imageData, type } = event.detail;

            try {
                // Get viewport center for positioning
                const appState = excalidrawAPI.getAppState();
                const centerX = appState.scrollX + appState.width / 2;
                const centerY = appState.scrollY + appState.height / 2;

                // Create unique file ID
                const fileId = `generated-${Date.now()}`;

                // Create Excalidraw image element
                const imageElement = convertToExcalidrawElements([
                    {
                        type: "image",
                        x: centerX - 100, // Center the 200x200 image
                        y: centerY - 100,
                        width: 200,
                        height: 200,
                        fileId: fileId,
                    },
                ]);

                // Add to canvas
                const currentElements = excalidrawAPI.getSceneElements();

                // Add the image as a file
                const newFile = {
                    mimeType: "image/png",
                    id: fileId,
                    dataURL: imageData, // Should be base64 or blob URL
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

        console.log("👂 Canvas listening for draw commands");
        window.addEventListener("excalidraw:draw", handleDrawCommand);
        window.addEventListener("excalidraw:get-state", handleGetState);
        window.addEventListener("excalidraw:insert-svg", handleInsertSVG);
        window.addEventListener("excalidraw:insert-image", handleInsertImage);

        return () => {
            console.log("👋 Canvas stopped listening for draw commands");
            window.removeEventListener("excalidraw:draw", handleDrawCommand);
            window.removeEventListener("excalidraw:get-state", handleGetState);
            window.removeEventListener("excalidraw:insert-svg", handleInsertSVG);
            window.removeEventListener("excalidraw:insert-image", handleInsertImage);
        };
    }, [excalidrawAPI]);

    // Broadcast canvas state changes
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

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
            }}
        >
            <Excalidraw
                excalidrawAPI={(api) => {
                    setExcalidrawAPI(api);
                    // Make API globally available for debugging
                    if (typeof window !== "undefined") {
                        (window as any).excalidrawAPI = api;
                    }
                }}
                theme={theme}
                initialData={{
                    appState: {
                        viewBackgroundColor: "transparent",
                        gridSize: 0, // Remove grid dots (0 = no grid)
                    },
                }}
            />
        </div>
    );
}
