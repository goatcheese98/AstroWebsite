import type { Message } from "../components/ai-chat/types";
import type { ImageHistoryItem } from "../components/ai-chat/hooks/useImageGeneration";
import type { ExcalidrawAPI, ExcalidrawElement, ExcalidrawAppState } from "@/stores";

// File format version for compatibility checking
const STATE_FILE_VERSION = "1.1.0";  // Bumped for compression support
const STATE_FILE_EXTENSION = ".rj";
const EXCALIDRAW_EXTENSION = ".excalidraw";

/**
 * Complete canvas state that can be saved/loaded
 */
export interface CanvasState {
    version: string;
    exportedAt: number;
    canvas: {
        elements: ExcalidrawElement[];
        appState: Partial<ExcalidrawAppState>;
        files: Record<string, { mimeType: string; id: string; dataURL?: string }> | null;
    };
    chat: {
        messages: Message[];
        aiProvider: "kimi" | "claude";
        contextMode: "all" | "selected";
    };
    images: {
        history: ImageHistoryItem[];
    };
    // Allow additional properties for markdown files
    [key: string]: unknown;
}

/**
 * Current state data collected from various sources
 */
export interface CurrentStateData {
    excalidrawAPI: ExcalidrawAPI;
    messages: Message[];
    aiProvider: "kimi" | "claude";
    contextMode: "all" | "selected";
    imageHistory: ImageHistoryItem[];
}

/**
 * Result of loading a canvas state
 */
export interface LoadStateResult {
    success: boolean;
    state?: CanvasState;
    error?: string;
}

/**
 * Collect complete canvas state from all sources
 */
export function collectCanvasState(data: CurrentStateData): CanvasState {
    const { excalidrawAPI, messages, aiProvider, contextMode, imageHistory } = data;
    
    // Get Excalidraw state
    const elements = excalidrawAPI?.getSceneElements?.() || [];
    const appState = excalidrawAPI?.getAppState?.() || {};
    const files = excalidrawAPI?.getFiles?.() || {};
    
    // Extract only the essential app state properties
    const essentialAppState = {
        viewBackgroundColor: appState.viewBackgroundColor,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
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
    
    return {
        version: STATE_FILE_VERSION,
        exportedAt: Date.now(),
        canvas: {
            elements,
            appState: essentialAppState,
            files,
        },
        chat: {
            messages: messages.map(msg => ({
                ...msg,
                metadata: {
                    ...msg.metadata,
                    // Convert Date to timestamp for serialization
                    timestamp: msg.metadata.timestamp instanceof Date 
                        ? msg.metadata.timestamp.toISOString() 
                        : msg.metadata.timestamp,
                },
            })) as unknown as Message[],
            aiProvider,
            contextMode,
        },
        images: {
            history: imageHistory.map(img => ({
                ...img,
                // Convert Date to timestamp for serialization
                timestamp: img.timestamp instanceof Date 
                    ? img.timestamp.toISOString() 
                    : img.timestamp,
            })) as unknown as ImageHistoryItem[],
        },
    };
}

/**
 * Generate a descriptive filename for the canvas state
 */
function generateFilename(state: CanvasState): string {
    const now = new Date();
    
    // Format: YYYY-MM-DD_HH-MM
    const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }).replace(/\//g, '-');
    
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    }).replace(':', '-');
    
    // Count elements by type for descriptive name
    const elements = state.canvas.elements || [];
    const elementCount = elements.length;
    const messageCount = state.chat.messages?.length || 0;
    const imageCount = state.images.history?.length || 0;
    
    // Build descriptive parts
    const parts: string[] = [];
    if (elementCount > 0) parts.push(`${elementCount}el`);
    if (messageCount > 0) parts.push(`${messageCount}ch`);
    if (imageCount > 0) parts.push(`${imageCount}im`);
    
    const description = parts.length > 0 ? `_${parts.join('-')}` : '';
    
    return `Canvas_${dateStr}_${timeStr}${description}${STATE_FILE_EXTENSION}`;
}

