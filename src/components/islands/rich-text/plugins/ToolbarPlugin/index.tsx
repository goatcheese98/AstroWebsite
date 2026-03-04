import React, { useCallback, useEffect, useState, useRef, useContext, createContext } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    UNDO_COMMAND,
    $createParagraphNode,
    $getNodeByKey,
} from 'lexical';
import {
    $isListNode,
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
    INSERT_CHECK_LIST_COMMAND,
} from '@lexical/list';
import {
    $isHeadingNode,
    $createHeadingNode,
    $createQuoteNode,
    type HeadingTagType,
} from '@lexical/rich-text';
import {
    $createCodeNode,
    $isCodeNode,
    CODE_LANGUAGE_FRIENDLY_NAME_MAP,
    CODE_LANGUAGE_MAP,
    getLanguageFriendlyName,
} from '@lexical/code';
import {
    $createLinkNode,
    $isLinkNode,
    TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import {
    $getSelectionStyleValueForProperty,
    $patchStyleText,
    $setBlocksType,
} from '@lexical/selection';
import { $isParagraphNode } from 'lexical';
import { $findMatchingParent } from '@lexical/utils';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';

// Custom commands
import { INSERT_EQUATION_COMMAND } from '../EquationPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from '../CollapsiblePlugin';
import { INSERT_DATETIME_COMMAND } from '../DateTimePlugin';
import { INSERT_PAGE_BREAK_COMMAND } from '../PageBreakPlugin';
import { INSERT_YOUTUBE_COMMAND, INSERT_TWEET_COMMAND } from '../AutoEmbedPlugin';

// Markdown toggle button
import { MarkdownToggleButton } from '../MarkdownTogglePlugin';

// ============================================================================
// Icon Components
// ============================================================================

const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const BoldIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
);

const ItalicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="4" x2="10" y2="4" />
        <line x1="14" y1="20" x2="5" y2="20" />
        <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
);

const UnderlineIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
        <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
);

const StrikethroughIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.3 19c.77-1.2 1.1-2.6 1-4" />
        <path d="M5.7 19c-.77-1.2-1.1-2.6-1-4" />
        <path d="M19 11.77A6 6 0 0 0 12 6a6 6 0 0 0-7 5.77" />
        <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
);

const CodeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
);

const LinkIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

const TableIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
);

const EquationIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 3h10M7 21h10M12 3v18M7 12h10" />
        <circle cx="12" cy="12" r="9" />
    </svg>
);

const CollapsibleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const LineIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const PageBreakIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="8" rx="1" />
        <rect x="3" y="13" width="18" height="8" rx="1" />
        <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2 2" />
    </svg>
);

const UndoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
);

const RedoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
);

const AlignLeftIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="17" y1="10" x2="3" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="17" y1="18" x2="3" y2="18" />
    </svg>
);

const AlignCenterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="21" y1="10" x2="3" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="21" y1="18" x2="3" y2="18" />
    </svg>
);

const AlignRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="21" y1="10" x2="7" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="21" y1="18" x2="7" y2="18" />
    </svg>
);

const AlignJustifyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="21" y1="10" x2="3" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="21" y1="18" x2="3" y2="18" />
    </svg>
);

const ParagraphIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 4v16M17 4v16M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
    </svg>
);

const H1Icon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h8M4 18V6M12 18V6M17 12h3m0 0v6m0-6-4-4" />
    </svg>
);

const H2Icon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h8M4 18V6M12 18V6m5 12h4m-4-6 4-2v6" />
    </svg>
);

const H3Icon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h8M4 18V6M12 18V6m5 6v6m0-6 4-2v6" />
    </svg>
);

const BulletListIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

const NumberedListIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="10" y1="6" x2="21" y2="6" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <line x1="10" y1="18" x2="21" y2="18" />
        <path d="M4 6h1v4M4 10h2M4 16h2" />
    </svg>
);

const CheckListIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
);

const QuoteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
);

const CodeBlockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
);

const SubscriptIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m4 5 8 8M12 5l-8 8M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.66-.34c-.66.34-1.12.99-1.22 1.73" />
    </svg>
);

const SuperscriptIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m4 19 8-8M12 19l-8-8M20 12h-4c0-1.5.44-2 1.5-2.5S20 8.33 20 7c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.66-.34c-.66.34-1.12.99-1.22 1.73" />
    </svg>
);

const TextCaseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7V4h8v3M8 4v16M12 4v16" />
        <path d="M16 20h4M18 20V4l-4 8h6" />
    </svg>
);

const UppercaseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 18V6M4 6h8M12 6v12M4 12h8" />
        <path d="M16 18V6l6 12V6" />
    </svg>
);

const LowercaseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 18V6h4a4 4 0 0 1 0 8H6" />
        <path d="M14 18V6h4a4 4 0 0 1 0 8h-4" />
    </svg>
);

const EmbedIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
);

const CapitalizeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 18V6h8v3M8 4v16" />
        <path d="M16 18V6h4a4 4 0 0 1 0 8h-4" />
    </svg>
);

const ClearFormattingIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 21h10M7 3v5a3 3 0 0 0 6 0V3" />
        <line x1="4" y1="21" x2="20" y2="21" />
        <line x1="13" y1="3" x2="13" y2="8" />
        <line x1="17" y1="3" x2="17" y2="8" />
    </svg>
);

const MonitorIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const BlurIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

// ============================================================================
// Types & Constants
// ============================================================================

interface ToolbarProps {
    isDark: boolean;
    backgroundOpacity?: number;
    onBackgroundOpacityChange?: (opacity: number) => void;
    blurAmount?: number;
    onBlurAmountChange?: (blur: number) => void;
    /** DOM element ID to portal the toolbar into (for breaking out of overflow:hidden containers) */
    portalId?: string;
}

interface ToolbarState {
    // Format states
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isStrikethrough: boolean;
    isCode: boolean;
    isLink: boolean;
    isSubscript: boolean;
    isSuperscript: boolean;
    // Block type
    blockType: string;
    codeLanguage: string;
    // History
    canUndo: boolean;
    canRedo: boolean;
    // Typography
    fontFamily: string;
    fontSize: string;
    // Colors
    fontColor: string;
    bgColor: string;
}

interface DropdownContextType {
    openDropdown: string | null;
    setOpenDropdown: (id: string | null) => void;
    isDark: boolean;
}

const BLOCK_TYPES: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'Normal', value: 'paragraph', icon: <ParagraphIcon /> },
    { label: 'Heading 1', value: 'h1', icon: <H1Icon /> },
    { label: 'Heading 2', value: 'h2', icon: <H2Icon /> },
    { label: 'Heading 3', value: 'h3', icon: <H3Icon /> },
    { label: 'Bullet List', value: 'bullet', icon: <BulletListIcon /> },
    { label: 'Numbered List', value: 'number', icon: <NumberedListIcon /> },
    { label: 'Check List', value: 'check', icon: <CheckListIcon /> },
    { label: 'Quote', value: 'quote', icon: <QuoteIcon /> },
    { label: 'Code Block', value: 'code', icon: <CodeBlockIcon /> },
];

const FONT_FAMILIES = [
    { label: 'Sans Serif', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Mono', value: 'SF Mono, Menlo, monospace' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Playfair', value: 'Playfair Display, serif' },
];

const FONT_SIZES = ['12px', '14px', '15px', '16px', '18px', '20px', '24px', '32px'];

const CODE_LANGUAGES = Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(
    ([value, label]) => ({ value, label })
);

// ============================================================================
// Context
// ============================================================================

const DropdownContext = createContext<DropdownContextType>({
    openDropdown: null,
    setOpenDropdown: () => {},
    isDark: false,
});

// ============================================================================
// Helper Functions
// ============================================================================

function getSelectedNode(selection: any) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    if (anchorNode === focusNode) {
        return anchorNode;
    }
    const isBackward = selection.isBackward();
    if (isBackward) {
        return $isAtNodeEnd(focus) ? anchorNode : focusNode;
    } else {
        return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
    }
}

function $isAtNodeEnd(selection: any) {
    return selection.offset === selection.getNode().getTextContentSize();
}

// ============================================================================
// Dropdown Components
// ============================================================================

interface DropdownProps {
    id: string;
    buttonContent: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({ id, buttonContent, children, className, disabled }) => {
    const { openDropdown, setOpenDropdown, isDark } = useContext(DropdownContext);
    const isOpen = openDropdown === id;
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleToggle = useCallback(() => {
        if (disabled) return;
        setOpenDropdown(isOpen ? null : id);
    }, [isOpen, id, setOpenDropdown, disabled]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setOpenDropdown(null);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, setOpenDropdown]);

    const buttonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        border: 'none',
        borderRadius: '4px',
        background: isOpen
            ? isDark ? '#333' : '#f0f0f0'
            : 'transparent',
        color: isDark ? '#ccc' : '#444',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.1s ease',
        height: '28px',
        whiteSpace: 'nowrap',
    };

    const menuStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '4px',
        background: isDark ? '#1a1a1a' : '#ffffff',
        border: `1px solid ${isDark ? '#333' : '#ddd'}`,
        borderRadius: '6px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: 100,
        minWidth: '160px',
        maxHeight: '300px',
        overflow: 'auto',
        display: isOpen ? 'block' : 'none',
    };

    return (
        <div style={{ position: 'relative' }} className={className}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                onMouseDown={(e) => e.preventDefault()}
                style={buttonStyle}
                disabled={disabled}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {buttonContent}
                <ChevronDownIcon />
            </button>
            <div ref={menuRef} style={menuStyle} role="menu">
                {children}
            </div>
        </div>
    );
};

