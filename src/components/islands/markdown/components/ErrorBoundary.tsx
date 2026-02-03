/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🟣 ErrorBoundary.tsx           "The Safety Net"                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I catch errors in markdown notes. When something goes wrong, I display  ║
 * ║     a fallback UI instead of crashing the entire canvas. I protect the      ║
 * ║     user experience.                                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  Children   │─────▶│      ME      │─────▶│  Fallback   │   │
 *      │   │  (Markdown  │      │  ErrorBound  │      │     UI      │   │
 *      │   │   Content)  │      │     ary      │      │             │   │
 *      │   └─────────────┘      └──────────────┘      └─────────────┘   │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** Errors in markdown crash the entire canvas
 * - **User Impact:** Lost work, frustrating experience
 * - **Quick Fix:** Check componentDidCatch implementation
 * - **Debug:** Log caught errors
 * 
 * 📦 PROPS I RECEIVE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ children            │ Content to render (the markdown note)                │
 * │ fallback            │ Optional custom fallback UI                          │
 * │ onError             │ Optional callback when error is caught               │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🔑 KEY CONCEPTS:
 * - Catches errors in React component tree
 * - Displays fallback UI instead of crashing
 * - Logs errors for debugging
 * 
 * @module markdown/components/ErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

/**
 * Error boundary for markdown notes
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('MarkdownNote Error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        padding: '20px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '14px',
                    }}
                >
                    <strong>⚠️ Note Error</strong>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                        Something went wrong with this note. Try refreshing the page.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
