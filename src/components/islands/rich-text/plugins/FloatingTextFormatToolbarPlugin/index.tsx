import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND,
    SELECTION_CHANGE_COMMAND,
    COMMAND_PRIORITY_LOW,
    TextNode,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import { $getSelectionStyleValueForProperty } from '@lexical/selection';
import { getSelectedNode } from '../../utils/getSelectedNode';
import { setFloatingElemPositionForRange } from '../../utils/setFloatingElemPosition';

// ============================================================================
// Icon Components (defined first to avoid circular reference issues)
// ============================================================================

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

const UppercaseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 18V6M4 6h8M12 6v12M4 12h8" />
        <path d="M16 18V6l6 12V6" />
    </svg>
);

const LowercaseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 18V6h4a4 4 0 0 1 0 8H6" />
        <path d="M14 18V6h4a4 4 0 0 1 0 8h-4" />
    </svg>
);

const CapitalizeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 18V6h8v3M8 4v16" />
        <path d="M16 18V6h4a4 4 0 0 1 0 8h-4" />
    </svg>
);

const LinkIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

interface FloatingTextFormatToolbarProps {
    anchorElem: HTMLElement;
    isDark: boolean;
}

// Text transform types
const TEXT_TRANSFORM_COMMAND = {
    UPPERCASE: 'uppercase',
    LOWERCASE: 'lowercase',
    CAPITALIZE: 'capitalize',
} as const;

function getDOMSelection(targetWindow: Window | null): Selection | null {
    return targetWindow?.getSelection() ?? null;
}



