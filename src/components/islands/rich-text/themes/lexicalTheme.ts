import type { EditorThemeClasses } from 'lexical';

/**
 * Light theme - matches the canvas light mode
 */
export const lightTheme: EditorThemeClasses = {
    root: 'lexical-root lexical-root-light',
    paragraph: 'lexical-paragraph',
    quote: 'lexical-quote',
    heading: {
        h1: 'lexical-h1',
        h2: 'lexical-h2',
        h3: 'lexical-h3',
        h4: 'lexical-h4',
        h5: 'lexical-h5',
        h6: 'lexical-h6',
    },
    list: {
        ul: 'lexical-ul',
        ol: 'lexical-ol',
        listitem: 'lexical-listitem',
        listitemChecked: 'lexical-listitem-checked',
        listitemUnchecked: 'lexical-listitem-unchecked',
        nested: {
            listitem: 'lexical-nested-listitem',
        },
        olDepth: [
            'lexical-ol1',
            'lexical-ol2',
            'lexical-ol3',
            'lexical-ol4',
            'lexical-ol5',
        ],
    },
    image: 'lexical-image',
    link: 'lexical-link',
    embedBlock: {
        base: 'lexical-embed-block',
        focus: 'lexical-embed-block-focus',
    },
    text: {
        bold: 'lexical-text-bold',
        italic: 'lexical-text-italic',
        overflowed: 'lexical-text-overflowed',
        hashtag: 'lexical-text-hashtag',
        underline: 'lexical-text-underline',
        strikethrough: 'lexical-text-strikethrough',
        underlineStrikethrough: 'lexical-text-underline-strikethrough',
        code: 'lexical-text-code',
    },
    code: 'lexical-code',
    codeHighlight: {
        atrule: 'lexical-token-attr',
        attr: 'lexical-token-attr',
        boolean: 'lexical-token-property',
        builtin: 'lexical-token-selector',
        cdata: 'lexical-token-comment',
        char: 'lexical-token-selector',
        class: 'lexical-token-function',
        'class-name': 'lexical-token-function',
        comment: 'lexical-token-comment',
        constant: 'lexical-token-property',
        deleted: 'lexical-token-property',
        doctype: 'lexical-token-comment',
        entity: 'lexical-token-operator',
        function: 'lexical-token-function',
        important: 'lexical-token-variable',
        inserted: 'lexical-token-selector',
        keyword: 'lexical-token-attr',
        namespace: 'lexical-token-variable',
        number: 'lexical-token-property',
        operator: 'lexical-token-operator',
        prolog: 'lexical-token-comment',
        property: 'lexical-token-property',
        punctuation: 'lexical-token-punctuation',
        regex: 'lexical-token-variable',
        selector: 'lexical-token-selector',
        string: 'lexical-token-selector',
        symbol: 'lexical-token-property',
        tag: 'lexical-token-property',
        url: 'lexical-token-operator',
        variable: 'lexical-token-variable',
    },
    table: 'lexical-table',
    tableCell: 'lexical-table-cell',
    tableCellHeader: 'lexical-table-cell-header',
    tableRow: 'lexical-table-row',
};

/**
 * Dark theme - matches the canvas dark mode
 */
export const darkTheme: EditorThemeClasses = {
    ...lightTheme,
    root: 'lexical-root lexical-root-dark',
};

/**
 * Get theme based on current mode
 */
export function getLexicalTheme(isDark: boolean): EditorThemeClasses {
    return isDark ? darkTheme : lightTheme;
}

/**
 * CSS styles for the Lexical editor
 * These are injected as a style tag in the component
 */
