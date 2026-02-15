// Components
export { default as AIChatContainer } from "./AIChatContainer";
export { default as PathfinderBotAvatar } from "./PathfinderBotAvatar";
export { default as ImageGenerationModal } from "./ImageGenerationModal";
export { default as TemplateModal } from "./TemplateModal";

// Sub-components (for advanced use cases)
export { ChatPanel } from "./components/ChatPanel";
export { ChatHeader } from "./components/ChatHeader";
export { CanvasContextPanel } from "./components/CanvasContextPanel";
export { CanvasContextOverlay } from "./components/CanvasContextOverlay";
export { ImageGallery } from "./components/ImageGallery";
export { MessageList } from "./components/MessageList";
export { MessageBubble } from "./components/message"; // Barrel export from message/ folder
export { ChatInput } from "./components/ChatInput";

// Hooks
export { useElementSelection } from "./useElementSelection";
export { useAIChatState } from "./hooks/useAIChatState";
export { useImageGeneration } from "./hooks/useImageGeneration";
export { useScreenshotCapture } from "./hooks/useScreenshotCapture";
export { useCanvasCommands } from "./hooks/useCanvasCommands";
export { usePanelResize } from "./hooks/usePanelResize";
export { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
export { useMobileDetection } from "./hooks/useMobileDetection";

// Types
export type {
    Message,
    MessageContent,
    MessageMetadata,
    CanvasContext,
    CanvasElementSnapshot,
    Reaction,
    Thread,
    PromptTemplate,
    ChatMode,
    AIChatState,
    AIChatActions,
    CanvasSelectionEvent,
    ElementContext,
} from "./types";

export type { GenerationOptions } from "./ImageGenerationModal";
export type { 
    UseAIChatStateOptions, 
    UseAIChatStateReturn,
    SendMessageOptions 
} from "./hooks/useAIChatState";
export type { 
    UseImageGenerationReturn,
    ImageHistoryItem 
} from "./hooks/useImageGeneration";
export type { 
    UseScreenshotCaptureOptions,
    UseScreenshotCaptureReturn,
    ScreenshotQuality,
    ScreenshotRequestOptions,
    ScreenshotResult 
} from "./hooks/useScreenshotCapture";
export type { 
    UseCanvasCommandsOptions,
    UseCanvasCommandsReturn 
} from "./hooks/useCanvasCommands";
export type { 
    UsePanelResizeOptions,
    UsePanelResizeReturn 
} from "./hooks/usePanelResize";
export type { 
    UseKeyboardShortcutsOptions,
    UseKeyboardShortcutsReturn 
} from "./hooks/useKeyboardShortcuts";
export type { 
    MobileDetectionState 
} from "./hooks/useMobileDetection";

// Constants
export { QUICK_TEMPLATES, TEMPLATE_CATEGORIES } from "./constants/promptTemplates";
