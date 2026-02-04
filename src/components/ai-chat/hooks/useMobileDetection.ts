/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                       📱 useMobileDetection.ts                               ║
 * ║                    "The Mobile Device Detector"                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: 🔵 Custom Hook | 📱 Mobile | 🎯 Responsive                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * 👤 WHO AM I?
 * I detect if the user is on a mobile device by checking:
 * - Viewport width (screen size)
 * - Touch capability
 * - User agent string (for device type detection)
 *
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Mobile devices need different UI/UX:
 * - Smaller touch targets
 * - Simplified interfaces
 * - Different interaction patterns
 * - Performance optimizations
 *
 * 📦 STATE I PROVIDE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ isMobile            │ Boolean - is viewport <= 768px OR touch device       │
 * │ isPhone             │ Boolean - is viewport <= 480px (small phone)         │
 * │ isTablet            │ Boolean - is viewport 481px-768px (tablet)           │
 * │ hasTouch            │ Boolean - does device support touch                  │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 *
 * @module useMobileDetection
 */

import { useState, useEffect, useCallback } from "react";

export interface MobileDetectionState {
    /** True if mobile viewport (<= 768px) or touch device */
    isMobile: boolean;
    /** True if phone-sized viewport (<= 480px) */
    isPhone: boolean;
    /** True if tablet-sized viewport (481px - 768px) */
    isTablet: boolean;
    /** True if device has touch capability */
    hasTouch: boolean;
    /** Current viewport width */
    viewportWidth: number;
    /** Current viewport height */
    viewportHeight: number;
}

// Breakpoints matching common device sizes
const BREAKPOINTS = {
    phone: 480,
    tablet: 768,
    desktop: 1024,
} as const;

/**
 * Check if device has touch capability
 */
function checkTouchCapability(): boolean {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * Check if user agent indicates mobile device
 */
function checkUserAgentMobile(): boolean {
    if (typeof navigator === "undefined") return false;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(navigator.userAgent);
}

/**
 * Hook to detect mobile devices and viewport state
 */
export function useMobileDetection(): MobileDetectionState {
    const [state, setState] = useState<MobileDetectionState>(() => ({
        isMobile: false,
        isPhone: false,
        isTablet: false,
        hasTouch: false,
        viewportWidth: typeof window !== "undefined" ? window.innerWidth : 0,
        viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    }));

    const updateState = useCallback(() => {
        if (typeof window === "undefined") return;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const hasTouch = checkTouchCapability();
        const isUserAgentMobile = checkUserAgentMobile();

        // Mobile = small viewport OR touch device with mobile UA
        const isPhone = width <= BREAKPOINTS.phone;
        const isTablet = width > BREAKPOINTS.phone && width <= BREAKPOINTS.tablet;
        const isMobileViewport = width <= BREAKPOINTS.tablet;
        const isMobile = isMobileViewport || (hasTouch && isUserAgentMobile);

        setState({
            isMobile,
            isPhone,
            isTablet,
            hasTouch,
            viewportWidth: width,
            viewportHeight: height,
        });
    }, []);

    useEffect(() => {
        // Initial check
        updateState();

        // Listen for resize events
        const handleResize = () => {
            updateState();
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleResize);
        };
    }, [updateState]);

    return state;
}

export default useMobileDetection;