interface DropdownItemProps {
    onClick: () => void;
    active?: boolean;
    icon?: React.ReactNode;
    shortcut?: string;
    children: React.ReactNode;
    disabled?: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ onClick, active, icon, shortcut, children, disabled }) => {
    const { isDark } = useContext(DropdownContext);

    const style: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active
            ? isDark ? '#333' : '#f0f0f0'
            : 'transparent',
        color: active
            ? '#6366f1'
            : isDark ? '#ccc' : '#444',
        fontSize: '13px',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        transition: 'background 0.1s ease',
        opacity: disabled ? 0.4 : 1,
    };

    const shortcutStyle: React.CSSProperties = {
        marginLeft: 'auto',
        fontSize: '11px',
        color: isDark ? '#666' : '#999',
        fontFamily: 'monospace',
    };

    return (
        <button
            onClick={disabled ? undefined : onClick}
            onMouseDown={(e) => e.preventDefault()}
            style={style}
            role="menuitem"
            disabled={disabled}
        >
            {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
            <span>{children}</span>
            {shortcut && <span style={shortcutStyle}>{shortcut}</span>}
        </button>
    );
};

// ============================================================================
// Dropdown Components
// ============================================================================

const FontFamilyDropdown: React.FC<{
    fontFamily: string;
    onSelect: (value: string) => void;
}> = ({ fontFamily, onSelect }) => {
    const { setOpenDropdown } = useContext(DropdownContext);
    const currentFont = FONT_FAMILIES.find(f => f.value === fontFamily) || FONT_FAMILIES[0];

    return (
        <Dropdown
            id="font-family"
            buttonContent={<span style={{ fontFamily: currentFont.value }}>{currentFont.label}</span>}
            className="font-family-dropdown"
        >
            {FONT_FAMILIES.map((font) => (
                <DropdownItem
                    key={font.value}
                    onClick={() => {
                        onSelect(font.value);
                        setOpenDropdown(null);
                    }}
                    active={font.value === fontFamily}
                >
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                </DropdownItem>
            ))}
        </Dropdown>
    );
};

const FontSizeDropdown: React.FC<{
    fontSize: string;
    onSelect: (value: string) => void;
}> = ({ fontSize, onSelect }) => {
    const { setOpenDropdown } = useContext(DropdownContext);

    return (
        <Dropdown
            id="font-size"
            buttonContent={<span>{fontSize}</span>}
            className="font-size-dropdown"
        >
            {FONT_SIZES.map((size) => (
                <DropdownItem
                    key={size}
                    onClick={() => {
                        onSelect(size);
                        setOpenDropdown(null);
                    }}
                    active={size === fontSize}
                >
                    {size}
                </DropdownItem>
            ))}
        </Dropdown>
    );
};

const BlockFormatDropdown: React.FC<{
    blockType: string;
    onSelect: (value: string) => void;
}> = ({ blockType, onSelect }) => {
    const { setOpenDropdown } = useContext(DropdownContext);
    const currentBlock = BLOCK_TYPES.find(b => b.value === blockType) || BLOCK_TYPES[0];

    return (
        <Dropdown
            id="block-format"
            buttonContent={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {currentBlock.icon}
                    {currentBlock.label}
                </span>
            }
            className="block-format-dropdown"
        >
            {BLOCK_TYPES.map((type) => (
                <DropdownItem
                    key={type.value}
                    onClick={() => {
                        onSelect(type.value);
                        setOpenDropdown(null);
                    }}
                    active={type.value === blockType}
                    icon={type.icon}
                >
                    {type.label}
                </DropdownItem>
            ))}
        </Dropdown>
    );
};

const CodeLanguageDropdown: React.FC<{
    codeLanguage: string;
    onSelect: (value: string) => void;
    disabled?: boolean;
}> = ({ codeLanguage, onSelect, disabled }) => {
    const { setOpenDropdown, isDark } = useContext(DropdownContext);
    const friendlyName = getLanguageFriendlyName(codeLanguage);

    if (disabled) return null;

    return (
        <Dropdown
            id="code-language"
            buttonContent={<span>{friendlyName}</span>}
            className="code-language-dropdown"
        >
            {CODE_LANGUAGES.map((lang) => (
                <DropdownItem
                    key={lang.value}
                    onClick={() => {
                        onSelect(lang.value);
                        setOpenDropdown(null);
                    }}
                    active={lang.value === codeLanguage}
                >
                    {lang.label}
                </DropdownItem>
            ))}
        </Dropdown>
    );
};

// ============================================================================
// Toolbar Button Component
// ============================================================================

