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