export const FloatingTextFormatToolbar: React.FC<FloatingTextFormatToolbarProps> = ({
    anchorElem,
    isDark,
}) => {
    const [editor] = useLexicalComposerContext();
    const popupRef = useRef<HTMLDivElement | null>(null);
    const [isText, setIsText] = useState(false);
    const [isLink, setIsLink] = useState(false);
    
    // Format states
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [isSubscript, setIsSubscript] = useState(false);
    const [isSuperscript, setIsSuperscript] = useState(false);
    const [isUppercase, setIsUppercase] = useState(false);
    const [isLowercase, setIsLowercase] = useState(false);
    const [isCapitalize, setIsCapitalize] = useState(false);

    const updatePopup = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();

            if (!$isRangeSelection(selection) || selection.isCollapsed()) {
                setIsText(false);
                return;
            }

            const anchorNode = getSelectedNode(selection);

            const element = anchorNode.getKey() === 'root'
                ? anchorNode
                : $findMatchingParent(anchorNode, (e) => {
                    const parent = e.getParent();
                    return parent !== null;
                });

            if (element === null) {
                setIsText(false);
                return;
            }

            const linkParent = $findMatchingParent(anchorNode, $isLinkNode);
            const isLinkNode = linkParent !== null || $isLinkNode(anchorNode);

            setIsLink(isLinkNode);
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            setIsStrikethrough(selection.hasFormat('strikethrough'));
            setIsCode(selection.hasFormat('code'));
            setIsSubscript(selection.hasFormat('subscript'));
            setIsSuperscript(selection.hasFormat('superscript'));
            
            // Check text transform
            const textTransform = $getSelectionStyleValueForProperty(selection, 'text-transform', '');
            setIsUppercase(textTransform === 'uppercase');
            setIsLowercase(textTransform === 'lowercase');
            setIsCapitalize(textTransform === 'capitalize');

            setIsText(true);
        });
    }, [editor]);

    useEffect(() => {
        const popup = popupRef.current;
        if (!popup) return;

        const rootElement = editor.getRootElement();
        if (!rootElement) return;

        editor.getEditorState().read(() => {
            const selection = $getSelection();
            
            if (!$isRangeSelection(selection) || selection.isCollapsed() || editor.isComposing()) {
                popup.style.opacity = '0';
                popup.style.transform = 'translate(-10000px, -10000px)';
                return;
            }

            const domSelection = getDOMSelection(window);
            if (!domSelection || domSelection.rangeCount === 0) {
                popup.style.opacity = '0';
                popup.style.transform = 'translate(-10000px, -10000px)';
                return;
            }

            const domRange = domSelection.getRangeAt(0);
            const rect = domRange.getBoundingClientRect();
            
            setFloatingElemPositionForRange(rect, popup, anchorElem);
        });
    }, [editor, anchorElem, isText]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updatePopup();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updatePopup();
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [editor, updatePopup]);

    // Hide toolbar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                // Let the selection change handler deal with hiding
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const insertLink = useCallback(() => {
        if (!isLink) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
        } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    }, [editor, isLink]);

    const applyTextTransform = useCallback((transform: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            const nodes = selection.getNodes();
            nodes.forEach((node) => {
                if (node instanceof TextNode) {
                    const text = node.getTextContent();
                    let transformedText = text;
                    
                    switch (transform) {
                        case TEXT_TRANSFORM_COMMAND.UPPERCASE:
                            transformedText = text.toUpperCase();
                            break;
                        case TEXT_TRANSFORM_COMMAND.LOWERCASE:
                            transformedText = text.toLowerCase();
                            break;
                        case TEXT_TRANSFORM_COMMAND.CAPITALIZE:
                            transformedText = text.replace(/\b\w/g, (char) => char.toUpperCase());
                            break;
                    }
                    
                    if (transformedText !== text) {
                        node.setTextContent(transformedText);
                    }
                }
            });
        });
    }, [editor]);

    const toolbarStyle: React.CSSProperties = {
        display: isText ? 'flex' : 'none',
        gap: '2px',
        padding: '6px 8px',
        background: isDark ? '#1a1a1a' : '#ffffff',
        borderRadius: '8px',
        boxShadow: isDark 
            ? '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
            : '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 100,
        opacity: 0,
        transform: 'translate(-10000px, -10000px)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        alignItems: 'center',
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        border: 'none',
        borderRadius: '4px',
        background: active ? (isDark ? '#333' : '#f0f0f0') : 'transparent',
        color: active ? '#6366f1' : isDark ? '#aaa' : '#555',
        cursor: 'pointer',
        transition: 'all 0.1s ease',
        fontSize: '13px',
        margin: '0 1px',
    });

    const dividerStyle: React.CSSProperties = {
        width: '1px',
        height: '20px',
        background: isDark ? '#333' : '#eee',
        margin: '0 4px',
    };

    return createPortal(
        <div ref={popupRef} style={toolbarStyle} className="floating-text-format-toolbar">
            {/* Basic Formatting */}
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
                style={buttonStyle(isBold)}
                title="Bold (Ctrl+B)"
                type="button"
            >
                <BoldIcon />
            </button>
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
                style={buttonStyle(isItalic)}
                title="Italic (Ctrl+I)"
                type="button"
            >
                <ItalicIcon />
            </button>
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
                style={buttonStyle(isUnderline)}
                title="Underline (Ctrl+U)"
                type="button"
            >
                <UnderlineIcon />
            </button>
            
            <div style={dividerStyle} />
            
            {/* Additional Formatting */}
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
                style={buttonStyle(isStrikethrough)}
                title="Strikethrough"
                type="button"
            >
                <StrikethroughIcon />
            </button>
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
                style={buttonStyle(isCode)}
                title="Inline Code"
                type="button"
            >
                <CodeIcon />
            </button>
            
            <div style={dividerStyle} />
            
            {/* Subscript / Superscript */}
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')}
                style={buttonStyle(isSubscript)}
                title="Subscript"
                type="button"
            >
                <SubscriptIcon />
            </button>
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')}
                style={buttonStyle(isSuperscript)}
                title="Superscript"
                type="button"
            >
                <SuperscriptIcon />
            </button>
            
            <div style={dividerStyle} />
            
            {/* Text Transform */}
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextTransform(TEXT_TRANSFORM_COMMAND.UPPERCASE)}
                style={buttonStyle(isUppercase)}
                title="Uppercase"
                type="button"
            >
                <UppercaseIcon />
            </button>
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextTransform(TEXT_TRANSFORM_COMMAND.LOWERCASE)}
                style={buttonStyle(isLowercase)}
                title="Lowercase"
                type="button"
            >
                <LowercaseIcon />
            </button>
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextTransform(TEXT_TRANSFORM_COMMAND.CAPITALIZE)}
                style={buttonStyle(isCapitalize)}
                title="Capitalize"
                type="button"
            >
                <CapitalizeIcon />
            </button>
            
            <div style={dividerStyle} />
            
            {/* Link */}
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={insertLink}
                style={buttonStyle(isLink)}
                title="Insert Link"
                type="button"
            >
                <LinkIcon />
            </button>
        </div>,
        anchorElem,
    );
};

export default FloatingTextFormatToolbar;