/**
 * Compress data using gzip via CompressionStream API
 */
async function compressData(data: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const input = encoder.encode(data);
    
    const compressionStream = new CompressionStream('gzip');
    const writer = compressionStream.writable.getWriter();
    
    writer.write(input);
    writer.close();
    
    const reader = compressionStream.readable.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    
    // Concatenate chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    
    return result;
}

/**
 * Decompress gzip data via DecompressionStream API
 */
async function decompressData(compressed: ArrayBuffer): Promise<string> {
    const decompressionStream = new DecompressionStream('gzip');
    const writer = decompressionStream.writable.getWriter();
    
    writer.write(new Uint8Array(compressed));
    writer.close();
    
    const reader = decompressionStream.readable.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    
    // Concatenate chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(result);
}

/**
 * Detect file format from buffer content
 * @returns 'json' | 'gzip' | 'unknown'
 */
function detectFormat(buffer: ArrayBuffer): 'json' | 'gzip' | 'unknown' {
    const bytes = new Uint8Array(buffer.slice(0, 2));
    
    // Gzip magic number: 0x1f 0x8b
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        return 'gzip';
    }
    
    // JSON starts with '{'
    if (bytes[0] === 0x7b) {
        return 'json';
    }
    
    return 'unknown';
}

export interface SaveOptions {
    compressed?: boolean;
    excludeHistory?: boolean;
}

/**
 * Save canvas state to a file
 * @param state - The canvas state to save
 * @param filename - Optional filename (auto-generated if not provided)
 * @param options - Save options (compressed vs full size, exclude history)
 */
