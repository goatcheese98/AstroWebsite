import React, {
  memo,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { nanoid } from 'nanoid';
import type {
  KanbanBoardData,
  KanbanCard,
  KanbanColumn as KanbanColumnType,
  KanbanElement,
  KanbanNoteRef,
  KanbanOperation,
  AppState,
} from './kanban-types';
import { KanbanColumn } from './KanbanColumn';
import {
  applyColorOpacity,
  getExcalidrawCornerRadius,
  getExcalidrawFontFamily,
  getExcalidrawSurfaceStyle,
} from '@/components/islands/excalidraw-element-style';
import { getOverlayZIndex } from '@/components/islands/overlay-utils';
import { ZoomHint } from '@/components/islands/ZoomHint';
import { useZoomHint } from '@/components/islands/useZoomHint';

interface KanbanBoardProps {
  element: KanbanElement;
  appState: AppState;
  stackIndex?: number;
  onChange: (elementId: string, data: KanbanBoardData) => void;
}

const KanbanBoardInner = memo(
  forwardRef<KanbanNoteRef, KanbanBoardProps>(({ element, appState, stackIndex = 0, onChange }, ref) => {
    const [boardData, setBoardData] = useState<KanbanBoardData>(element.customData);
    const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
    const [draggingFromColumnId, setDraggingFromColumnId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<string | null>(null);
    const [overCardId, setOverCardId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Interactive whenever the Excalidraw element is selected
    const isInteracting = appState.selectedElementIds?.[element.id] === true;
    const { visible: zoomHintVisible } = useZoomHint(containerRef, isInteracting);

    const activeFontSize = boardData.fontSize ?? 13;

    // Sync from element.customData when it changes externally
    useEffect(() => {
      setBoardData(element.customData);
    }, [element.customData]);

    const commitChange = useCallback(
      (updater: (prev: KanbanBoardData) => KanbanBoardData) => {
        setBoardData((prev) => {
          const next = updater(prev);
          onChange(element.id, next);
          return next;
        });
      },
      [element.id, onChange],
    );

    // --- Column operations ---

    const handleUpdateColumn = useCallback(
      (columnId: string, changes: Partial<KanbanColumnType>) => {
        commitChange((prev) => ({
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId ? { ...col, ...changes } : col,
          ),
        }));
      },
      [commitChange],
    );

    const handleDeleteColumn = useCallback(
      (columnId: string) => {
        commitChange((prev) => ({
          ...prev,
          columns: prev.columns.filter((col) => col.id !== columnId),
        }));
      },
      [commitChange],
    );

    const handleAddColumn = useCallback(() => {
      commitChange((prev) => ({
        ...prev,
        columns: [
          ...prev.columns,
          { id: nanoid(), title: 'New Column', cards: [] },
        ],
      }));
    }, [commitChange]);

    // --- Card operations ---

    const handleAddCard = useCallback(
      (columnId: string, card: Partial<KanbanCard>) => {
        commitChange((prev) => ({
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: [...col.cards, { id: nanoid(), title: 'New card', ...card } as KanbanCard] }
              : col,
          ),
        }));
      },
      [commitChange],
    );

    const handleUpdateCard = useCallback(
      (cardId: string, changes: Partial<KanbanCard>) => {
        commitChange((prev) => ({
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === cardId ? { ...card, ...changes } : card,
            ),
          })),
        }));
      },
      [commitChange],
    );

    const handleDeleteCard = useCallback(
      (cardId: string) => {
        commitChange((prev) => ({
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.filter((card) => card.id !== cardId),
          })),
        }));
      },
      [commitChange],
    );

    // --- Drag and drop ---

    const handleDragStart = useCallback(
      (e: React.DragEvent, cardId: string, fromColumnId: string) => {
        setDraggingCardId(cardId);
        setDraggingFromColumnId(fromColumnId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cardId);
      },
      [],
    );

    const handleCardDragEnter = useCallback((cardId: string | null) => {
      setOverCardId(cardId);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverColumnId(columnId);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent, toColumnId: string) => {
        e.preventDefault();
        setOverColumnId(null);

        if (!draggingCardId || !draggingFromColumnId) return;

        const cardId = draggingCardId;
        const fromColumnId = draggingFromColumnId;
        const targetCardId = overCardId;
        setDraggingCardId(null);
        setDraggingFromColumnId(null);
        setOverCardId(null);

        commitChange((prev) => {
          const fromCol = prev.columns.find((c) => c.id === fromColumnId);
          const card = fromCol?.cards.find((c) => c.id === cardId);
          if (!card) return prev;

          if (fromColumnId === toColumnId) {
            // Intra-column reorder
            const newCards = fromCol!.cards.filter((c) => c.id !== cardId);
            const insertIdx = targetCardId
              ? newCards.findIndex((c) => c.id === targetCardId)
              : -1;
            newCards.splice(insertIdx === -1 ? newCards.length : insertIdx, 0, card);
            return {
              ...prev,
              columns: prev.columns.map((col) =>
                col.id === fromColumnId ? { ...col, cards: newCards } : col,
              ),
            };
          }

          // Cross-column move
          const toCol = prev.columns.find((c) => c.id === toColumnId);
          if (!toCol) return prev;
          const toCards = toCol.cards.filter((c) => c.id !== cardId);
          const insertIdx = targetCardId
            ? toCards.findIndex((c) => c.id === targetCardId)
            : -1;
          toCards.splice(insertIdx === -1 ? toCards.length : insertIdx, 0, card);

          return {
            ...prev,
            columns: prev.columns.map((col) => {
              if (col.id === fromColumnId) return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
              if (col.id === toColumnId) return { ...col, cards: toCards };
              return col;
            }),
          };
        });
      },
      [draggingCardId, draggingFromColumnId, overCardId, commitChange],
    );

    // --- Apply AI operations ---

    const applyOperations = useCallback(
      (ops: KanbanOperation[]) => {
        commitChange((prev) => {
          const next = { ...prev, columns: [...prev.columns.map((c) => ({ ...c, cards: [...c.cards] }))] };

          for (const op of ops) {
            if (op.op === 'add_card') {
              const col = next.columns.find((c) => c.id === op.columnId);
              if (col) col.cards.push({ id: nanoid(), title: 'New card', ...op.card } as KanbanCard);
            } else if (op.op === 'update_card') {
              for (const col of next.columns) {
                const i = col.cards.findIndex((c) => c.id === op.cardId);
                if (i !== -1) { col.cards[i] = { ...col.cards[i], ...op.changes }; break; }
              }
            } else if (op.op === 'delete_card') {
              for (const col of next.columns) {
                const before = col.cards.length;
                col.cards = col.cards.filter((c) => c.id !== op.cardId);
                if (col.cards.length !== before) break;
              }
            } else if (op.op === 'move_card') {
              let movingCard: KanbanCard | undefined;
              for (const col of next.columns) {
                const idx = col.cards.findIndex((c) => c.id === op.cardId);
                if (idx !== -1) { movingCard = col.cards.splice(idx, 1)[0]; break; }
              }
              if (movingCard) {
                const toCol = next.columns.find((c) => c.id === op.toColumnId);
                if (toCol) {
                  if (op.toIndex !== undefined) toCol.cards.splice(op.toIndex, 0, movingCard);
                  else toCol.cards.push(movingCard);
                }
              }
            } else if (op.op === 'add_column') {
              next.columns.push({ id: nanoid(), title: 'New Column', cards: [], ...op.column } as KanbanColumnType);
            } else if (op.op === 'update_column') {
              const i = next.columns.findIndex((c) => c.id === op.columnId);
              if (i !== -1) next.columns[i] = { ...next.columns[i], ...op.changes };
            } else if (op.op === 'delete_column') {
              next.columns = next.columns.filter((c) => c.id !== op.columnId);
            } else if (op.op === 'reorder_cards') {
              const col = next.columns.find((c) => c.id === op.columnId);
              if (col) {
                const map = new Map(col.cards.map((c) => [c.id, c]));
                col.cards = op.cardIds.map((id) => map.get(id)).filter((c): c is KanbanCard => !!c);
              }
            }
          }
          return next;
        });
      },
      [commitChange],
    );

    // Listen for AI kanban-update events
    useEffect(() => {
      const handleKanbanUpdate = (e: Event) => {
        const { elementId, ops } = (e as CustomEvent<{ elementId: string; ops: KanbanOperation[] }>).detail;
        if (elementId === element.id) applyOperations(ops);
      };
      window.addEventListener('canvas:kanban-update', handleKanbanUpdate);
      return () => window.removeEventListener('canvas:kanban-update', handleKanbanUpdate);
    }, [element.id, applyOperations]);

    // --- updateTransform (called every RAF frame from CanvasNotesLayer) ---

    const updateTransform = useCallback(
      (x: number, y: number, width: number, height: number, angle: number, zoom: number, scrollX: number, scrollY: number) => {
        if (!containerRef.current) return;
        const screenCenterX = (x + width / 2 + scrollX) * zoom;
        const screenCenterY = (y + height / 2 + scrollY) * zoom;
        const container = containerRef.current;
        container.style.top = `${screenCenterY - height / 2}px`;
        container.style.left = `${screenCenterX - width / 2}px`;
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        container.style.transform = `scale(${zoom}) rotate(${angle}rad)`;
      },
      [],
    );

    useImperativeHandle(ref, () => ({ updateTransform }), [updateTransform]);

    // Screen position for initial render
    const zoom = appState.zoom.value;
    const screenCenterX = (element.x + element.width / 2 + appState.scrollX) * zoom;
    const screenCenterY = (element.y + element.height / 2 + appState.scrollY) * zoom;

    const containerStyle: React.CSSProperties = {
      position: 'absolute',
      top: `${screenCenterY - element.height / 2}px`,
      left: `${screenCenterX - element.width / 2}px`,
      width: `${element.width}px`,
      height: `${element.height}px`,
      transform: `scale(${zoom}) rotate(${element.angle || 0}rad)`,
      transformOrigin: 'center center',
      pointerEvents: 'none',
      zIndex: getOverlayZIndex(isInteracting, false, stackIndex),
    };

    const boardRadius = getExcalidrawCornerRadius(
      element.width,
      element.height,
      element.roundness,
    ) || 6;

    const boardSurface = getExcalidrawSurfaceStyle({
      backgroundColor: element.backgroundColor,
      strokeColor: element.strokeColor,
      strokeWidth: element.strokeWidth,
      strokeStyle: element.strokeStyle,
      fillStyle: element.fillStyle,
      opacity: element.opacity,
    });
    const boardFontFamily = getExcalidrawFontFamily(element.fontFamily) ?? 'Helvetica, Arial, sans-serif';
    const borderTone = applyColorOpacity(
      element.strokeColor && element.strokeColor !== 'transparent' ? element.strokeColor : '#000000',
      ((element.opacity ?? 100) / 100) * 0.3,
    );
    const headerBg = 'rgba(255,255,255,0.52)';
    const columnBg = 'rgba(255,255,255,0.56)';
    const cardBg = 'rgba(255,255,255,0.86)';

    return (
      <div ref={containerRef} style={containerStyle}>
        <div
          style={{
            width: '100%',
            height: '100%',
            ...boardSurface,
            borderRadius: boardRadius,
            boxShadow: isInteracting
              ? '0 0 0 2px #6366f1, 0 10px 20px -3px rgba(0,0,0,0.18)'
              : '0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            isolation: 'isolate',
            pointerEvents: isInteracting ? 'auto' : 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            transition: 'box-shadow 0.15s ease, background 0.2s ease',
            fontFamily: boardFontFamily,
            fontSize: activeFontSize,
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          {/* Board header */}
          <div
            style={{
              padding: '10px 14px 8px',
              borderBottom: `1.5px solid ${borderTone}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              background: headerBg,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="16" rx="1" />
            </svg>
            {editingTitle ? (
              <input
                autoFocus
                defaultValue={boardData.title}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val) commitChange((prev) => ({ ...prev, title: val }));
                  setEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) commitChange((prev) => ({ ...prev, title: val }));
                    setEditingTitle(false);
                  } else if (e.key === 'Escape') {
                    setEditingTitle(false);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  fontFamily: 'inherit',
                  fontSize: '1.08em',
                  fontWeight: 700,
                  color: '#1a1a1a',
                  background: 'transparent',
                  border: 'none',
                  outline: '1.5px solid rgba(99,102,241,0.5)',
                  borderRadius: 3,
                  padding: '0 4px',
                  minWidth: 60,
                  maxWidth: 240,
                }}
              />
            ) : (
              <span
                onDoubleClick={() => setEditingTitle(true)}
                title="Double-click to rename"
                style={{ fontFamily: 'inherit', fontSize: '1.08em', fontWeight: 700, color: '#1a1a1a', cursor: 'text' }}
              >
                {boardData.title}
              </span>
            )}
            <span style={{ fontFamily: 'inherit', fontSize: '0.85em', color: '#9ca3af', marginLeft: 4 }}>
              {boardData.columns.reduce((sum, col) => sum + col.cards.length, 0)} cards
            </span>
          </div>

          {/* Columns area */}
          <div
            style={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              alignItems: 'flex-start',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,0,0,0.12) transparent',
            }}
          >
            {boardData.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                colBg={columnBg}
                cardBg={cardBg}
                isOver={overColumnId === column.id}
                draggingCardId={draggingCardId}
                overCardId={overCardId}
                onUpdateColumn={handleUpdateColumn}
                onDeleteColumn={handleDeleteColumn}
                onUpdateCard={handleUpdateCard}
                onDeleteCard={handleDeleteCard}
                onAddCard={handleAddCard}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onCardDragEnter={handleCardDragEnter}
              />
            ))}

            <button
              onClick={handleAddColumn}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                minWidth: 180,
                height: 44,
                border: '1.5px dashed rgba(0,0,0,0.18)',
                borderRadius: 6,
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: '#9ca3af',
                fontFamily: 'inherit',
                fontSize: '1em',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.color = '#6366f1';
                e.currentTarget.style.background = 'rgba(99,102,241,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)';
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.23em', lineHeight: 1 }}>+</span>
              Add column
            </button>
          </div>
        </div>

        <style>{`
          .kanban-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .kanban-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .kanban-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
        `}</style>
        <ZoomHint visible={zoomHintVisible} />
      </div>
    );
  }),
);

KanbanBoardInner.displayName = 'KanbanBoardInner';

export const KanbanBoard = memo(
  forwardRef<KanbanNoteRef, KanbanBoardProps>((props, ref) => (
    <KanbanBoardInner {...props} ref={ref} />
  )),
);

KanbanBoard.displayName = 'KanbanBoard';
