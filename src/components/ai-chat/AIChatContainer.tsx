import React, { useState, useRef, useEffect, useCallback } from "react";
import { useElementSelection } from "./useElementSelection";
import type { Message, PromptTemplate } from "./types";
import type { GenerationOptions } from "./ImageGenerationModal";
import { nanoid } from "nanoid";
import PathfinderBotAvatar from "./PathfinderBotAvatar";
import ImageGenerationModal from "./ImageGenerationModal";
import TemplateModal from "./TemplateModal";

// Quick prompt templates
const PROMPT_TEMPLATES: PromptTemplate[] = [
    {
        id: "ui-mockup",
        icon: "🎨",
        title: "UI Mockup",
        description: "Create wireframe for web/mobile",
        template: "Create a {platform} wireframe for {description}",
        variables: [
            { name: "platform", label: "Platform", type: "select", options: ["web", "mobile", "tablet"] },
            { name: "description", label: "Description", type: "text" }
        ]
    },
    {
        id: "flowchart",
        icon: "🔄",
        title: "Flowchart",
        description: "Process flow diagram",
        template: "Create a flowchart for: {process}",
        variables: [{ name: "process", label: "Process", type: "text" }]
    },
    {
        id: "architecture",
        icon: "🏗️",
        title: "Architecture",
        description: "System design diagram",
        template: "Design system architecture for: {system}",
        variables: [{ name: "system", label: "System", type: "text" }]
    },
    {
        id: "explain",
        icon: "💡",
        title: "Explain",
        description: "Explain selected elements",
        template: "Explain these canvas elements and suggest improvements",
        variables: []
    }
];

type AIProvider = "kimi" | "claude";

interface AIChatContainerProps {
    isOpen: boolean;
    onClose: () => void;
    initialWidth?: number;
}

