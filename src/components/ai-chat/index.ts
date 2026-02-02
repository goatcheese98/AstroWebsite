/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                     📦 ai-chat/index.ts                                      ║
 * ║                    "The AI Chat Module Export Hub"                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: ⚪ Barrel Export | 📚 Module Entry Point | 🏗️ Public API         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the public face of the AI Chat module. I decide what the outside world
 * can see and use from this module. I'm a "barrel" file - I re-export everything
 * that should be publicly accessible, creating a clean API surface for consumers.
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Developers importing from this module shouldn't need to know the internal
 * file structure. I provide:
 * - Single import point for all chat functionality
 * - Clean, organized exports by category
 * - Type definitions for TypeScript users
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   Inside the module:        Outside consumers:                   │
 *      │   ┌─────────────┐          ┌──────────────┐                     │
 *      │   │ All hooks   │◀─────────│ Other parts  │                     │
 *      │   │ All comps   │          │ of the app   │                     │
 *      │   │ All types   │          └──────────────┘                     │
 *      │   └──────┬──────┘                                              │
 *      │          │                                                     │
 *      │          ▼                                                     │
 *      │   ┌─────────────┐                                              │
 *      │   │      ME     │                                              │
 *      │   │  (index.ts) │                                              │
 *      │   └─────────────┘                                              │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Import errors, missing exports, TypeScript compilation fails
 * - User Impact: Can't use the AI Chat module
 * - Quick Fix: Check all exports match actual file names
 * - Debug: Verify file paths are correct
 * 
 * 📦 EXPORTS:
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ Components: AIChatContainer, PathfinderBotAvatar, ImageGenerationModal,   │
 * │             TemplateModal                                                   │
 * │ Hooks:      useElementSelection                                            │
 * │ Types:      Message, MessageContent, MessageMetadata, CanvasContext, etc. │
 * └────────────────────────────────────────────────────────────────────────────┘
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Added exports for new hooks and components
 * 2026-02-02: Organized exports by category (components, hooks, types)
 * 
 * @module ai-chat
 */

// Components
export { default as AIChatContainer } from "./AIChatContainer";
export { default as PathfinderBotAvatar } from "./PathfinderBotAvatar";
export { default as ImageGenerationModal } from "./ImageGenerationModal";
export { default as TemplateModal } from "./TemplateModal";

// Sub-components (for advanced use cases)
export { ChatPanel } from "./components/ChatPanel";
export { ChatHeader } from "./components/ChatHeader";
export { CanvasContextPanel } from "./components/CanvasContextPanel";
export { ImageGallery } from "./components/ImageGallery";
export { MessageList } from "./components/MessageList";
export { MessageBubble } from "./components/MessageBubble";
export { ChatInput } from "./components/ChatInput";

// Hooks
export { useElementSelection } from "./useElementSelection";
export { useAIChatState } from "./hooks/useAIChatState";
export { useImageGeneration } from "./hooks/useImageGeneration";
export { useScreenshotCapture } from "./hooks/useScreenshotCapture";
export { useCanvasCommands } from "./hooks/useCanvasCommands";
export { usePanelResize } from "./hooks/usePanelResize";
export { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

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

// Constants
export { QUICK_TEMPLATES, TEMPLATE_CATEGORIES } from "./constants/promptTemplates";