export async function saveCanvasStateToFile(
    state: CanvasState, 
    filename?: string,
    options: SaveOptions = { compressed: true, excludeHistory: false }
): Promise<void> {
    const finalFilename = filename || generateFilename(state);
    
    // Ensure filename has correct extension
    const finalFilenameWithExt = finalFilename.endsWith(STATE_FILE_EXTENSION) 
        ? finalFilename 
        : `${finalFilename}${STATE_FILE_EXTENSION}`;
    
    // Create modified state if excluding history
    const stateToSave = options.excludeHistory 
        ? { ...state, images: { history: [] } }
        : state;
    
    const historyCount = state.images.history.length;
    const excludedCount = options.excludeHistory ? historyCount : 0;
    
    if (options.compressed) {
        // Compressed: compact JSON + gzip
        const json = JSON.stringify(stateToSave);
        const compressed = await compressData(json);
        const blob = new Blob([compressed as unknown as BlobPart], { type: "application/gzip" });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = finalFilenameWithExt;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        const compressionRatio = ((1 - compressed.length / json.length) * 100).toFixed(1);
        const historyNote = excludedCount > 0 ? ` (excluded ${excludedCount} gallery images)` : '';
        console.log(`💾 Canvas state saved (compressed): ${finalFilenameWithExt} (${compressionRatio}% smaller)${historyNote}`);
    } else {
        // Full size: pretty-printed JSON for human readability
        const json = JSON.stringify(stateToSave, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = finalFilenameWithExt;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        const sizeKB = (json.length / 1024).toFixed(1);
        const historyNote = excludedCount > 0 ? ` (excluded ${excludedCount} gallery images)` : '';
        console.log(`💾 Canvas state saved (full size): ${finalFilenameWithExt} (${sizeKB} KB)${historyNote}`);
    }
}

/**
 * Raw Excalidraw file format (from .excalidraw files)
 */
interface ExcalidrawFileData {
    type?: string;
    version?: number;
    source?: string;
    elements?: ExcalidrawElement[];
    appState?: Partial<ExcalidrawAppState>;
    files?: Record<string, { mimeType: string; id: string; dataURL?: string }>;
}

/**
 * Convert .excalidraw file to our CanvasState format
 */
function convertExcalidrawToCanvasState(excalidrawData: ExcalidrawFileData): CanvasState {
    return {
        version: STATE_FILE_VERSION,
        exportedAt: Date.now(),
        canvas: {
            elements: excalidrawData.elements || [],
            appState: excalidrawData.appState || {},
            files: excalidrawData.files || null,
        },
        chat: {
            messages: [],
            aiProvider: "kimi",
            contextMode: "all",
        },
        images: {
            history: [],
        },
    };
}

/**
 * Load canvas state from a file (supports .rj, .excalidraw, and .md files)
 */
export async function loadCanvasStateFromFile(file: File): Promise<LoadStateResult> {
    // Validate file extension
    const isRjFile = file.name.endsWith(STATE_FILE_EXTENSION);
    const isExcalidrawFile = file.name.endsWith(EXCALIDRAW_EXTENSION);
    const isMarkdownFile = file.name.endsWith('.md');

    if (!isRjFile && !isExcalidrawFile && !isMarkdownFile) {
        return {
            success: false,
            error: `Invalid file type. Expected ${STATE_FILE_EXTENSION}, ${EXCALIDRAW_EXTENSION}, or .md file.`,
        };
    }
    
    try {
        // Read file as ArrayBuffer to handle both text and binary
        const arrayBuffer = await file.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
            return {
                success: false,
                error: "File is empty",
            };
        }

        let state: CanvasState;
        let wasCompressed = false;

        // Handle .excalidraw files
        if (isExcalidrawFile) {
            const decoder = new TextDecoder();
            const content = decoder.decode(arrayBuffer);
            const excalidrawData = JSON.parse(content);
            state = convertExcalidrawToCanvasState(excalidrawData);
            console.log("📂 Loaded .excalidraw file and converted to canvas state");
        }
        // Handle .md files
        else if (isMarkdownFile) {
            const decoder = new TextDecoder();
            const markdownContent = decoder.decode(arrayBuffer);

            // Create a canvas state with a single markdown note
            state = {
                version: STATE_FILE_VERSION,
                exportedAt: Date.now(),
                canvas: {
                    elements: [],
                    appState: {},
                    files: {},
                },
                chat: {
                    messages: [],
                    aiProvider: "kimi",
                    contextMode: "all",
                },
                images: {
                    history: [],
                },
            };

            // Store markdown content in state for later processing
            (state as any).markdownContent = markdownContent;
            (state as any).markdownFilename = file.name;

            console.log("📂 Loaded .md file:", file.name);
        }
        // Handle .rj files (our native format)
        else {
            // Detect file format
            const format = detectFormat(arrayBuffer);
            let content: string;

            if (format === 'gzip') {
                // Decompress gzip file
                content = await decompressData(arrayBuffer);
                wasCompressed = true;
            } else if (format === 'json') {
                // Legacy uncompressed JSON file
                const decoder = new TextDecoder();
                content = decoder.decode(arrayBuffer);
            } else {
                return {
                    success: false,
                    error: "Invalid file format. File is not a valid .rj file.",
                };
            }

            state = JSON.parse(content) as CanvasState;
        }
        
        // Skip validation for markdown files (they have different structure)
        if (!isMarkdownFile) {
            // Validate required fields
            if (!state.version || !state.canvas || !state.chat) {
                return {
                    success: false,
                    error: "Invalid file format: missing required fields",
                };
            }

            // Check version compatibility (only major version matters) - skip for .excalidraw
            if (!isExcalidrawFile) {
                const versionParts = state.version.split(".").map(Number);
                const currentParts = STATE_FILE_VERSION.split(".").map(Number);

                // Major version mismatch is not compatible
                if (versionParts[0] !== currentParts[0]) {
                    return {
                        success: false,
                        error: `Version mismatch: file is v${state.version}, expected v${STATE_FILE_VERSION}. Please update the app.`,
                    };
                }
            }

            // Restore Date objects from timestamps
            if (state.chat?.messages) {
                state.chat.messages = state.chat.messages.map(msg => ({
                    ...msg,
                    metadata: {
                        ...msg.metadata,
                        timestamp: new Date(msg.metadata.timestamp as any),
                    },
                }));
            }

            if (state.images?.history) {
                state.images.history = state.images.history.map(img => ({
                    ...img,
                    timestamp: new Date(img.timestamp as any),
                }));
            }
        }

        console.log("📂 Canvas state loaded:", {
            fileType: isMarkdownFile ? '.md' : isExcalidrawFile ? '.excalidraw' : '.rj',
            version: state.version,
            exportedAt: state.exportedAt ? new Date(state.exportedAt).toLocaleString() : 'N/A',
            elements: state.canvas.elements?.length || 0,
            messages: state.chat?.messages?.length || 0,
            images: state.images?.history?.length || 0,
            compressed: wasCompressed,
        });
        
        return {
            success: true,
            state,
        };
        
    } catch (err) {
        console.error("Failed to parse canvas state file:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to parse file",
        };
    }
}

