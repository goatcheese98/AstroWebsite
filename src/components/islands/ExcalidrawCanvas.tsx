import { useEffect, useState, useRef, useCallback } from "react";
import { nanoid } from "nanoid";
import { encode, decode } from "@msgpack/msgpack";
import { useMobileDetection } from "../ai-chat/hooks/useMobileDetection";
import { useLongPress } from "../../hooks/useLongPress";
import { useSmoothCollaboration } from "./useSmoothCollaboration";
import { useCursorTracking } from "./useCursorTracking";
import { useCanvasSession } from "../../hooks/useCanvasSession";
import CanvasAvatar from "./CanvasAvatar";
import CollaboratorCursor from "./CollaboratorCursor";
import SelectionLockOverlay from "./SelectionLockOverlay";
import ToastNotification, { type Toast } from "./ToastNotification";
import { useSelectionLocking } from "./useSelectionLocking";
import "@excalidraw/excalidraw/index.css";

// Helper to merge remote elements into local state
const reconcileElements = (local: any[], remote: any[]) => {
    // Map existing elements for fast lookup
    const elementMap = new Map();
    local.forEach(el => elementMap.set(el.id, el));

    // Process remote elements
    remote.forEach(remoteEl => {
        const localEl = elementMap.get(remoteEl.id);

        // Update if:
        // 1. New element (not in local) OR
        // 2. Remote version is newer OR
        // 3. Same version but remote nonce is higher (prevent flicker)
        if (!localEl ||
            (remoteEl.version > (localEl.version || 0)) ||
            (remoteEl.version === localEl.version && remoteEl.versionNonce > (localEl.versionNonce || 0))) {
            elementMap.set(remoteEl.id, remoteEl);
        }
    });

    return Array.from(elementMap.values());
};

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

// Lazy-loaded WebEmbed
let WebEmbed: any = null;

const loadWebEmbed = async () => {
    if (!WebEmbed) {
        const mod = await import("./web-embed");
        WebEmbed = mod.WebEmbed;
    }
    return { WebEmbed };
};

// Lazy-loaded LexicalNote
let LexicalNote: any = null;

const loadLexicalNote = async () => {
    if (!LexicalNote) {
        const mod = await import("./rich-text");
        LexicalNote = mod.LexicalNote;
    }
    return { LexicalNote };
};

const STORAGE_KEY = "excalidraw-canvas-data";
const STORAGE_VERSION = 2; // Bumped to invalidate old cache

interface ExcalidrawCanvasProps {
    isSharedMode?: boolean;
    shareRoomId?: string;
    partyKitHost?: string;
    onMarkdownNotesChange?: (notes: any[]) => void;
    onImageHistoryChange?: (images: any[]) => void;
}

