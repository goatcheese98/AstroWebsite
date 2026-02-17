/**
 * Shared Store Types
 * 
 * Core type definitions used across all store slices.
 * This is the single source of truth for store shapes.
 */

import type { StoreApi } from 'zustand';

// ============================================================================
// Base Types
// ============================================================================

export type AIProvider = "kimi" | "claude";
export type ContextMode = "all" | "selected";

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'loading';
  duration?: number;
}

// ============================================================================
// Canvas Types
// ============================================================================

export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  fillStyle?: string;
  roundness?: { type: number } | null;
  locked?: boolean;
  customData?: Record<string, any>;
  version?: number;
  versionNonce?: number;
  [key: string]: any;
}

export interface ExcalidrawAppState {
  scrollX: number;
  scrollY: number;
  zoom: { value: number };
  selectedElementIds: Record<string, boolean>;
  viewBackgroundColor?: string;
  currentItemStrokeColor?: string;
  currentItemBackgroundColor?: string;
  currentItemFillStyle?: string;
  currentItemStrokeWidth?: number;
  currentItemRoughness?: number;
  currentItemOpacity?: number;
  currentItemFontFamily?: string;
  currentItemFontSize?: number;
  currentItemTextAlign?: string;
  currentItemStrokeStyle?: string;
  currentItemRoundness?: number;
  width?: number;
  height?: number;
  collaborators?: Map<string, any>;
  [key: string]: any;
}

export interface ExcalidrawAPI {
  getSceneElements: () => ExcalidrawElement[];
  getAppState: () => ExcalidrawAppState;
  getFiles: () => Record<string, any>;
  updateScene: (updates: { elements?: any[]; appState?: any; files?: any }) => void;
  addFiles: (files: any[]) => void;
  setToast: (toast: { message: string; duration?: number }) => void;
  [key: string]: any;
}

export interface CanvasData {
  elements: ExcalidrawElement[];
  appState: Partial<ExcalidrawAppState>;
  files: Record<string, any> | null;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface MessageContent {
  type: 'text' | 'image';
  text?: string;
  url?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: MessageContent[];
  metadata?: {
    timestamp: Date;
    model?: string;
    provider?: AIProvider;
    canvasContext?: {
      elementCount: number;
      selectedElementIds: string[];
      viewport: any;
    };
  };
  reactions?: string[];
  status?: 'sending' | 'sent' | 'error';
  drawingCommand?: any[];
  sourceCode?: string;
}

// ============================================================================
// Command Types
// ============================================================================

export type CommandType = 
  | 'insertImage'
  | 'insertSvg'
  | 'drawElements'
  | 'updateElements'
  | 'captureScreenshot'
  | 'loadMarkdownFiles'
  | 'webembed:selected'
  | 'markdown:edit';

export interface CommandPayload {
  insertImage: { imageData: string; type: string; width?: number; height?: number };
  insertSvg: { svgPath: string; svgId: string };
  drawElements: { elements: any[]; isModification?: boolean };
  updateElements: { elements: any[] };
  captureScreenshot: { elementIds?: string[]; quality?: 'low' | 'high' | 'preview'; backgroundColor?: string };
  loadMarkdownFiles: { files: FileList };
  'webembed:selected': { url: string; title: string; elementId: string };
  'markdown:edit': { elementId: string; mode?: 'raw' | 'hybrid' };
}

export interface PendingCommand<T extends CommandType = CommandType> {
  type: T;
  payload: CommandPayload[T];
  timestamp: string;
  resolve?: (value: any) => void;
  reject?: (error: Error) => void;
}

// ============================================================================
// Async Operation Types
// ============================================================================

export type AsyncOperationStatus = 'pending' | 'progress' | 'completed' | 'failed';

export interface AsyncOperation {
  id: string;
  type: string;
  status: AsyncOperationStatus;
  progress?: number;
  result?: any;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

// ============================================================================
// Store State Interface (combination of all slices)
// ============================================================================

export interface StoreState extends
  CanvasSlice,
  UISlice,
  ChatSlice,
  CommandSlice,
  AsyncSlice {
  // This is the combined store type
}

export type StoreSet = StoreApi<StoreState>['setState'];
export type StoreGet = StoreApi<StoreState>['getState'];

// ============================================================================
// Slice Interfaces
// ============================================================================

export interface CanvasSlice {
  // State
  elements: ExcalidrawElement[];
  appState: Partial<ExcalidrawAppState>;
  files: Record<string, any> | null;
  excalidrawAPI: ExcalidrawAPI | null;
  isExcalidrawReady: boolean;
  canvasId: string | null;
  canvasTitle: string;
  isDirty: boolean;
  lastSaved: Date | null;
  
