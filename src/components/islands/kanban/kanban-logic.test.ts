import { describe, expect, it } from 'vitest';
import type { KanbanBoardData } from './kanban-types';
import {
  applyKanbanOperations,
  getProjectedOverCardId,
  moveKanbanCard,
} from './kanban-logic';

function makeBoard(): KanbanBoardData {
  return {
    type: 'kanban',
    title: 'Board',
    columns: [
      {
        id: 'todo',
        title: 'To Do',
        cards: [
          { id: 'a', title: 'A' },
          { id: 'b', title: 'B' },
          { id: 'c', title: 'C' },
        ],
      },
      {
        id: 'doing',
        title: 'Doing',
        cards: [
          { id: 'd', title: 'D' },
          { id: 'e', title: 'E' },
        ],
      },
      {
        id: 'done',
        title: 'Done',
        cards: [],
      },
    ],
  };
}

function cardIds(board: KanbanBoardData, columnId: string): string[] {
  const column = board.columns.find((item) => item.id === columnId);
  return column ? column.cards.map((card) => card.id) : [];
}

function allCardIds(board: KanbanBoardData): string[] {
  return board.columns.flatMap((column) => column.cards.map((card) => card.id));
}

describe('getProjectedOverCardId', () => {
  const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns the current card id when hovering above midpoint', () => {
    expect(getProjectedOverCardId(cards, 'b', false)).toBe('b');
  });

  it('returns the next card id when hovering below midpoint', () => {
    expect(getProjectedOverCardId(cards, 'b', true)).toBe('c');
  });

  it('returns null when hovering below midpoint of the last card', () => {
    expect(getProjectedOverCardId(cards, 'c', true)).toBeNull();
  });

  it('returns null for unknown hovered cards', () => {
    expect(getProjectedOverCardId(cards, 'missing', false)).toBeNull();
  });
});

describe('moveKanbanCard', () => {
  it('reorders cards within the same column before a target card', () => {
    const board = makeBoard();
    const moved = moveKanbanCard({
      board,
      cardId: 'c',
      fromColumnId: 'todo',
      toColumnId: 'todo',
      overCardId: 'a',
    });

    expect(cardIds(moved, 'todo')).toEqual(['c', 'a', 'b']);
  });

  it('moves cards to the bottom when dropped within the same column with no target card', () => {
    const board = makeBoard();
    const moved = moveKanbanCard({
      board,
      cardId: 'a',
      fromColumnId: 'todo',
      toColumnId: 'todo',
      overCardId: null,
    });

    expect(cardIds(moved, 'todo')).toEqual(['b', 'c', 'a']);
  });

  it('reorders cards correctly when dragging upward in the same column', () => {
    const board = makeBoard();
    const moved = moveKanbanCard({
      board,
      cardId: 'b',
      fromColumnId: 'todo',
      toColumnId: 'todo',
      overCardId: 'a',
    });

    expect(cardIds(moved, 'todo')).toEqual(['b', 'a', 'c']);
  });

  it('treats dropping over itself as a no-op', () => {
    const board = makeBoard();
    const moved = moveKanbanCard({
      board,
      cardId: 'b',
      fromColumnId: 'todo',
      toColumnId: 'todo',
      overCardId: 'b',
    });

    expect(moved).toBe(board);
  });

  it('treats stale same-column target ids as a no-op', () => {
    const board = makeBoard();
    const moved = moveKanbanCard({
      board,
      cardId: 'a',
      fromColumnId: 'todo',
      toColumnId: 'todo',
      overCardId: 'missing-card',
    });

    expect(moved).toBe(board);
  });

  it('returns the original board when the computed order does not change', () => {
    const board = makeBoard();
    const moved = moveKanbanCard({
      board,
      cardId: 'b',
      fromColumnId: 'todo',
      toColumnId: 'todo',
      overCardId: 'c',
    });

    expect(moved).toBe(board);
  });

  it('moves cards across columns before a target card', () => {
    const board = makeBoard();
    const moved = moveKanbanCard({
      board,
      cardId: 'b',
      fromColumnId: 'todo',
      toColumnId: 'doing',
      overCardId: 'e',
    });

    expect(cardIds(moved, 'todo')).toEqual(['a', 'c']);
    expect(cardIds(moved, 'doing')).toEqual(['d', 'b', 'e']);
  });

  it('moves cards across columns to the end when there is no valid target card', () => {
    const board = makeBoard();
    const moved = moveKanbanCard({
      board,
      cardId: 'a',
      fromColumnId: 'todo',
      toColumnId: 'doing',
      overCardId: 'missing-card',
    });

    expect(cardIds(moved, 'todo')).toEqual(['b', 'c']);
    expect(cardIds(moved, 'doing')).toEqual(['d', 'e', 'a']);
  });

  it('returns the original board for invalid source card or invalid destination column', () => {
    const board = makeBoard();

    const missingCard = moveKanbanCard({
      board,
      cardId: 'missing',
      fromColumnId: 'todo',
      toColumnId: 'doing',
      overCardId: null,
    });
    expect(missingCard).toBe(board);

    const missingDestination = moveKanbanCard({
      board,
      cardId: 'a',
      fromColumnId: 'todo',
      toColumnId: 'unknown-column',
      overCardId: null,
    });
    expect(missingDestination).toBe(board);
  });

  it('preserves card identity invariants across many randomized moves', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    let board: KanbanBoardData = {
      type: 'kanban',
      title: 'Stress',
      columns: [
        { id: 'c1', title: 'C1', cards: Array.from({ length: 6 }, (_, i) => ({ id: `c1-${i}`, title: `C1-${i}` })) },
        { id: 'c2', title: 'C2', cards: Array.from({ length: 6 }, (_, i) => ({ id: `c2-${i}`, title: `C2-${i}` })) },
        { id: 'c3', title: 'C3', cards: Array.from({ length: 6 }, (_, i) => ({ id: `c3-${i}`, title: `C3-${i}` })) },
        { id: 'c4', title: 'C4', cards: Array.from({ length: 6 }, (_, i) => ({ id: `c4-${i}`, title: `C4-${i}` })) },
      ],
    };

    const initialCardIds = allCardIds(board).sort();
    const initialCardCount = initialCardIds.length;

    for (let i = 0; i < 500; i += 1) {
      const nonEmptyColumns = board.columns.filter((column) => column.cards.length > 0);
      const fromColumn = nonEmptyColumns[Math.floor(random() * nonEmptyColumns.length)];
      const toColumn = board.columns[Math.floor(random() * board.columns.length)];
      const fromCard = fromColumn.cards[Math.floor(random() * fromColumn.cards.length)];

      const overCardId = (() => {
        const mode = Math.floor(random() * 4);
        if (mode === 0) return null;
        if (mode === 1) return 'missing-target';
        if (toColumn.cards.length === 0) return null;
        return toColumn.cards[Math.floor(random() * toColumn.cards.length)].id;
      })();

      board = moveKanbanCard({
        board,
        cardId: fromCard.id,
        fromColumnId: fromColumn.id,
        toColumnId: toColumn.id,
        overCardId,
      });

      const ids = allCardIds(board);
      expect(ids.length).toBe(initialCardCount);
      expect(new Set(ids).size).toBe(initialCardCount);
      expect([...ids].sort()).toEqual(initialCardIds);
    }
  });
});