export default function ExcalidrawCanvas({
    isSharedMode = false,
    shareRoomId,
    partyKitHost = import.meta.env.PUBLIC_PARTYKIT_HOST || "astroweb-excalidraw.rohanjasani.partykit.dev",
    onMarkdownNotesChange,
    onImageHistoryChange
}: ExcalidrawCanvasProps = {}) {
    const { isMobile, isPhone } = useMobileDetection();
    const session = useCanvasSession();
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [ExcalidrawComponent, setExcalidrawComponent] = useState<any>(null);
    const [MarkdownNoteComponent, setMarkdownNoteComponent] = useState<any>(null);
    const [WebEmbedComponent, setWebEmbedComponent] = useState<any>(null);
    const [LexicalNoteComponent, setLexicalNoteComponent] = useState<any>(null);
    const [initialCanvasData, setInitialCanvasData] = useState<any>(null);

    // Use refs to avoid triggering re-renders from RAF loop
    const viewStateRef = useRef({ scrollX: 0, scrollY: 0, zoom: { value: 1 }, selectedElementIds: {} });
    const markdownElementsRef = useRef<any[]>([]);
    const markdownNoteRefsRef = useRef<Map<string, any>>(new Map());
    const webEmbedElementsRef = useRef<any[]>([]);
    const webEmbedRefsRef = useRef<Map<string, any>>(new Map());
    const lexicalElementsRef = useRef<any[]>([]);
    const lexicalNoteRefsRef = useRef<Map<string, any>>(new Map());
    const saveTimeoutRef = useRef<number | null>(null);
    const pendingSaveDataRef = useRef<{ elements: any[]; appState: any; files: any } | null>(null);

    // State for triggering React re-renders (updated at controlled intervals)
    const [, forceUpdate] = useState({});
    const [markdownElements, setMarkdownElements] = useState<any[]>([]);
    const [webEmbedElements, setWebEmbedElements] = useState<any[]>([]);
    const [lexicalElements, setLexicalElements] = useState<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Collaboration state
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [activeUsers, setActiveUsers] = useState(1);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const lastSyncTimeRef = useRef<number>(0);
    const lastRemoteUpdateTimeRef = useRef<number>(0); // Timestamp of last remote update
    const mySequenceRef = useRef<number>(0); // Sequence number for echo suppression
    const syncedVersionsRef = useRef<Map<string, number>>(new Map()); // Track synced versions to prevent loops
    const lastReceivedSeqsRef = useRef<Map<string, number>>(new Map()); // Track last received sequence per user
    const lastSyncedAppStateRef = useRef<string>(""); // Track last synced app state

    const SYNC_THROTTLE_MS = 100; // Throttle updates to 10 per second
    const REMOTE_UPDATE_WINDOW_MS = 20; // Minimal suppression, relying on Delta Sync to prevent loops

    // Load saved canvas data from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                console.log("📂 Loaded from localStorage:", {
                    version: data.version,
                    expectedVersion: STORAGE_VERSION,
                    savedAt: data.savedAt ? new Date(data.savedAt).toISOString() : "unknown",
                    elements: data.canvasData?.elements?.length || 0,
                    files: Object.keys(data.canvasData?.files || {}).length,
                });

                if (data.version === STORAGE_VERSION) {
                    setInitialCanvasData(data.canvasData);
                    console.log("✅ Restored canvas from localStorage");
                } else {
                    console.warn(`⚠️ Canvas data version mismatch (got ${data.version}, expected ${STORAGE_VERSION}), clearing old data`);
                    localStorage.removeItem(STORAGE_KEY);
                }
            } else {
                console.log("📂 No saved data in localStorage");
            }
        } catch (err) {
            console.error("❌ Failed to load canvas data:", err);
            // Clear corrupted data
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    // Connect to PartyKit room when in shared mode
    useEffect(() => {
        if (!isSharedMode || !shareRoomId || !excalidrawAPI) return;

        console.log(`🌐 Connecting to shared room: ${shareRoomId}`);
        const wsUrl = `wss://${partyKitHost}/parties/main/${shareRoomId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("✅ Connected to shared room:", shareRoomId);
            setIsConnected(true);
        };

        ws.onmessage = async (event) => {
            try {
                // Decode MessagePack binary
                const arrayBuffer = event.data instanceof ArrayBuffer
                    ? event.data
                    : await event.data.arrayBuffer();
                const data = decode(new Uint8Array(arrayBuffer)) as any;
                console.log("📥 Received message:", data.type);

                if (data.type === "init") {
                    // Initial state when joining room
                    setActiveUsers(data.activeUsers);

                    // Set user ID for cursor tracking
                    if (data.userId) {
                        setCurrentUserId(data.userId);
                        console.log("👤 User ID assigned:", data.userId);
                    }

                    if (data.state) {
                        console.log("📂 Loading initial shared state");
                        if (data.state.elements) {
                            // Mark timestamp to suppress onChange during update
                            lastRemoteUpdateTimeRef.current = Date.now();

                            excalidrawAPI.updateScene({
                                elements: data.state.elements,
                                appState: data.state.appState,
                            });
                            if (data.state.files) {
                                excalidrawAPI.addFiles(Object.values(data.state.files));
                            }
                        }
                        if (data.state.markdownNotes) {
                            // Markdown notes are part of elements, so they're already loaded
                            console.log("✓ Markdown notes loaded:", data.state.markdownNotes.length);
                        }
                        if (data.state.imageHistory) {
                            // Dispatch event to load image history
                            window.dispatchEvent(new CustomEvent("imagegen:load-history", {
                                detail: { images: data.state.imageHistory }
                            }));
                        }
                        // Load initial cursors
                        if (data.state.cursors) {
                            Object.values(data.state.cursors).forEach((cursor: any) => {
                                if (cursor.userId !== data.userId) {
                                    handleCursorUpdate(cursor);
                                }
                            });
                            console.log("👆 Loaded initial cursors:", Object.keys(data.state.cursors).length);
                        }
                    }
                } else if (data.type === "cursor-update") {
                    // Another user moved their cursor
                    handleCursorUpdate(data);
                } else if (data.type === "canvas-update") {
                    // Another user updated canvas - FULL STATE SYNC

                    // ROBUST ECHO SUPPRESSION: Check if this is our own update
                    if (data.userId === currentUserIdRef.current && currentUserIdRef.current) {
                        return;
                    }
                    // RE MOVED: sentSequencesRef - it causes collisions if multiple users have same seq number!

                    // Track sequence per user to detect duplicates
                    if (data.userId && data.seq !== undefined) {
                        const lastSeq = lastReceivedSeqsRef.current.get(data.userId) || -1;
                        if (data.seq <= lastSeq) {
                            console.log("⏭️ Skipping duplicate update from", data.userId, "(seq:", data.seq, ")");
                            return;
                        }
                        lastReceivedSeqsRef.current.set(data.userId, data.seq);
                    } else if (data.seq !== undefined) {
                        // Fallback for legacy messages without userId (though we should avoid this)
                        console.warn("⚠️ Received update without userId, skipping strict seq check");
                    }

                    console.log("🔄 Applying merged state from collaborator (seq:", data.seq, ")");

                    // Update synced versions for incoming elements so we don't echo them
                    if (data.elements) {
                        data.elements.forEach((el: any) => {
                            syncedVersionsRef.current.set(el.id, el.version);
                        });
                    }

                    // Update last synced app state if provided
                    if (data.appState) {
                        lastSyncedAppStateRef.current = JSON.stringify(data.appState);
                    }

                    // Mark timestamp to suppress onChange during this update
                    lastRemoteUpdateTimeRef.current = Date.now();

                    // MERGE local and remote elements to avoid overwriting newer local changes
                    const currentElements = excalidrawAPI.getSceneElements();
                    const mergedElements = reconcileElements(currentElements, data.elements || []);

                    excalidrawAPI.updateScene({
                        elements: mergedElements,
                        appState: {
                            viewBackgroundColor: data.appState?.viewBackgroundColor,
                            // Only update visual properties, keep view state (scroll/zoom) local
                        },
                    });

                    if (data.files) {
                        excalidrawAPI.addFiles(Object.values(data.files));
                    }
                } else if (data.type === "markdown-update") {
                    // Another user updated markdown notes
                    console.log("📝 Applying markdown update from collaborator");
                    // Markdown notes are stored as elements with customData.type === "markdown"
                    // They're already part of the canvas update
                } else if (data.type === "image-update") {
                    // Another user generated an image
                    console.log("🖼️ Applying image history update from collaborator");
                    window.dispatchEvent(new CustomEvent("imagegen:load-history", {
                        detail: { images: data.imageHistory }
                    }));
                } else if (data.type === "selection-update") {
                    handleSelectionUpdate(data);
                } else if (data.type === "user-joined") {
                    console.log("👋 User joined:", data.userId);
                    setActiveUsers(data.activeUsers);
                } else if (data.type === "user-left") {
                    console.log("👋 User left:", data.userId);
                    setActiveUsers(data.activeUsers);
                    removeCursor(data.userId);
                    removeUserSelection(data.userId);
                } else if (data.type === "room-expired") {
                    console.log("⏰ Room expired:", data.message);
                    // Show notification to user
                    alert(`⏰ ${data.message}\n\nThis room was inactive for ${data.inactiveDays} days and has been cleared. You can start fresh!`);
                }
            } catch (err) {
                console.error("❌ Error processing message:", err);
            }
        };

        ws.onerror = (error) => {
            console.error("❌ WebSocket error:", error);
            setIsConnected(false);
        };

        ws.onclose = () => {
            console.log("🔌 Disconnected from shared room");
            setIsConnected(false);
        };

        setSocket(ws);
        socketRef.current = ws;

        return () => {
            console.log("🔌 Closing WebSocket connection");
            ws.close();
            socketRef.current = null;
        };
    }, [isSharedMode, shareRoomId, excalidrawAPI, partyKitHost]);

    // Load components on mount
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const [{ Excalidraw }, { MarkdownNote }, { WebEmbed }, { LexicalNote }] = await Promise.all([
                    loadExcalidraw(),
                    loadMarkdownNote(),
                    loadWebEmbed(),
                    loadLexicalNote()
                ]);

                if (mounted) {
                    setExcalidrawComponent(() => Excalidraw);
                    setMarkdownNoteComponent(() => MarkdownNote);
                    setWebEmbedComponent(() => WebEmbed);
                    setLexicalNoteComponent(() => LexicalNote);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Failed to load Excalidraw:", err);
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, []);

    // Actually perform the save to localStorage
    const performSave = useCallback((elements: any[], appState: any, files: any) => {
        try {
            const dataToSave = {
                version: STORAGE_VERSION,
                savedAt: Date.now(), // Add timestamp for staleness detection
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
            console.log("💾 Canvas auto-saved:", {
                version: STORAGE_VERSION,
                elements: elements.length,
                files: Object.keys(files || {}).length,
                timestamp: new Date(dataToSave.savedAt).toISOString(),
            });
        } catch (err) {
            console.error("Failed to save canvas:", err);
        }
    }, []);

    // Save canvas to localStorage with debouncing
    const saveToLocalStorage = useCallback((elements: any[], appState: any, files: any) => {
        // Store pending data for emergency save on page unload
        pendingSaveDataRef.current = { elements, appState, files };

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce save by 1 second
        saveTimeoutRef.current = window.setTimeout(() => {
            performSave(elements, appState, files);
            pendingSaveDataRef.current = null;
        }, 1000);
    }, [performSave]);

    // Handle page unload - save any pending changes immediately
    useEffect(() => {
        const handleBeforeUnload = () => {
            // If there's pending save data, save it immediately
            if (pendingSaveDataRef.current) {
                const { elements, appState, files } = pendingSaveDataRef.current;
                performSave(elements, appState, files);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [performSave]);

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

    // RAF polling loop - unified clock for zero-lag overlay sync
    useEffect(() => {
        if (!excalidrawAPI) return;

        let rafId: number;
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 16; // React state updates only at ~60fps (for mounting/unmounting)
        let lastSelectedIds: string = "";

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

                // Dispatch selection change event when selection changes
                const currentSelectedIds = Object.keys(appState.selectedElementIds || {}).sort().join(",");
                if (currentSelectedIds !== lastSelectedIds) {
                    lastSelectedIds = currentSelectedIds;
                    window.dispatchEvent(new CustomEvent("excalidraw:selection-change", {
                        detail: { selectedElementIds: appState.selectedElementIds }
                    }));
                }

                const mdElements = elements.filter(
                    (el: any) => el.customData?.type === "markdown" && !el.isDeleted
                );
                markdownElementsRef.current = mdElements;

                const embedElements = elements.filter(
                    (el: any) => el.customData?.type === "web-embed" && !el.isDeleted
                );
                webEmbedElementsRef.current = embedElements;

                const lexElements = elements.filter(
                    (el: any) => el.customData?.type === "lexical" && !el.isDeleted
                );
                lexicalElementsRef.current = lexElements;

                // UNIFIED CLOCK: Update transforms directly on existing refs (every frame, no React)
                mdElements.forEach((el: any) => {
                    const ref = markdownNoteRefsRef.current.get(el.id);
                    if (ref?.updateTransform) {
                        ref.updateTransform(
                            el.x,
                            el.y,
                            el.width,
                            el.height,
                            el.angle || 0,
                            appState.zoom.value,
                            appState.scrollX,
                            appState.scrollY
                        );
                    }
                });

                embedElements.forEach((el: any) => {
                    const ref = webEmbedRefsRef.current.get(el.id);
                    if (ref?.updateTransform) {
                        ref.updateTransform(
                            el.x,
                            el.y,
                            el.width,
                            el.height,
                            el.angle || 0,
                            appState.zoom.value,
                            appState.scrollX,
                            appState.scrollY
                        );
                    }
                });

                lexElements.forEach((el: any) => {
                    const ref = lexicalNoteRefsRef.current.get(el.id);
                    if (ref?.updateTransform) {
                        ref.updateTransform(
                            el.x,
                            el.y,
                            el.width,
                            el.height,
                            el.angle || 0,
                            appState.zoom.value,
                            appState.scrollX,
                            appState.scrollY
                        );
                    }
                });

                // React state updates ONLY for mounting/unmounting (less frequent)
                if (timestamp - lastUpdateTime > UPDATE_INTERVAL) {
                    setMarkdownElements([...mdElements]);
                    setWebEmbedElements([...embedElements]);
                    setLexicalElements([...lexElements]);
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

    // Handle markdown file loading (both single and bulk)
    useEffect(() => {
        const handleLoadMarkdownFiles = async (event: any) => {
            const { files, dropPosition } = event.detail || {};
            if (!files || !Array.isArray(files) || files.length === 0) {
                console.warn("No markdown files provided");
                return;
            }

            if (!excalidrawAPI) {
                console.warn("⚠️ Excalidraw API not ready yet");
                return;
            }

            console.log(`📝 Creating ${files.length} markdown note(s)`);

            try {
                const { convertToExcalidrawElements: converter } = await loadExcalidraw();
                const appState = excalidrawAPI.getAppState();

                // Grid layout configuration
                const GRID_COLS = Math.ceil(Math.sqrt(files.length)); // Square-ish grid
                const NOTE_WIDTH = 500;
                const NOTE_HEIGHT = 350;
                const PADDING = 50; // Space between notes

                // Starting position
                let startX, startY;

                if (dropPosition && files.length === 1) {
                    // If single file with drop position, use drop location
                    startX = (dropPosition.x / appState.zoom.value) - appState.scrollX - NOTE_WIDTH / 2;
                    startY = (dropPosition.y / appState.zoom.value) - appState.scrollY - NOTE_HEIGHT / 2;
                } else {
                    // Otherwise, use viewport center and grid layout
                    const viewportCenterX = appState.width / 2;
                    const viewportCenterY = appState.height / 2;
                    startX = (viewportCenterX / appState.zoom.value) - appState.scrollX - (GRID_COLS * (NOTE_WIDTH + PADDING)) / 2;
                    startY = (viewportCenterY / appState.zoom.value) - appState.scrollY - 200;
                }

                const newElements = [];

                // Read all files and create markdown notes
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const arrayBuffer = await file.arrayBuffer();
                    const decoder = new TextDecoder();
                    const content = decoder.decode(arrayBuffer);

                    // Calculate grid position
                    const col = i % GRID_COLS;
                    const row = Math.floor(i / GRID_COLS);
                    const x = startX + col * (NOTE_WIDTH + PADDING);
                    const y = startY + row * (NOTE_HEIGHT + PADDING);

                    const markdownElement = {
                        type: "rectangle",
                        x,
                        y,
                        width: NOTE_WIDTH,
                        height: NOTE_HEIGHT,
                        backgroundColor: "#ffffff",
                        strokeColor: "transparent",
                        strokeWidth: 0,
                        roughness: 0,
                        opacity: 100,
                        fillStyle: "solid",
                        id: nanoid(),
                        locked: false,
                        customData: {
                            type: "markdown",
                            content: content,
                            originalFilename: file.name,
                        },
                    };

                    newElements.push(markdownElement);
                }

                // Convert and add to canvas
                const converted = converter(newElements);
                const currentElements = excalidrawAPI.getSceneElements();

                excalidrawAPI.updateScene({
                    elements: [...currentElements, ...converted],
                });

                console.log(`✅ Created ${newElements.length} markdown note(s) from files`);

                // Show toast notification
                window.dispatchEvent(new CustomEvent("canvas:show-toast", {
                    detail: {
                        message: `Added ${files.length} markdown note${files.length > 1 ? 's' : ''}`,
                        type: 'success',
                    },
                }));
            } catch (err) {
                console.error("❌ Error creating markdown notes:", err);
                window.dispatchEvent(new CustomEvent("canvas:show-toast", {
                    detail: {
                        message: "Failed to load markdown files",
                        type: 'info',
                    },
                }));
            }
        };

        window.addEventListener('canvas:load-markdown-files', handleLoadMarkdownFiles);

        return () => {
            window.removeEventListener('canvas:load-markdown-files', handleLoadMarkdownFiles);
        };
    }, [excalidrawAPI]);

    // Handle drag-and-drop for canvas state files, .excalidraw, and .md files
    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            // Check if any files are supported file types
            const hasCanvasFile = Array.from(e.dataTransfer?.items || []).some(
                item => {
                    if (item.kind !== 'file') return false;
                    const file = item.getAsFile();
                    return file?.name?.endsWith('.rj') ||
                        file?.name?.endsWith('.excalidraw') ||
                        file?.name?.endsWith('.md');
                }
            );

            if (hasCanvasFile) {
                e.preventDefault();
                e.dataTransfer!.dropEffect = 'copy';
            }
        };

        const handleDrop = async (e: DragEvent) => {
            const files = Array.from(e.dataTransfer?.files || []);

            // Separate files by type
            const canvasFiles = files.filter(f => f.name.endsWith('.rj') || f.name.endsWith('.excalidraw'));
            const markdownFiles = files.filter(f => f.name.endsWith('.md'));

            // Handle canvas state files (.rj or .excalidraw)
            if (canvasFiles.length > 0) {
                e.preventDefault();
                e.stopPropagation();

                const canvasFile = canvasFiles[0]; // Use first canvas file
                console.log("📂 Canvas file dropped:", canvasFile.name);

                // Import and use the state manager
                const { loadCanvasStateFromFile } = await import('../../lib/canvas-state-manager');
                const result = await loadCanvasStateFromFile(canvasFile);

                if (result.success && result.state) {
                    // Dispatch event to load the state
                    window.dispatchEvent(new CustomEvent('canvas:load-state', {
                        detail: { state: result.state },
                    }));

                    // Also dispatch to chat components (if .rj file)
                    if (canvasFile.name.endsWith('.rj')) {
                        window.dispatchEvent(new CustomEvent('chat:load-messages', {
                            detail: { messages: result.state.chat.messages },
                        }));

                        if (result.state.chat.aiProvider) {
                            window.dispatchEvent(new CustomEvent('chat:set-provider', {
                                detail: { provider: result.state.chat.aiProvider },
                            }));
                        }
                    }

                    console.log('✅ Canvas state loaded from drop');
                } else {
                    console.error('❌ Failed to load canvas state:', result.error);
                    alert(`Failed to load: ${result.error}`);
                }
            }
            // Handle markdown files
            else if (markdownFiles.length > 0) {
                e.preventDefault();
                e.stopPropagation();

                console.log(`📂 ${markdownFiles.length} markdown file(s) dropped`);

                // Get drop position
                const dropPosition = {
                    x: e.clientX,
                    y: e.clientY,
                };

                // Dispatch event to create markdown notes
                window.dispatchEvent(new CustomEvent('canvas:load-markdown-files', {
                    detail: {
                        files: markdownFiles,
                        dropPosition: markdownFiles.length === 1 ? dropPosition : undefined,
                    },
                }));
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

    // Use a ref to always have access to the latest excalidrawAPI
    const excalidrawAPIRef = useRef(excalidrawAPI);
    useEffect(() => {
        excalidrawAPIRef.current = excalidrawAPI;
    }, [excalidrawAPI]);

    // Smooth collaboration system (springs + fade-in)
    const { smoothRemoteUpdate, isSmoothingUpdate } = useSmoothCollaboration(excalidrawAPI);

    // User ID for cursor tracking (generated once per session)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userColor, setUserColor] = useState<string>('#3b82f6');

    // Generate consistent color for user
    useEffect(() => {
        if (currentUserId) {
            const colors = [
                '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
                '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
            ];
            let hash = 0;
            for (let i = 0; i < currentUserId.length; i++) {
                hash = currentUserId.charCodeAt(i) + ((hash << 5) - hash);
            }
            const index = Math.abs(hash) % colors.length;
            setUserColor(colors[index]);
        }
    }, [currentUserId]);

    // Keep ref in sync for event handlers
    const currentUserIdRef = useRef<string | null>(null);
    useEffect(() => {
        currentUserIdRef.current = currentUserId;
    }, [currentUserId]);

    // Cursor tracking system
    const { cursors, handleCursorUpdate, removeCursor } = useCursorTracking(
        socket,
        excalidrawAPI,
        currentUserId
    );

    // Selection locking system
    const [toast, setToast] = useState<Toast | null>(null);
    const {
        selections,
        lockedElements,
        isElementLocked,
        getLockedElementsDetails,
        sendSelectionUpdate,
        handleSelectionUpdate,
        removeUserSelection
    } = useSelectionLocking(
        socket,
        excalidrawAPI,
        currentUserId,
        userColor
    );

    // Optimized sync function that sends only changed elements (deltas)
    const syncCanvasToPartyKit = useCallback((elements: any[], appState: any, files: any) => {
        if (!isSharedMode || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            return;
        }

        const now = Date.now();
        if (now - lastSyncTimeRef.current < SYNC_THROTTLE_MS) {
            return; // Throttle updates
        }

        // 1. Calculate Changed Elements (Deltas)
        const changedElements: any[] = [];
        elements.forEach((el: any) => {
            const lastSyncedVersion = syncedVersionsRef.current.get(el.id) || -1;
            // Send if newer version OR if deleted (version increments on delete)
            if (el.version > lastSyncedVersion || (el.isDeleted && el.version > lastSyncedVersion)) {
                changedElements.push(el);
                // Optimistically update tracker
                syncedVersionsRef.current.set(el.id, el.version);
            }
        });

        // 2. Check AppState Changes
        // We only care about visual properties
        const appStateSnapshot = {
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
        };
        const appStateStr = JSON.stringify(appStateSnapshot);
        const appStateChanged = appStateStr !== lastSyncedAppStateRef.current;

        // 3. Stop if nothing changed (Loop Breaker)
        if (changedElements.length === 0 && !appStateChanged) {
            return;
        }

        if (appStateChanged) lastSyncedAppStateRef.current = appStateStr;
        lastSyncTimeRef.current = now;

        try {
            // Increment sequence for this update
            const seq = mySequenceRef.current++;

            // Encode as MessagePack binary - DELTA SYNC
            const message = encode({
                type: "canvas-update",
                userId: currentUserId, // Add user ID for per-user sequence tracking
                seq, // Add sequence number for echo suppression
                elements: changedElements, // Send only deltas
                appState: appStateSnapshot,
                files,
            });

            socketRef.current.send(message);
            console.log("📤 Sent delta update (seq:", seq, ") - elements:", changedElements.length);
        } catch (err) {
            console.error("Failed to sync canvas to PartyKit:", err);
        }
    }, [isSharedMode, currentUserId]);

    // Sync markdown notes to PartyKit
    const syncMarkdownNotes = useCallback((notes: any[]) => {
        if (!isSharedMode || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            const message = encode({
                type: "markdown-update",
                markdownNotes: notes
            });
            socketRef.current.send(message);
        } catch (err) {
            console.error("Failed to sync markdown notes to PartyKit:", err);
        }
    }, [isSharedMode]);

    // Sync image history to PartyKit
    const syncImageHistory = useCallback((images: any[]) => {
        if (!isSharedMode || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            const message = encode({
                type: "image-update",
                imageHistory: images
            });
            socketRef.current.send(message);
        } catch (err) {
            console.error("Failed to sync image history to PartyKit:", err);
        }
    }, [isSharedMode]);

    // Handle creating new markdown element
    const handleCreateMarkdown = useCallback(async () => {
        const api = excalidrawAPIRef.current;
        if (!api) {
            console.warn("⚠️ Cannot create note: Excalidraw API not ready");
            return;
        }

        const { convertToExcalidrawElements: converter } = await loadExcalidraw();

        // Get viewport center for proper positioning
        const appState = api.getAppState();
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
        const currentElements = api.getSceneElements();

        api.updateScene({
            elements: [...currentElements, ...converted],
        });

        console.log("✅ Created new markdown note at viewport center");
    }, []);

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
                    // Increment version to trigger sync
                    version: (el.version || 0) + 1,
                    versionNonce: Date.now(), // Use timestamp for unique nonce
                };
            }
            return el;
        });

        excalidrawAPI.updateScene({ elements: updatedElements });
        console.log("📝 Markdown updated for element:", elementId, "- new version:", updatedElements.find((el: any) => el.id === elementId)?.version);
    }, [excalidrawAPI]);

    // Handle creating a new web embed
    const handleCreateWebEmbed = useCallback(async (initialUrl?: string) => {
        const api = excalidrawAPIRef.current;
        if (!api) {
            console.warn("⚠️ Cannot create web embed: Excalidraw API not ready");
            return;
        }

        const { convertToExcalidrawElements: converter } = await loadExcalidraw();

        // Get viewport center for proper positioning
        const appState = api.getAppState();
        const viewportCenterX = appState.width / 2;
        const viewportCenterY = appState.height / 2;

        // Convert viewport center to scene coordinates
        const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
        const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

        const newElement = {
            type: "rectangle",
            x: sceneX - 350,
            y: sceneY - 250,
            width: 700,
            height: 500,
            backgroundColor: "#ffffff",
            strokeColor: "#000000",
            strokeWidth: 4,
            roughness: 0,
            opacity: 100,
            fillStyle: "solid",
            id: nanoid(),
            locked: false,
            customData: {
                type: "web-embed",
                url: initialUrl || "",
                title: "Web Embed",
            },
        };

        const converted = converter([newElement]);
        const currentElements = api.getSceneElements();

        api.updateScene({
            elements: [...currentElements, ...converted],
        });

        console.log("✅ Created new web embed at viewport center");
    }, []);

    // Handle web embed URL update
    const handleWebEmbedUpdate = useCallback((elementId: string, newUrl: string) => {
        if (!excalidrawAPI) return;

        const elements = excalidrawAPI.getSceneElements();
        const updatedElements = elements.map((el: any) => {
            if (el.id === elementId) {
                return {
                    ...el,
                    customData: {
                        ...el.customData,
                        url: newUrl,
                    },
                    // Increment version to trigger sync
                    version: (el.version || 0) + 1,
                    versionNonce: Date.now(),
                };
            }
            return el;
        });

        excalidrawAPI.updateScene({ elements: updatedElements });
        console.log("🌐 Web embed updated for element:", elementId, "- URL:", newUrl);
    }, [excalidrawAPI]);

    // Handle web embed position change (dragging)
    const handleWebEmbedPositionChange = useCallback((elementId: string, newX: number, newY: number) => {
        if (!excalidrawAPI) return;

        const elements = excalidrawAPI.getSceneElements();
        const updatedElements = elements.map((el: any) => {
            if (el.id === elementId) {
                return {
                    ...el,
                    x: newX,
                    y: newY,
                    version: (el.version || 0) + 1,
                    versionNonce: Date.now(),
                };
            }
            return el;
        });

        excalidrawAPI.updateScene({ elements: updatedElements });
    }, [excalidrawAPI]);

    // Handle web embed deletion
    const handleWebEmbedDelete = useCallback((elementId: string) => {
        if (!excalidrawAPI) return;

        const elements = excalidrawAPI.getSceneElements();
        excalidrawAPI.updateScene({
            elements: elements.filter((el: any) => el.id !== elementId),
        });
        console.log("🗑️ Deleted web embed:", elementId);
    }, [excalidrawAPI]);

    // Listen for web embed creation events from AI chat
    useEffect(() => {
        const handleCreateWebEmbedEvent = (event: CustomEvent<{ url: string }>) => {
            const { url } = event.detail;
            console.log("🌐 Canvas received web embed request:", url);
            handleCreateWebEmbed(url);
        };

        window.addEventListener("canvas:create-web-embed", handleCreateWebEmbedEvent as EventListener);

        return () => {
            window.removeEventListener("canvas:create-web-embed", handleCreateWebEmbedEvent as EventListener);
        };
    }, [handleCreateWebEmbed]);

    // Handle creating new Lexical rich text note
    const handleCreateLexicalNote = useCallback(async () => {
        const api = excalidrawAPIRef.current;
        if (!api) {
            console.warn("⚠️ Cannot create Lexical note: Excalidraw API not ready");
            return;
        }

        const { convertToExcalidrawElements: converter } = await loadExcalidraw();
        const { DEFAULT_NOTE_STATE } = await import("./rich-text");

        // Get viewport center for proper positioning
        const appState = api.getAppState();
        const viewportCenterX = appState.width / 2;
        const viewportCenterY = appState.height / 2;

        // Convert viewport center to scene coordinates
        const sceneX = (viewportCenterX / appState.zoom.value) - appState.scrollX;
        const sceneY = (viewportCenterY / appState.zoom.value) - appState.scrollY;

        const newElement = {
            type: "rectangle",
            x: sceneX - 250,
            y: sceneY - 200,
            width: 1000,
            height: 1200,
            backgroundColor: "#ffffff",
            strokeColor: "#000000",
            strokeWidth: 4,
            roughness: 0,
            opacity: 100,
            fillStyle: "solid",
            id: nanoid(),
            locked: false,
            customData: {
                type: "lexical",
                lexicalState: DEFAULT_NOTE_STATE,
                version: 1,
            },
        };

        const converted = converter([newElement]);
        const currentElements = api.getSceneElements();

        api.updateScene({
            elements: [...currentElements, ...converted],
        });

        console.log("✅ Created new Lexical rich text note at viewport center");
    }, []);

    // Handle Lexical state update
    const handleLexicalUpdate = useCallback((elementId: string, updates: { lexicalState?: string; backgroundOpacity?: number; blurAmount?: number }) => {
        if (!excalidrawAPI) return;

        const elements = excalidrawAPI.getSceneElements();
        const updatedElements = elements.map((el: any) => {
            if (el.id === elementId) {
                const newCustomData = { ...el.customData };
                if (updates.lexicalState !== undefined) {
                    newCustomData.lexicalState = updates.lexicalState;
                }
                if (updates.backgroundOpacity !== undefined) {
                    newCustomData.backgroundOpacity = updates.backgroundOpacity;
                }
                if (updates.blurAmount !== undefined) {
                    newCustomData.blurAmount = updates.blurAmount;
                }

                return {
                    ...el,
                    customData: newCustomData,
                    // Increment version to trigger sync
                    version: (el.version || 0) + 1,
                    versionNonce: Date.now(),
                };
            }
            return el;
        });

        excalidrawAPI.updateScene({ elements: updatedElements });
        console.log("🔷 Lexical state updated for element:", elementId, updates);
    }, [excalidrawAPI]);

    // Register markdown note ref
    const registerMarkdownNoteRef = useCallback((id: string, ref: any) => {
        if (ref) {
            markdownNoteRefsRef.current.set(id, ref);
        } else {
            markdownNoteRefsRef.current.delete(id);
        }
    }, []);

    // Register web embed ref
    const registerWebEmbedRef = useCallback((id: string, ref: any) => {
        if (ref) {
            webEmbedRefsRef.current.set(id, ref);
        } else {
            webEmbedRefsRef.current.delete(id);
        }
    }, []);

    // Deselect all elements (used by rich text notes on Escape)
    const handleDeselectElements = useCallback(() => {
        const api = excalidrawAPIRef.current;
        if (api) {
            api.updateScene({
                appState: {
                    selectedElementIds: {},
                }
            });
        }
    }, []);

    // Register Lexical note ref
    const registerLexicalNoteRef = useCallback((id: string, ref: any) => {
        if (ref) {
            lexicalNoteRefsRef.current.set(id, ref);
        } else {
            lexicalNoteRefsRef.current.delete(id);
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
        delay: 1500, // 2.5x longer than original (600ms × 3 = 1800ms) for deliberate long-press
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
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
            }}
            // Add long-press support for mobile context menu
            {...(isMobile ? longPressHandlers.handlers : {})}
        >
            {/* Shared mode indicator */}
            {isSharedMode && isConnected && (
                <div className="shared-indicator">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>{activeUsers} {activeUsers === 1 ? 'user' : 'users'} online</span>
                </div>
            )}

            <style>{`
                .shared-indicator {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    color: white;
                    border-radius: 8px;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
                    transition: opacity 0.2s, transform 0.2s;
                    pointer-events: auto;
                }

                .shared-indicator:hover {
                    opacity: 0.95;
                    transform: translateY(-2px);
                }

                .shared-indicator svg {
                    flex-shrink: 0;
                }

                .shared-indicator span {
                    line-height: 1;
                }

                @media (max-width: 768px) {
                    .shared-indicator {
                        bottom: 16px;
                        right: 16px;
                        padding: 6px 10px;
                        font-size: 12px;
                    }

                    .shared-indicator svg {
                        width: 10px;
                        height: 10px;
                    }
                }
            `}</style>
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
                    // Make API and helper functions globally available
                    if (typeof window !== "undefined") {
                        (window as any).excalidrawAPI = api;
                        (window as any).createMarkdownNote = handleCreateMarkdown;
                        (window as any).createWebEmbed = handleCreateWebEmbed;
                        (window as any).createLexicalNote = handleCreateLexicalNote;

                        // Add utility to clear all canvas localStorage (for debugging)
                        (window as any).clearCanvasStorage = () => {
                            try {
                                const keys = [
                                    STORAGE_KEY,
                                    "canvas-image-history",
                                ];
                                keys.forEach(key => {
                                    localStorage.removeItem(key);
                                    console.log(`🗑️ Cleared: ${key}`);
                                });
                                console.log("✅ All canvas storage cleared. Refresh the page.");
                                return "Storage cleared. Refresh the page to start fresh.";
                            } catch (err) {
                                console.error("❌ Failed to clear storage:", err);
                                return "Failed to clear storage.";
                            }
                        };
                        console.log("💡 Debug utility available: clearCanvasStorage()");
                    }

                    // Restore files from localStorage immediately when API is ready
                    try {
                        const saved = localStorage.getItem(STORAGE_KEY);
                        if (saved) {
                            const data = JSON.parse(saved);
                            const files = data.canvasData?.files;
                            if (files && Object.keys(files).length > 0) {
                                console.log("📂 Restoring files:", Object.keys(files).length);
                                api.addFiles(Object.values(files));
                                console.log("✅ Files restored");
                            }
                        }
                    } catch (err) {
                        console.error("❌ Failed to restore files:", err);
                    }
                }}
                initialData={initialCanvasData || {
                    appState: {
                        viewBackgroundColor: "#ffffff", // Always white background
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

                    // Get canvas offset
                    if (!containerRef.current) return;
                    const rect = containerRef.current.getBoundingClientRect();
                    const clientX = event.clientX - rect.left;
                    const clientY = event.clientY - rect.top;

                    // Convert pointer to scene coordinates
                    const sceneX = (clientX / appState.zoom.value) - appState.scrollX;
                    const sceneY = (clientY / appState.zoom.value) - appState.scrollY;

                    // Check if pointer is over any markdown or lexical element
                    const hitElement = elements.find((el: any) => {
                        if (el.isDeleted || (el.customData?.type !== 'markdown' && el.customData?.type !== 'lexical')) return false;

                        // Simple hit test (assuming no rotation for simplicity)
                        return sceneX >= el.x &&
                            sceneX <= el.x + el.width &&
                            sceneY >= el.y &&
                            sceneY <= el.y + el.height;
                    });

                    if (hitElement) {
                        // Select the element instead of entering text mode
                        excalidrawAPI.selectShape({
                            id: hitElement.id,
                        });
                    }
                }}
                onDoubleClick={(event: any, pointerState: any) => {
                    // Prevent Excalidraw's native text editing when double-clicking on custom notes
                    const elements = excalidrawAPI?.getSceneElements?.() || [];
                    const appState = excalidrawAPI?.getAppState?.();

                    if (!appState) return false;

                    // Get canvas offset
                    if (!containerRef.current) return false;
                    const rect = containerRef.current.getBoundingClientRect();
                    const clientX = event.clientX - rect.left;
                    const clientY = event.clientY - rect.top;

                    // Convert pointer to scene coordinates
                    const sceneX = (clientX / appState.zoom.value) - appState.scrollX;
                    const sceneY = (clientY / appState.zoom.value) - appState.scrollY;

                    // Check if double-click is on a markdown or lexical element
                    const customElement = elements.find((el: any) => {
                        if (el.isDeleted || (el.customData?.type !== 'markdown' && el.customData?.type !== 'lexical')) return false;

                        return sceneX >= el.x &&
                            sceneX <= el.x + el.width &&
                            sceneY >= el.y &&
                            sceneY <= el.y + el.height;
                    });

                    if (customElement) {
                        if (customElement.customData?.type === 'markdown') {
                            // Dispatch event to trigger markdown edit mode
                            window.dispatchEvent(new CustomEvent('markdown:edit', {
                                detail: { elementId: customElement.id }
                            }));
                        }
                        // Return false to prevent Excalidraw's default text editing
                        return false;
                    }

                    // Allow default behavior for other elements
                    return true;
                }}
                onChange={(elements: any[], appState: any) => {
                    // SELECTION LOCKING LOGIC
                    if (isSharedMode) {
                        const selectedIds = Object.keys(appState.selectedElementIds || {});

                        // Check for collisions with locked elements
                        let blocked = false;
                        const allowedSelection: Record<string, boolean> = { ...appState.selectedElementIds };

                        for (const id of selectedIds) {
                            const lock = isElementLocked(id);
                            if (lock) {
                                delete allowedSelection[id];
                                blocked = true;
                                // Show toast notification (throttled)
                                setToast({
                                    id: Date.now().toString(),
                                    message: `Element locked by ${lock.userName}`,
                                    type: 'warning'
                                });
                            }
                        }

                        if (blocked) {
                            // Revert selection immediately
                            // Use setTimeout to avoid state update loops during render
                            setTimeout(() => {
                                excalidrawAPI.updateScene({
                                    appState: {
                                        selectedElementIds: allowedSelection
                                    }
                                });
                            }, 0);
                        } else {
                            // Send selection update to server
                            sendSelectionUpdate(selectedIds);
                        }
                    }

                    // Update view state ref without triggering React renders
                    viewStateRef.current = {
                        scrollX: appState.scrollX,
                        scrollY: appState.scrollY,
                        zoom: appState.zoom,
                        selectedElementIds: appState.selectedElementIds || {},
                    };

                    // Auto-save to localStorage - use ref to avoid closure issues
                    const api = excalidrawAPIRef.current;
                    if (api) {
                        const files = api.getFiles();

                        // If canvas is empty, clear localStorage (only in non-shared mode)
                        if (elements.length === 0 && !isSharedMode) {
                            localStorage.removeItem(STORAGE_KEY);
                        } else if (!isSharedMode) {
                            // Save to localStorage in non-shared mode
                            saveToLocalStorage(elements, appState, files);
                        }

                        // Dispatch change event for cloud auto-save
                        window.dispatchEvent(new CustomEvent("canvas:data-change"));

                        // Sync to PartyKit in shared mode (but not when applying remote updates or smoothing)
                        if (isSharedMode) {
                            // Check if this onChange was triggered by a recent remote update (within 50ms)
                            const timeSinceRemoteUpdate = Date.now() - lastRemoteUpdateTimeRef.current;
                            if (timeSinceRemoteUpdate < REMOTE_UPDATE_WINDOW_MS) {
                                console.log("⏸️ Skipping sync - recent remote update (" + timeSinceRemoteUpdate + "ms ago)");
                            } else if (isSmoothingUpdate()) {
                                console.log("⏸️ Skipping sync - smoothing animation");
                            } else {
                                console.log("📤 Syncing to PartyKit - elements:", elements.length);
                                syncCanvasToPartyKit(elements, appState, files);

                                // Extract and sync markdown notes
                                const mdNotes = elements.filter((el: any) =>
                                    el.customData?.type === "markdown" && !el.isDeleted
                                );
                                if (mdNotes.length > 0) {
                                    console.log("📝 Syncing markdown notes:", mdNotes.length);
                                }
                                if (onMarkdownNotesChange) {
                                    onMarkdownNotesChange(mdNotes);
                                }
                                syncMarkdownNotes(mdNotes);
                            }
                        }
                    } else {
                        console.log("📝 onChange - API not ready yet");
                    }
                }}
                renderTopRightUI={() => (
                    <CanvasAvatar
                        user={session.user}
                        isAuthenticated={session.isAuthenticated}
                        isLoading={session.isLoading}
                    />
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

            {/* Render WebEmbed overlays for each web embed element */}
            {WebEmbedComponent && webEmbedElements.map((element) => (
                <WebEmbedComponent
                    key={element.id}
                    element={element}
                    appState={viewStateRef.current}
                    onChange={handleWebEmbedUpdate}
                    onPositionChange={handleWebEmbedPositionChange}
                    onDelete={handleWebEmbedDelete}
                    ref={(ref: any) => registerWebEmbedRef(element.id, ref)}
                />
            ))}

            {/* Render LexicalNote overlays for each Lexical rich text element */}
            {LexicalNoteComponent && lexicalElements.map((element) => (
                <LexicalNoteComponent
                    key={element.id}
                    element={element}
                    appState={viewStateRef.current}
                    onChange={handleLexicalUpdate}
                    onDeselect={handleDeselectElements}
                    ref={(ref: any) => registerLexicalNoteRef(element.id, ref)}
                />
            ))}

            {/* Render collaborator cursors in shared mode */}
            {isSharedMode && excalidrawAPI && Array.from(cursors.values()).map((cursor) => (
                <CollaboratorCursor
                    key={cursor.userId}
                    userId={cursor.userId}
                    userName={cursor.userName}
                    x={cursor.x}
                    y={cursor.y}
                    color={cursor.color}
                    zoom={viewStateRef.current.zoom.value}
                    scrollX={viewStateRef.current.scrollX}
                    scrollY={viewStateRef.current.scrollY}
                />
            ))}

            {/* Selection Lock Overlay */}
            {isSharedMode && excalidrawAPI && (
                <SelectionLockOverlay
                    lockedElements={getLockedElementsDetails()}
                    zoom={(viewStateRef.current.zoom as any)?.value || (viewStateRef.current.zoom as unknown as number) || 1}
                    scrollX={viewStateRef.current.scrollX}
                    scrollY={viewStateRef.current.scrollY}
                />
            )}

            <ToastNotification toast={toast} />

        </div>
    );
}
