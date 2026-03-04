/**
 * Component Picker Plugin (Slash Commands)
 * 
 * Provides a command palette that opens when typing `/`, allowing quick insertion
 * of blocks like headings, lists, tables, code blocks, etc.
 * 
 * Based on Lexical Playground implementation.
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    LexicalTypeaheadMenuPlugin,
    MenuOption,
    useBasicTypeaheadTriggerMatch,
    type MenuTextMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
    $createHeadingNode,
    $createQuoteNode,
    type HeadingTagType,
} from '@lexical/rich-text';
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    TextNode,
} from 'lexical';
import {
    $createListItemNode,
    $createListNode,
    ListNode,
    ListItemNode,
} from '@lexical/list';
import { $createCodeNode, $isCodeNode, CodeNode } from '@lexical/code';
import {
    $createTableCellNode,
    $createTableNode,
    $createTableNodeWithDimensions,
    $createTableRowNode,
    $isTableCellNode,
    $isTableNode,
    $isTableRowNode,
    TableCellHeaderStates,
    TableCellNode,
    TableNode,
    TableRowNode,
} from '@lexical/table';
import { $setBlocksType } from '@lexical/selection';
import { $findMatchingParent, isHTMLElement } from '@lexical/utils';
import { $createHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { INSERT_EQUATION_COMMAND } from '../EquationPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from '../CollapsiblePlugin';
import { INSERT_DATETIME_COMMAND } from '../DateTimePlugin';
import { INSERT_PAGE_BREAK_COMMAND } from '../PageBreakPlugin';
import { INSERT_IMAGE_COMMAND } from '../ImagePlugin';

// ============================================================================
// Icon Components (defined first to avoid circular reference issues)
// ============================================================================

const ParagraphIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 4v16" />
        <path d="M17 4v16" />
        <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
    </svg>
);

const Heading1Icon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h8" />
        <path d="M4 18V6" />
        <path d="M12 18V6" />
        <path d="m17 12 3-2v8" />
    </svg>
);

const Heading2Icon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h8" />
        <path d="M4 18V6" />
        <path d="M12 18V6" />
        <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
);

const Heading3Icon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h8" />
        <path d="M4 18V6" />
        <path d="M12 18V6" />
        <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
        <path d="M17 17.5c4 0 4-4 4-4" />
    </svg>
);

const BulletListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
    </svg>
);

const NumberedListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 6h11" />
        <path d="M10 12h11" />
        <path d="M10 18h11" />
        <path d="M4 6h1v4" />
        <path d="M4 10h2" />
        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
);

const CheckListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 11 3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
);

const QuoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
        <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
    </svg>
);

const CodeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
);

const TableIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="3" x2="21" y1="9" y2="9" />
        <line x1="3" x2="21" y1="15" y2="15" />
        <line x1="12" x2="12" y1="3" y2="21" />
    </svg>
);

const HorizontalRuleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </svg>
);

const PageBreakIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" x2="12" y1="18" y2="12" />
        <line x1="9" x2="15" y1="15" y2="15" />
    </svg>
);

const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
);

const EquationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 7h10" />
        <path d="M10 11v6" />
        <path d="M9 17h2" />
        <path d="M14 11v6" />
        <path d="M13 17h2" />
        <path d="M12 7V4" />
    </svg>
);

const CollapsibleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 11 3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        <path d="m5 11 3 3" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
);

const AlignLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="21" x2="3" y1="6" y2="6" />
        <line x1="15" x2="3" y1="12" y2="12" />
        <line x1="17" x2="3" y1="18" y2="18" />
    </svg>
);

const AlignCenterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="21" x2="3" y1="6" y2="6" />
        <line x1="17" x2="7" y1="12" y2="12" />
        <line x1="19" x2="5" y1="18" y2="18" />
    </svg>
);

const AlignRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="21" x2="3" y1="6" y2="6" />
        <line x1="21" x2="9" y1="12" y2="12" />
        <line x1="21" x2="7" y1="18" y2="18" />
    </svg>
);

const AlignJustifyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" x2="21" y1="6" y2="6" />
        <line x1="3" x2="21" y1="12" y2="12" />
        <line x1="3" x2="21" y1="18" y2="18" />
    </svg>
);

// ============================================================================
// Types & Interfaces
// ============================================================================

export class ComponentPickerOption extends MenuOption {
    /** Display title for the option */
    title: string;
    /** Icon component or element */
    icon?: React.ReactNode;
    /** Additional keywords for search */
    keywords: string[];
    /** Keyboard shortcut display */
    shortcut?: string;
    /** Category for grouping */
    category?: string;
    /** Callback to execute when selected */
    onSelect: (queryString: string) => void;

    constructor(
        title: string,
        options: {
            icon?: React.ReactNode;
            keywords?: string[];
            shortcut?: string;
            category?: string;
            onSelect: (queryString: string) => void;
        },
    ) {
        super(title);
        this.title = title;
        this.icon = options.icon;
        this.keywords = options.keywords ?? [];
        this.shortcut = options.shortcut;
        this.category = options.category;
        this.onSelect = options.onSelect.bind(this);
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the current selection is inside a table
 */
function $isSelectionInsideTable(): boolean {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return false;
    
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    
    return (
        $findMatchingParent(anchorNode, $isTableCellNode) !== null ||
        $findMatchingParent(focusNode, $isTableCellNode) !== null
    );
}

/**
 * Get the current block type from selection
 */
function $getCurrentBlockType(): string {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return 'paragraph';
    
    const anchorNode = selection.anchor.getNode();
    const blockNode = $findMatchingParent(anchorNode, (node) => 
        node !== anchorNode && (node as any).getType !== undefined
    );
    
    return blockNode?.getType?.() ?? 'paragraph';
}

/**
 * Parse table dimensions from query string (e.g., "3x4" -> { rows: 3, columns: 4 })
 */
function parseTableDimensions(query: string): { rows: number; columns: number } | null {
    const match = query.match(/^(\d+)x(\d+)$/i);
    if (!match) return null;
    
    const rows = parseInt(match[1], 10);
    const columns = parseInt(match[2], 10);
    
    if (rows < 1 || rows > 20 || columns < 1 || columns > 20) return null;
    
    return { rows, columns };
}

// ============================================================================
// Main Plugin Component
// ============================================================================

export default function ComponentPickerPlugin(): React.ReactElement | null {
    const [editor] = useLexicalComposerContext();
    const [queryString, setQueryString] = useState<string | null>(null);

    // Check trigger match
    const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
        minLength: 0,
        maxLength: 10,
    });

    // Get all available options
    const getOptions = useCallback((): ComponentPickerOption[] => {
        const options: ComponentPickerOption[] = [
            // Basic Blocks
            new ComponentPickerOption('Paragraph', {
                icon: <ParagraphIcon />,
                keywords: ['normal', 'text', 'p'],
                category: 'Basic',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createParagraphNode());
                        }
                    });
                },
            }),

            // Headings
            new ComponentPickerOption('Heading 1', {
                icon: <Heading1Icon />,
                keywords: ['h1', 'title', 'header', 'heading'],
                shortcut: '#',
                category: 'Headings',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createHeadingNode('h1'));
                        }
                    });
                },
            }),
            new ComponentPickerOption('Heading 2', {
                icon: <Heading2Icon />,
                keywords: ['h2', 'subtitle', 'header', 'heading'],
                shortcut: '##',
                category: 'Headings',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createHeadingNode('h2'));
                        }
                    });
                },
            }),
            new ComponentPickerOption('Heading 3', {
                icon: <Heading3Icon />,
                keywords: ['h3', 'subsubtitle', 'header', 'heading'],
                shortcut: '###',
                category: 'Headings',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createHeadingNode('h3'));
                        }
                    });
                },
            }),

            // Lists
            new ComponentPickerOption('Bullet List', {
                icon: <BulletListIcon />,
                keywords: ['ul', 'unordered', 'list', 'bullet', '-'],
                shortcut: '-',
                category: 'Lists',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            const anchorNode = selection.anchor.getNode();
                            const blockNode = $findMatchingParent(anchorNode, (node) => 
                                node !== anchorNode && (node as any).getType !== undefined
                            );
                            
                            if (blockNode?.getType() === 'list') {
                                // Convert list to paragraph
                                $setBlocksType(selection, () => $createParagraphNode());
                            } else {
                                // Convert to bullet list
                                $setBlocksType(selection, () => $createListNode('bullet'));
                            }
                        }
                    });
                },
            }),
            new ComponentPickerOption('Numbered List', {
                icon: <NumberedListIcon />,
                keywords: ['ol', 'ordered', 'list', 'number', '1.'],
                shortcut: '1.',
                category: 'Lists',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createListNode('number'));
                        }
                    });
                },
            }),
            new ComponentPickerOption('Check List', {
                icon: <CheckListIcon />,
                keywords: ['check', 'todo', 'checkbox', 'task', '[ ]'],
                shortcut: '[ ]',
                category: 'Lists',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createListNode('check'));
                        }
                    });
                },
            }),

            // Formatting
            new ComponentPickerOption('Quote', {
                icon: <QuoteIcon />,
                keywords: ['blockquote', 'quote', '>'],
                shortcut: '>',
                category: 'Formatting',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createQuoteNode());
                        }
                    });
                },
            }),
            new ComponentPickerOption('Code Block', {
                icon: <CodeIcon />,
                keywords: ['code', 'pre', '```'],
                shortcut: '```',
                category: 'Formatting',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createCodeNode());
                        }
                    });
                },
            }),

            // Insert
            new ComponentPickerOption('Table', {
                icon: <TableIcon />,
                keywords: ['table', 'grid', 'spreadsheet', 'rows', 'columns'],
                category: 'Insert',
                onSelect: (queryString: string) => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if (!$isRangeSelection(selection)) return;

                        // Check for dynamic dimensions in query
                        const dimensions = parseTableDimensions(queryString);
                        
                        if (dimensions) {
                            // Insert table with specified dimensions
                            const tableNode = $createTableNodeWithDimensions(
                                dimensions.rows,
                                dimensions.columns,
                                true, // includeHeaders
                            );
                            selection.insertNodes([tableNode]);
                        } else {
                            // Insert default 3x3 table
                            const tableNode = $createTableNodeWithDimensions(3, 3, true);
                            selection.insertNodes([tableNode]);
                        }
                        
                        // Add paragraph after table
                        const paragraph = $createParagraphNode();
                        tableNode.insertAfter(paragraph);
                        paragraph.select();
                    });
                },
            }),
            new ComponentPickerOption('Horizontal Rule', {
                icon: <HorizontalRuleIcon />,
                keywords: ['hr', 'divider', 'line', 'separator', '---'],
                shortcut: '---',
                category: 'Insert',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            const hrNode = $createHorizontalRuleNode();
                            selection.insertNodes([hrNode]);
                        }
                    });
                },
            }),
            new ComponentPickerOption('Page Break', {
                icon: <PageBreakIcon />,
                keywords: ['page', 'break', 'pagebreak', 'new page'],
                category: 'Insert',
                onSelect: () => {
                    editor.dispatchCommand(INSERT_PAGE_BREAK_COMMAND, undefined);
                },
            }),
            new ComponentPickerOption('Image', {
                icon: <ImageIcon />,
                keywords: ['image', 'img', 'picture', 'photo'],
                category: 'Insert',
                onSelect: () => {
                    // Open a prompt for image URL
                    const url = prompt('Enter image URL:');
                    if (url) {
                        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                            src: url,
                            altText: 'Image',
                            width: 400,
                            height: 300,
                        });
                    }
                },
            }),
            new ComponentPickerOption('Equation', {
                icon: <EquationIcon />,
                keywords: ['equation', 'math', 'latex', 'formula', 'katex'],
                category: 'Insert',
                onSelect: () => {
                    editor.dispatchCommand(INSERT_EQUATION_COMMAND, {
                        equation: 'E = mc^2',
                        inline: false,
                    });
                },
            }),
            new ComponentPickerOption('Collapsible', {
                icon: <CollapsibleIcon />,
                keywords: ['collapsible', 'details', 'accordion', 'fold', 'expand'],
                category: 'Insert',
                onSelect: () => {
                    editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
                },
            }),
            new ComponentPickerOption('Today', {
                icon: <CalendarIcon />,
                keywords: ['today', 'date', 'current', 'now'],
                category: 'Insert',
                onSelect: () => {
                    editor.dispatchCommand(INSERT_DATETIME_COMMAND, {
                        dateTime: new Date(),
                        format: 'full',
                    });
                },
            }),
            new ComponentPickerOption('Tomorrow', {
                icon: <CalendarIcon />,
                keywords: ['tomorrow', 'date', 'next day'],
                category: 'Insert',
                onSelect: () => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    editor.dispatchCommand(INSERT_DATETIME_COMMAND, {
                        dateTime: tomorrow,
                        format: 'full',
                    });
                },
            }),
            new ComponentPickerOption('Yesterday', {
                icon: <CalendarIcon />,
                keywords: ['yesterday', 'date', 'previous day'],
                category: 'Insert',
                onSelect: () => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    editor.dispatchCommand(INSERT_DATETIME_COMMAND, {
                        dateTime: yesterday,
                        format: 'full',
                    });
                },
            }),

            // Alignment
            new ComponentPickerOption('Align Left', {
                icon: <AlignLeftIcon />,
                keywords: ['align', 'left'],
                shortcut: 'Ctrl+L',
                category: 'Alignment',
                onSelect: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
                },
            }),
            new ComponentPickerOption('Align Center', {
                icon: <AlignCenterIcon />,
                keywords: ['align', 'center'],
                shortcut: 'Ctrl+E',
                category: 'Alignment',
                onSelect: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
                },
            }),
            new ComponentPickerOption('Align Right', {
                icon: <AlignRightIcon />,
                keywords: ['align', 'right'],
                shortcut: 'Ctrl+R',
                category: 'Alignment',
                onSelect: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
                },
            }),
            new ComponentPickerOption('Justify', {
                icon: <AlignJustifyIcon />,
                keywords: ['align', 'justify'],
                shortcut: 'Ctrl+J',
                category: 'Alignment',
                onSelect: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
                },
            }),
        ];

        return options;
    }, [editor]);

    // Filter options based on query string
    const filteredOptions = useMemo(() => {
        const options = getOptions();
        
        if (!queryString) {
            return options;
        }

        const query = queryString.toLowerCase().trim();
        
        // Check if query is a table dimension pattern (e.g., "3x4")
        const tableDimensions = parseTableDimensions(query);
        if (tableDimensions) {
            // Return a dynamic table option
            return [
                new ComponentPickerOption(
                    `${tableDimensions.rows}x${tableDimensions.columns} Table`,
                    {
                        icon: <TableIcon />,
                        keywords: ['table', 'grid', `${tableDimensions.rows}x${tableDimensions.columns}`],
                        category: 'Insert',
                        onSelect: () => {
                            editor.update(() => {
                                const selection = $getSelection();
                                if ($isRangeSelection(selection)) {
                                    const tableNode = $createTableNodeWithDimensions(
                                        tableDimensions.rows,
                                        tableDimensions.columns,
                                        true,
                                    );
                                    selection.insertNodes([tableNode]);
                                    const paragraph = $createParagraphNode();
                                    tableNode.insertAfter(paragraph);
                                    paragraph.select();
                                }
                            });
                        },
                    }
                ),
            ];
        }

        return options.filter((option) => {
            const titleMatch = option.title.toLowerCase().includes(query);
            const keywordMatch = option.keywords.some((keyword) =>
                keyword.toLowerCase().includes(query)
            );
            return titleMatch || keywordMatch;
        });
    }, [getOptions, queryString, editor]);

    // Handle option selection
    const onSelectOption = useCallback(
        (selectedOption: ComponentPickerOption, nodeToRemove: TextNode | null, closeMenu: () => void, matchingString: string) => {
            editor.update(() => {
                // Remove the trigger text
                if (nodeToRemove) {
                    nodeToRemove.remove();
                } else {
                    // Try to remove the trigger text from selection
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const anchor = selection.anchor;
                        const focus = selection.focus;
                        if (anchor.offset >= matchingString.length) {
                            anchor.set(anchor.getNode(), anchor.offset - matchingString.length, 'text');
                            focus.set(focus.getNode(), focus.offset, 'text');
                            selection.extract();
                        }
                    }
                }

                // Execute the option's onSelect
                selectedOption.onSelect(matchingString);
                
                closeMenu();
            });
        },
        [editor]
    );

    // Render the menu
    const menuRenderFn = useCallback(
        (
            anchorElementRef: React.RefObject<HTMLElement>,
            { selectedIndex, options, selectOptionAndCleanUp, setHighlightedIndex }: {
                selectedIndex: number | null;
                options: ComponentPickerOption[];
                selectOptionAndCleanUp: (option: ComponentPickerOption) => void;
                setHighlightedIndex: (index: number) => void;
            }
        ) => {
            if (anchorElementRef.current === null || options.length === 0) {
                return null;
            }

            const { current: anchorElement } = anchorElementRef;
            const rect = anchorElement.getBoundingClientRect();

            // Group options by category
            const groupedOptions = options.reduce((acc, option) => {
                const category = option.category ?? 'Other';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(option);
                return acc;
            }, {} as Record<string, ComponentPickerOption[]>);

            const categories = Object.keys(groupedOptions);

            return createPortal(
                <div
                    className="component-picker-menu"
                    style={{
                        position: 'fixed',
                        top: rect.bottom + 8,
                        left: rect.left,
                        zIndex: 10000,
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        border: '1px solid #e5e7eb',
                        minWidth: '280px',
                        maxWidth: '320px',
                        maxHeight: '400px',
                        overflow: 'auto',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: '14px',
                    }}
                >
                    {categories.map((category, categoryIndex) => (
                        <div key={category}>
                            <div
                                style={{
                                    padding: '8px 12px 4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                {category}
                            </div>
                            {groupedOptions[category].map((option, indexInCategory) => {
                                // Calculate global index
                                let globalIndex = 0;
                                for (let i = 0; i < categoryIndex; i++) {
                                    globalIndex += groupedOptions[categories[i]].length;
                                }
                                globalIndex += indexInCategory;

                                const isSelected = selectedIndex === globalIndex;

                                return (
                                    <button
                                        key={option.key}
                                        onClick={() => selectOptionAndCleanUp(option)}
                                        onMouseEnter={() => setHighlightedIndex(globalIndex)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: 'none',
                                            background: isSelected ? '#f3f4f6' : 'transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            gap: '10px',
                                            transition: 'background 0.15s ease',
                                            color: '#1f2937',
                                        }}
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        <span
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px',
                                                color: '#6b7280',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {option.icon}
                                        </span>
                                        <span
                                            style={{
                                                flex: 1,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {option.title}
                                        </span>
                                        {option.shortcut && (
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    color: '#9ca3af',
                                                    background: '#f3f4f6',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                }}
                                            >
                                                {option.shortcut}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div
                            style={{
                                padding: '16px',
                                textAlign: 'center',
                                color: '#9ca3af',
                            }}
                        >
                            No results found
                        </div>
                    )}
                </div>,
                document.body
            );
        },
        []
    );

    return (
        <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
            onQueryChange={setQueryString}
            onSelectOption={onSelectOption}
            triggerFn={checkForTriggerMatch}
            options={filteredOptions}
            menuRenderFn={menuRenderFn}
        />
    );
}