export default function AIChatContainer({ isOpen, onClose, initialWidth = 400 }: AIChatContainerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [panelWidth, setPanelWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [canvasState, setCanvasState] = useState<any>(null);
    const [contextMode, setContextMode] = useState<"all" | "selected">("all");
    const [aiProvider, setAiProvider] = useState<AIProvider>("kimi");
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [screenshotData, setScreenshotData] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showImageGenModal, setShowImageGenModal] = useState(false);
    const [pendingGenerationOptions, setPendingGenerationOptions] = useState<GenerationOptions | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [imageHistory, setImageHistory] = useState<Array<{id: string; url: string; prompt: string; timestamp: Date}>>([]);
    const [isCaptureForChat, setIsCaptureForChat] = useState(false);
    const [chatScreenshotData, setChatScreenshotData] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const generationRequestIdRef = useRef<string | null>(null);
    const chatRequestIdRef = useRef<string | null>(null);

    // Element selection hook
    const {
        selectedElements,
        isSelectionMode,
        selectElements,
        clearSelection,
        setSelectionMode,
        getSelectionContext,
        elementSnapshots,
    } = useElementSelection({
        enabled: isOpen,
        onSelectionChange: (ids) => {
            // Sync with Excalidraw's actual selection
            syncWithExcalidrawSelection();
        },
    });

    // Request initial canvas state once on mount
    useEffect(() => {
        const timeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent("excalidraw:get-state"));
        }, 100);
        return () => clearTimeout(timeout);
    }, []);

    // Listen for canvas state and selection changes
    useEffect(() => {
        const handleCanvasUpdate = (event: any) => {
            // Only update if we have actual data
            if (!event.detail) return;

            // Always update canvas state to ensure proper synchronization
            setCanvasState(event.detail);

            // Sync selection from Excalidraw (without causing re-renders)
            if (event.detail?.appState?.selectedElementIds) {
                const selectedIds = Object.entries(event.detail.appState.selectedElementIds)
                    .filter(([_, selected]) => selected)
                    .map(([id]) => id);

                if (selectedIds.length > 0) {
                    selectElements(selectedIds);
                }
            }
        };

        window.addEventListener("excalidraw:state-update", handleCanvasUpdate);

        return () => {
            window.removeEventListener("excalidraw:state-update", handleCanvasUpdate);
        };
    }, [selectElements]);

    // Auto-switch to "Selected" mode when elements are selected on canvas
    useEffect(() => {
        if (selectedElements.length > 0 && contextMode === "all") {
            setContextMode("selected");
        }
    }, [selectedElements.length, contextMode]);

    // Listen for newly added elements from AI and select them
    useEffect(() => {
        const handleElementsAdded = (event: any) => {
            const { elementIds } = event.detail;
            if (elementIds && Array.isArray(elementIds) && elementIds.length > 0) {
                console.log("📥 New elements added, selecting them:", elementIds);
                // Add new elements to current selection
                selectElements([...selectedElements, ...elementIds]);
            }
        };

        window.addEventListener("excalidraw:elements-added", handleElementsAdded);

        return () => {
            window.removeEventListener("excalidraw:elements-added", handleElementsAdded);
        };
    }, [selectElements, selectedElements]);

    // Cleanup: Ensure onClose is called when component unmounts unexpectedly
    useEffect(() => {
        return () => {
            // If component unmounts while still "open", notify parent
            if (isOpen) {
                console.warn("AIChatContainer unmounting while open - calling onClose");
                onClose();
            }
        };
    }, [isOpen, onClose]);

    // Handle generation when options are ready from modal
    useEffect(() => {
        if (pendingGenerationOptions && !isCapturing && !generationRequestIdRef.current) {
            setIsCapturing(true);

            // Create unique request ID for this generation
            const requestId = `generation-${Date.now()}`;
            generationRequestIdRef.current = requestId;

            console.log("🎨 Starting image generation with requestId:", requestId);

            // Capture screenshot with the selected options
            window.dispatchEvent(new CustomEvent("excalidraw:capture-screenshot", {
                detail: {
                    elementIds: selectedElements.length > 0 ? selectedElements : undefined,
                    quality: "high",
                    backgroundColor: pendingGenerationOptions.backgroundColor !== "canvas"
                        ? pendingGenerationOptions.backgroundColor
                        : undefined,
                    requestId: requestId,
                }
            }));
        }
    }, [pendingGenerationOptions, selectedElements]); // Removed isCapturing from dependencies to prevent loop

    // Listen for screenshot capture events (for both generation and chat)
    useEffect(() => {
        const handleScreenshotCaptured = (event: any) => {
            // Handle image generation screenshots
            if (generationRequestIdRef.current && event.detail.requestId === generationRequestIdRef.current) {
                console.log("✅ Received screenshot for image generation:", event.detail.requestId);
                setIsCapturing(false);

                if (event.detail.error) {
                    console.error("Screenshot error:", event.detail.error);
                    setError("Screenshot failed: " + event.detail.error);
                    setIsGeneratingImage(false);
                    generationRequestIdRef.current = null;
                    return;
                }

                setScreenshotData(event.detail.dataURL);
                console.log(`📸 Screenshot captured: ${event.detail.elementCount} elements`);
                return;
            }

            // Handle chat screenshots
            if (chatRequestIdRef.current && event.detail.requestId === chatRequestIdRef.current) {
                console.log("✅ Received screenshot for chat:", event.detail.requestId);
                setIsCaptureForChat(false);

                if (event.detail.error) {
                    console.error("Chat screenshot error:", event.detail.error);
                    chatRequestIdRef.current = null;
                    // Continue without screenshot
                    setChatScreenshotData(null);
                    return;
                }

                setChatScreenshotData(event.detail.dataURL);
                console.log(`📸 Chat screenshot captured: ${event.detail.elementCount} elements`);
            }
        };

        window.addEventListener("excalidraw:screenshot-captured", handleScreenshotCaptured);
        return () => {
            window.removeEventListener("excalidraw:screenshot-captured", handleScreenshotCaptured);
        };
    }, []);

    // Generate image after screenshot is captured
    useEffect(() => {
        if (screenshotData && !isGeneratingImage && generationRequestIdRef.current) {
            console.log("🚀 Starting image generation...");
            generateImageFromScreenshot();
        }
    }, [screenshotData]);

    // Continue sending chat message after screenshot is captured
    useEffect(() => {
        if (chatScreenshotData && !isLoading && input.trim()) {
            console.log("📤 Screenshot ready, continuing with send...");
            // Trigger the actual send by calling the send logic directly
            // Don't call handleSend recursively - just set a flag
            sendMessageWithScreenshot();
        }
    }, [chatScreenshotData]);

    // Image generation function using screenshot
    const generateImageFromScreenshot = useCallback(async () => {
        if (!screenshotData || !pendingGenerationOptions) return;
        
        setIsGeneratingImage(true);
        setError(null);
        
        try {
            // Build comprehensive prompt with strict instructions
            let systemInstructions = "You are an expert UI/UX designer tasked with transforming wireframes into photorealistic designs.\n\n";

            // Add background color instruction FIRST (most important)
            const bgColor = pendingGenerationOptions.backgroundColor;
            if (bgColor && bgColor !== "canvas") {
                systemInstructions += `CRITICAL: The background color MUST be exactly ${bgColor}. Do not deviate from this color under any circumstances.\n\n`;
            }

            // Add layout instructions based on strict ratio setting
            if (pendingGenerationOptions.strictRatio) {
                systemInstructions += `LAYOUT REQUIREMENTS (MANDATORY):
1. Maintain EXACT element positions - do not move any elements from their locations in the wireframe
2. Preserve PRECISE proportions - element sizes must match the wireframe exactly (1:1 ratio)
3. Keep IDENTICAL spacing - gaps between elements must be the same as shown
4. Follow the EXACT composition - overall layout structure cannot change
5. Maintain relative sizes - if element A is 2x larger than element B in the wireframe, keep this ratio

`;
            } else {
                systemInstructions += `LAYOUT REQUIREMENTS:
1. Follow the general layout structure shown in the wireframe
2. Element positions should be similar but can be adjusted for visual balance
3. Proportions should be close to the reference but can be refined for aesthetics
4. You have creative freedom to improve spacing and alignment

`;
            }

            // Add the user's creative prompt
            systemInstructions += `DESIGN VISION:\n${pendingGenerationOptions.prompt}\n\n`;

            // Add quality and rendering instructions
            systemInstructions += `RENDERING REQUIREMENTS:
- Produce a photorealistic, high-quality design
- Use modern design principles (proper shadows, gradients, depth)
- Ensure professional polish and attention to detail
- Make it look like a finished product, not a prototype
${bgColor && bgColor !== "canvas" ? `- Background must be ${bgColor} with NO variations or gradients\n` : ""}
- If the reference shows UI elements (buttons, cards, text), make them look realistic and functional

IMPORTANT: Study the reference image carefully before generating. Your output MUST respect the layout constraints specified above.`;

            console.log('🎨 Generating image with enhanced prompt');
            console.log('🤖 Model:', pendingGenerationOptions.useProModel ? 'Gemini 3 Pro Image' : 'Gemini 2.5 Flash Image');
            console.log('📐 Strict ratio:', pendingGenerationOptions.strictRatio);
            console.log('🎨 Background:', bgColor || 'canvas default');

            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: systemInstructions,
                    model: pendingGenerationOptions.useProModel
                        ? "gemini-3-pro-image-preview"
                        : "gemini-2.5-flash-image",
                    imageData: screenshotData,
                    mode: "visual",
                }),
            });
            
            const data = await response.json();
            
            // Close modal on success or error
            setShowImageGenModal(false);
            setPendingGenerationOptions(null);
            
            if (!response.ok) {
                // Check for specific error cases
                if (data.details?.includes('understand') || data.details?.includes('cannot')) {
                    setError("I do not understand this prompt or context. Please provide clearer instructions about what you want to create.");
                } else {
                    throw new Error(data.details || data.error || "Image generation failed");
                }
                return;
            }
            
            // Check if AI responded with text saying it doesn't understand
            if (data.message && (
                data.message.toLowerCase().includes('do not understand') ||
                data.message.toLowerCase().includes('cannot understand') ||
                data.message.toLowerCase().includes('unclear')
            )) {
                setError("I do not understand this prompt or context. Please provide clearer instructions about what you want to create.");
                return;
            }
            
            // Insert the generated image into canvas
            const imageDataUrl = `data:${data.mimeType};base64,${data.imageData}`;

            // Add to image history
            setImageHistory(prev => [{
                id: nanoid(),
                url: imageDataUrl,
                prompt: pendingGenerationOptions.prompt,
                timestamp: new Date(),
            }, ...prev]);

            // Calculate aspect ratio from base64 image
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const maxWidth = 600;
                const width = Math.min(img.width, maxWidth);
                const height = width / aspectRatio;

                window.dispatchEvent(new CustomEvent("excalidraw:insert-image", {
                    detail: {
                        imageData: imageDataUrl,
                        type: "png",
                        width,
                        height,
                    },
                }));
            };
            img.src = imageDataUrl;
            
            console.log('✅ Image generated and inserted');
        } catch (err) {
            console.error("Image generation error:", err);
            setError(err instanceof Error ? err.message : "Image generation failed");
        } finally {
            setIsGeneratingImage(false);
            setScreenshotData(null);
            generationRequestIdRef.current = null; // Clear request ID
            setPendingGenerationOptions(null); // Clear pending options to prevent re-trigger
        }
    }, [screenshotData, pendingGenerationOptions]);



    // Sync selection with Excalidraw
    const syncWithExcalidrawSelection = useCallback(() => {
        const api = (window as any).excalidrawAPI;
        if (!api) return;

        const appState = api.getAppState();
        const selectedIds = Object.entries(appState.selectedElementIds || {})
            .filter(([_, selected]) => selected)
            .map(([id]) => id);
        
        if (selectedIds.length > 0) {
            selectElements(selectedIds);
        }
    }, [selectElements]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Resize functionality
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 320 && newWidth <= window.innerWidth * 0.8) {
                setPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isResizing) {
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    // Execute drawing command (creates new elements)
    const executeDrawingCommand = useCallback((elementsArray: any[], isModification = false) => {
        try {
            if (!Array.isArray(elementsArray)) return false;
            const event = new CustomEvent("excalidraw:draw", {
                detail: { elements: elementsArray, isModification },
            });
            window.dispatchEvent(event);
            return true;
        } catch (err) {
            console.error("Failed to execute drawing command:", err);
            return false;
        }
    }, []);

    // Execute update command (modifies existing elements)
    const executeUpdateCommand = useCallback((elementsArray: any[]) => {
        try {
            if (!Array.isArray(elementsArray)) return false;
            const event = new CustomEvent("excalidraw:update-elements", {
                detail: { elements: elementsArray },
            });
            window.dispatchEvent(event);
            return true;
        } catch (err) {
            console.error("Failed to execute update command:", err);
            return false;
        }
    }, []);

    // Get canvas description
    const getCanvasDescription = useCallback(() => {
        if (!canvasState?.elements?.length) {
            return "The canvas is currently empty.";
        }

        const counts: Record<string, number> = {};
        canvasState.elements.forEach((el: any) => {
            counts[el.type] = (counts[el.type] || 0) + 1;
        });

        const desc = Object.entries(counts)
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');

        return `Canvas has ${canvasState.elements.length} elements: ${desc}`;
    }, [canvasState]);

    // Toggle AI provider
    const toggleAIProvider = () => {
        setAiProvider(prev => prev === "kimi" ? "claude" : "kimi");
    };

    // Actual message sending logic (extracted to prevent recursion)
    const sendMessageWithScreenshot = useCallback(async () => {
        const userContent = input.trim();
        if (!userContent) return;

        // Reset capture state
        setIsCaptureForChat(false);

        // Build context based on mode
        let contextMessage = "";
        let elementDataForPrompt = "";
        let isModifyingElements = false;
        
        if (contextMode === "selected" && selectedElements.length > 0) {
            const selectionContext = getSelectionContext();
            contextMessage = `\n\n[Working with ${selectedElements.length} selected elements:\n${selectionContext}]`;
            
            // Include full element data in the prompt for both providers
            // This allows the AI to modify existing elements by returning the same IDs
            if (canvasState?.elements) {
                const selectedElementData = canvasState.elements.filter((el: any) => 
                    selectedElements.includes(el.id)
                );
                if (selectedElementData.length > 0) {
                    elementDataForPrompt = `\n\nSELECTED ELEMENTS DATA (JSON - MODIFY THESE, PRESERVE IDs):\n${JSON.stringify(selectedElementData, null, 2)}`;
                    isModifyingElements = true;
                }
            }
        } else {
            contextMessage = `\n\n[Canvas has ${canvasState?.elements?.length || 0} total elements]`;
        }

        const fullContent = userContent + contextMessage + elementDataForPrompt;

        const userMessage: Message = {
            id: nanoid(),
            role: "user",
            content: [{ type: "text", text: userContent }],
            metadata: {
                timestamp: new Date(),
                canvasContext: {
                    elementCount: canvasState?.elements?.length || 0,
                    selectedElementIds: selectedElements,
                    viewport: canvasState?.appState || { scrollX: 0, scrollY: 0, zoom: 1 },
                },
            },
            reactions: [],
            status: "sent",
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        // Store screenshot data to send with message
        const screenshotToSend = chatScreenshotData;

        // Clear screenshot data for next message
        setChatScreenshotData(null);
        chatRequestIdRef.current = null;

        try {
            const canvasDescription = getCanvasDescription();
            const selectionContext = selectedElements.length > 0 
                ? `\n\nCurrently selected elements (${selectedElements.length}):\n${getSelectionContext()}`
                : "";
            
            const canvasStateData = {
                description: canvasDescription + selectionContext,
                elementCount: canvasState?.elements?.length || 0,
                selectedElements: selectedElements.length > 0 
                    ? `User has selected ${selectedElements.length} elements: ${getSelectionContext()}`
                    : "No specific elements selected",
                isModifyingElements,
            };

            let response;
            let data;

            if (aiProvider === "kimi") {
                // Kimi API
                console.log('🌙 Sending to Kimi K2.5...');

                response = await fetch("/api/chat-kimi", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [...messages, userMessage].map(m => ({
                            role: m.role,
                            content: fullContent,
                        })),
                        model: "kimi-k2-0711-preview",
                        canvasState: canvasStateData,
                        screenshot: screenshotToSend, // Include screenshot if available
                    }),
                });

                data = await response.json();

                if (!response.ok) {
                    console.error('❌ Kimi API error:', data);

                    // Check for rate limit / overload errors
                    const errorMessage = data.details || data.error || "Kimi API failed";
                    const isOverloaded = errorMessage.toLowerCase().includes('overload') ||
                                       errorMessage.toLowerCase().includes('too many requests') ||
                                       response.status === 429;

                    if (isOverloaded) {
                        throw new Error("Kimi is currently overloaded. Click the green badge above to switch to Claude instead.");
                    }

                    throw new Error(errorMessage);
                }

                console.log('✅ Kimi response received');
            } else {
                // Claude API
                console.log('🎭 Sending to Claude...');

                response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [...messages, userMessage].map(m => ({
                            role: m.role,
                            content: fullContent,
                        })),
                        model: "claude-sonnet-4-20250514",
                        canvasState: canvasStateData,
                        screenshot: screenshotToSend, // Include screenshot if available
                    }),
                });

                data = await response.json();

                if (!response.ok) {
                    console.error('❌ Claude API error:', data);

                    // Check for rate limit errors
                    const errorMessage = data.details || data.error || "Claude API failed";
                    const isOverloaded = errorMessage.toLowerCase().includes('overload') ||
                                       errorMessage.toLowerCase().includes('too many requests') ||
                                       response.status === 429;

                    if (isOverloaded) {
                        throw new Error("Claude is currently overloaded. Try switching to Kimi using the badge above, or wait a moment and try again.");
                    }

                    throw new Error(errorMessage);
                }

                console.log('✅ Claude response received');
            }

            // Parse drawing commands
            let displayMessage = data.message;
            let drawingCommand: any[] | null = null;
            let isModification = false;

            const jsonMatch = data.message.match(/```json\s*\n([\s\S]*?)\n```/) 
                || data.message.match(/```\s*\n([\s\S]*?)\n```/)
                || data.message.match(/\[\s*\{[\s\S]*?\}\s*\]/);

            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        drawingCommand = parsed;
                        
                        // Separate elements into updates (have IDs matching selection) and new elements
                        const selectedIds = new Set(selectedElements);
                        const elementsToUpdate: any[] = [];
                        const elementsToAdd: any[] = [];
                        
                        parsed.forEach((el: any) => {
                            if (el.id && selectedIds.has(el.id)) {
                                // Existing element to update
                                elementsToUpdate.push(el);
                            } else {
                                // New element to add
                                elementsToAdd.push(el);
                            }
                        });
                        
                        let updateSuccess = false;
                        let addSuccess = false;
                        
                        // Update existing elements
                        if (elementsToUpdate.length > 0) {
                            updateSuccess = executeUpdateCommand(elementsToUpdate);
                            isModification = true;
                        }
                        
                        // Add new elements (pass isModification flag to preserve positioning)
                        if (elementsToAdd.length > 0) {
                            addSuccess = executeDrawingCommand(elementsToAdd, isModification || contextMode === "selected");
                        }
                        
                        // Build appropriate success message
                        if (elementsToUpdate.length > 0 && elementsToAdd.length > 0) {
                            displayMessage = data.message.replace(
                                jsonMatch[0],
                                (updateSuccess && addSuccess)
                                    ? `\n\n✅ **${elementsToUpdate.length} element(s) updated, ${elementsToAdd.length} new element(s) added!**\n`
                                    : "\n\n⚠️ **Some operations failed**\n"
                            );
                        } else if (elementsToUpdate.length > 0) {
                            displayMessage = data.message.replace(
                                jsonMatch[0],
                                updateSuccess
                                    ? "\n\n✅ **Elements updated!**\n" 
                                    : "\n\n⚠️ **Failed to update elements**\n"
                            );
                        } else {
                            displayMessage = data.message.replace(
                                jsonMatch[0],
                                addSuccess
                                    ? "\n\n✅ **Drawing added to canvas!**\n" 
                                    : "\n\n⚠️ **Failed to add drawing**\n"
                            );
                        }
                    }
                } catch (err) {
                    console.error("Failed to parse drawing command:", err);
                }
            }

            const assistantMessage: Message = {
                id: nanoid(),
                role: "assistant",
                content: [{ type: "text", text: displayMessage }],
                metadata: {
                    timestamp: new Date(),
                    model: data.model || (aiProvider === "kimi" ? "kimi-k2-0711-preview" : "claude-sonnet-4-20250514"),
                    provider: aiProvider,
                },
                reactions: [],
                status: "sent",
                drawingCommand: drawingCommand || undefined,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }, [input, contextMode, selectedElements, canvasState, chatScreenshotData, messages, aiProvider, getSelectionContext, getCanvasDescription, executeDrawingCommand, executeUpdateCommand]);

    // Send message (with optional screenshot for selected elements)
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        // Skip screenshot for Kimi (doesn't support image input)
        const isKimi = aiProvider === "kimi";
        
        // If in selected mode with elements and we don't have a screenshot yet, capture one first
        // BUT skip screenshot capture for Kimi since it doesn't support images
        if (!isKimi && contextMode === "selected" && selectedElements.length > 0 && !chatScreenshotData && !isCaptureForChat) {
            setIsCaptureForChat(true);
            const requestId = `chat-${Date.now()}`;
            chatRequestIdRef.current = requestId;

            console.log("📸 Capturing screenshot for chat with requestId:", requestId);

            window.dispatchEvent(new CustomEvent("excalidraw:capture-screenshot", {
                detail: {
                    elementIds: selectedElements,
                    quality: "low", // Low quality for fast transmission
                    requestId: requestId,
                }
            }));

            // Wait for screenshot to be captured (will trigger sendMessageWithScreenshot via useEffect)
            return;
        }

        // If we reach here, either we have a screenshot, don't need one, or we're using Kimi (no screenshot)
        await sendMessageWithScreenshot();
    };

    // Handle template selection
    const handleTemplateSelect = (template: PromptTemplate) => {
        if (template.variables.length === 0) {
            setInput(template.template);
        } else {
            let filled = template.template;
            template.variables.forEach(v => {
                const value = v.type === "select" ? v.options?.[0] || "" : `[${v.label}]`;
                filled = filled.replace(`{${v.name}}`, value);
            });
            setInput(filled);
        }
        setShowTemplateModal(false);
        setShowTemplates(false);
        inputRef.current?.focus();
    };

    // Copy image to clipboard
    const copyImageToClipboard = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            console.log("✅ Image copied to clipboard");
        } catch (err) {
            console.error("Failed to copy image:", err);
        }
    };

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === "Escape") {
            if (isSelectionMode) {
                setSelectionMode(false);
            } else {
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Panel */}
            <div
                ref={panelRef}
                className="ai-chat-container"
                style={{
                    position: "fixed",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${panelWidth}px`,
                    background: "var(--color-surface, #ffffff)",
                    borderLeft: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.08)",
                    zIndex: 999,
                    display: "flex",
                    flexDirection: "column",
                    animation: "slideIn 0.25s ease",
                    pointerEvents: "auto", // Re-enable pointer events on the panel itself
                }}
            >
                {/* Resize Handle */}
                <div
                    onMouseDown={handleResizeStart}
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        cursor: "ew-resize",
                        zIndex: 1000,
                        background: "transparent",
                        transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-accent, #6366f1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                />

                {/* Header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    background: "var(--color-bg, #fafafa)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>💬</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h2 style={{
                                margin: 0,
                                fontFamily: "var(--font-hand, sans-serif)",
                                fontSize: "17px",
                                fontWeight: 600,
                                color: "var(--color-text, #1f2937)",
                            }}>
                                AI Assistant
                            </h2>
                            {/* Clickable AI Provider Badge */}
                            <button
                                onClick={toggleAIProvider}
                                title={`Click to switch to ${aiProvider === "kimi" ? "Claude (premium)" : "Kimi"}`}
                                style={{
                                    fontSize: "10px",
                                    padding: "2px 6px",
                                    background: aiProvider === "kimi" ? "#10b981" : "#047857",
                                    color: "white",
                                    borderRadius: "4px",
                                    fontWeight: 500,
                                    border: aiProvider === "kimi" ? "1px solid #059669" : "1px solid #065f46",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = aiProvider === "kimi" ? "#059669" : "#065f46";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = aiProvider === "kimi" ? "#10b981" : "#047857";
                                }}
                            >
                                {aiProvider === "kimi" ? "Kimi K2.5" : "Claude"}
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            color: "var(--color-text-muted, #6b7280)",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--color-fill-1, #f3f4f6)";
                            e.currentTarget.style.color = "var(--color-text, #1f2937)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--color-text-muted, #6b7280)";
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Canvas Context - NEW: All vs Selected Toggle */}
                <div style={{
                    padding: "14px 18px",
                    background: "var(--color-fill-1, #f3f4f6)",
                    borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                    }}>
                        <span style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--color-text-muted, #6b7280)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}>
                            Canvas Context
                        </span>
                        {canvasState?.elements?.length > 0 && (
                            <span style={{
                                fontSize: "11px",
                                color: "var(--color-text-muted, #6b7280)",
                            }}>
                                {canvasState.elements.length} elements
                            </span>
                        )}
                    </div>

                    {/* Context Mode Toggle */}
                    <div style={{
                        display: "flex",
                        background: "var(--color-surface, #ffffff)",
                        borderRadius: "8px",
                        padding: "3px",
                        marginBottom: "10px",
                        border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    }}>
                        <button
                            onClick={() => {
                                setContextMode("all");
                                clearSelection(); // Clear selection when switching to "All" mode
                            }}
                            style={{
                                flex: 1,
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: contextMode === "all" ? "1px solid #047857" : "1px solid #fca5a5",
                                background: contextMode === "all"
                                    ? "#059669"
                                    : "#fee2e2",
                                color: contextMode === "all"
                                    ? "white"
                                    : "#9ca3af",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            All Elements
                        </button>
                        <button
                            onClick={() => setContextMode("selected")}
                            style={{
                                flex: 1,
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: contextMode === "selected" ? "1px solid #059669" : "1px solid #fca5a5",
                                background: contextMode === "selected"
                                    ? "#10b981"
                                    : "#fee2e2",
                                color: contextMode === "selected"
                                    ? "white"
                                    : "#9ca3af",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            Selected ({selectedElements.length})
                        </button>
                    </div>

                    {/* Selection Tip */}
                    {contextMode === "selected" && (
                        <div style={{
                            marginTop: "10px",
                            padding: "8px 12px",
                            background: "var(--color-surface, #ffffff)",
                            borderRadius: "6px",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                        }}>
                            <div style={{
                                fontSize: "11px",
                                color: "var(--color-text-muted, #6b7280)",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                    <path d="M2 17l10 5 10-5"/>
                                    <path d="M2 12l10 5 10-5"/>
                                </svg>
                                💡 Hold <strong>Shift</strong> to multi-select items on canvas
                            </div>
                        </div>
                    )}

                    {/* Selected Elements Preview */}
                    {contextMode === "selected" && selectedElements.length > 0 && elementSnapshots.size > 0 && (
                        <div style={{
                            marginTop: "10px",
                            padding: "10px",
                            background: "var(--color-surface, #ffffff)",
                            borderRadius: "8px",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            maxHeight: "120px",
                            overflowY: "auto",
                        }}>
                            <div style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                            }}>
                                {Array.from(elementSnapshots.values()).map(snapshot => (
                                    <div
                                        key={snapshot.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            padding: "5px 10px",
                                            background: "var(--color-fill-2, #e5e7eb)",
                                            borderRadius: "6px",
                                            fontSize: "11px",
                                        }}
                                    >
                                        <span style={{ fontSize: "12px" }}>
                                            {snapshot.type === "rectangle" && "▭"}
                                            {snapshot.type === "diamond" && "◇"}
                                            {snapshot.type === "ellipse" && "○"}
                                            {snapshot.type === "text" && "T"}
                                            {snapshot.type === "arrow" && "→"}
                                            {snapshot.type === "line" && "/"}
                                            {!["rectangle", "diamond", "ellipse", "text", "arrow", "line"].includes(snapshot.type) && "◆"}
                                        </span>
                                        <span style={{
                                            maxWidth: "80px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {snapshot.text || snapshot.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* All Elements Summary */}
                    {contextMode === "all" && canvasState?.elements?.length > 0 && (
                        <div style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "var(--color-text-muted, #6b7280)",
                        }}>
                            {(() => {
                                const counts: Record<string, number> = {};
                                canvasState.elements.forEach((el: any) => {
                                    counts[el.type] = (counts[el.type] || 0) + 1;
                                });
                                return Object.entries(counts)
                                    .slice(0, 4)
                                    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                                    .join(', ');
                            })()}
                        </div>
                    )}
                </div>

                {/* Image History */}
                {imageHistory.length > 0 && (
                    <div style={{
                        padding: "14px 18px",
                        background: "var(--color-fill-1, #f3f4f6)",
                        borderBottom: "1px solid var(--color-stroke-muted, #e5e7eb)",
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "10px",
                        }}>
                            <div style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "var(--color-text-muted, #6b7280)",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                            }}>
                                Generated Images ({imageHistory.length})
                            </div>
                            <button
                                onClick={() => setImageHistory([])}
                                style={{
                                    fontSize: "10px",
                                    padding: "4px 8px",
                                    background: "transparent",
                                    border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                    borderRadius: "4px",
                                    color: "var(--color-text-muted, #6b7280)",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "var(--color-error-bg, #fef2f2)";
                                    e.currentTarget.style.borderColor = "var(--color-error, #ef4444)";
                                    e.currentTarget.style.color = "var(--color-error, #ef4444)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.borderColor = "var(--color-stroke-muted, #e5e7eb)";
                                    e.currentTarget.style.color = "var(--color-text-muted, #6b7280)";
                                }}
                            >
                                Clear
                            </button>
                        </div>
                        <div style={{
                            display: "flex",
                            gap: "8px",
                            overflowX: "auto",
                            paddingBottom: "4px",
                        }}>
                            {imageHistory.map(img => {
                                const [isHovered, setIsHovered] = React.useState(false);
                                return (
                                    <div
                                        key={img.id}
                                        onMouseEnter={() => setIsHovered(true)}
                                        onMouseLeave={() => setIsHovered(false)}
                                        style={{
                                            position: "relative",
                                            minWidth: "80px",
                                            width: "80px",
                                            height: "80px",
                                            borderRadius: "8px",
                                            overflow: "hidden",
                                            border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                                            background: "var(--color-surface, #ffffff)",
                                            transform: isHovered ? "scale(1.05)" : "scale(1)",
                                            transition: "transform 0.15s",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.prompt}
                                            title={img.prompt}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                            }}
                                        />
                                        <button
                                            onClick={() => copyImageToClipboard(img.url)}
                                            title="Copy image"
                                            style={{
                                                position: "absolute",
                                                top: "4px",
                                                right: "4px",
                                                width: "24px",
                                                height: "24px",
                                                borderRadius: "4px",
                                                border: "none",
                                                background: "rgba(0, 0, 0, 0.7)",
                                                color: "white",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                opacity: isHovered ? 1 : 0,
                                                transition: "opacity 0.15s",
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                }}>
                    {messages.length === 0 ? (
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "var(--color-text-muted, #6b7280)",
                            textAlign: "center",
                        }}>
                            {/* PathfinderBot Avatar */}
                            <div style={{ marginBottom: "16px" }}>
                                <PathfinderBotAvatar size={80} />
                            </div>
                            <h3 style={{
                                margin: "0 0 6px",
                                fontSize: "15px",
                                fontWeight: 600,
                                color: "var(--color-text, #1f2937)",
                            }}>
                                Start creating with AI
                            </h3>
                            <p style={{
                                margin: 0,
                                fontSize: "13px",
                                lineHeight: 1.5,
                                maxWidth: "240px",
                            }}>
                                Describe what to draw or switch to "Selected" mode to work with specific elements
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                canvasState={canvasState}
                            />
                        ))
                    )}
                    {isLoading && (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px 16px",
                            background: "var(--color-fill-1, #f3f4f6)",
                            borderRadius: "12px",
                            alignSelf: "flex-start",
                        }}>
                            <div style={{
                                width: "16px",
                                height: "16px",
                                border: "2px solid var(--color-stroke-muted, #e5e7eb)",
                                borderTopColor: "var(--color-accent, #6366f1)",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                            }} />
                            <span style={{
                                fontSize: "13px",
                                color: "var(--color-text-muted, #6b7280)",
                            }}>
                                {aiProvider === "kimi" ? "Kimi is thinking..." : "Claude is thinking..."}
                            </span>
                        </div>
                    )}
                    {error && (
                        <div style={{
                            padding: "10px 14px",
                            background: "var(--color-error-bg, #fef2f2)",
                            border: "1px solid var(--color-error, #fecaca)",
                            borderRadius: "8px",
                            color: "var(--color-error-text, #dc2626)",
                            fontSize: "13px",
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>


                {/* Input Area */}
                <div style={{
                    padding: "14px 18px 18px",
                    background: "var(--color-bg, #fafafa)",
                    borderTop: "1px solid var(--color-stroke-muted, #e5e7eb)",
                }}>
                    {/* Toolbar */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "10px",
                    }}>
                        <button
                            onClick={() => setShowTemplateModal(true)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 10px",
                                background: "transparent",
                                border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                borderRadius: "6px",
                                fontSize: "11px",
                                color: "var(--color-text-muted, #6b7280)",
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "var(--color-accent, #6366f1)";
                                e.currentTarget.style.background = "var(--color-accent-light, #e0e7ff)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--color-stroke-muted, #e5e7eb)";
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            <span>⚡</span>
                            Templates
                        </button>
                        
                        {/* Generate Image Button - Opens Modal */}
                        <button
                            onClick={() => {
                                if (selectedElements.length === 0) {
                                    setError("Select items first");
                                    setTimeout(() => setError(null), 2000);
                                    return;
                                }
                                setShowImageGenModal(true);
                                setError(null);
                            }}
                            title={selectedElements.length === 0 ? "Select elements on the canvas to generate an image" : "Generate realistic image from selected elements"}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 10px",
                                background: (isGeneratingImage || isCapturing || selectedElements.length === 0)
                                    ? "#fee2e2"
                                    : "#059669",
                                border: selectedElements.length > 0 && !isGeneratingImage && !isCapturing
                                    ? "1px solid #047857"
                                    : "1px solid #fca5a5",
                                borderRadius: "6px",
                                fontSize: "11px",
                                color: (isGeneratingImage || isCapturing || selectedElements.length === 0)
                                    ? "#9ca3af"
                                    : "white",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                fontWeight: 500,
                                boxShadow: selectedElements.length > 0 && !isGeneratingImage && !isCapturing
                                    ? "0 0 0 3px rgba(5, 150, 105, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)"
                                    : "none",
                                position: "relative" as const,
                            }}
                            onMouseEnter={(e) => {
                                if (selectedElements.length > 0 && !isGeneratingImage && !isCapturing) {
                                    e.currentTarget.style.background = "#047857";
                                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(5, 150, 105, 0.15), 0 2px 6px rgba(0, 0, 0, 0.15)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedElements.length > 0 && !isGeneratingImage && !isCapturing) {
                                    e.currentTarget.style.background = "#059669";
                                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(5, 150, 105, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)";
                                }
                            }}
                        >
                            {isCapturing ? (
                                <>
                                    <div style={{
                                        width: "10px",
                                        height: "10px",
                                        border: "2px solid rgba(255,255,255,0.3)",
                                        borderTopColor: "white",
                                        borderRadius: "50%",
                                        animation: "spin 0.8s linear infinite",
                                    }} />
                                    Capturing...
                                </>
                            ) : isGeneratingImage ? (
                                <>
                                    <div style={{
                                        width: "10px",
                                        height: "10px",
                                        border: "2px solid rgba(255,255,255,0.3)",
                                        borderTopColor: "white",
                                        borderRadius: "50%",
                                        animation: "spin 0.8s linear infinite",
                                    }} />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                    Generate Image
                                </>
                            )}
                        </button>
                    </div>

                    {/* Input */}
                    <div style={{
                        position: "relative",
                        display: "flex",
                        gap: "8px",
                    }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={contextMode === "selected" && selectedElements.length > 0
                                ? `Ask about ${selectedElements.length} selected elements...`
                                : "Ask AI to draw, explain, or modify..."
                            }
                            rows={2}
                            style={{
                                flex: 1,
                                padding: "10px 14px",
                                border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                borderRadius: "10px",
                                background: "var(--color-surface, #ffffff)",
                                fontSize: "13px",
                                lineHeight: 1.5,
                                resize: "none",
                                outline: "none",
                                fontFamily: "inherit",
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            style={{
                                alignSelf: "flex-end",
                                padding: "10px 18px",
                                background: !input.trim() || isLoading
                                    ? "#fee2e2"
                                    : "#059669",
                                color: !input.trim() || isLoading
                                    ? "#9ca3af"
                                    : "white",
                                border: input.trim() && !isLoading ? "1px solid #047857" : "1px solid #fca5a5",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
                                transition: "all 0.15s",
                                boxShadow: input.trim() && !isLoading ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
                            }}
                            onMouseEnter={(e) => {
                                if (input.trim() && !isLoading) {
                                    e.currentTarget.style.background = "#047857";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (input.trim() && !isLoading) {
                                    e.currentTarget.style.background = "#059669";
                                }
                            }}
                        >
                            Send
                        </button>
                    </div>
                    <div style={{
                        marginTop: "6px",
                        fontSize: "10px",
                        color: "var(--color-text-muted, #6b7280)",
                    }}>
                        Enter to send • Shift+Enter for new line • ESC to {isSelectionMode ? "exit selection" : "close"}
                    </div>
                </div>

                {/* Animations */}
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>

            {/* Image Generation Modal */}
            <ImageGenerationModal
                isOpen={showImageGenModal}
                onClose={() => {
                    setShowImageGenModal(false);
                    setIsCapturing(false);
                    setIsGeneratingImage(false);
                    setPendingGenerationOptions(null);
                }}
                selectedElements={selectedElements}
                elementSnapshots={elementSnapshots}
                canvasState={canvasState}
                onGenerate={(options) => {
                    setPendingGenerationOptions(options);
                }}
                isGenerating={isGeneratingImage}
                isCapturing={isCapturing}
            />

            {/* Template Modal */}
            <TemplateModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onSelect={handleTemplateSelect}
                selectedElementsCount={selectedElements.length}
            />
        </>
    );
}

// Message Bubble Component
function MessageBubble({ message, canvasState }: { message: Message; canvasState?: any }) {
    const isUser = message.role === "user";
    const [copiedJson, setCopiedJson] = useState(false);
    const [copiedSvg, setCopiedSvg] = useState(false);
    
    const textContent = message.content
        .filter(c => c.type === "text")
        .map(c => c.type === "text" ? c.text : "")
        .join("\n");

    // Check if message has a drawing command
    const hasDrawingCommand = !!message.drawingCommand && Array.isArray(message.drawingCommand);

    // Copy JSON to clipboard
    const copyJson = async () => {
        if (!message.drawingCommand) return;
        try {
            const jsonStr = JSON.stringify(message.drawingCommand, null, 2);
            await navigator.clipboard.writeText(jsonStr);
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 2000);
        } catch (err) {
            console.error("Failed to copy JSON:", err);
        }
    };

    // Copy SVG to clipboard
    const copySvg = async () => {
        if (!message.drawingCommand) return;
        try {
            // Dynamically import exportToSvg
            const { exportToSvg } = await import("@excalidraw/excalidraw");
            
            // Create minimal appState for export
            const appState = {
                exportBackground: true,
                exportWithDarkMode: false,
                exportScale: 1,
                ...canvasState?.appState,
            };

            const svg = await exportToSvg({
                elements: message.drawingCommand,
                appState,
                files: canvasState?.files || {},
            });

            const svgData = svg.outerHTML;
            await navigator.clipboard.writeText(svgData);
            setCopiedSvg(true);
            setTimeout(() => setCopiedSvg(false), 2000);
        } catch (err) {
            console.error("Failed to copy SVG:", err);
        }
    };

    return (
        <div style={{
            alignSelf: isUser ? "flex-end" : "flex-start",
            maxWidth: "88%",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
        }}>
            <div style={{
                padding: "12px 16px",
                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: isUser 
                    ? "var(--color-accent, #6366f1)" 
                    : "var(--color-surface, #ffffff)",
                color: isUser ? "white" : "var(--color-text, #1f2937)",
                boxShadow: isUser 
                    ? "0 1px 4px rgba(99, 102, 241, 0.2)" 
                    : "0 1px 3px rgba(0, 0, 0, 0.06)",
                fontSize: "13px",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                border: isUser ? "none" : "1px solid var(--color-stroke-muted, #e5e7eb)",
            }}>
                {textContent}
            </div>
            
            {/* Copy buttons for drawing commands */}
            {hasDrawingCommand && (
                <div style={{
                    display: "flex",
                    gap: "6px",
                    marginTop: "4px",
                    marginLeft: isUser ? "auto" : "10px",
                    marginRight: isUser ? "10px" : "auto",
                }}>
                    <button
                        onClick={copyJson}
                        title="Copy JSON"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            background: copiedJson ? "#dcfce7" : "var(--color-fill-1, #f3f4f6)",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: copiedJson ? "#166534" : "var(--color-text-muted, #6b7280)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                        {copiedJson ? "Copied!" : "JSON"}
                    </button>
                    
                    <button
                        onClick={copySvg}
                        title="Copy SVG"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            background: copiedSvg ? "#dcfce7" : "var(--color-fill-1, #f3f4f6)",
                            border: "1px solid var(--color-stroke-muted, #e5e7eb)",
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: copiedSvg ? "#166534" : "var(--color-text-muted, #6b7280)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        {copiedSvg ? "Copied!" : "SVG"}
                    </button>
                </div>
            )}
            
            <span style={{
                fontSize: "10px",
                color: "var(--color-text-muted, #6b7280)",
                marginLeft: isUser ? "auto" : "10px",
                marginRight: isUser ? "10px" : "auto",
            }}>
                {message.metadata.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}
            </span>
        </div>
    );
}
