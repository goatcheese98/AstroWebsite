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

    // Track multi-selected blocks (for group actions)
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());

    // Local state for blocks to handle real-time updates
    const [localBlocks, setLocalBlocks] = useState<MarkdownBlock[]>(blocks);

    // Sync local blocks when content changes externally
    useEffect(() => {
        setLocalBlocks(blocks);
    }, [blocks]);

    /**
     * Handle clicking a block to edit it or multi-select
     */
    const handleEdit = useCallback((blockId: string, isShift?: boolean) => {
        if (isShift) {
            setSelectedBlockIds(prev => {
                const next = new Set(prev);
                if (next.has(blockId)) {
                    next.delete(blockId);
                } else {
                    next.add(blockId);
                }
                return next;
            });
            setEditingBlockId(null);
        } else {
            setEditingBlockId(blockId);
            setSelectedBlockIds(new Set());
        }
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

    /**
     * Group actions
     */
    const handleGroupCopy = useCallback(async () => {
        const selectedBlocks = localBlocks.filter(b => selectedBlockIds.has(b.id));
        const combinedContent = selectedBlocks.map(b => b.rawContent).join('\n\n');
        try {
            await navigator.clipboard.writeText(combinedContent);
            setSelectedBlockIds(new Set());
        } catch (err) {
            console.error('Failed to copy group:', err);
        }
    }, [localBlocks, selectedBlockIds]);

    const handleClearSelection = useCallback(() => {
        setSelectedBlockIds(new Set());
    }, []);

    return (
        <div
            className="hybrid-markdown-editor-container"
            style={{
                width: '100%',
                height: '100%',
                overflow: isScrollMode ? 'auto' : 'hidden',
                padding: '18px 22px',
                paddingTop: '38px',
                pointerEvents: isScrollMode ? 'auto' : 'none',
                position: 'relative',
            }}
            onClick={(e) => {
                // Allow clicking on the container to deselect block and clear multi-selection
                if (e.target === e.currentTarget) {
                    setEditingBlockId(null);
                    setSelectedBlockIds(new Set());
                }
            }}
        >
            {/* Multi-selection Toolbar */}
            {selectedBlockIds.size > 1 && (
                <div
                    style={{
                        position: 'sticky',
                        top: '8px',
                        left: '0',
                        right: '0',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        maxWidth: 'fit-content',
                        zIndex: 2000,
                        display: 'flex',
                        gap: '8px',
                        padding: '8px 16px',
                        background: isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
                        border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(16px)',
                        alignItems: 'center',
                        marginBottom: '16px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#a1a1aa' : '#71717a', marginRight: '8px' }}>
                        {selectedBlockIds.size} blocks selected
                    </span>
                    <button
                        onClick={handleGroupCopy}
                        style={{
                            padding: '6px 12px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        📋 Copy Combined
                    </button>
                    <button
                        onClick={handleClearSelection}
                        style={{
                            padding: '6px 12px',
                            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            color: isDark ? '#e5e5e5' : '#1a1a1a',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        ✕ Cancel
                    </button>
                </div>
            )}
            {localBlocks.map((block) => (
                <MarkdownBlockEditor
                    key={block.id}
                    block={block}
                    isEditing={editingBlockId === block.id}
                    isSelectionActive={selectedBlockIds.has(block.id)}
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
