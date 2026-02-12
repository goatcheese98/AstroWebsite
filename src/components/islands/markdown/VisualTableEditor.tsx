import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TableCell {
    content: string;
    isHeader: boolean;
}

interface TableRow {
    cells: TableCell[];
}

interface VisualTableEditorProps {
    markdown: string;
    onChange: (newMarkdown: string) => void;
    isDark: boolean;
}

/**
 * Visual Table Editor - Clean, Robust Implementation
 * Single + buttons, proper edit buffer, no premature exits
 */
export const VisualTableEditor: React.FC<VisualTableEditorProps> = ({
    markdown,
    onChange,
    isDark,
}) => {
    const [tableData, setTableData] = useState<TableRow[]>([]);
    const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const isEditingRef = useRef(false);

    /**
 * Parse markdown table into structured data
     */
    const parseMarkdownTable = useCallback((md: string): TableRow[] => {
        const lines = md
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length < 2) return [];

        const rows: TableRow[] = [];

        // Header row (line 0)
        const headerCells = lines[0]
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);

        if (headerCells.length > 0) {
            rows.push({
                cells: headerCells.map(content => ({
                    content,
                    isHeader: true,
                })),
            });
        }

        // Data rows (skip separator at line 1)
        for (let i = 2; i < lines.length; i++) {
            const dataCells = lines[i]
                .split('|')
                .map(cell => cell.trim())
                .filter(cell => cell.length > 0);

            if (dataCells.length > 0) {
                const columnCount = rows[0]?.cells.length || dataCells.length;
                const normalizedCells = Array.from({ length: columnCount }, (_, index) => ({
                    content: dataCells[index] || '',
                    isHeader: false,
                }));
                rows.push({ cells: normalizedCells });
            }
        }

        return rows;
    }, []);

    /**
     * Convert table data to markdown
     */
    const serializeToMarkdown = useCallback((rows: TableRow[]): string => {
        if (rows.length === 0) return '';

        const lines: string[] = [];
        const columnCount = rows[0]?.cells.length || 0;

        // Calculate column widths
        const columnWidths = Array.from({ length: columnCount }, (_, colIndex) => {
            const maxWidth = Math.max(
                ...rows.map(row => (row.cells[colIndex]?.content || '').length),
                3
            );
            return maxWidth;
        });

        const padCell = (content: string, width: number) => content.padEnd(width, ' ');

        // Header
        if (rows[0]) {
            const headerCells = rows[0].cells.map((cell, i) =>
                padCell(cell.content, columnWidths[i])
            );
            lines.push('| ' + headerCells.join(' | ') + ' |');

            // Separator
            const separators = columnWidths.map(width => '-'.repeat(width));
            lines.push('| ' + separators.join(' | ') + ' |');
        }

        // Data rows
        for (let i = 1; i < rows.length; i++) {
            const dataCells = rows[i].cells.map((cell, colIndex) =>
                padCell(cell.content, columnWidths[colIndex])
            );
            lines.push('| ' + dataCells.join(' | ') + ' |');
        }

        return lines.join('\n');
    }, []);

    // Parse markdown into table data - but NOT while editing
    useEffect(() => {
        if (!isEditingRef.current) {
            const parsed = parseMarkdownTable(markdown);
            setTableData(parsed);
        }
    }, [markdown, parseMarkdownTable]);

    /**
     * Start editing a cell
     */
    const startEditing = useCallback((rowIndex: number, colIndex: number) => {
        const currentContent = tableData[rowIndex]?.cells[colIndex]?.content || '';
        setEditingCell({ row: rowIndex, col: colIndex });
        setEditValue(currentContent);
        isEditingRef.current = true;
    }, [tableData]);

    /**
     * Commit edit and update parent
     */
    const commitEdit = useCallback(() => {
        if (!editingCell) return;

        const { row: rowIndex, col: colIndex } = editingCell;

        // Update table data
        const newTableData = tableData.map((row, rIdx) => {
            if (rIdx !== rowIndex) return row;
            return {
                ...row,
                cells: row.cells.map((cell, cIdx) => {
                    if (cIdx !== colIndex) return cell;
                    return { ...cell, content: editValue };
                }),
            };
        });

        // Update local state immediately
        setTableData(newTableData);

        // Serialize and notify parent
        const newMarkdown = serializeToMarkdown(newTableData);
        onChange(newMarkdown);

        // Clear editing state
        setEditingCell(null);
        setEditValue('');
        isEditingRef.current = false;
    }, [editingCell, editValue, tableData, serializeToMarkdown, onChange]);

    /**
     * Add a new column
     */
    const handleAddColumn = useCallback(() => {
        const newTableData = tableData.map((row, rowIndex) => ({
            cells: [
                ...row.cells,
                { content: '', isHeader: rowIndex === 0 },
            ],
        }));

        setTableData(newTableData);
        const newMarkdown = serializeToMarkdown(newTableData);
        onChange(newMarkdown);
    }, [tableData, serializeToMarkdown, onChange]);

    /**
     * Add a new row
     */
    const handleAddRow = useCallback(() => {
        const columnCount = tableData[0]?.cells.length || 0;
        const newRow: TableRow = {
            cells: Array.from({ length: columnCount }, () => ({
                content: '',
                isHeader: false,
            })),
        };

        const newTableData = [...tableData, newRow];
        setTableData(newTableData);
        const newMarkdown = serializeToMarkdown(newTableData);
        onChange(newMarkdown);
    }, [tableData, serializeToMarkdown, onChange]);

    if (tableData.length === 0) {
        return (
            <div style={{ padding: '12px', color: isDark ? '#e5e5e5' : '#1a1a1a' }}>
                Invalid table format.
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'relative',
                padding: '20px',
                borderRadius: '8px',
                background: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.03)',
                border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)'}`,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <table
                    style={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        fontSize: '0.9em',
                    }}
                >
                    <tbody>
                        {tableData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.cells.map((cell, colIndex) => {
                                    const Tag = cell.isHeader ? 'th' : 'td';
                                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;

                                    return (
                                        <Tag
                                            key={colIndex}
                                            style={{
                                                padding: '10px 14px',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                textAlign: 'left',
                                                fontWeight: cell.isHeader ? '600' : 'normal',
                                                background: cell.isHeader
                                                    ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                                                    : 'transparent',
                                                cursor: isEditing ? 'text' : 'pointer',
                                                minWidth: '80px',
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isEditing) {
                                                    startEditing(rowIndex, colIndex);
                                                }
                                            }}
                                        >
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={commitEdit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                                            commitEdit();
                                                        }
                                                        e.stopPropagation();
                                                    }}
                                                    autoFocus
                                                    style={{
                                                        width: '100%',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: 'inherit',
                                                        fontSize: 'inherit',
                                                        fontFamily: 'inherit',
                                                        fontWeight: 'inherit',
                                                        outline: 'none',
                                                        padding: 0,
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span>
                                                    {cell.content || (
                                                        <span style={{ opacity: 0.3, fontStyle: 'italic' }}>
                                                            empty
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </Tag>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Single Add Column button - right side, vertically centered */}
                <button
                    onClick={handleAddColumn}
                    style={{
                        position: 'absolute',
                        right: '-40px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                        background: isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                        color: isDark ? '#aaa' : '#666',
                        fontSize: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? 'rgba(70, 70, 70, 0.9)' : 'rgba(245, 245, 245, 1)';
                        e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 0.9)';
                        e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
                    }}
                    title="Add column"
                >
                    +
                </button>
            </div>

            {/* Single Add Row button - bottom, horizontally centered */}
            <button
                onClick={handleAddRow}
                style={{
                    marginTop: '12px',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                    background: isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    color: isDark ? '#aaa' : '#666',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'block',
                    margin: '12px auto 0',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(70, 70, 70, 0.9)' : 'rgba(245, 245, 245, 1)';
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
                }}
            >
                Add row below
            </button>
        </div>
    );
};