interface ToolbarButtonProps {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title?: string;
    children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, active, disabled, title, children }) => {
    const { isDark } = useContext(DropdownContext);

    const style: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        border: 'none',
        borderRadius: '4px',
        background: active
            ? isDark ? '#333' : '#f0f0f0'
            : 'transparent',
        color: active
            ? '#6366f1'
            : isDark ? '#aaa' : '#555',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.1s ease',
        fontSize: '14px',
        margin: '0 1px',
    };

    return (
        <button
            onClick={onClick}
            onMouseDown={(e) => e.preventDefault()}
            style={style}
            disabled={disabled}
            title={title}
        >
            {children}
        </button>
    );
};

// ============================================================================
// Divider Component
// ============================================================================

const ToolbarDivider: React.FC = () => {
    const { isDark } = useContext(DropdownContext);
    return (
        <div
            style={{
                width: '1px',
                height: '20px',
                background: isDark ? '#333' : '#eee',
                margin: '0 6px',
            }}
        />
    );
};

// ============================================================================
// Main Toolbar Component
// ============================================================================

export const ToolbarPlugin: React.FC<ToolbarProps> = ({
    isDark,
    backgroundOpacity = 1,
    onBackgroundOpacityChange,
    blurAmount = 5,
    onBlurAmountChange,
    portalId,
}) => {
    const [editor] = useLexicalComposerContext();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Toolbar state
    const [toolbarState, setToolbarState] = useState<ToolbarState>({
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrikethrough: false,
        isCode: false,
        isLink: false,
        isSubscript: false,
        isSuperscript: false,
        blockType: 'paragraph',
        codeLanguage: '',
        canUndo: false,
        canRedo: false,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '15px',
        fontColor: isDark ? '#e5e5e5' : '#000000',
        bgColor: isDark ? '#1a1a1a' : '#ffffff',
    });

    // Dialog states
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showTableDialog, setShowTableDialog] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const [showEquationDialog, setShowEquationDialog] = useState(false);
    const [equation, setEquation] = useState('x^2 + y^2 = r^2');

    // Dialog refs for outside-click handling
    const equationDialogRef = useRef<HTMLDivElement>(null);
    const linkDialogRef = useRef<HTMLDivElement>(null);
    const tableDialogRef = useRef<HTMLDivElement>(null);
    const embedDialogRef = useRef<HTMLDivElement>(null);

    // Update toolbar state based on selection
    const updateToolbar = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
                const node = getSelectedNode(selection);
                const parent = node.getParent();

                // Get block type
                const anchorNode = selection.anchor.getNode();
                let element =
                    anchorNode.getKey() === 'root'
                        ? anchorNode
                        : $findMatchingParent(anchorNode, (e) => {
                            const parent = e.getParent();
                            return parent !== null && $isParagraphNode(parent);
                        });

                if (element === null) {
                    element = anchorNode.getTopLevelElementOrThrow();
                }

                let blockType = 'paragraph';
                let codeLanguage = '';

                if ($isListNode(element)) {
                    const listType = element.getListType();
                    blockType = listType === 'check' ? 'check' : listType === 'number' ? 'number' : 'bullet';
                } else if ($isHeadingNode(element)) {
                    blockType = element.getTag();
                } else if ($isCodeNode(element)) {
                    blockType = 'code';
                    codeLanguage = element.getLanguage() || '';
                } else if ($isParagraphNode(element)) {
                    blockType = 'paragraph';
                } else if (element.getType() === 'quote') {
                    blockType = 'quote';
                }

                setToolbarState({
                    isBold: selection.hasFormat('bold'),
                    isItalic: selection.hasFormat('italic'),
                    isUnderline: selection.hasFormat('underline'),
                    isStrikethrough: selection.hasFormat('strikethrough'),
                    isCode: selection.hasFormat('code'),
                    isLink: $isLinkNode(parent) || $isLinkNode(node),
                    isSubscript: selection.hasFormat('subscript'),
                    isSuperscript: selection.hasFormat('superscript'),
                    blockType,
                    codeLanguage,
                    canUndo: toolbarState.canUndo,
                    canRedo: toolbarState.canRedo,
                    fontFamily: $getSelectionStyleValueForProperty(
                        selection,
                        'font-family',
                        'system-ui, -apple-system, sans-serif'
                    ),
                    fontSize: $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
                    fontColor: $getSelectionStyleValueForProperty(
                        selection,
                        'color',
                        isDark ? '#e5e5e5' : '#000000'
                    ),
                    bgColor: $getSelectionStyleValueForProperty(
                        selection,
                        'background-color',
                        isDark ? '#1a1a1a' : '#ffffff'
                    ),
                });
            }
        });
    }, [editor, isDark, toolbarState.canUndo, toolbarState.canRedo]);

    // Listen for selection changes
    useEffect(() => {
        return editor.registerUpdateListener(() => {
            updateToolbar();
        });
    }, [editor, updateToolbar]);

    // Listen for selection change command
    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                updateToolbar();
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor, updateToolbar]);

    // Undo/redo state
    useEffect(() => {
        const unregisterUndo = editor.registerCommand(
            CAN_UNDO_COMMAND,
            (payload) => {
                setToolbarState(prev => ({ ...prev, canUndo: payload }));
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
        const unregisterRedo = editor.registerCommand(
            CAN_REDO_COMMAND,
            (payload) => {
                setToolbarState(prev => ({ ...prev, canRedo: payload }));
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
        return () => {
            unregisterUndo();
            unregisterRedo();
        };
    }, [editor]);

    // Format handlers
    const toggleBold = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
    const toggleItalic = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
    const toggleUnderline = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
    const toggleStrikethrough = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
    const toggleCode = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
    const toggleSubscript = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
    const toggleSuperscript = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');

    // Text case handlers
    const changeTextCase = (textCase: 'uppercase' | 'lowercase' | 'capitalize') => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { 'text-transform': textCase });
            }
        });
    };

    // Clear formatting
    const clearFormatting = () => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                selection.format = 0;
                $patchStyleText(selection, {
                    'font-family': null,
                    'font-size': null,
                    color: null,
                    'background-color': null,
                    'text-transform': null,
                });
            }
        });
    };

    // Block type handlers
    const formatBlock = useCallback((type: string) => {
        if (type === 'bullet') {
            editor.dispatchCommand(
                toolbarState.blockType !== 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : REMOVE_LIST_COMMAND,
                undefined
            );
        } else if (type === 'number') {
            editor.dispatchCommand(
                toolbarState.blockType !== 'number' ? INSERT_ORDERED_LIST_COMMAND : REMOVE_LIST_COMMAND,
                undefined
            );
        } else if (type === 'check') {
            editor.dispatchCommand(
                toolbarState.blockType !== 'check' ? INSERT_CHECK_LIST_COMMAND : REMOVE_LIST_COMMAND,
                undefined
            );
        } else if (type === 'quote') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            });
        } else if (type === 'code') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createCodeNode());
                }
            });
        } else if (type === 'paragraph') {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createParagraphNode());
                }
            });
        } else if (type.startsWith('h')) {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
                }
            });
        }
    }, [editor, toolbarState.blockType]);

    // Code language handler
    const setCodeLanguage = useCallback((language: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const anchorNode = selection.anchor.getNode();
                const element = anchorNode.getTopLevelElement();
                if ($isCodeNode(element)) {
                    element.setLanguage(language);
                }
            }
        });
    }, [editor]);

    // Link handlers
    const insertLink = () => {
        if (!toolbarState.isLink) {
            setShowLinkDialog(true);
            editor.getRootElement()?.focus();
        } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    };

    const confirmLink = () => {
        if (linkUrl) editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
        setShowLinkDialog(false);
        setLinkUrl('');
    };

    // Table handlers
    const insertTable = () => {
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: String(tableCols),
            rows: String(tableRows),
            includeHeaders: true,
        });
        setShowTableDialog(false);
    };

    // Align handlers
    const setAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
    };

    // Style handlers
    const onFontFamilySelect = (value: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { 'font-family': value });
            }
        });
    };

    const onFontSizeSelect = (value: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { 'font-size': value });
            }
        });
    };

    const applyFontColor = (color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) $patchStyleText(selection, { color });
        });
    };

    const applyBgColor = (color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) $patchStyleText(selection, { 'background-color': color });
        });
    };

    // Custom features
    const insertEquation = () => {
        editor.dispatchCommand(INSERT_EQUATION_COMMAND, { equation, inline: false });
        setShowEquationDialog(false);
    };

    const insertCollapsible = () => {
        editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
    };

    const insertHorizontalRule = () => {
        editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
    };

    const insertToday = () => {
        editor.dispatchCommand(INSERT_DATETIME_COMMAND, { dateTime: new Date(), format: 'full' });
    };

    const insertPageBreak = () => {
        editor.dispatchCommand(INSERT_PAGE_BREAK_COMMAND, undefined);
    };

    // Embed insertion
    const [showEmbedDialog, setShowEmbedDialog] = useState(false);
    const [embedUrl, setEmbedUrl] = useState('');
    const [embedType, setEmbedType] = useState<'youtube' | 'twitter'>('youtube');

    // Outside-click dismiss handlers for dialogs
    useEffect(() => {
        if (!showEquationDialog) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (equationDialogRef.current && !equationDialogRef.current.contains(event.target as Node)) {
                setShowEquationDialog(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEquationDialog]);

    useEffect(() => {
        if (!showLinkDialog) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (linkDialogRef.current && !linkDialogRef.current.contains(event.target as Node)) {
                setShowLinkDialog(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showLinkDialog]);

    useEffect(() => {
        if (!showTableDialog) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (tableDialogRef.current && !tableDialogRef.current.contains(event.target as Node)) {
                setShowTableDialog(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTableDialog]);

    useEffect(() => {
        if (!showEmbedDialog) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (embedDialogRef.current && !embedDialogRef.current.contains(event.target as Node)) {
                setShowEmbedDialog(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmbedDialog]);

    const insertEmbed = () => {
        if (!embedUrl) return;
        
        if (embedType === 'youtube') {
            editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, embedUrl);
        } else {
            editor.dispatchCommand(INSERT_TWEET_COMMAND, embedUrl);
        }
        setShowEmbedDialog(false);
        setEmbedUrl('');
    };

    // Toolbar styles - positioned outside the rounded content container
    const toolbarStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px',
        padding: '6px 10px',
        background: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: `blur(${blurAmount}px)`,
        WebkitBackdropFilter: `blur(${blurAmount}px)`,
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        alignItems: 'center',
        minHeight: '40px',
        position: 'relative',
        margin: '0 0 4px 0',  // Small gap between toolbar and content
        width: '100%',
        borderRadius: '8px',  // Rounded corners for standalone toolbar
        zIndex: 10,
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    };

    const groupStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
    };

    const colorPickerStyle = (color: string): React.CSSProperties => ({
        width: '20px',
        height: '20px',
        borderRadius: '3px',
        background: color,
        border: `1px solid ${isDark ? '#444' : '#ddd'}`,
        cursor: 'pointer',
    });

    // Toolbar content that will be rendered either inline or via portal
    const toolbarContent = (
        <DropdownContext.Provider value={{ openDropdown, setOpenDropdown, isDark }}>
            <div style={toolbarStyle} className="lexical-toolbar">
                {/* History Group */}
                <div style={groupStyle}>
                    <ToolbarButton
                        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                        disabled={!toolbarState.canUndo}
                        title="Undo (Ctrl+Z)"
                    >
                        <UndoIcon />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                        disabled={!toolbarState.canRedo}
                        title="Redo (Ctrl+Y)"
                    >
                        <RedoIcon />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                {/* Typography Group */}
                <div style={groupStyle}>
                    <FontFamilyDropdown
                        fontFamily={toolbarState.fontFamily}
                        onSelect={onFontFamilySelect}
                    />
                    <FontSizeDropdown
                        fontSize={toolbarState.fontSize}
                        onSelect={onFontSizeSelect}
                    />
                </div>

                <ToolbarDivider />

                {/* Block Type Group */}
                <div style={groupStyle}>
                    <BlockFormatDropdown
                        blockType={toolbarState.blockType}
                        onSelect={formatBlock}
                    />
                    {toolbarState.blockType === 'code' && (
                        <CodeLanguageDropdown
                            codeLanguage={toolbarState.codeLanguage}
                            onSelect={setCodeLanguage}
                        />
                    )}
                </div>

                <ToolbarDivider />

                {/* Text Formatting Group */}
                <div style={groupStyle}>
                    <ToolbarButton onClick={toggleBold} active={toolbarState.isBold} title="Bold (Ctrl+B)">
                        <BoldIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={toggleItalic} active={toolbarState.isItalic} title="Italic (Ctrl+I)">
                        <ItalicIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={toggleUnderline} active={toolbarState.isUnderline} title="Underline (Ctrl+U)">
                        <UnderlineIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={toggleStrikethrough} active={toolbarState.isStrikethrough} title="Strikethrough">
                        <StrikethroughIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={toggleCode} active={toolbarState.isCode} title="Inline Code">
                        <CodeIcon />
                    </ToolbarButton>

                    {/* Text Case Dropdown */}
                    <Dropdown
                        id="text-case"
                        buttonContent={<TextCaseIcon />}
                        className="text-case-dropdown"
                    >
                        <DropdownItem onClick={() => changeTextCase('uppercase')} icon={<UppercaseIcon />}>
                            Uppercase
                        </DropdownItem>
                        <DropdownItem onClick={() => changeTextCase('lowercase')} icon={<LowercaseIcon />}>
                            Lowercase
                        </DropdownItem>
                        <DropdownItem onClick={() => changeTextCase('capitalize')} icon={<CapitalizeIcon />}>
                            Capitalize
                        </DropdownItem>
                    </Dropdown>

                    {/* Subscript/Superscript */}
                    <ToolbarButton onClick={toggleSubscript} active={toolbarState.isSubscript} title="Subscript">
                        <SubscriptIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={toggleSuperscript} active={toolbarState.isSuperscript} title="Superscript">
                        <SuperscriptIcon />
                    </ToolbarButton>

                    {/* Clear Formatting */}
                    <ToolbarButton onClick={clearFormatting} title="Clear Formatting">
                        <ClearFormattingIcon />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                {/* Colors Group */}
                <div style={{ ...groupStyle, gap: '6px' }}>
                    <div title="Text Color" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '12px', color: isDark ? '#aaa' : '#666' }}>A</div>
                        <input
                            type="color"
                            value={toolbarState.fontColor.startsWith('#') ? toolbarState.fontColor : (isDark ? '#e5e5e5' : '#000000')}
                            onChange={(e) => applyFontColor(e.target.value)}
                            style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                        />
                    </div>
                    <div title="Highlight Color" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '12px', background: '#ff0', color: '#000', padding: '0 2px', borderRadius: '2px' }}>H</div>
                        <input
                            type="color"
                            value={toolbarState.bgColor.startsWith('#') ? toolbarState.bgColor : (isDark ? '#1a1a1a' : '#ffffff')}
                            onChange={(e) => applyBgColor(e.target.value)}
                            style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                        />
                    </div>

                    <ToolbarDivider />

                    {/* Background Opacity Slider */}
                    <div title="Note Transparency" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                        <div style={{ fontSize: '12px', color: isDark ? '#818cf8' : '#6366f1', display: 'flex' }}>
                            <MonitorIcon />
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={backgroundOpacity}
                            onChange={(e) => onBackgroundOpacityChange?.(parseFloat(e.target.value))}
                            style={{
                                width: '80px',
                                height: '4px',
                                cursor: 'pointer',
                                accentColor: '#6366f1',
                                WebkitAppearance: 'none',
                                background: isDark ? '#333' : '#eee',
                                borderRadius: '2px',
                                outline: 'none'
                            }}
                        />
                        <div style={{ fontSize: '11px', fontWeight: '500', color: isDark ? '#888' : '#666', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {Math.floor(backgroundOpacity * 100)}%
                        </div>
                    </div>

                    <ToolbarDivider />

                    {/* Blur Slider */}
                    <div title="Blur Intensity" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                        <div style={{ fontSize: '12px', color: isDark ? '#818cf8' : '#6366f1', display: 'flex' }}>
                            <BlurIcon />
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={blurAmount}
                            onChange={(e) => onBlurAmountChange?.(parseInt(e.target.value))}
                            style={{
                                width: '80px',
                                height: '4px',
                                cursor: 'pointer',
                                accentColor: '#6366f1',
                                WebkitAppearance: 'none',
                                background: isDark ? '#333' : '#eee',
                                borderRadius: '2px',
                                outline: 'none'
                            }}
                        />
                        <div style={{ fontSize: '11px', fontWeight: '500', color: isDark ? '#888' : '#666', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {blurAmount}px
                        </div>
                    </div>
                </div>

                <ToolbarDivider />

                {/* Inserts Group */}
                <div style={groupStyle}>
                    <ToolbarButton onClick={insertLink} active={toolbarState.isLink} title="Insert Link">
                        <LinkIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => setShowTableDialog(true)} title="Insert Table">
                        <TableIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => setShowEquationDialog(true)} title="Insert Equation">
                        <EquationIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={insertCollapsible} title="Insert Collapsible">
                        <CollapsibleIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={insertHorizontalRule} title="Horizontal Rule">
                        <LineIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={insertPageBreak} title="Page Break">
                        <PageBreakIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={insertToday} title="Insert Today's Date">
                        <CalendarIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => setShowEmbedDialog(true)} title="Insert Embed (YouTube/Twitter)">
                        <EmbedIcon />
                    </ToolbarButton>
                    <MarkdownToggleButton isDark={isDark} />
                </div>

                <ToolbarDivider />

                {/* Alignment Group */}
                <div style={groupStyle}>
                    <ToolbarButton onClick={() => setAlign('left')} title="Align Left">
                        <AlignLeftIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => setAlign('center')} title="Align Center">
                        <AlignCenterIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => setAlign('right')} title="Align Right">
                        <AlignRightIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => setAlign('justify')} title="Justify">
                        <AlignJustifyIcon />
                    </ToolbarButton>
                </div>

                {/* Dialogs */}
                {/* Equation Dialog */}
                {showEquationDialog && (
                    <div ref={equationDialogRef} style={{ position: 'absolute', top: '45px', left: '100px', background: isDark ? '#1a1a1a' : '#fff', border: `1px solid ${isDark ? '#333' : '#ddd'}`, padding: '12px', borderRadius: '8px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '300px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Insert LaTeX Equation</div>
                        <textarea
                            value={equation}
                            onChange={(e) => setEquation(e.target.value)}
                            rows={3}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#111' : '#fff', color: isDark ? '#fff' : '#000', fontFamily: 'monospace', fontSize: '13px', marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={() => setShowEquationDialog(false)} style={{ padding: '4px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: isDark ? '#aaa' : '#666' }}>Cancel</button>
                            <button onClick={insertEquation} style={{ padding: '6px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Insert</button>
                        </div>
                    </div>
                )}

                {/* Link Dialog */}
                {showLinkDialog && (
                    <div
                        ref={linkDialogRef}
                        style={{
                            position: 'absolute',
                            top: '45px',
                            left: '50px',
                            background: isDark ? '#1a1a1a' : '#ffffff',
                            border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            zIndex: 100,
                            display: 'flex',
                            gap: '8px',
                        }}
                    >
                        <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://example.com"
                            style={{
                                padding: '6px 10px',
                                border: `1px solid ${isDark ? '#333' : '#eee'}`,
                                borderRadius: '4px',
                                background: isDark ? '#111' : '#ffffff',
                                color: isDark ? '#fff' : '#374151',
                                fontSize: '13px',
                                width: '200px',
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && confirmLink()}
                            autoFocus
                        />
                        <button
                            onClick={confirmLink}
                            style={{ padding: '6px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                        >
                            Add
                        </button>
                        <button
                            onClick={() => setShowLinkDialog(false)}
                            style={{ padding: '6px', background: 'transparent', color: isDark ? '#9ca3af' : '#6b7280', border: 'none', fontSize: '13px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Table Dialog */}
                {showTableDialog && (
                    <div
                        ref={tableDialogRef}
                        style={{
                            position: 'absolute',
                            top: '45px',
                            left: '80px',
                            background: isDark ? '#1a1a1a' : '#ffffff',
                            border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                            borderRadius: '8px',
                            padding: '16px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            zIndex: 100,
                        }}
                    >
                        <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px' }}>Insert Table</div>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Rows</span>
                                <input
                                    type="number"
                                    value={tableRows}
                                    onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                                    min={1}
                                    max={10}
                                    style={{ width: '60px', padding: '6px', border: `1px solid ${isDark ? '#333' : '#eee'}`, borderRadius: '4px', background: isDark ? '#111' : '#ffffff', color: isDark ? '#fff' : '#000' }}
                                />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Cols</span>
                                <input
                                    type="number"
                                    value={tableCols}
                                    onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                                    min={1}
                                    max={10}
                                    style={{ width: '60px', padding: '6px', border: `1px solid ${isDark ? '#333' : '#eee'}`, borderRadius: '4px', background: isDark ? '#111' : '#ffffff', color: isDark ? '#fff' : '#000' }}
                                />
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowTableDialog(false)} style={{ padding: '4px 12px', background: 'transparent', color: isDark ? '#aaa' : '#666', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                            <button onClick={insertTable} style={{ padding: '6px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Insert</button>
                        </div>
                    </div>
                )}

                {/* Embed Dialog */}
                {showEmbedDialog && (
                    <div
                        ref={embedDialogRef}
                        style={{
                            position: 'absolute',
                            top: '45px',
                            left: '80px',
                            background: isDark ? '#1a1a1a' : '#ffffff',
                            border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                            borderRadius: '8px',
                            padding: '16px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            zIndex: 100,
                            width: '320px',
                        }}
                    >
                        <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px' }}>Insert Embed</div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button
                                onClick={() => setEmbedType('youtube')}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: embedType === 'youtube' ? '#6366f1' : isDark ? '#333' : '#f3f4f6',
                                    color: embedType === 'youtube' ? '#fff' : isDark ? '#ccc' : '#374151',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                }}
                            >
                                YouTube
                            </button>
                            <button
                                onClick={() => setEmbedType('twitter')}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: embedType === 'twitter' ? '#6366f1' : isDark ? '#333' : '#f3f4f6',
                                    color: embedType === 'twitter' ? '#fff' : isDark ? '#ccc' : '#374151',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                }}
                            >
                                Twitter/X
                            </button>
                        </div>
                        <input
                            type="text"
                            value={embedUrl}
                            onChange={(e) => setEmbedUrl(e.target.value)}
                            placeholder={embedType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://twitter.com/username/status/...'}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: `1px solid ${isDark ? '#333' : '#eee'}`,
                                borderRadius: '4px',
                                background: isDark ? '#111' : '#ffffff',
                                color: isDark ? '#fff' : '#000',
                                fontSize: '13px',
                                marginBottom: '12px',
                                boxSizing: 'border-box',
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && insertEmbed()}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowEmbedDialog(false)} style={{ padding: '4px 12px', background: 'transparent', color: isDark ? '#aaa' : '#666', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                            <button onClick={insertEmbed} style={{ padding: '6px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Insert</button>
                        </div>
                    </div>
                )}
            </div>
        </DropdownContext.Provider>
    );

    // If portalId is provided, render into that DOM element via portal
    // This allows the toolbar to break out of overflow:hidden containers
    if (portalId) {
        const portalElement = document.getElementById(portalId);
        if (portalElement) {
            return createPortal(toolbarContent, portalElement);
        }
    }

    // Otherwise render inline (normal behavior)
    return toolbarContent;
};

export default ToolbarPlugin;