  // Actions
  setCanvasData: (data: CanvasData) => void;
  setElements: (elements: ExcalidrawElement[]) => void;
  setAppState: (appState: Partial<ExcalidrawAppState>) => void;
  setExcalidrawAPI: (api: ExcalidrawAPI | null) => void;
  setCanvasId: (id: string | null) => void;
  setCanvasTitle: (title: string) => void;
  setDirty: (dirty: boolean) => void;
  setLastSaved: (date: Date | null) => void;
  resetCanvas: () => void;
  
  // Selectors (computed)
  getSceneElements: () => ExcalidrawElement[];
  getAppState: () => Partial<ExcalidrawAppState>;
  getSelectedElementIds: () => string[];
  getSelectedElements: () => ExcalidrawElement[];
  getExcalidrawAPI: () => ExcalidrawAPI | null;
}

export interface UISlice {
  // State
  isChatOpen: boolean;
  isChatMinimized: boolean;
  isAssetsOpen: boolean;
  isShareModalOpen: boolean;
  isImageGenModalOpen: boolean;
  isSaveModalOpen: boolean;
  toasts: Toast[];
  
  // Actions
  setChatOpen: (open: boolean) => void;
  setChatMinimized: (minimized: boolean) => void;
  toggleChat: () => void;
  setAssetsOpen: (open: boolean) => void;
  toggleAssets: () => void;
  setShareModalOpen: (open: boolean) => void;
  setImageGenModalOpen: (open: boolean) => void;
  setSaveModalOpen: (open: boolean) => void;
  
  // Toast actions
  addToast: (message: string, type: Toast['type'], duration?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Selectors
  isAnyModalOpen: () => boolean;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt?: string;
  timestamp: Date;
  width?: number;
  height?: number;
}

export interface ChatSlice {
  // State
  messages: Message[];
  aiProvider: AIProvider;
  contextMode: ContextMode;
  isChatLoading: boolean;
  chatError: string | null;
  imageHistory: GeneratedImage[];
  
  // Actions
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  setAIProvider: (provider: AIProvider | ((prev: AIProvider) => AIProvider)) => void;
  setContextMode: (mode: ContextMode) => void;
  setChatLoading: (loading: boolean) => void;
  setChatError: (error: string | null) => void;
  clearChatError: () => void;
  // Image history actions
  addGeneratedImage: (image: GeneratedImage) => void;
  removeGeneratedImage: (id: string) => void;
  clearImageHistory: () => void;
}

export interface CommandSlice {
  // State
  pendingCommand: PendingCommand | null;
  
  // Actions
  dispatchCommand: <T extends CommandType>(
    type: T,
    payload: CommandPayload[T]
  ) => Promise<any>;
  clearCommand: () => void;
  resolveCommand: (result?: any) => void;
  rejectCommand: (error: Error) => void;
}

export interface AsyncSlice {
  // State
  operations: Map<string, AsyncOperation>;
  
  // Actions
  startOperation: (id: string, type: string) => void;
  updateOperation: (id: string, progress: number) => void;
  completeOperation: (id: string, result?: any) => void;
  failOperation: (id: string, error: string) => void;
  removeOperation: (id: string) => void;
  
  // Selectors
  getOperation: (id: string) => AsyncOperation | undefined;
  isOperationPending: (id: string) => boolean;
}
