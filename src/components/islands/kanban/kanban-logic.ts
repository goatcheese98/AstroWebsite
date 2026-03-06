import { nanoid } from 'nanoid';
import type {
  KanbanBoardData,
  KanbanCard,
  KanbanColumn,
  KanbanOperation,
} from './kanban-types';

interface MoveKanbanCardInput {
  board: KanbanBoardData;
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  overCardId?: string | null;
}

interface CardWithId {
  id: string;
}

function cloneColumns(columns: KanbanColumn[]): KanbanColumn[] {
  return columns.map((column) => ({ ...column, cards: [...column.cards] }));
}

export function getProjectedOverCardId(
  cards: ReadonlyArray<CardWithId>,
  hoveredCardId: string,
  isPastMidpoint: boolean,
): string | null {
  const hoveredIndex = cards.findIndex((card) => card.id === hoveredCardId);
  if (hoveredIndex === -1) {
    return null;
  }

  if (!isPastMidpoint) {
    return hoveredCardId;
  }

  return cards[hoveredIndex + 1]?.id ?? null;
}

export function moveKanbanCard({
  board,
  cardId,
  fromColumnId,
  toColumnId,
  overCardId = null,
}: MoveKanbanCardInput): KanbanBoardData {
  const fromColumn = board.columns.find((column) => column.id === fromColumnId);
  const sourceCardIndex = fromColumn?.cards.findIndex((card) => card.id === cardId) ?? -1;

  if (!fromColumn || sourceCardIndex === -1) {
    return board;
  }

  const movingCard = fromColumn.cards[sourceCardIndex];

  if (fromColumnId === toColumnId) {
    if (overCardId === cardId) {
      return board;
    }

    const cardsWithoutMoving = fromColumn.cards.filter((card) => card.id !== cardId);
    let nextIndex = cardsWithoutMoving.length;

    if (overCardId) {
      const targetIndex = cardsWithoutMoving.findIndex((card) => card.id === overCardId);
      if (targetIndex === -1) {
        return board;
      }
      nextIndex = targetIndex;
    }

    const nextCards = [...cardsWithoutMoving];
    nextCards.splice(nextIndex, 0, movingCard);
    const isUnchanged = nextCards.every((card, index) => card.id === fromColumn.cards[index]?.id);
    if (isUnchanged) {
      return board;
    }

    return {
      ...board,
      columns: board.columns.map((column) =>
        column.id === fromColumnId ? { ...column, cards: nextCards } : column,
      ),
    };
  }

  const toColumn = board.columns.find((column) => column.id === toColumnId);
  if (!toColumn) {
    return board;
  }

  const nextColumns = cloneColumns(board.columns);
  const source = nextColumns.find((column) => column.id === fromColumnId);
  const destination = nextColumns.find((column) => column.id === toColumnId);
  if (!source || !destination) {
    return board;
  }

  const removalIndex = source.cards.findIndex((card) => card.id === cardId);
  if (removalIndex === -1) {
    return board;
  }

  const [removedCard] = source.cards.splice(removalIndex, 1);
  if (!removedCard) {
    return board;
  }

  const insertionIndex = overCardId
    ? destination.cards.findIndex((card) => card.id === overCardId)
    : -1;
  if (insertionIndex === -1) {
    destination.cards.push(removedCard);
  } else {
    destination.cards.splice(insertionIndex, 0, removedCard);
  }

  return {
    ...board,
    columns: nextColumns,
  };
}

export function applyKanbanOperations(
  board: KanbanBoardData,
  operations: KanbanOperation[],
  createId: () => string = nanoid,
): KanbanBoardData {
  const next: KanbanBoardData = {
    ...board,
    columns: cloneColumns(board.columns),
  };

  for (const operation of operations) {
    if (operation.op === 'add_card') {
      const column = next.columns.find((col) => col.id === operation.columnId);
      if (column) {
        const newCard = {
          id: createId(),
          title: 'New card',
          ...operation.card,
        } as KanbanCard;
        column.cards.push(newCard);
      }
      continue;
    }

    if (operation.op === 'update_card') {
      for (const column of next.columns) {
        const cardIndex = column.cards.findIndex((card) => card.id === operation.cardId);
        if (cardIndex !== -1) {
          column.cards[cardIndex] = { ...column.cards[cardIndex], ...operation.changes };
          break;
        }
      }
      continue;
    }

    if (operation.op === 'delete_card') {
      for (const column of next.columns) {
        const originalLength = column.cards.length;
        column.cards = column.cards.filter((card) => card.id !== operation.cardId);
        if (column.cards.length !== originalLength) {
          break;
        }
      }
      continue;
    }

    if (operation.op === 'move_card') {
      let removedCard: KanbanCard | undefined;

      for (const column of next.columns) {
        const cardIndex = column.cards.findIndex((card) => card.id === operation.cardId);
        if (cardIndex !== -1) {
          removedCard = column.cards.splice(cardIndex, 1)[0];
          break;
        }
      }

      if (!removedCard) {
        continue;
      }

      const destination = next.columns.find((column) => column.id === operation.toColumnId);
      if (!destination) {
        continue;
      }

      if (operation.toIndex === undefined) {
        destination.cards.push(removedCard);
      } else {
        const boundedIndex = Math.max(0, Math.min(destination.cards.length, operation.toIndex));
        destination.cards.splice(boundedIndex, 0, removedCard);
      }
      continue;
    }

    if (operation.op === 'add_column') {
      next.columns.push({
        id: createId(),
        title: 'New Column',
        cards: [],
        ...operation.column,
      } as KanbanColumn);
      continue;
    }

    if (operation.op === 'update_column') {
      const columnIndex = next.columns.findIndex((column) => column.id === operation.columnId);
      if (columnIndex !== -1) {
        next.columns[columnIndex] = { ...next.columns[columnIndex], ...operation.changes };
      }
      continue;
    }

    if (operation.op === 'delete_column') {
      next.columns = next.columns.filter((column) => column.id !== operation.columnId);
      continue;
    }

    if (operation.op === 'reorder_cards') {
      const column = next.columns.find((col) => col.id === operation.columnId);
      if (!column) {
        continue;
      }

      const cardById = new Map(column.cards.map((card) => [card.id, card]));
      column.cards = operation.cardIds
        .map((cardId) => cardById.get(cardId))
        .filter((card): card is KanbanCard => Boolean(card));
    }
  }

  return next;
}
