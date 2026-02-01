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
let MarkdownNoteRef: any = null;

const loadMarkdownNote = async () => {
  if (!MarkdownNote) {
    const mod = await import("./MarkdownNote");
    MarkdownNote = mod.MarkdownNote;
    MarkdownNoteRef = mod.MarkdownNoteRef;
  }
  return { MarkdownNote, MarkdownNoteRef };
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

    // Listen for drawing commands from the AI chat
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

                    console.log("🎨 Scene updated with new elements");
                } catch (err) {
                    console.error("❌ Error converting elements:", err);
                }
            }
        };

        window.addEventListener("ai-draw-command", handleDrawCommand);
        return () => window.removeEventListener("ai-draw-command", handleDrawCommand);
    }, [excalidrawAPI]);

    // Handle creating new markdown element
    const handleCreateMarkdown = useCallback(async () => {
        if (!excalidrawAPI) return;

        const { convertToExcalidrawElements: converter } = await loadExcalidraw();
        
        const newElement = {
            type: "rectangle",
            x: 100 - viewStateRef.current.scrollX,
            y: 100 - viewStateRef.current.scrollY,
            width: 300,
            height: 200,
            backgroundColor: "#fef3c7",
            strokeColor: "#1f2937",
            strokeWidth: 2,
            roughness: 1,
            opacity: 100,
            id: nanoid(),
            customData: {
                type: "markdown",
                content: "# New Note\n\nDouble-click to edit",
            },
        };

        const converted = converter([newElement]);
        const currentElements = excalidrawAPI.getSceneElements();
        
        excalidrawAPI.updateScene({
            elements: [...currentElements, ...converted],
        });
    }, [excalidrawAPI]);

    // Handle markdown content update
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
        markdownNoteRefsRef.current.set(id, ref);
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
        <>
            <ExcalidrawComponent
                theme={theme}
                excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
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
            />
            
            {/* Render MarkdownNote overlays for each markdown element */}
            {MarkdownNoteComponent && markdownElements.map((element) => (
                <MarkdownNoteComponent
                    key={element.id}
                    element={element}
                    viewState={viewStateRef.current}
                    onUpdate={(content: string) => handleMarkdownUpdate(element.id, content)}
                    registerRef={(ref: any) => registerMarkdownNoteRef(element.id, ref)}
                />
            ))}
        </>
    );
}
