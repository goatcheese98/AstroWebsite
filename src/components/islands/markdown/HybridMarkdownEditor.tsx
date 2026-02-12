import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MarkdownBlockEditor } from './MarkdownBlockEditor';
import { parseMarkdownBlocks, reconstructMarkdown, updateBlock, type MarkdownBlock } from '../../../lib/markdown-block-parser';

interface HybridMarkdownEditorProps {
    content: string;
    onChange: (newContent: string) => void;
    isDark: boolean;
    isScrollMode: boolean;
}

/**
 * Hybrid Markdown Editor
 * 
 * Orchestrates block-level editing:
 * - Parses markdown into blocks
 * - Tracks which block is being edited
 * - Renders array of MarkdownBlockEditors
 * - Reconstructs full markdown on changes
 */
export const HybridMarkdownEditor: React.FC<HybridMarkdownEditorProps> = ({
    content,
    onChange,
    isDark,
    isScrollMode,
}) => {
    // Parse content into blocks (memoized to avoid re-parsing on every render)
    const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

    // Track which block is currently being edited (null = none)
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

    // Local state for blocks to handle real-time updates
    const [localBlocks, setLocalBlocks] = useState<MarkdownBlock[]>(blocks);

    // Sync local blocks when content changes externally
    useEffect(() => {
        setLocalBlocks(blocks);
    }, [blocks]);

    /**
     * Handle clicking a block to edit it
     */
    const handleEdit = useCallback((blockId: string) => {
        setEditingBlockId(blockId);
    }, []);

    /**
     * Handle changes to a block's content
     */
    const handleChange = useCallback((blockId: string, newContent: string) => {
        setLocalBlocks(prevBlocks => {
            const updated = updateBlock(prevBlocks, blockId, newContent);
            // Debounce the onChange callback to parent
            const fullMarkdown = reconstructMarkdown(updated);
            onChange(fullMarkdown);
            return updated;
        });
    }, [onChange]);

    /**
     * Handle exiting edit mode (blur)
     */
    const handleBlur = useCallback(() => {
        setEditingBlockId(null);
    }, []);

    /**
     * Handle adding a new block after a specific block
     */
    const handleAddBlock = useCallback((afterBlockId: string) => {
        setLocalBlocks(prevBlocks => {
            const index = prevBlocks.findIndex(b => b.id === afterBlockId);
            if (index === -1) return prevBlocks;

            // Create a new empty paragraph block
            const newBlock: MarkdownBlock = {
                id: `block-${Date.now()}-new`,
                type: 'paragraph',
                rawContent: '',
                startLine: prevBlocks[index].endLine + 1,
                endLine: prevBlocks[index].endLine + 1,
            };

            const updated = [
                ...prevBlocks.slice(0, index + 1),
                newBlock,
                ...prevBlocks.slice(index + 1),
            ];

            // Update the full markdown
            const fullMarkdown = reconstructMarkdown(updated);
            onChange(fullMarkdown);

            // Auto-edit the new block
            setEditingBlockId(newBlock.id);

            return updated;
        });
    }, [onChange]);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                overflow: isScrollMode ? 'auto' : 'hidden',
                padding: '18px 22px',
                paddingTop: '38px',
                pointerEvents: isScrollMode ? 'auto' : 'none',
            }}
            onClick={(e) => {
                // Allow clicking on the container to deselect block
                if (e.target === e.currentTarget) {
                    setEditingBlockId(null);
                }
            }}
        >
            {localBlocks.map((block) => (
                <MarkdownBlockEditor
                    key={block.id}
                    block={block}
                    isEditing={editingBlockId === block.id}
                    isDark={isDark}
                    onEdit={handleEdit}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onAddBlock={handleAddBlock}
                />
            ))}
        </div>
    );
};
