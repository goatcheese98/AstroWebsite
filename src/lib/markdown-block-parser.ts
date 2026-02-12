
/**
 * Markdown Block Parser
 * 
 * Parses markdown content into semantic blocks for hybrid editing.
 * Each block represents a logical unit (heading, paragraph, code block, list, table, etc.)
 * that can be edited independently while others remain rendered.
 */

export interface MarkdownBlock {
    id: string;           // Unique identifier for React keys
    type: 'heading' | 'paragraph' | 'code' | 'list' | 'table' | 'blockquote' | 'hr' | 'empty';
    rawContent: string;   // Original markdown text
    startLine: number;    // 0-indexed line number where block starts
    endLine: number;      // 0-indexed line number where block ends
    metadata?: {
        level?: number;   // Header level (1-6)
        language?: string; // Code block language
        ordered?: boolean; // List type
    };
}

/**
 * Parse markdown content into blocks
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
    const lines = content.split('\n');
    const blocks: MarkdownBlock[] = [];
    let currentLine = 0;

    while (currentLine < lines.length) {
        const line = lines[currentLine];

        // Code block (fenced with ```)
        if (line.trim().startsWith('```')) {
            const block = parseCodeBlock(lines, currentLine);
            blocks.push(block);
            currentLine = block.endLine + 1;
            continue;
        }

        // Horizontal rule
        if (/^(\*\*\*+|---+|___+)\s*$/.test(line.trim())) {
            blocks.push({
                id: generateId(),
                type: 'hr',
                rawContent: line,
                startLine: currentLine,
                endLine: currentLine,
            });
            currentLine++;
            continue;
        }

        // Heading
        if (/^#{1,6}\s/.test(line.trim())) {
            const match = line.trim().match(/^(#{1,6})\s/);
            blocks.push({
                id: generateId(),
                type: 'heading',
                rawContent: line,
                startLine: currentLine,
                endLine: currentLine,
                metadata: { level: match![1].length },
            });
            currentLine++;
            continue;
        }

        // Blockquote
        if (line.trim().startsWith('>')) {
            const block = parseBlockquote(lines, currentLine);
            blocks.push(block);
            currentLine = block.endLine + 1;
            continue;
        }

        // Table (starts with |)
        if (line.trim().startsWith('|') && currentLine + 1 < lines.length) {
            const nextLine = lines[currentLine + 1].trim();
            // Check if next line is separator (|----|)
            if (/^\|[\s:-]+\|/.test(nextLine)) {
                const block = parseTable(lines, currentLine);
                blocks.push(block);
                currentLine = block.endLine + 1;
                continue;
            }
        }

        // List (unordered or ordered)
        if (/^(\s*)[-*+]\s/.test(line) || /^(\s*)\d+\.\s/.test(line)) {
            const block = parseList(lines, currentLine);
            blocks.push(block);
            currentLine = block.endLine + 1;
            continue;
        }

        // Empty line
        if (line.trim() === '') {
            blocks.push({
                id: generateId(),
                type: 'empty',
                rawContent: line,
                startLine: currentLine,
                endLine: currentLine,
            });
            currentLine++;
            continue;
        }

        // Default: paragraph (might span multiple lines until empty line or special syntax)
        const block = parseParagraph(lines, currentLine);
        blocks.push(block);
        currentLine = block.endLine + 1;
    }

    return blocks;
}

/**
 * Parse a code block (```)
 */
function parseCodeBlock(lines: string[], startLine: number): MarkdownBlock {
    const startLineText = lines[startLine];
    const language = startLineText.trim().slice(3).trim();

    let endLine = startLine + 1;
    while (endLine < lines.length && !lines[endLine].trim().startsWith('```')) {
        endLine++;
    }

    const rawContent = lines.slice(startLine, endLine + 1).join('\n');

    return {
        id: generateId(),
        type: 'code',
        rawContent,
        startLine,
        endLine,
        metadata: { language: language || 'plaintext' },
    };
}

/**
 * Parse a blockquote (>)
 */