describe('applyKanbanOperations', () => {
  it('supports add/update/delete/move card operations', () => {
    const board = makeBoard();
    const next = applyKanbanOperations(
      board,
      [
        { op: 'add_card', columnId: 'todo', card: { title: 'New Card', priority: 'high' } },
        { op: 'update_card', cardId: 'a', changes: { title: 'A+' } },
        { op: 'move_card', cardId: 'd', toColumnId: 'todo', toIndex: 1 },
        { op: 'delete_card', cardId: 'b' },
      ],
      () => 'generated-card-id',
    );

    expect(cardIds(next, 'todo')).toEqual(['a', 'd', 'c', 'generated-card-id']);
    expect(cardIds(next, 'doing')).toEqual(['e']);
    expect(next.columns[0].cards[0].title).toBe('A+');
    expect(next.columns[0].cards[3].title).toBe('New Card');
    expect(next.columns[0].cards[3].priority).toBe('high');
  });

  it('supports add/update/delete column operations', () => {
    const board = makeBoard();
    const next = applyKanbanOperations(
      board,
      [
        { op: 'add_column', column: { title: 'Backlog' } },
        { op: 'update_column', columnId: 'doing', changes: { title: 'In Progress' } },
        { op: 'delete_column', columnId: 'done' },
      ],
      () => 'generated-column-id',
    );

    expect(next.columns.map((column) => column.id)).toEqual(['todo', 'doing', 'generated-column-id']);
    expect(next.columns.find((column) => column.id === 'doing')?.title).toBe('In Progress');
    expect(next.columns.find((column) => column.id === 'generated-column-id')?.title).toBe('Backlog');
  });

  it('reorders cards by explicit id list and ignores unknown ids', () => {
    const board = makeBoard();
    const next = applyKanbanOperations(board, [
      { op: 'reorder_cards', columnId: 'todo', cardIds: ['c', 'a', 'missing', 'b'] },
    ]);

    expect(cardIds(next, 'todo')).toEqual(['c', 'a', 'b']);
  });

  it('clamps move_card toIndex values to valid bounds', () => {
    const board = makeBoard();
    const low = applyKanbanOperations(board, [
      { op: 'move_card', cardId: 'a', toColumnId: 'doing', toIndex: -99 },
    ]);
    expect(cardIds(low, 'doing')).toEqual(['a', 'd', 'e']);

    const high = applyKanbanOperations(board, [
      { op: 'move_card', cardId: 'a', toColumnId: 'doing', toIndex: 999 },
    ]);
    expect(cardIds(high, 'doing')).toEqual(['d', 'e', 'a']);
  });
});