/**
 * Trigger file picker for loading canvas state (supports single file: .rj, .excalidraw, or .md)
 */
export function triggerCanvasStateLoad(): Promise<LoadStateResult> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = `${STATE_FILE_EXTENSION},${EXCALIDRAW_EXTENSION},.md`;
        input.style.display = "none";

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                resolve({
                    success: false,
                    error: "No file selected",
                });
                return;
            }

            const result = await loadCanvasStateFromFile(file);
            resolve(result);
        };

        input.oncancel = () => {
            resolve({
                success: false,
                error: "Cancelled",
            });
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
}

/**
 * Result of loading multiple markdown files
 */
export interface BulkMarkdownLoadResult {
    success: boolean;
    files?: Array<{
        filename: string;
        content: string;
    }>;
    error?: string;
}

/**
 * Trigger file picker for bulk loading markdown files
 */
export function triggerBulkMarkdownLoad(): Promise<BulkMarkdownLoadResult> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".md";
        input.multiple = true; // Allow multiple file selection
        input.style.display = "none";

        input.onchange = async (e) => {
            const fileList = (e.target as HTMLInputElement).files;
            if (!fileList || fileList.length === 0) {
                resolve({
                    success: false,
                    error: "No files selected",
                });
                return;
            }

            try {
                const files: Array<{ filename: string; content: string }> = [];

                // Read all markdown files
                for (let i = 0; i < fileList.length; i++) {
                    const file = fileList[i];
                    if (!file.name.endsWith('.md')) {
                        console.warn(`Skipping non-markdown file: ${file.name}`);
                        continue;
                    }

                    const arrayBuffer = await file.arrayBuffer();
                    const decoder = new TextDecoder();
                    const content = decoder.decode(arrayBuffer);

                    files.push({
                        filename: file.name,
                        content: content,
                    });
                }

                if (files.length === 0) {
                    resolve({
                        success: false,
                        error: "No valid markdown files found",
                    });
                    return;
                }

                console.log(`📂 Loaded ${files.length} markdown files for bulk import`);

                resolve({
                    success: true,
                    files,
                });
            } catch (err) {
                console.error("Failed to read markdown files:", err);
                resolve({
                    success: false,
                    error: err instanceof Error ? err.message : "Failed to read files",
                });
            }
        };

        input.oncancel = () => {
            resolve({
                success: false,
                error: "Cancelled",
            });
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
}

/**
 * Check if a file is a valid canvas state file
 */
export function isCanvasStateFile(file: File): boolean {
    return file.name.endsWith(STATE_FILE_EXTENSION) ||
           file.name.endsWith(EXCALIDRAW_EXTENSION) ||
           file.name.endsWith('.md');
}

export { STATE_FILE_VERSION, STATE_FILE_EXTENSION, EXCALIDRAW_EXTENSION };
