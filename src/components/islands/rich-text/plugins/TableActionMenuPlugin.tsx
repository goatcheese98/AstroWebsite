import type { JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    $getSelection,
    $isRangeSelection,
    $createParagraphNode,
} from 'lexical';
import {
    $isTableCellNode,
    $isTableRowNode,
    $getTableRowNodeFromTableCellNodeOrThrow,
    $getTableNodeFromLexicalNodeOrThrow,
    $getTableColumnIndexFromTableCellNode,
    $getTableRowIndexFromTableCellNode,
    $createTableCellNode,
    $createTableRowNode,
    TableCellNode,
    TableRowNode,
} from '@lexical/table';
import { $patchStyleText } from '@lexical/selection';

interface TableActionMenuProps {
    anchorElem: HTMLElement;
    editor: ReturnType<typeof useLexicalComposerContext>[0];
    onClose: () => void;
    tableCellNode: TableCellNode;
}

function TableActionMenu({
    anchorElem,
    editor,
    onClose,
    tableCellNode,
}: TableActionMenuProps): JSX.Element {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleAddRowAbove = useCallback(() => {
        editor.update(() => {
            const rowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
            if (!rowNode) return;
            
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(rowNode);
            
            // Get number of columns from first row
            const firstRow = tableNode.getFirstChild() as TableRowNode;
            const columnCount = firstRow ? firstRow.getChildrenSize() : 1;
            
            // Create new row with cells
            const newRow = $createTableRowNode();
            for (let i = 0; i < columnCount; i++) {
                const cell = $createTableCellNode();
                cell.append($createParagraphNode());
                newRow.append(cell);
            }
            
            rowNode.insertBefore(newRow);
        });
        onClose();
    }, [editor, tableCellNode, onClose]);

    const handleAddRowBelow = useCallback(() => {
        editor.update(() => {
            const rowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
            if (!rowNode) return;
            
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(rowNode);
            
            // Get number of columns from first row
            const firstRow = tableNode.getFirstChild() as TableRowNode;
            const columnCount = firstRow ? firstRow.getChildrenSize() : 1;
            
            // Create new row with cells
            const newRow = $createTableRowNode();
            for (let i = 0; i < columnCount; i++) {
                const cell = $createTableCellNode();
                cell.append($createParagraphNode());
                newRow.append(cell);
            }
            
            rowNode.insertAfter(newRow);
        });
        onClose();
    }, [editor, tableCellNode, onClose]);

    const handleDeleteRow = useCallback(() => {
        editor.update(() => {
            const rowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
            if (!rowNode) return;
            
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(rowNode);
            
            // Don't delete if it's the last row
            if (tableNode.getChildrenSize() <= 1) {
                tableNode.remove();
            } else {
                rowNode.remove();
            }
        });
        onClose();
    }, [editor, tableCellNode, onClose]);

    const handleAddColumnLeft = useCallback(() => {
        editor.update(() => {
            const rowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
            if (!rowNode) return;
            
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(rowNode);
            const columnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
            
            // Add cell to each row at the specified column index
            tableNode.getChildren().forEach((row) => {
                if ($isTableRowNode(row)) {
                    const newCell = $createTableCellNode();
                    newCell.append($createParagraphNode());
                    const children = row.getChildren();
                    if (columnIndex < children.length) {
                        children[columnIndex].insertBefore(newCell);
                    } else {
                        row.append(newCell);
                    }
                }
            });
        });
        onClose();
    }, [editor, tableCellNode, onClose]);

    const handleAddColumnRight = useCallback(() => {
        editor.update(() => {
            const rowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
            if (!rowNode) return;
            
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(rowNode);
            const columnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
            
            // Add cell to each row after the specified column index
            tableNode.getChildren().forEach((row) => {
                if ($isTableRowNode(row)) {
                    const newCell = $createTableCellNode();
                    newCell.append($createParagraphNode());
                    const children = row.getChildren();
                    if (columnIndex < children.length) {
                        children[columnIndex].insertAfter(newCell);
                    } else {
                        row.append(newCell);
                    }
                }
            });
        });
        onClose();
    }, [editor, tableCellNode, onClose]);

    const handleDeleteColumn = useCallback(() => {
        editor.update(() => {
            const rowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
            if (!rowNode) return;
            
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(rowNode);
            const columnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
            
            // Check if this is the last column
            const firstRow = tableNode.getFirstChild() as TableRowNode;
            if (firstRow && firstRow.getChildrenSize() <= 1) {
                // Delete entire table if last column
                tableNode.remove();
            } else {
                // Remove cell from each row at the specified column index
                tableNode.getChildren().forEach((row) => {
                    if ($isTableRowNode(row)) {
                        const children = row.getChildren();
                        if (columnIndex < children.length) {
                            children[columnIndex].remove();
                        }
                    }
                });
            }
        });
        onClose();
    }, [editor, tableCellNode, onClose]);

    const handleSetBackgroundColor = useCallback((color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { 'background-color': color });
            } else {
                // If no text selection, apply to cell
                tableCellNode.setStyle(`background-color: ${color}`);
            }
        });
        onClose();
    }, [editor, tableCellNode, onClose]);

    const colors = [
        { label: 'None', value: 'transparent' },
        { label: 'Red', value: '#fee2e2' },
        { label: 'Yellow', value: '#fef3c7' },
        { label: 'Green', value: '#d1fae5' },
        { label: 'Blue', value: '#dbeafe' },
        { label: 'Purple', value: '#ede9fe' },
    ];

    const menuStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: '0',
        zIndex: 1000,
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        padding: '8px 0',
        minWidth: '180px',
    };

    const itemStyle: React.CSSProperties = {
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    };

    const dividerStyle: React.CSSProperties = {
        height: '1px',
        backgroundColor: '#e5e7eb',
        margin: '8px 0',
    };

    return createPortal(
        <div ref={menuRef} style={menuStyle}>
            <div style={{ padding: '4px 16px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                Row
            </div>
            <div style={itemStyle} onClick={handleAddRowAbove} onMouseDown={(e) => e.preventDefault()}>
                Add row above
            </div>
            <div style={itemStyle} onClick={handleAddRowBelow} onMouseDown={(e) => e.preventDefault()}>
                Add row below
            </div>
            <div style={{ ...itemStyle, color: '#dc2626' }} onClick={handleDeleteRow} onMouseDown={(e) => e.preventDefault()}>
                Delete row
            </div>
            
            <div style={dividerStyle} />
            
            <div style={{ padding: '4px 16px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                Column
            </div>
            <div style={itemStyle} onClick={handleAddColumnLeft} onMouseDown={(e) => e.preventDefault()}>
                Add column left
            </div>
            <div style={itemStyle} onClick={handleAddColumnRight} onMouseDown={(e) => e.preventDefault()}>
                Add column right
            </div>
            <div style={{ ...itemStyle, color: '#dc2626' }} onClick={handleDeleteColumn} onMouseDown={(e) => e.preventDefault()}>
                Delete column
            </div>
            
            <div style={dividerStyle} />
            
            <div style={{ padding: '4px 16px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                Background
            </div>
            <div style={{ display: 'flex', gap: '4px', padding: '8px 16px', flexWrap: 'wrap' }}>
                {colors.map((c) => (
                    <button
                        key={c.value}
                        onClick={() => handleSetBackgroundColor(c.value)}
                        onMouseDown={(e) => e.preventDefault()}
                        title={c.label}
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            backgroundColor: c.value,
                            cursor: 'pointer',
                        }}
                    />
                ))}
            </div>
        </div>,
        anchorElem,
    );
}

export default function TableActionMenuPlugin({
    anchorElem = document.body,
}: {
    anchorElem?: HTMLElement;
}): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [tableCellNode, setTableCellNode] = useState<TableCellNode | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleContextMenu = (event: MouseEvent) => {
            // Check if the click target is inside a table cell
            const target = event.target as HTMLElement;
            const cellElement = target.closest('td, th');
            
            if (!cellElement) {
                return;
            }

            // Use editor state to find the table cell node from selection
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                
                if (!$isRangeSelection(selection)) {
                    return;
                }

                // Get the anchor node and traverse up to find the table cell
                const anchorNode = selection.anchor.getNode();
                let currentNode = anchorNode;
                let cellNode: TableCellNode | null = null;

                // Traverse up the tree to find TableCellNode
                while (currentNode !== null) {
                    if ($isTableCellNode(currentNode)) {
                        cellNode = currentNode;
                        break;
                    }
                    currentNode = currentNode.getParent();
                }

                if (cellNode) {
                    event.preventDefault();
                    setTableCellNode(cellNode);
                    // Account for scroll position using pageX/pageY
                    setPosition({ x: event.pageX, y: event.pageY });
                    setIsMenuOpen(true);
                }
            });
        };

        const rootElement = editor.getRootElement();
        if (rootElement) {
            rootElement.addEventListener('contextmenu', handleContextMenu);
        }

        return () => {
            if (rootElement) {
                rootElement.removeEventListener('contextmenu', handleContextMenu);
            }
        };
    }, [editor]);

    const handleClose = useCallback(() => {
        setIsMenuOpen(false);
        setTableCellNode(null);
    }, []);

    if (!isMenuOpen || !tableCellNode) {
        return null;
    }

    return (
        <div style={{ position: 'absolute', left: position.x, top: position.y, zIndex: 1000 }}>
            <TableActionMenu
                anchorElem={anchorElem}
                editor={editor}
                onClose={handleClose}
                tableCellNode={tableCellNode}
            />
        </div>
    );
}
