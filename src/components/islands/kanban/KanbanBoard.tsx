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
import { BOARD_THEMES, BOARD_FONTS } from './kanban-types';
import { KanbanColumn } from './KanbanColumn';
import { applyKanbanOperations, moveKanbanCard } from './kanban-logic';
import {
  applyColorOpacity,
  getExcalidrawCornerRadius,
  getExcalidrawFontFamily,
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

const MAX_HISTORY_ENTRIES = 100;

function cloneBoardData(data: KanbanBoardData): KanbanBoardData {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data)) as KanbanBoardData;
}

const KanbanBoardInner = memo(
  forwardRef<KanbanNoteRef, KanbanBoardProps>(({ element, appState, stackIndex = 0, onChange }, ref) => {
    const [boardData, setBoardData] = useState<KanbanBoardData>(element.customData);
    const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
    const [draggingFromColumnId, setDraggingFromColumnId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<string | null>(null);
    const [overCardId, setOverCardId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pendingDeleteColumnId, setPendingDeleteColumnId] = useState<string | null>(null);
    const [historyTick, setHistoryTick] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const undoStackRef = useRef<KanbanBoardData[]>([]);
    const redoStackRef = useRef<KanbanBoardData[]>([]);

    // Interactive whenever the Excalidraw element is selected
    const isInteracting = appState.selectedElementIds?.[element.id] === true;
    const { visible: zoomHintVisible } = useZoomHint(containerRef, isInteracting);

    const activeTheme = BOARD_THEMES.find((theme) => theme.id === boardData.bgTheme) ?? BOARD_THEMES[0];
    const activeFont = BOARD_FONTS.find((font) => font.id === boardData.fontId);
    const activeFontSize = boardData.fontSize ?? 13;
    const canUndo = historyTick >= 0 && undoStackRef.current.length > 0;
    const canRedo = historyTick >= 0 && redoStackRef.current.length > 0;

    // Sync from element.customData when it changes externally
    useEffect(() => {
      setBoardData(element.customData);
    }, [element.customData]);

    useEffect(() => {
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistoryTick((tick) => tick + 1);
    }, [element.id]);

    useEffect(() => {
      if (!isInteracting) {
        setShowSettings(false);
        setPendingDeleteColumnId(null);
      }
    }, [isInteracting]);

    useEffect(() => {
      if (
        pendingDeleteColumnId &&
        !boardData.columns.some((column) => column.id === pendingDeleteColumnId)
      ) {
        setPendingDeleteColumnId(null);
      }
    }, [pendingDeleteColumnId, boardData.columns]);

    useEffect(() => {
      if (!pendingDeleteColumnId) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setPendingDeleteColumnId(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pendingDeleteColumnId]);

    const commitChange = useCallback(
      (updater: (prev: KanbanBoardData) => KanbanBoardData) => {
        setBoardData((prev) => {
          const next = updater(prev);
          if (next === prev) {
            return prev;
          }
          undoStackRef.current = [
            ...undoStackRef.current.slice(-(MAX_HISTORY_ENTRIES - 1)),
            cloneBoardData(prev),
          ];
          redoStackRef.current = [];
          onChange(element.id, next);
          return next;
        });
        setHistoryTick((tick) => tick + 1);
      },
      [element.id, onChange],
    );

    const handleUndo = useCallback(() => {
      const previous = undoStackRef.current.at(-1);
      if (!previous) return;
      undoStackRef.current = undoStackRef.current.slice(0, -1);

      setBoardData((current) => {
        redoStackRef.current = [
          ...redoStackRef.current.slice(-(MAX_HISTORY_ENTRIES - 1)),
          cloneBoardData(current),
        ];
        const next = cloneBoardData(previous);
        onChange(element.id, next);
        return next;
      });

      setHistoryTick((tick) => tick + 1);
    }, [element.id, onChange]);

    const handleRedo = useCallback(() => {
      const nextFromRedo = redoStackRef.current.at(-1);
      if (!nextFromRedo) return;
      redoStackRef.current = redoStackRef.current.slice(0, -1);

      setBoardData((current) => {
        undoStackRef.current = [
          ...undoStackRef.current.slice(-(MAX_HISTORY_ENTRIES - 1)),
          cloneBoardData(current),
        ];
        const next = cloneBoardData(nextFromRedo);
        onChange(element.id, next);
        return next;
      });

      setHistoryTick((tick) => tick + 1);
    }, [element.id, onChange]);

    const handleSetTheme = useCallback(
      (themeId: string) => {
        commitChange((prev) => ({ ...prev, bgTheme: themeId }));
      },
      [commitChange],
    );

    const handleSetFont = useCallback(
      (fontId: string) => {
        commitChange((prev) => ({ ...prev, fontId }));
      },
      [commitChange],
    );

    const handleSetFontSize = useCallback(
      (delta: number) => {
        commitChange((prev) => ({
          ...prev,
          fontSize: Math.min(20, Math.max(10, (prev.fontSize ?? 13) + delta)),
        }));
      },
      [commitChange],
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

    const handleRequestDeleteColumn = useCallback(
      (columnId: string) => {
        const targetColumn = boardData.columns.find((column) => column.id === columnId);
        if (!targetColumn) return;
        setPendingDeleteColumnId(columnId);
      },
      [boardData.columns],
    );

    const handleCancelDeleteColumn = useCallback(() => {
      setPendingDeleteColumnId(null);
    }, []);

    const handleConfirmDeleteColumn = useCallback(() => {
      if (!pendingDeleteColumnId) return;
      handleDeleteColumn(pendingDeleteColumnId);
      setPendingDeleteColumnId(null);
    }, [pendingDeleteColumnId, handleDeleteColumn]);

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

    const handleDragEnd = useCallback(() => {
      setDraggingCardId(null);
      setDraggingFromColumnId(null);
      setOverColumnId(null);
      setOverCardId(null);
    }, []);

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
        if (!draggingCardId || !draggingFromColumnId) {
          handleDragEnd();
          return;
        }

        const dropTargetCardId = overCardId;
        commitChange((prev) =>
          moveKanbanCard({
            board: prev,
            cardId: draggingCardId,
            fromColumnId: draggingFromColumnId,
            toColumnId,
            overCardId: dropTargetCardId,
          }),
        );
        handleDragEnd();
      },
      [draggingCardId, draggingFromColumnId, overCardId, commitChange, handleDragEnd],
    );

    // --- Apply AI operations ---

    const applyOperations = useCallback(
      (ops: KanbanOperation[]) => {
        commitChange((prev) => applyKanbanOperations(prev, ops));
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

    const boardOpacity = (element.opacity ?? 100) / 100;
    const boardFontFamily = activeFont?.family ?? getExcalidrawFontFamily(element.fontFamily) ?? 'Helvetica, Arial, sans-serif';
    const boardBg = applyColorOpacity(activeTheme.boardBg, boardOpacity);
    const borderTone = applyColorOpacity(activeTheme.border, boardOpacity);
    const headerBg = applyColorOpacity(activeTheme.headerBg, boardOpacity);
    const columnBg = applyColorOpacity(activeTheme.colBg, boardOpacity);
    const cardBg = applyColorOpacity(activeTheme.cardBg, boardOpacity);
    const pendingDeleteColumn = pendingDeleteColumnId
      ? boardData.columns.find((column) => column.id === pendingDeleteColumnId) ?? null
      : null;

    return (
      <div ref={containerRef} style={containerStyle}>
        <div
          style={{
            width: '100%',
            height: '100%',
            background: boardBg,
            border: `1.5px solid ${borderTone}`,
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
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUndo();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!canUndo}
                title="Undo"
                style={{
                  width: 24,
                  height: 24,
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 5,
                  background: canUndo ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)',
                  cursor: canUndo ? 'pointer' : 'default',
                  color: canUndo ? '#374151' : '#c4c8d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 14,
                }}
              >
                ↶
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRedo();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!canRedo}
                title="Redo"
                style={{
                  width: 24,
                  height: 24,
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 5,
                  background: canRedo ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)',
                  cursor: canRedo ? 'pointer' : 'default',
                  color: canRedo ? '#374151' : '#c4c8d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 14,
                }}
              >
                ↷
              </button>
            </div>
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
                draggingFromColumnId={draggingFromColumnId}
                overCardId={overCardId}
                onUpdateColumn={handleUpdateColumn}
                onRequestDeleteColumn={handleRequestDeleteColumn}
                onUpdateCard={handleUpdateCard}
                onDeleteCard={handleDeleteCard}
                onAddCard={handleAddCard}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
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

          {pendingDeleteColumn && (
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                if (e.currentTarget === e.target) {
                  handleCancelDeleteColumn();
                }
              }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15,23,42,0.24)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                zIndex: 20,
              }}
            >
              <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  width: 'min(420px, 100%)',
                  background: '#ffffff',
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 10,
                  boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
                  padding: '14px',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: '1.02em', fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                  Delete column?
                </div>
                <div style={{ fontSize: '0.9em', color: '#6b7280', lineHeight: 1.45, marginBottom: 12 }}>
                  Delete "{pendingDeleteColumn.title}" and its {pendingDeleteColumn.cards.length} card(s)?
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={handleCancelDeleteColumn}
                    style={{
                      padding: '6px 10px',
                      border: '1.5px solid rgba(0,0,0,0.15)',
                      borderRadius: 6,
                      background: '#ffffff',
                      cursor: 'pointer',
                      color: '#6b7280',
                      fontFamily: 'inherit',
                      fontSize: '0.85em',
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeleteColumn}
                    style={{
                      padding: '6px 10px',
                      border: '1.5px solid #ef4444',
                      borderRadius: 6,
                      background: '#ef4444',
                      cursor: 'pointer',
                      color: '#ffffff',
                      fontFamily: 'inherit',
                      fontSize: '0.85em',
                      fontWeight: 700,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '4px 10px 6px',
              flexShrink: 0,
              borderTop: `1px solid ${borderTone}`,
              background: headerBg,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings((visible) => !visible);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Appearance"
              style={{
                width: 28,
                height: 28,
                border: showSettings ? '1.5px solid #6366f1' : `1.5px solid ${borderTone}`,
                borderRadius: 6,
                background: showSettings ? 'rgba(99,102,241,0.08)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: showSettings ? '#6366f1' : '#9ca3af',
                transition: 'all 0.15s ease',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (!showSettings) {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.color = '#6366f1';
                }
              }}
              onMouseLeave={(e) => {
                if (!showSettings) {
                  e.currentTarget.style.borderColor = borderTone;
                  e.currentTarget.style.color = '#9ca3af';
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            </button>
          </div>

          {showSettings && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: 44,
                right: 10,
                width: 232,
                background: '#ffffff',
                borderRadius: 10,
                border: '1.5px solid rgba(0,0,0,0.1)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                padding: '12px',
                zIndex: 10,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'system-ui, sans-serif' }}>
                  Background
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {BOARD_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleSetTheme(theme.id)}
                      title={theme.name}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: theme.colBg,
                        border: activeTheme.id === theme.id ? '2.5px solid #6366f1' : '1.5px solid rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                        boxShadow: activeTheme.id === theme.id ? '0 0 0 1.5px #fff inset' : 'none',
                        transition: 'border 0.1s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 12 }} />

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'system-ui, sans-serif' }}>
                  Font
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {BOARD_FONTS.map((font) => {
                    const isSelected = activeFont?.id === font.id;
                    return (
                      <button
                        key={font.id}
                        onClick={() => handleSetFont(font.id)}
                        style={{
                          padding: '5px 10px',
                          border: isSelected ? '1.5px solid #6366f1' : '1.5px solid rgba(0,0,0,0.1)',
                          borderRadius: 6,
                          background: isSelected ? 'rgba(99,102,241,0.07)' : 'transparent',
                          cursor: 'pointer',
                          fontFamily: font.family,
                          fontSize: 13,
                          fontWeight: isSelected ? 700 : 400,
                          color: isSelected ? '#6366f1' : '#374151',
                          textAlign: 'left',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        {font.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 12, marginTop: 4 }} />

              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'system-ui, sans-serif' }}>
                  Font Size
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleSetFontSize(-1)}
                    disabled={activeFontSize <= 10}
                    style={{
                      width: 28,
                      height: 28,
                      border: '1.5px solid rgba(0,0,0,0.12)',
                      borderRadius: 6,
                      background: 'transparent',
                      cursor: activeFontSize <= 10 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      lineHeight: 1,
                      color: activeFontSize <= 10 ? '#d1d5db' : '#374151',
                      fontFamily: 'system-ui, sans-serif',
                      padding: 0,
                    }}
                  >
                    -
                  </button>
                  <span style={{ flex: 1, textAlign: 'center', fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {activeFontSize}px
                  </span>
                  <button
                    onClick={() => handleSetFontSize(1)}
                    disabled={activeFontSize >= 20}
                    style={{
                      width: 28,
                      height: 28,
                      border: '1.5px solid rgba(0,0,0,0.12)',
                      borderRadius: 6,
                      background: 'transparent',
                      cursor: activeFontSize >= 20 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      lineHeight: 1,
                      color: activeFontSize >= 20 ? '#d1d5db' : '#374151',
                      fontFamily: 'system-ui, sans-serif',
                      padding: 0,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap');
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
