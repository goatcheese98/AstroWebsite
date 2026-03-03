import React, { useState, useCallback, useRef } from 'react';
import type { KanbanCard } from './kanban-types';
import { LABEL_COLORS, PRIORITY_COLORS } from './kanban-types';

interface KanbanCardViewProps {
  card: KanbanCard;
  columnId: string;
  cardBg: string;
  onUpdate: (cardId: string, changes: Partial<KanbanCard>) => void;
  onDelete: (cardId: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string, fromColumnId: string) => void;
  onDragEnter: (cardId: string) => void;
}

export function KanbanCardView({
  card,
  columnId,
  cardBg,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnter,
}: KanbanCardViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDesc, setEditDesc] = useState(card.description || '');
  const [editPriority, setEditPriority] = useState<KanbanCard['priority']>(card.priority);
  const [isHovered, setIsHovered] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const doneCount = card.checklist?.filter((item) => item.done).length ?? 0;
  const totalCount = card.checklist?.length ?? 0;
  const checklistProgress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const openEdit = useCallback(() => {
    setEditTitle(card.title);
    setEditDesc(card.description || '');
    setEditPriority(card.priority);
    setIsEditing(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }, [card.title, card.description, card.priority]);

  const saveEdit = useCallback(() => {
    if (editTitle.trim()) {
      onUpdate(card.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        priority: editPriority || undefined,
      });
    }
    setIsEditing(false);
  }, [card.id, editTitle, editDesc, editPriority, onUpdate]);

  const cancelEdit = useCallback(() => {
    setEditTitle(card.title);
    setEditDesc(card.description || '');
    setEditPriority(card.priority);
    setIsEditing(false);
  }, [card.title, card.description, card.priority]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveEdit();
      }
      if (e.key === 'Escape') cancelEdit();
    },
    [saveEdit, cancelEdit],
  );

  const priorityColor = card.priority ? PRIORITY_COLORS[card.priority] : undefined;

  if (isEditing) {
    return (
      <div
        style={{
          background: cardBg,
          border: '2px solid #6366f1',
          borderRadius: 4,
          padding: '8px',
          marginBottom: 6,
          boxShadow: '0 4px 12px rgba(99,102,241,0.15)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={titleInputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Card title"
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'inherit',
            fontSize: '1em',
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: 4,
            padding: '2px 0',
            boxSizing: 'border-box',
          }}
        />
        <textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
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
            resize: 'vertical',
            padding: '4px 6px',
            boxSizing: 'border-box',
            marginBottom: 6,
          }}
        />

        {/* Priority selector */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontFamily: 'inherit', fontSize: '0.77em', color: '#9ca3af', display: 'block', marginBottom: 4 }}>
            Priority
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(['none', 'low', 'medium', 'high'] as const).map((p) => {
              const isNone = p === 'none';
              const color = isNone ? '#9ca3af' : PRIORITY_COLORS[p];
              const selected = isNone ? !editPriority : editPriority === p;
              return (
                <button
                  key={p}
                  onClick={() => setEditPriority(isNone ? undefined : p)}
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
                    transition: 'all 0.1s ease',
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

        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            onClick={cancelEdit}
            style={{
              padding: '3px 8px',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 3,
              background: 'white',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.85em',
              color: '#666',
            }}
          >
            Cancel
          </button>
          <button
            onClick={saveEdit}
            style={{
              padding: '3px 8px',
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
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id, columnId)}
      onDragEnter={() => onDragEnter(card.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={openEdit}
      style={{
        background: cardBg,
        border: '1.5px solid rgba(0,0,0,0.10)',
        borderRadius: 4,
        padding: '8px 10px',
        marginBottom: 6,
        cursor: 'grab',
        position: 'relative',
        boxShadow: isHovered
          ? '0 3px 10px rgba(0,0,0,0.12)'
          : '0 1px 3px rgba(0,0,0,0.07)',
        transition: 'box-shadow 0.15s ease',
        userSelect: 'none',
      }}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
          {card.labels.map((label) => (
            <span
              key={label}
              style={{
                background: LABEL_COLORS[label] || '#f3f4f6',
                color: '#374151',
                fontSize: '0.69em',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 3,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <div
        style={{
          fontFamily: 'inherit',
          fontSize: '1em',
          fontWeight: 600,
          color: '#1a1a1a',
          lineHeight: 1.35,
          marginBottom: card.description ? 4 : 0,
          paddingRight: isHovered ? 20 : 0,
        }}
      >
        {card.title}
      </div>

      {/* Description */}
      {card.description && (
        <div
          style={{
            fontFamily: 'inherit',
            fontSize: '0.85em',
            color: '#6b7280',
            lineHeight: 1.4,
            marginBottom: 4,
          }}
        >
          {card.description}
        </div>
      )}

      {/* Checklist progress */}
      {totalCount > 0 && (
        <div style={{ marginTop: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <div
              style={{
                flex: 1,
                height: 4,
                background: 'rgba(0,0,0,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${checklistProgress}%`,
                  height: '100%',
                  background: checklistProgress === 100 ? '#10b981' : '#6366f1',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span style={{ fontFamily: 'inherit', fontSize: '0.77em', color: '#9ca3af', flexShrink: 0 }}>
              {doneCount}/{totalCount}
            </span>
          </div>
        </div>
      )}

      {/* Priority */}
      {priorityColor && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor }} />
          <span style={{ fontFamily: 'inherit', fontSize: '0.77em', color: priorityColor, fontWeight: 600 }}>
            {card.priority}
          </span>
        </div>
      )}

      {/* Delete button on hover */}
      {isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Delete card"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
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
            fontSize: '0.85em',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