function parseBlockquote(lines: string[], startLine: number): MarkdownBlock {
    let endLine = startLine;

    // Continue while lines start with >
    while (endLine + 1 < lines.length && lines[endLine + 1].trim().startsWith('>')) {
        endLine++;
    }

    const rawContent = lines.slice(startLine, endLine + 1).join('\n');

    return {
        id: generateId(),
        type: 'blockquote',
        rawContent,
        startLine,
        endLine,
    };
}

/**
 * Parse a table
 */
function parseTable(lines: string[], startLine: number): MarkdownBlock {
    let endLine = startLine + 2; // At least header, separator, and one row

    // Continue while lines start with |
    while (endLine < lines.length && lines[endLine].trim().startsWith('|')) {
        endLine++;
    }
    endLine--; // Back up to last table row

    const rawContent = lines.slice(startLine, endLine + 1).join('\n');

    return {
        id: generateId(),
        type: 'table',
        rawContent,
        startLine,
        endLine,
    };
}

/**
 * Parse a list (ordered or unordered)
 */
function parseList(lines: string[], startLine: number): MarkdownBlock {
    const firstLine = lines[startLine];
    const isOrdered = /^\s*\d+\.\s/.test(firstLine);
    const baseIndent = firstLine.match(/^(\s*)/)?.[1].length || 0;

    let endLine = startLine;

    // Continue while we have list items or sub-items
    while (endLine + 1 < lines.length) {
        const nextLine = lines[endLine + 1];
        const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;

        // Check if it's a list item or continuation
        const isListItem = /^(\s*)[-*+]\s/.test(nextLine) || /^(\s*)\d+\.\s/.test(nextLine);
        const isEmpty = nextLine.trim() === '';
        const isIndented = nextIndent > baseIndent;

        if (!isListItem && !isEmpty && !isIndented) {
            break;
        }

        endLine++;

        // Stop at double empty line
        if (isEmpty && endLine + 1 < lines.length && lines[endLine + 1].trim() === '') {
            break;
        }
    }

    const rawContent = lines.slice(startLine, endLine + 1).join('\n');

    return {
        id: generateId(),
        type: 'list',
        rawContent,
        startLine,
        endLine,
        metadata: { ordered: isOrdered },
    };
}

/**
 * Parse a paragraph (continues until empty line or special syntax)
 */
function parseParagraph(lines: string[], startLine: number): MarkdownBlock {
    let endLine = startLine;

    // Continue while we have non-empty lines that aren't special syntax
    while (endLine + 1 < lines.length) {
        const nextLine = lines[endLine + 1];

        // Stop at empty line
        if (nextLine.trim() === '') break;

        // Stop at special syntax
        if (
            /^#{1,6}\s/.test(nextLine.trim()) ||          // Heading
            nextLine.trim().startsWith('```') ||          // Code block
            /^(\*\*\*+|---+|___+)\s*$/.test(nextLine.trim()) || // HR
            nextLine.trim().startsWith('>') ||            // Blockquote
            /^(\s*)[-*+]\s/.test(nextLine) ||             // Unordered list
            /^(\s*)\d+\.\s/.test(nextLine) ||             // Ordered list
            nextLine.trim().startsWith('|')               // Table
        ) {
            break;
        }

        endLine++;
    }

    const rawContent = lines.slice(startLine, endLine + 1).join('\n');

    return {
        id: generateId(),
        type: 'paragraph',
        rawContent,
        startLine,
        endLine,
    };
}

/**
 * Generate a unique ID for blocks
 */
let blockIdCounter = 0;
function generateId(): string {
    return `block-${Date.now()}-${blockIdCounter++}`;
}

/**
 * Reconstruct full markdown from blocks
 */
export function reconstructMarkdown(blocks: MarkdownBlock[]): string {
    return blocks.map(block => block.rawContent).join('\n');
}

/**
 * Update a specific block in the blocks array
 */
export function updateBlock(blocks: MarkdownBlock[], blockId: string, newContent: string): MarkdownBlock[] {
    return blocks.map(block => {
        if (block.id === blockId) {
            // Recalculate line count for updated content
            const lines = newContent.split('\n');
            return {
                ...block,
                rawContent: newContent,
                endLine: block.startLine + lines.length - 1,
            };
        }
        return block;
    });
}
