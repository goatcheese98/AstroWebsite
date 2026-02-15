/**
 * CSS styles for markdown preview and note containers
 */
export const getMarkdownStyles = (): string => `
    .markdown-preview {
        font-size: 14px;
        line-height: 1.6;
        color: inherit;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    /* Make text elements transparent to pointer events, so clicks bubble up */
    .markdown-preview * {
        pointer-events: none;
        user-select: none;
    }

    /* Re-enable pointer events for interactive elements */
    .markdown-preview a,
    .markdown-preview input[type="checkbox"] {
        pointer-events: auto;
        cursor: pointer;
    }

    .markdown-preview > *:first-child {
        margin-top: 0 !important;
    }

    .markdown-preview > *:last-child {
        margin-bottom: 0 !important;
    }

    .markdown-preview strong {
        font-weight: 600;
        color: inherit;
    }

    .markdown-preview em {
        font-style: italic;
    }

    /* Better code block overflow handling */
    .markdown-preview pre {
        overflow-x: auto;
        max-width: 100%;
    }

    .markdown-preview code {
        word-break: break-word;
    }

    /* Better scrollbar for markdown notes */
    .markdown-note-overlay::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    .markdown-note-overlay::-webkit-scrollbar-track {
        background: transparent;
    }

    .markdown-note-overlay::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
    }

    [data-theme="dark"] .markdown-note-overlay::-webkit-scrollbar-thumb {
        background: rgba(161, 161, 170, 0.4);
    }

    .markdown-note-overlay::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
    }

    [data-theme="dark"] .markdown-note-overlay::-webkit-scrollbar-thumb:hover {
        background: rgba(161, 161, 170, 0.6);
    }

    /* Smooth transitions */
    .markdown-note-overlay {
        transition: border-color 0.2s ease, box-shadow 0.3s ease;
    }

    /* Better checkbox styling */
    .markdown-preview input[type="checkbox"] {
        margin-right: 0.5em;
        cursor: pointer;
    }

    .markdown-preview input[type="checkbox"]:hover {
        transform: scale(1.1);
    }

    /* Better link hover effect */
    .markdown-preview a {
        transition: all 0.2s ease;
    }

    .markdown-preview a:hover {
        border-bottom: 2px solid #3b82f6;
        color: #2563eb;
    }

    /* Improve text selection */
    .markdown-preview ::selection {
        background: rgba(59, 130, 246, 0.3);
    }

    [data-theme="dark"] .markdown-preview ::selection {
        background: rgba(129, 140, 248, 0.3);
    }

    /* Better table responsive behavior */
    .markdown-preview table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
    }

    /* Fade animation for container */
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
`;
