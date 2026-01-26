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

        console.log("👂 Canvas listening for draw commands");
        window.addEventListener("excalidraw:draw", handleDrawCommand);

        return () => {
            console.log("👋 Canvas stopped listening for draw commands");
            window.removeEventListener("excalidraw:draw", handleDrawCommand);
        };
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
                    },
                }}
            />
        </div>
    );
}
