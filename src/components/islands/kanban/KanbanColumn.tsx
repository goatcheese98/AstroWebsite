import React, { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { KanbanColumn as KanbanColumnType, KanbanCard } from './kanban-types';
import { PRIORITY_COLORS } from './kanban-types';
import { KanbanCardView } from './KanbanCardView';
import { getProjectedOverCardId } from './kanban-logic';

function DropIndicator() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        margin: '2px 0',
        gap: 0,
        pointerEvents: 'none',
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
      <div style={{ flex: 1, height: 2, background: '#6366f1', borderRadius: 1 }} />
    </div>
  );
}

interface KanbanColumnProps {
  column: KanbanColumnType;
  colBg: string;
  cardBg: string;
  isOver: boolean;
  draggingCardId: string | null;
  draggingFromColumnId: string | null;
  overCardId: string | null;
  onUpdateColumn: (columnId: string, changes: Partial<KanbanColumnType>) => void;
  onRequestDeleteColumn: (columnId: string) => void;
  onUpdateCard: (cardId: string, changes: Partial<KanbanCard>) => void;
  onDeleteCard: (cardId: string) => void;
  onAddCard: (columnId: string, card: Partial<KanbanCard>) => void;
  onDragStart: (e: React.DragEvent, cardId: string, fromColumnId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onCardDragEnter: (cardId: string | null) => void;
}

export function KanbanColumn({
  column,
  colBg,
  cardBg,
  isOver,
  draggingCardId,
  draggingFromColumnId,
  overCardId,
  onUpdateColumn,
  onRequestDeleteColumn,
  onUpdateCard,
  onDeleteCard,
  onAddCard,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onCardDragEnter,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);
  const [isHovered, setIsHovered] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardPriority, setNewCardPriority] = useState<KanbanCard['priority']>(undefined);
  const [newCardDueDate, setNewCardDueDate] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isEditingWipLimit, setIsEditingWipLimit] = useState(false);
  const [wipLimitValue, setWipLimitValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newCardInputRef = useRef<HTMLInputElement>(null);
  const wipLimitInputRef = useRef<HTMLInputElement>(null);
  const isOverWipLimit = typeof column.wipLimit === 'number' && column.cards.length > column.wipLimit;

  const saveTitle = useCallback(() => {
    if (titleValue.trim()) {
      onUpdateColumn(column.id, { title: titleValue.trim() });
    } else {
      setTitleValue(column.title);
    }
    setIsEditingTitle(false);
  }, [column.id, column.title, titleValue, onUpdateColumn]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') saveTitle();
      if (e.key === 'Escape') {
        setTitleValue(column.title);
        setIsEditingTitle(false);
      }
    },
    [saveTitle, column.title],
  );

  const startAddCard = useCallback(() => {
    setAddingCard(true);
    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardPriority(undefined);
    setNewCardDueDate('');
    setShowMoreDetails(false);
    setTimeout(() => newCardInputRef.current?.focus(), 0);
  }, []);

  const submitNewCard = useCallback(() => {
    if (newCardTitle.trim()) {
      onAddCard(column.id, {
        id: nanoid(),
        title: newCardTitle.trim(),
        description: newCardDesc.trim() || undefined,
        priority: newCardPriority || undefined,
        dueDate: newCardDueDate || undefined,
      });
    }
    setAddingCard(false);
    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardPriority(undefined);
    setNewCardDueDate('');
    setShowMoreDetails(false);
  }, [column.id, newCardTitle, newCardDesc, newCardPriority, newCardDueDate, onAddCard]);

  const cancelNewCard = useCallback(() => {
    setAddingCard(false);
    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardPriority(undefined);
    setNewCardDueDate('');
    setShowMoreDetails(false);
  }, []);

  const handleNewCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') submitNewCard();
      if (e.key === 'Escape') cancelNewCard();
    },
    [submitNewCard, cancelNewCard],
  );

  const handleCardDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, hoveredCardId: string) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const midpointY = rect.top + rect.height / 2;
      const isPastMidpoint = e.clientY > midpointY;
      const projectedCardId = getProjectedOverCardId(
        column.cards,
        hoveredCardId,
        isPastMidpoint,
      );
      onCardDragEnter(projectedCardId);
    },
    [column.cards, onCardDragEnter],
  );

  const openWipLimitEditor = useCallback(() => {
    setWipLimitValue(
      typeof column.wipLimit === 'number' ? String(column.wipLimit) : '',
    );
    setIsEditingWipLimit(true);
    setTimeout(() => wipLimitInputRef.current?.focus(), 0);
  }, [column.wipLimit]);

  const saveWipLimit = useCallback(() => {
    const trimmed = wipLimitValue.trim();
    if (!trimmed) {
      onUpdateColumn(column.id, { wipLimit: undefined });
      setIsEditingWipLimit(false);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setWipLimitValue(
        typeof column.wipLimit === 'number' ? String(column.wipLimit) : '',
      );
      setIsEditingWipLimit(false);
      return;
    }

    onUpdateColumn(column.id, { wipLimit: Math.floor(parsed) });
    setIsEditingWipLimit(false);
  }, [wipLimitValue, onUpdateColumn, column.id, column.wipLimit]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => e.stopPropagation()}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDrop={(e) => onDrop(e, column.id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 220,
        maxWidth: 260,
        width: 240,
        background: isOver
          ? 'rgba(99,102,241,0.06)'
          : isOverWipLimit
            ? 'rgba(254,242,242,0.75)'
            : colBg,
        borderRadius: 6,
        border: isOver
          ? '2px dashed rgba(99,102,241,0.5)'
          : isOverWipLimit
            ? '1.5px solid rgba(239,68,68,0.35)'
            : '1.5px solid rgba(0,0,0,0.08)',
        flexShrink: 0,
        maxHeight: '100%',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease, background 0.15s ease',
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: '10px 10px 6px',
          borderBottom: '1.5px solid rgba(0,0,0,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {column.color && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: column.color, flexShrink: 0 }} />
        )}

        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleTitleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: '1em',
              fontWeight: 700,
              color: '#1a1a1a',
              padding: 0,
            }}
            autoFocus
          />
        ) : (
          <div
            onClick={() => { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 0); }}
            style={{
              flex: 1,
              fontFamily: 'inherit',
              fontSize: '1em',
              fontWeight: 700,
              color: '#1a1a1a',
              cursor: 'text',
              userSelect: 'none',
            }}
          >
            {column.title}
          </div>
        )}

        {isEditingWipLimit ? (
          <input
            ref={wipLimitInputRef}
            value={wipLimitValue}
            onChange={(e) => setWipLimitValue(e.target.value)}
            onBlur={saveWipLimit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveWipLimit();
              if (e.key === 'Escape') {
                setIsEditingWipLimit(false);
                setWipLimitValue(
                  typeof column.wipLimit === 'number' ? String(column.wipLimit) : '',
                );
              }
            }}
            placeholder="∞"
            style={{
              width: 40,
              height: 20,
              border: '1.5px solid rgba(99,102,241,0.5)',
              borderRadius: 10,
              outline: 'none',
              background: 'rgba(255,255,255,0.88)',
              color: '#4b5563',
              fontSize: '0.74em',
              fontFamily: 'inherit',
              fontWeight: 700,
              textAlign: 'center',
              padding: 0,
              flexShrink: 0,
            }}
          />
        ) : (
          <span
            onDoubleClick={openWipLimitEditor}
            title="Double-click to set WIP limit"
            style={{
              background: isOverWipLimit ? 'rgba(239,68,68,0.14)' : 'rgba(0,0,0,0.07)',
              color: isOverWipLimit ? '#dc2626' : '#6b7280',
              borderRadius: 10,
              padding: '1px 6px',
              fontSize: '0.77em',
              fontFamily: 'inherit',
              fontWeight: 700,
              flexShrink: 0,
              cursor: 'text',
              userSelect: 'none',
            }}
          >
            {typeof column.wipLimit === 'number'
              ? `${column.cards.length}/${column.wipLimit}`
              : column.cards.length}
          </span>
        )}

        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDeleteColumn(column.id);
            }}
            title="Delete column"
            style={{
              width: 18,
              height: 18,
              border: 'none',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: 3,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '0.92em',
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Cards area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 8px 4px',
          scrollbarWidth: 'none',
        }}
      >
        {typeof column.wipLimit === 'number' && (
          <div
            style={{
              marginBottom: 6,
              fontFamily: 'inherit',
              fontSize: '0.74em',
              fontWeight: 700,
              color: isOverWipLimit ? '#dc2626' : '#9ca3af',
              letterSpacing: '0.01em',
            }}
          >
            WIP {column.cards.length}/{column.wipLimit}
          </div>
        )}

        {column.cards.map((card) => {
          // Show indicator before this card when dragging over it (but not when it's the card being dragged)
          const showIndicatorBefore =
            !!draggingCardId &&
            overCardId === card.id &&
            card.id !== draggingCardId;
          return (
            <React.Fragment key={card.id}>
              {showIndicatorBefore && <DropIndicator />}
              <KanbanCardView
                card={card}
                columnId={column.id}
                cardBg={cardBg}
                isDragging={draggingCardId === card.id}
                showReturnCue={
                  draggingCardId === card.id &&
                  draggingFromColumnId === column.id &&
                  overCardId === card.id
                }
                onUpdate={onUpdateCard}
                onDelete={onDeleteCard}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragEnter={onCardDragEnter}
                onDragOverCard={handleCardDragOver}
              />
            </React.Fragment>
          );
        })}
        {/* Sentinel div: captures dragEnter below all cards, resetting overCardId to null */}
        <div
          style={{ flex: 1, minHeight: 20 }}
          onDragEnter={() => onCardDragEnter(null)}
          onDragOver={(e) => {
            e.preventDefault();
            onCardDragEnter(null);
          }}
        />
        {/* Indicator at the bottom: overCardId is null means cursor is below all cards */}
        {!!draggingCardId && isOver && !overCardId && <DropIndicator />}

        {addingCard && (
          <div
            style={{
              background: cardBg,
              border: '2px solid #6366f1',
              borderRadius: 4,
              padding: '8px',
              marginBottom: 6,
              boxShadow: '0 4px 12px rgba(99,102,241,0.12)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <input
              ref={newCardInputRef}
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={handleNewCardKeyDown}
              placeholder="Card title..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '1em',
                fontWeight: 600,
                color: '#1a1a1a',
                marginBottom: 6,
                padding: '2px 0',
                boxSizing: 'border-box',
              }}
            />

            {/* Collapsible more details */}
            <button
              onClick={() => setShowMoreDetails((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.77em',
                color: showMoreDetails ? '#6366f1' : '#9ca3af',
                marginBottom: showMoreDetails ? 8 : 6,
                transition: 'color 0.15s ease',
              }}
            >
              <svg
                width="10" height="10" viewBox="0 0 10 10"
                style={{ transform: showMoreDetails ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
              >
                <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              {showMoreDetails ? 'Hide details' : 'Add details'}
            </button>

            {showMoreDetails && (
              <div style={{ marginBottom: 8 }}>
                {/* Description */}
                <textarea
                  value={newCardDesc}
                  onChange={(e) => setNewCardDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 3,
                    outline: 'none',
                    background: 'rgba(255,255,255,0.7)',
                    fontFamily: 'inherit',
                    fontSize: '0.85em',
                    color: '#555',
                    resize: 'none',
                    padding: '4px 6px',
                    boxSizing: 'border-box',
                    marginBottom: 8,
                  }}
                />

                {/* Priority */}
                <div>
                  <span style={{ fontFamily: 'inherit', fontSize: '0.77em', color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                    Priority
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(['none', 'low', 'medium', 'high'] as const).map((p) => {
                      const isNone = p === 'none';
                      const color = isNone ? '#9ca3af' : PRIORITY_COLORS[p];
                      const selected = isNone ? !newCardPriority : newCardPriority === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setNewCardPriority(isNone ? undefined : p)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 8px',
                            border: selected ? `1.5px solid ${color}` : '1.5px solid rgba(0,0,0,0.12)',
                            borderRadius: 10,
                            background: selected ? `${color}18` : 'transparent',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '0.77em',
                            fontWeight: selected ? 700 : 400,
                            color: selected ? color : '#9ca3af',
                            flexShrink: 0,
                          }}
                        >
                          {!isNone && (
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          )}
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <span style={{ fontFamily: 'inherit', fontSize: '0.77em', color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                    Due Date
                  </span>
                  <input
                    type="date"
                    value={newCardDueDate}
                    onChange={(e) => setNewCardDueDate(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 3,
                      outline: 'none',
                      background: 'rgba(255,255,255,0.8)',
                      fontFamily: 'inherit',
                      fontSize: '0.83em',
                      color: '#555',
                      padding: '4px 6px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={submitNewCard}
                style={{
                  padding: '3px 10px',
                  border: 'none',
                  borderRadius: 3,
                  background: '#6366f1',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85em',
                  fontWeight: 600,
                }}
              >
                Add card
              </button>
              <button
                onClick={cancelNewCard}
                style={{
                  padding: '3px 8px',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: 3,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85em',
                  color: '#666',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add card button */}
      {!addingCard && (
        <button
          onClick={startAddCard}
          style={{
            margin: '4px 8px 8px',
            padding: '5px',
            border: '1.5px dashed rgba(0,0,0,0.18)',
            borderRadius: 4,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#9ca3af',
            fontFamily: 'inherit',
            fontSize: '0.92em',
            transition: 'all 0.15s ease',
            flexShrink: 0,
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
          <span style={{ fontSize: '1.08em', lineHeight: 1 }}>+</span>
          Add card
        </button>
      )}
    </div>
  );
}
