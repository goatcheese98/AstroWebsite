// AI Chat Components - Enterprise Grade

export { default as AIChatContainer } from "./AIChatContainer";
export { default as PathfinderBotAvatar } from "./PathfinderBotAvatar";
export { default as ImageGenerationModal } from "./ImageGenerationModal";
export { default as TemplateModal } from "./TemplateModal";
export { useElementSelection } from "./useElementSelection";

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