export function getLexicalEditorStyles(): string {
    return `
        /* ===== Base Editor Styles ===== */
        .lexical-root {
            position: relative;
            width: 100%;
            height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            outline: none;
            padding: 16px 20px;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .lexical-root:focus {
            outline: none;
        }

        /* Light theme */
        .lexical-root-light {
            color: #1a1a1a;
            background: transparent;
        }

        /* Dark theme */
        .lexical-root-dark {
            color: #e5e5e5;
            background: transparent;
        }

        /* ===== Typography ===== */
        .lexical-paragraph {
            margin: 0 0 12px 0;
            position: relative;
        }

        .lexical-paragraph:last-child {
            margin-bottom: 0;
        }

        .lexical-h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 24px 0 16px 0;
            line-height: 1.3;
            letter-spacing: -0.02em;
        }

        .lexical-h2 {
            font-size: 24px;
            font-weight: 600;
            margin: 20px 0 12px 0;
            line-height: 1.3;
            letter-spacing: -0.01em;
        }

        .lexical-h3 {
            font-size: 20px;
            font-weight: 600;
            margin: 16px 0 10px 0;
            line-height: 1.3;
        }

        .lexical-h4 {
            font-size: 17px;
            font-weight: 600;
            margin: 14px 0 8px 0;
        }

        .lexical-h5, .lexical-h6 {
            font-size: 15px;
            font-weight: 600;
            margin: 12px 0 6px 0;
        }

        .lexical-quote {
            border-left: 3px solid #6366f1;
            padding-left: 16px;
            margin: 16px 0;
            font-style: italic;
            color: inherit;
            opacity: 0.85;
        }

        .lexical-root-dark .lexical-quote {
            border-left-color: #818cf8;
        }

        /* ===== Lists ===== */
        .lexical-ul, .lexical-ol {
            margin: 12px 0;
            padding-left: 32px;
        }

        .lexical-ul {
            list-style-type: disc !important;
        }

        .lexical-ol {
            list-style-type: decimal !important;
        }

        .lexical-listitem {
            margin: 4px 0;
            line-height: 1.6;
            display: list-item !important;
        }

        .lexical-listitem-checked,
        .lexical-listitem-unchecked {
            position: relative;
            margin-left: 8px;
            margin-bottom: 4px;
            padding-left: 24px;
            list-style-type: none;
            cursor: pointer;
        }

        .lexical-listitem-checked::before,
        .lexical-listitem-unchecked::before {
            content: '';
            position: absolute;
            left: 0;
            top: 4px;
            width: 16px;
            height: 16px;
            border: 2px solid #6366f1;
            border-radius: 4px;
            transition: all 0.15s ease;
        }

        .lexical-listitem-checked::before {
            background: #6366f1;
        }

        .lexical-listitem-checked::after {
            content: '✓';
            position: absolute;
            left: 3px;
            top: 1px;
            color: white;
            font-size: 11px;
            font-weight: bold;
        }

        .lexical-root-dark .lexical-listitem-checked::before,
        .lexical-root-dark .lexical-listitem-unchecked::before {
            border-color: #818cf8;
        }

        .lexical-root-dark .lexical-listitem-checked::before {
            background: #818cf8;
        }

        .lexical-nested-listitem {
            list-style-type: none;
        }

        /* ===== Text Formatting ===== */
        .lexical-text-bold {
            font-weight: 700;
        }

        .lexical-text-italic {
            font-style: italic;
        }

        .lexical-text-underline {
            text-decoration: underline;
            text-decoration-color: currentColor;
            text-underline-offset: 2px;
        }

        .lexical-text-strikethrough {
            text-decoration: line-through;
            opacity: 0.7;
        }

        .lexical-text-underline-strikethrough {
            text-decoration: underline line-through;
            text-underline-offset: 2px;
            opacity: 0.7;
        }

        .lexical-text-code {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.9em;
            padding: 2px 6px;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 4px;
            color: #6366f1;
        }

        .lexical-root-dark .lexical-text-code {
            background: rgba(129, 140, 248, 0.15);
            color: #a5b4fc;
        }

        .lexical-text-hashtag {
            color: #6366f1;
        }

        .lexical-root-dark .lexical-text-hashtag {
            color: #a5b4fc;
        }

        /* ===== Links ===== */
        .lexical-link {
            color: #6366f1;
            text-decoration: none;
            border-bottom: 1px solid rgba(99, 102, 241, 0.3);
            transition: border-color 0.15s ease;
        }

        .lexical-link:hover {
            border-bottom-color: #6366f1;
        }

        .lexical-root-dark .lexical-link {
            color: #a5b4fc;
            border-bottom-color: rgba(165, 180, 252, 0.3);
        }

        .lexical-root-dark .lexical-link:hover {
            border-bottom-color: #a5b4fc;
        }

        /* ===== Code Blocks ===== */
        .lexical-code {
            display: block;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #d1fae5;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(7, 12, 24, 0.96) 100%);
            border: 1px solid rgba(56, 189, 248, 0.22);
            border-radius: 12px;
            box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18), 0 8px 22px rgba(2, 6, 23, 0.24);
            padding: 14px 16px;
            margin: 18px 0;
            max-width: 100%;
            box-sizing: border-box;
            position: relative;
            isolation: isolate;
            clear: both;
            overflow-x: auto;
            overflow-y: hidden;
            white-space: pre;
            word-break: normal;
            overflow-wrap: normal;
        }

        .lexical-code::-webkit-scrollbar {
            height: 6px;
        }

        .lexical-code::-webkit-scrollbar-track {
            background: transparent;
        }

        .lexical-code::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.35);
            border-radius: 999px;
        }

        .lexical-code + .lexical-paragraph {
            margin-top: 14px;
        }

        .lexical-table + .lexical-code {
            margin-top: 20px;
        }

        .lexical-root-dark .lexical-code {
            color: #d1fae5;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(4, 10, 22, 0.98) 100%);
            border-color: rgba(125, 211, 252, 0.25);
        }

        /* Code highlighting */
        .lexical-token-comment {
            color: #6b7280;
            font-style: italic;
        }

        .lexical-token-keyword {
            color: #d73a49;
            font-weight: 600;
        }

        .lexical-token-string {
            color: #032f62;
        }

        .lexical-token-function {
            color: #6f42c1;
        }

        .lexical-token-number {
            color: #005cc5;
        }

        .lexical-token-operator {
            color: #d73a49;
        }

        .lexical-token-property {
            color: #005cc5;
        }

        .lexical-token-selector {
            color: #22863a;
        }

        .lexical-token-variable {
            color: #e36209;
        }

        .lexical-root-dark .lexical-token-comment {
            color: #9ca3af;
        }

        .lexical-root-dark .lexical-token-keyword {
            color: #ff7b72;
        }

        .lexical-root-dark .lexical-token-string {
            color: #a5d6ff;
        }

        .lexical-root-dark .lexical-token-function {
            color: #d2a8ff;
        }

        .lexical-root-dark .lexical-token-number {
            color: #79c0ff;
        }

        .lexical-root-dark .lexical-token-operator {
            color: #ff7b72;
        }

        .lexical-root-dark .lexical-token-property {
            color: #79c0ff;
        }

        .lexical-root-dark .lexical-token-selector {
            color: #7ee787;
        }

        .lexical-root-dark .lexical-token-variable {
            color: #ffa657;
        }

        /* ===== Tables ===== */
        .lexical-table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 14px;
            table-layout: fixed;
            max-width: 100%;
        }

        .lexical-table-cell,
        .lexical-table-cell-header {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
            overflow-wrap: anywhere;
            word-break: break-word;
            min-width: 0;
        }

        .lexical-table-cell > *,
        .lexical-table-cell-header > * {
            margin: 0;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
        }

        .lexical-table-cell-header {
            background: #f9fafb;
            font-weight: 600;
        }

        .lexical-root-dark .lexical-table-cell,
        .lexical-root-dark .lexical-table-cell-header {
            border-color: #374151;
        }

        .lexical-root-dark .lexical-table-cell-header {
            background: #1f2937;
        }

        /* ===== Collapsible ===== */
        .Collapsible__container {
            margin: 14px 0;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.55);
            overflow: hidden;
        }

        .Collapsible__title {
            margin: 0;
            padding: 10px 12px;
            cursor: pointer;
            font-weight: 600;
            list-style: none;
            user-select: none;
            border-bottom: 1px solid transparent;
        }

        .Collapsible__title::-webkit-details-marker {
            display: none;
        }

        .Collapsible__title::before {
            content: '▸';
            display: inline-block;
            margin-right: 8px;
            color: #6366f1;
            transition: transform 0.15s ease;
        }

        .Collapsible__container[open] > .Collapsible__title {
            border-bottom-color: #e5e7eb;
        }

        .Collapsible__container[open] > .Collapsible__title::before {
            transform: rotate(90deg);
        }

        .Collapsible__content {
            padding: 10px 12px 12px;
        }

        .lexical-root-dark .Collapsible__container {
            border-color: #334155;
            background: rgba(15, 23, 42, 0.65);
        }

        .lexical-root-dark .Collapsible__container[open] > .Collapsible__title {
            border-bottom-color: #334155;
        }

        .lexical-root-dark .Collapsible__title::before {
            color: #a5b4fc;
        }

        /* ===== Scrollbar ===== */
        .lexical-root::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        .lexical-root::-webkit-scrollbar-track {
            background: transparent;
        }

        .lexical-root::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.3);
            border-radius: 3px;
        }

        .lexical-root::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.5);
        }

        .lexical-root-dark::-webkit-scrollbar-thumb {
            background: rgba(129, 140, 248, 0.3);
        }

        .lexical-root-dark::-webkit-scrollbar-thumb:hover {
            background: rgba(129, 140, 248, 0.5);
        }

        /* ===== Embed Blocks (YouTube, Tweet) ===== */
        .lexical-embed-block {
            position: relative;
            margin: 16px 0;
            user-select: none;
        }

        .lexical-embed-block iframe {
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .lexical-embed-block-focus {
            outline: 2px solid #6366f1;
            outline-offset: 2px;
            border-radius: 10px;
        }

        .lexical-root-dark .lexical-embed-block-focus {
            outline-color: #818cf8;
        }

        /* ===== Placeholder ===== */
        .lexical-placeholder {
            color: #9ca3af;
            overflow: hidden;
            position: absolute;
            text-overflow: ellipsis;
            top: 16px;
            left: 20px;
            user-select: none;
            white-space: nowrap;
            pointer-events: none;
        }

        .lexical-root-dark .lexical-placeholder {
            color: #6b7280;
        }

        /* ===== Editor State ===== */
        .lexical-editor-input {
            outline: none;
            caret-color: #6366f1;
        }

        .lexical-root-dark .lexical-editor-input {
            caret-color: #818cf8;
        }
    `;
}
