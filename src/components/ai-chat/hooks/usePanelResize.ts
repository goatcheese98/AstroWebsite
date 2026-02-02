/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                       ↔️ usePanelResize.ts                                   ║
 * ║                    "The Sidebar Resizer"                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔵 Custom Hook | 🖱️ Mouse Handler | 🎨 UI Controller            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the invisible resize handle on the left edge of the chat panel. When users
 * grab that 4-pixel strip and drag, I'm the one who makes the panel grow or shrink
 * smoothly. I ensure the panel never gets too narrow (unusable) or too wide 
 * (obscures the canvas).
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Different users have different preferences for chat panel size. Some want a
 * narrow sidebar to maximize drawing space; others want a wide panel to read
 * AI responses comfortably. I provide that control with a simple drag gesture.
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │                       ┌─────────────────┐                        │
      │                       │     MOUSE       │                        │
      │                       │   (user drags)  │                        │
      │                       └────────┬────────┘                        │
      │                                │                                │
      │                                ▼                                │
      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
      │   │  ChatPanel  │◀─────│      ME      │─────▶│   Window    │   │
      │   │ (visual     │      │(usePanel     │      │   (global   │   │
      │   │  resize)    │      │  Resize)     │      │   events)   │   │
      │   └─────────────┘      └──────────────┘      └─────────────┘   │
      │                                                                  │
      │   I MANAGE:                                                       │
      │   - panelWidth state (px)                                        │
      │   - isResizing state (drag in progress)                          │
      │   - Cursor style (ew-resize during drag)                         │
      │   - User selection prevention (no text selection while dragging) │
      │                                                                  │
      │   CONSTRAINTS:                                                    │
      │   - Min width: 320px (readable)                                  │
      │   - Max width: 80% of viewport (don't obscure canvas)            │
      │                                                                  │
      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - Symptoms: Panel won't resize, resize handle invisible, cursor doesn't change
 * - User Impact: User stuck with panel size they don't like
 * - Quick Fix: Check if mouse event listeners are attached to document
 * - Debug: Look for "ew-resize" cursor style on body during drag
 * - Common Issue: handleMouseUp not firing - check if mouse leaves window
 * 
 * 📦 STATE I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ panelWidth          │ Current width of chat panel in pixels                │
 * │ isResizing          │ Whether user is currently dragging                   │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - startResize(): Begin resize operation (called on mousedown)
 * - setWidth(): Programmatically set panel width
 * 
 * 📐 CONSTRAINTS I ENFORCE:
 * - Minimum: 320px (anything less is unreadable)
 * - Maximum: 80% of window width (must leave room for canvas)
 * 
 * 📝 REFACTOR JOURNAL:
 * 2026-02-02: Extracted from AIChatContainer.tsx (was ~40 lines of resize logic)
 * 2026-02-02: Separated resize concerns from component rendering
 * 2026-02-02: Added proper cleanup of document event listeners
 * 
 * @module usePanelResize
 */

import { useState, useCallback, useEffect } from "react";

export interface UsePanelResizeOptions {
    /** Initial width of the panel */
    initialWidth?: number;
    /** Minimum allowed width in pixels */
    minWidth?: number;
    /** Maximum allowed width (pixels or percentage of viewport) */
    maxWidth?: number | `${number}%`;
}

export interface UsePanelResizeReturn {
    /** Current panel width in pixels */
    panelWidth: number;
    /** Whether user is currently resizing */
    isResizing: boolean;
    /** Start a resize operation (attach to mousedown) */
    startResize: (e: React.MouseEvent) => void;
    /** Programmatically set panel width */
    setPanelWidth: (width: number) => void;
}

export function usePanelResize(options: UsePanelResizeOptions = {}): UsePanelResizeReturn {
    const {
        initialWidth = 400,
        minWidth = 320,
        maxWidth: maxWidthOption = "80%",
    } = options;
    
    // === 📐 State ===
    const [panelWidth, setPanelWidthState] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    
    /**
     * Calculate max width based on option type
     */
    const calculateMaxWidth = useCallback((): number => {
        if (typeof maxWidthOption === "string" && maxWidthOption.endsWith("%")) {
            const percentage = parseInt(maxWidthOption, 10);
            return (window.innerWidth * percentage) / 100;
        }
        return maxWidthOption as number;
    }, [maxWidthOption]);
    
    /**
     * Clamp width to valid range
     */
    const clampWidth = useCallback((width: number): number => {
        const maxWidth = calculateMaxWidth();
        return Math.max(minWidth, Math.min(width, maxWidth));
    }, [minWidth, calculateMaxWidth]);
    
    /**
     * Set panel width with constraints
     */
    const setPanelWidth = useCallback((width: number) => {
        setPanelWidthState(clampWidth(width));
    }, [clampWidth]);
    
    /**
     * Start resize operation on mousedown
     */
    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        
        // Set cursor immediately for feedback
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
        
        console.log("↔️ Started panel resize");
    }, []);
    
    /**
     * Handle mouse movement during resize
     */
    useEffect(() => {
        if (!isResizing) return;
        
        const handleMouseMove = (e: MouseEvent) => {
            // Calculate new width based on mouse position from right edge
            const newWidth = window.innerWidth - e.clientX;
            setPanelWidthState(clampWidth(newWidth));
        };
        
        const handleMouseUp = () => {
            setIsResizing(false);
            
            // Reset cursor and selection
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            
            console.log("✅ Ended panel resize");
        };
        
        // Attach global listeners
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, clampWidth]);
    
    /**
     * Handle window resize - ensure panel stays within bounds
     */
    useEffect(() => {
        const handleWindowResize = () => {
            setPanelWidthState(prev => clampWidth(prev));
        };
        
        window.addEventListener("resize", handleWindowResize);
        return () => window.removeEventListener("resize", handleWindowResize);
    }, [clampWidth]);
    
    return {
        panelWidth,
        isResizing,
        startResize,
        setPanelWidth,
    };
}

export default usePanelResize;
