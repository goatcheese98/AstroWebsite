// AI Chat Types - Enterprise Grade

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: MessageContent[];
    metadata: MessageMetadata;
    reactions: Reaction[];
    threadId?: string;
    parentId?: string;
    status: "sending" | "sent" | "error" | "editing";
    drawingCommand?: any[]; // Store the parsed JSON elements for copy functionality
    sourceCode?: string; // Original Mermaid/JSON code before processing (for "Show Code" feature)
}

export type MessageContent = 
    | { type: "text"; text: string }
    | { type: "code"; code: string; language: string; filename?: string }
    | { type: "image"; url: string; width?: number; height?: number; alt?: string }
    | { type: "drawing"; elements: any[]; preview?: string }
    | { type: "canvas-reference"; elementIds: string[]; snapshot?: CanvasElementSnapshot[] }
    | { type: "file"; name: string; size: number; url: string; mimeType: string };

export interface MessageMetadata {
    timestamp: Date;
    model?: string;
    provider?: "kimi" | "claude";
    tokens?: { input: number; output: number };
    latency?: number;
    canvasContext?: CanvasContext;
    editHistory?: { timestamp: Date; content: string }[];
}

export interface CanvasContext {
    elementCount: number;
    selectedElementIds: string[];
    viewport: {
        scrollX: number;
        scrollY: number;
        zoom: number;
    };
    snapshot?: string; // Base64 thumbnail
}

export interface CanvasElementSnapshot {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    label?: string;
    selected: boolean;
    // Image-specific fields
    fileId?: string;
    imageDataURL?: string; // Base64 data URL for image preview
}

export interface Reaction {
    emoji: string;
    userId: string;
    timestamp: Date;
}

export interface Thread {
    id: string;
    title: string;
    messageIds: string[];
    createdAt: Date;
    updatedAt: Date;
    resolved: boolean;
}

export interface PromptTemplate {
    id: string;
    icon: string;
    title: string;
    description: string;
    template: string;
    variables: { name: string; label: string; type: "text" | "select"; options?: string[] }[];
}

export type ChatMode = "text" | "image" | "code";

export interface AIChatState {
    // UI State
    isOpen: boolean;
    panelWidth: number;
    isCollapsed: boolean;
    activeThread: string | null;
    viewMode: "compact" | "comfortable";
    
    // Data
    messages: Message[];
    threads: Thread[];
    input: string;
    isLoading: boolean;
    error: string | null;
    
    // Canvas Integration
    canvasState: any | null;
    selectedElements: string[]; // IDs of selected elements
    elementSelectionMode: boolean;
    
    // AI Config
    model: string;
    temperature: number;
    maxTokens: number;
    
    // Search & Filter
    searchQuery: string;
    activeFilters: string[];
}

export interface AIChatActions {
    // Message Actions
    sendMessage: (content: string, options?: { canvasRefs?: string[] }) => Promise<void>;
    editMessage: (id: string, content: string) => void;
    deleteMessage: (id: string) => void;
    retryMessage: (id: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
    
    // Element Selection
    toggleElementSelection: (elementId: string) => void;
    selectElements: (elementIds: string[]) => void;
    clearElementSelection: () => void;
    setElementSelectionMode: (enabled: boolean) => void;
    
    // Thread Actions
    createThread: (messageId: string, title: string) => string;
    resolveThread: (threadId: string) => void;
    
    // UI Actions
    setInput: (value: string) => void;
    setPanelWidth: (width: number) => void;
    toggleCollapse: () => void;
    setSearchQuery: (query: string) => void;
    
    // Export
    exportConversation: (format: "md" | "json" | "pdf") => Blob;
    clearConversation: () => void;
}

// Event types for canvas communication
export interface CanvasSelectionEvent {
    elementIds: string[];
    action: "add" | "remove" | "set";
}

export interface ElementContext {
    id: string;
    type: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    content?: string;
    metadata?: Record<string, any>;
}
