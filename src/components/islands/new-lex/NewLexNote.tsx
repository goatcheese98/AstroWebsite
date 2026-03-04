import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { getOverlayZIndex } from '@/components/islands/overlay-utils';
import { ZoomHint } from '@/components/islands/ZoomHint';
import { useZoomHint } from '@/components/islands/useZoomHint';
import {
  getExcalidrawCornerRadius,
  getExcalidrawSurfaceStyle,
} from '@/components/islands/excalidraw-element-style';
import type {
  NewLexCommentReply,
  NewLexCommentThread,
  NewLexNoteProps,
  NewLexNoteRef,
} from './types';
import { DEFAULT_NEWLEX_CONTENT } from './types';

const CONTENT_COMMIT_DEBOUNCE_MS = 120;
const COMMENTS_COMMIT_DEBOUNCE_MS = 160;
const RIBBON_PREF_KEY = 'newlex.ribbon.enabled';
const USER_NAME_PREF_KEY = 'newlex.comment.author';

const COMMENT_INPUT_WIDTH = 250;
const TABLE_MAX_ROWS = 500;
const TABLE_MAX_COLUMNS = 50;
const DEFAULT_TABLE_ROWS = 3;
const DEFAULT_TABLE_COLUMNS = 3;

type Point = {
  left: number;
  top: number;
};

type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TableSelectionContext = {
  table: HTMLTableElement;
  row: HTMLTableRowElement;
  cell: HTMLTableCellElement;
  rowIndex: number;
  columnIndex: number;
  rowCount: number;
  columnCount: number;
};

type TableSelectionMeta = {
  tableId: string;
  rowIndex: number;
  columnIndex: number;
  rowCount: number;
  columnCount: number;
  hasRowHeader: boolean;
  hasColumnHeader: boolean;
  rowStriping: boolean;
  firstRowFrozen: boolean;
  firstColumnFrozen: boolean;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimestamp(value: number): string {
  const seconds = Math.round((value - Date.now()) / 1000);
  const minutes = Math.round(seconds / 60);

  if (seconds > -10) {
    return 'Just now';
  }

  const formatter = new Intl.RelativeTimeFormat('en', {
    localeMatcher: 'best fit',
    numeric: 'auto',
    style: 'short',
  });

  return formatter.format(minutes, 'minute');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function plainTextToHtml(value: string): string {
  return value
    .split('\n')
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');
}

function normalizeIncomingContent(value: string | undefined): string {
  const source = (value || '').trim();
  if (!source) return DEFAULT_NEWLEX_CONTENT;
  return looksLikeHtml(source) ? source : plainTextToHtml(source);
}

function normalizeIncomingComments(
  value: NewLexCommentThread[] | undefined,
): NewLexCommentThread[] {
  if (!Array.isArray(value)) return [];

  return value.map((thread) => ({
    ...thread,
    comment: typeof thread.comment === 'string' ? thread.comment : '',
    anchorText: thread.anchorText || '',
    replies: Array.isArray(thread.replies)
      ? thread.replies.map((reply) => ({
          ...reply,
          message: reply.message || '',
          deleted: !!reply.deleted,
        }))
      : [],
    commentDeleted: !!thread.commentDeleted,
    resolved: !!thread.resolved,
    collapsed: !!thread.collapsed,
  }));
}

function getSelectionRangeInEditor(editor: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;

  return range;
}

function getSelectionAnchorInEditor(editor: HTMLElement): Point | null {
  const range = getSelectionRangeInEditor(editor);
  if (!range || range.collapsed) return null;

  const rect = range.getBoundingClientRect();
  if (rect.width || rect.height) {
    return {
      left: rect.left + rect.width / 2,
      top: rect.top,
    };
  }

  const firstRect = range.getClientRects().item(0);
  if (!firstRect) return null;

  return {
    left: firstRect.left + firstRect.width / 2,
    top: firstRect.top,
  };
}

function selectNthTextMatch(
  editor: HTMLElement,
  rawQuery: string,
  matchIndex: number,
): boolean {
  const query = rawQuery.toLowerCase();
  if (!query) return false;

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let currentMatch = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const text = node.textContent || '';
    const lower = text.toLowerCase();
    let cursor = 0;

    while (cursor < lower.length) {
      const at = lower.indexOf(query, cursor);
      if (at === -1) break;

      if (currentMatch === matchIndex) {
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + query.length);

        const selection = window.getSelection();
        if (!selection) return false;

        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }

      currentMatch += 1;
      cursor = at + query.length;
    }
  }

  return false;
}

function getInitialRibbonEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(RIBBON_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

function getInitialUserName(): string {
  if (typeof window === 'undefined') return 'You';

  try {
    return window.localStorage.getItem(USER_NAME_PREF_KEY) || 'You';
  } catch {
    return 'You';
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

function createRectListFromRange(range: Range): RectLike[] {
  return Array.from(range.getClientRects()).map((rect) => ({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }));
}

function getClosestTableCell(node: Node | null): HTMLTableCellElement | null {
  if (!node) return null;

  const element =
    node instanceof HTMLElement ? node : (node.parentElement as HTMLElement | null);
  if (!element) return null;

  const cell = element.closest('td, th');
  return cell instanceof HTMLTableCellElement ? cell : null;
}

function getSelectionTableContext(editor: HTMLElement): TableSelectionContext | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;

  const cell = getClosestTableCell(selection.anchorNode);
  if (!cell || !editor.contains(cell)) return null;

  const row = cell.parentElement;
  if (!(row instanceof HTMLTableRowElement)) return null;

  const table = row.closest('table');
  if (!(table instanceof HTMLTableElement) || !editor.contains(table)) return null;

  const rows = Array.from(table.rows);
  const rowIndex = rows.indexOf(row);
  if (rowIndex < 0) return null;

  const columnIndex = Array.from(row.cells).indexOf(cell);
  if (columnIndex < 0) return null;

  const columnCount = rows.reduce((max, currentRow) => {
    return Math.max(max, currentRow.cells.length);
  }, 0);

  return {
    table,
    row,
    cell,
    rowIndex,
    columnIndex,
    rowCount: rows.length,
    columnCount,
  };
}

function ensureTableIdentity(table: HTMLTableElement): string {
  const existing = table.getAttribute('data-newlex-table-id');
  if (existing) return existing;

  const id = createId('tbl');
  table.setAttribute('data-newlex-table-id', id);
  return id;
}

function createEditableCell(tagName: 'td' | 'th'): HTMLTableCellElement {
  const cell = document.createElement(tagName) as HTMLTableCellElement;
  const paragraph = document.createElement('p');
  paragraph.appendChild(document.createElement('br'));
  cell.appendChild(paragraph);

  if (tagName === 'th') {
    cell.setAttribute('scope', 'col');
  }

  return cell;
}

function createEmptyParagraph(): HTMLParagraphElement {
  const paragraph = document.createElement('p');
  paragraph.appendChild(document.createElement('br'));
  return paragraph;
}

function createTableElement(
  rows: number,
  columns: number,
  includeHeaders: boolean,
): HTMLTableElement {
  const table = document.createElement('table');
  table.className = 'newlex-table';
  table.setAttribute('data-newlex-table', '1');
  ensureTableIdentity(table);

  const tbody = document.createElement('tbody');
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = document.createElement('tr');
    for (let colIndex = 0; colIndex < columns; colIndex += 1) {
      row.appendChild(createEditableCell(includeHeaders && rowIndex === 0 ? 'th' : 'td'));
    }
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  return table;
}

function setCaretInCell(editor: HTMLElement, cell: HTMLTableCellElement, atStart = true): void {
  editor.focus();

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(atStart);
  selection.removeAllRanges();
  selection.addRange(range);
}

function setCaretAtNodeStart(editor: HTMLElement, node: Node): void {
  editor.focus();

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  if (node instanceof HTMLElement) {
    range.selectNodeContents(node);
  } else {
    range.setStart(node, 0);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getCellAt(
  table: HTMLTableElement,
  rowIndex: number,
  columnIndex: number,
): HTMLTableCellElement | null {
  const row = table.rows.item(rowIndex);
  if (!row || row.cells.length === 0) return null;

  const boundedColumn = Math.max(0, Math.min(columnIndex, row.cells.length - 1));
  const cell = row.cells.item(boundedColumn);
  return cell instanceof HTMLTableCellElement ? cell : null;
}

function insertTableRow(
  table: HTMLTableElement,
  rowIndex: number,
  insertAfter: boolean,
): HTMLTableRowElement {
  const allRows = Array.from(table.rows);
  const referenceRow = allRows[rowIndex] ?? allRows[allRows.length - 1] ?? null;
  const section =
    (referenceRow?.parentElement as HTMLTableSectionElement | null) ||
    table.tBodies.item(0) ||
    table.createTBody();

  const nextRow = document.createElement('tr');
  const columnCount = allRows.reduce((max, row) => Math.max(max, row.cells.length), 0);
  const size = Math.max(1, columnCount);

  for (let colIndex = 0; colIndex < size; colIndex += 1) {
    const templateCell = referenceRow?.cells.item(colIndex) || allRows[0]?.cells.item(colIndex);
    const tagName = templateCell?.tagName === 'TH' ? 'th' : 'td';
    nextRow.appendChild(createEditableCell(tagName));
  }

  if (!referenceRow) {
    section.appendChild(nextRow);
  } else if (insertAfter) {
    section.insertBefore(nextRow, referenceRow.nextSibling);
  } else {
    section.insertBefore(nextRow, referenceRow);
  }

  return nextRow;
}

function insertTableColumn(
  table: HTMLTableElement,
  columnIndex: number,
  insertAfter: boolean,
): void {
  const rows = Array.from(table.rows);
  rows.forEach((row) => {
    const anchorCell = row.cells.item(columnIndex) || row.cells.item(row.cells.length - 1);
    const tagName = anchorCell?.tagName === 'TH' ? 'th' : 'td';
    const nextCell = createEditableCell(tagName);

    if (!anchorCell) {
      row.appendChild(nextCell);
      return;
    }

    if (insertAfter) {
      row.insertBefore(nextCell, anchorCell.nextSibling);
    } else {
      row.insertBefore(nextCell, anchorCell);
    }
  });
}

function replaceCellTag(
  cell: HTMLTableCellElement,
  toHeader: boolean,
): HTMLTableCellElement {
  const nextTagName = toHeader ? 'TH' : 'TD';
  if (cell.tagName === nextTagName) return cell;

  const replacement = document.createElement(nextTagName.toLowerCase()) as HTMLTableCellElement;
  for (const attribute of Array.from(cell.attributes)) {
    if (!toHeader && attribute.name === 'scope') continue;
    replacement.setAttribute(attribute.name, attribute.value);
  }

  if (toHeader) {
    replacement.setAttribute('scope', 'col');
  }

  while (cell.firstChild) {
    replacement.appendChild(cell.firstChild);
  }

  cell.replaceWith(replacement);
  return replacement;
}

function toggleRowHeader(
  table: HTMLTableElement,
  rowIndex: number,
  activeColumnIndex: number,
): HTMLTableCellElement | null {
  const row = table.rows.item(rowIndex);
  if (!row) return null;

  const shouldConvertToHeader = Array.from(row.cells).some((cell) => cell.tagName !== 'TH');
  const replacements = Array.from(row.cells).map((cell) =>
    replaceCellTag(cell as HTMLTableCellElement, shouldConvertToHeader),
  );

  const boundedIndex = Math.max(0, Math.min(activeColumnIndex, replacements.length - 1));
  return replacements[boundedIndex] || null;
}

function toggleColumnHeader(
  table: HTMLTableElement,
  columnIndex: number,
  activeRowIndex: number,
): HTMLTableCellElement | null {
  const rows = Array.from(table.rows);
  const columnCells = rows
    .map((row) => row.cells.item(columnIndex))
    .filter((cell): cell is HTMLTableCellElement => cell instanceof HTMLTableCellElement);

  if (columnCells.length === 0) return null;

  const shouldConvertToHeader = columnCells.some((cell) => cell.tagName !== 'TH');
  const updated = columnCells.map((cell) => replaceCellTag(cell, shouldConvertToHeader));
  const boundedRow = Math.max(0, Math.min(activeRowIndex, updated.length - 1));
  return updated[boundedRow] || null;
}

function toggleTableFlag(table: HTMLTableElement, name: string): void {
  if (table.hasAttribute(name)) {
    table.removeAttribute(name);
  } else {
    table.setAttribute(name, '1');
  }
}

function removeTableAndInsertParagraph(table: HTMLTableElement): HTMLParagraphElement | null {
  const parent = table.parentNode;
  if (!parent) return null;

  const paragraph = createEmptyParagraph();
  parent.insertBefore(paragraph, table.nextSibling);
  table.remove();
  return paragraph;
}

function CommentIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13 5.885v1.166a3.95 3.95 0 0 1-3.949 3.95H6.917a.748.748 0 0 0-.45.15l-1.345 1.007a.752.752 0 0 0-.032 1.181A2.933 2.933 0 0 0 6.95 14h2.716l2.534 1.901a.506.506 0 0 0 .524.047A.501.501 0 0 0 13 15.5V14h.051a2.949 2.949 0 0 0 2.95-2.949v-3.05a3.002 3.002 0 0 0-2.002-2.83.756.756 0 0 0-.999.714"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.05 1H2.95A2.952 2.952 0 0 0 0 3.949v3.102A2.952 2.952 0 0 0 2.949 10H3v1.5a.502.502 0 0 0 .8.4L6.334 10H9.05A2.952 2.952 0 0 0 12 7.05V3.95A2.952 2.952 0 0 0 9.05 1"
        fill="currentColor"
      />
    </svg>
  );
}

function AddCommentIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
      <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
    </svg>
  );
}

function SendIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
    </svg>
  );
}

function DeleteIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z" />
    </svg>
  );
}

const NewLexNoteInner = memo(
  forwardRef<NewLexNoteRef, NewLexNoteProps>(
    ({ element, appState, stackIndex = 0, onChange, onDeselect }, ref) => {
      const [content, setContent] = useState(
        normalizeIncomingContent(element.customData?.content),
      );
      const [comments, setComments] = useState<NewLexCommentThread[]>(
        normalizeIncomingComments(element.customData?.comments),
      );
      const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(
        element.customData?.commentsPanelOpen ?? false,
      );
      const [currentUser, setCurrentUser] = useState(getInitialUserName);
      const [isFocused, setIsFocused] = useState(false);
      const [hasSelection, setHasSelection] = useState(false);
      const [toolbarPoint, setToolbarPoint] = useState<Point | null>(null);
      const [isRibbonVisible, setIsRibbonVisible] = useState(getInitialRibbonEnabled);
      const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
      const [activeCommentIds, setActiveCommentIds] = useState<string[]>([]);
      const [replyDraftByThread, setReplyDraftByThread] = useState<
        Record<string, string>
      >({});
      const [showCommentInput, setShowCommentInput] = useState(false);
      const [commentDraft, setCommentDraft] = useState('');
      const [commentInputPoint, setCommentInputPoint] = useState<Point | null>(null);
      const [selectionRects, setSelectionRects] = useState<RectLike[]>([]);
      const [addCommentPoint, setAddCommentPoint] = useState<Point | null>(null);
      const [isInsertTableDialogOpen, setIsInsertTableDialogOpen] = useState(false);
      const [tableRowsDraft, setTableRowsDraft] = useState(
        String(DEFAULT_TABLE_ROWS),
      );
      const [tableColumnsDraft, setTableColumnsDraft] = useState(
        String(DEFAULT_TABLE_COLUMNS),
      );
      const [tableIncludeHeaders, setTableIncludeHeaders] = useState(true);
      const [tableSelectionMeta, setTableSelectionMeta] = useState<TableSelectionMeta | null>(
        null,
      );
      const [tableActionPoint, setTableActionPoint] = useState<Point | null>(null);
      const [isTableActionMenuOpen, setIsTableActionMenuOpen] = useState(false);

      const editorRef = useRef<HTMLDivElement>(null);
      const containerRef = useRef<HTMLDivElement>(null);
      const pendingContentCommitRef = useRef<number | null>(null);
      const pendingCommentsCommitRef = useRef<number | null>(null);
      const commentsRef = useRef<NewLexCommentThread[]>(comments);
      const liveContentRef = useRef(content);
      const pendingSelectionRef = useRef<Range | null>(null);
      const pendingQuoteRef = useRef('');
      const tableActionButtonRef = useRef<HTMLButtonElement>(null);
      const tableActionMenuRef = useRef<HTMLDivElement>(null);
      const previousTableSelectionKeyRef = useRef<string | null>(null);

      useEffect(() => {
        commentsRef.current = comments;
      }, [comments]);

      useEffect(() => {
        liveContentRef.current = content;
      }, [content]);

      const commitNote = useCallback(
        (updates: {
          content?: string;
          comments?: NewLexCommentThread[];
          commentsPanelOpen?: boolean;
        }) => {
          onChange(element.id, updates);
        },
        [element.id, onChange],
      );

      const scheduleContentCommit = useCallback(
        (nextContent: string) => {
          if (pendingContentCommitRef.current !== null) {
            window.clearTimeout(pendingContentCommitRef.current);
          }

          pendingContentCommitRef.current = window.setTimeout(() => {
            pendingContentCommitRef.current = null;
            commitNote({ content: nextContent });
          }, CONTENT_COMMIT_DEBOUNCE_MS);
        },
        [commitNote],
      );

      const scheduleCommentsCommit = useCallback(
        (nextComments: NewLexCommentThread[]) => {
          if (pendingCommentsCommitRef.current !== null) {
            window.clearTimeout(pendingCommentsCommitRef.current);
          }

          pendingCommentsCommitRef.current = window.setTimeout(() => {
            pendingCommentsCommitRef.current = null;
            commitNote({ comments: nextComments });
          }, COMMENTS_COMMIT_DEBOUNCE_MS);
        },
        [commitNote],
      );

      const flushPendingCommentsCommit = useCallback(() => {
        if (pendingCommentsCommitRef.current === null) return;

        window.clearTimeout(pendingCommentsCommitRef.current);
        pendingCommentsCommitRef.current = null;
        commitNote({ comments: commentsRef.current });
      }, [commitNote]);

      const persistComments = useCallback(
        (nextComments: NewLexCommentThread[]) => {
          commentsRef.current = nextComments;
          setComments(nextComments);
          scheduleCommentsCommit(nextComments);
        },
        [scheduleCommentsCommit],
      );

      const setCommentsPanelOpen = useCallback(
        (open: boolean) => {
          setIsCommentsPanelOpen(open);
          commitNote({ commentsPanelOpen: open });
        },
        [commitNote],
      );

      useEffect(() => {
        const incoming = normalizeIncomingContent(element.customData?.content);
        if (incoming === content || isFocused) return;
        liveContentRef.current = incoming;
        setContent(incoming);
      }, [content, element.customData?.content, isFocused]);

      useEffect(() => {
        const incoming = normalizeIncomingComments(element.customData?.comments);
        const current = commentsRef.current;

        if (JSON.stringify(incoming) !== JSON.stringify(current)) {
          commentsRef.current = incoming;
          setComments(incoming);
        }
      }, [element.customData?.comments]);

      useEffect(() => {
        const incomingOpen = element.customData?.commentsPanelOpen ?? false;
        setIsCommentsPanelOpen(incomingOpen);
      }, [element.customData?.commentsPanelOpen]);

      useEffect(
        () => () => {
          if (pendingContentCommitRef.current !== null) {
            window.clearTimeout(pendingContentCommitRef.current);
          }
          flushPendingCommentsCommit();
        },
        [flushPendingCommentsCommit],
      );

      useEffect(() => {
        try {
          window.localStorage.setItem(USER_NAME_PREF_KEY, currentUser.trim() || 'You');
        } catch {
          // noop
        }
      }, [currentUser]);

      const isSelected = appState.selectedElementIds?.[element.id] === true;
      const { visible: zoomHintVisible } = useZoomHint(containerRef, isSelected);

      const borderRadius = getExcalidrawCornerRadius(
        element.width,
        element.height,
        element.roundness,
      );

      const zoom = appState.zoom.value;
      const screenCenterX =
        (element.x + element.width / 2 + appState.scrollX) * zoom;
      const screenCenterY =
        (element.y + element.height / 2 + appState.scrollY) * zoom;

      const containerStyle: React.CSSProperties = {
        position: 'absolute',
        top: `${screenCenterY - element.height / 2}px`,
        left: `${screenCenterX - element.width / 2}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: `scale(${zoom}) rotate(${element.angle || 0}rad)`,
        transformOrigin: 'center center',
        pointerEvents: 'none',
        zIndex: getOverlayZIndex(isSelected, false, stackIndex),
      };

      const clipWrapperStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: `${borderRadius}px`,
        boxSizing: 'border-box',
        ...getExcalidrawSurfaceStyle({
          backgroundColor: element.backgroundColor,
          strokeColor: element.strokeColor,
          strokeWidth: element.strokeWidth,
          strokeStyle: element.strokeStyle,
          fillStyle: element.fillStyle,
          opacity: element.opacity,
        }),
      };

      const contentStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        pointerEvents: isSelected ? 'auto' : 'none',
        userSelect: isSelected ? 'auto' : 'none',
        WebkitUserSelect: isSelected ? 'auto' : 'none',
        cursor: isSelected ? 'text' : 'default',
        boxShadow: isSelected ? '0 0 0 2px #0ea5e9' : 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      };

      const refreshCommentMarkClasses = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const marks = editor.querySelectorAll<HTMLElement>('.newlex-comment[data-comment-id]');
        const activeSet = new Set(activeCommentIds);

        marks.forEach((node) => {
          const id = node.getAttribute('data-comment-id');
          if (!id) return;

          const isSelectedThread = selectedCommentId === id;
          const isActive = activeSet.has(id);

          node.classList.toggle('newlex-comment-active', isSelectedThread || isActive);
          node.classList.toggle('newlex-comment-selected', isSelectedThread);
        });
      }, [activeCommentIds, selectedCommentId]);

      const refreshFromEditor = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const next = editor.innerHTML;
        liveContentRef.current = next;
        scheduleContentCommit(next);
        refreshCommentMarkClasses();
      }, [refreshCommentMarkClasses, scheduleContentCommit]);

      const runNativeCommand = useCallback(
        (command: string, value?: string) => {
          const editor = editorRef.current;
          if (!editor) return;

          editor.focus();
          document.execCommand(command, false, value);
          refreshFromEditor();
        },
        [refreshFromEditor],
      );

      const transformSelection = useCallback(
        (transform: (text: string) => string) => {
          const editor = editorRef.current;
          if (!editor) return;

          const range = getSelectionRangeInEditor(editor);
          if (!range || range.collapsed) return;

          const selected = range.toString();
          if (!selected) return;

          const replacement = transform(selected);
          range.deleteContents();

          const node = document.createTextNode(replacement);
          range.insertNode(node);

          const selection = window.getSelection();
          if (selection) {
            const nextRange = document.createRange();
            nextRange.setStart(node, 0);
            nextRange.setEnd(node, replacement.length);
            selection.removeAllRanges();
            selection.addRange(nextRange);
          }

          refreshFromEditor();
        },
        [refreshFromEditor],
      );

      const insertCode = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const range = getSelectionRangeInEditor(editor);
        if (!range || range.collapsed) return;

        runNativeCommand('insertHTML', `<code>${escapeHtml(range.toString())}</code>`);
      }, [runNativeCommand]);

      const insertLink = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const url = window.prompt('Enter link URL', 'https://');
        if (!url) return;

        const sanitizedUrl = url.trim();
        if (!sanitizedUrl) return;

        const range = getSelectionRangeInEditor(editor);
        if (!range || range.collapsed) {
          runNativeCommand(
            'insertHTML',
            `<a href="${escapeHtml(
              sanitizedUrl,
            )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
              sanitizedUrl,
            )}</a>`,
          );
          return;
        }

        runNativeCommand('createLink', sanitizedUrl);
      }, [runNativeCommand]);

      const indentSelection = useCallback(
        (outdent: boolean) => {
          const editor = editorRef.current;
          if (!editor) return;

          const range = getSelectionRangeInEditor(editor);
          if (!range) return;

          if (outdent && range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = range.startContainer as Text;
            const raw = textNode.data;
            const offset = range.startOffset;
            const before = raw.slice(0, offset);
            const match = before.match(/(?:\u00A0| |\t){1,4}$/);

            if (match) {
              const removeLength = match[0].length;
              textNode.data = `${raw.slice(0, offset - removeLength)}${raw.slice(offset)}`;
              const selection = window.getSelection();
              if (selection) {
                const nextRange = document.createRange();
                nextRange.setStart(textNode, Math.max(0, offset - removeLength));
                nextRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(nextRange);
              }
              refreshFromEditor();
            }
            return;
          }

          const indentText = '\u00A0\u00A0\u00A0\u00A0';
          range.deleteContents();
          const node = document.createTextNode(indentText);
          range.insertNode(node);

          const selection = window.getSelection();
          if (selection) {
            const nextRange = document.createRange();
            nextRange.setStart(node, indentText.length);
            nextRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(nextRange);
          }

          refreshFromEditor();
        },
        [refreshFromEditor],
      );

      const getCommentIdsForRange = useCallback((range: Range): string[] => {
        const editor = editorRef.current;
        if (!editor) return [];

        const ids = new Set<string>();
        const marks = editor.querySelectorAll<HTMLElement>('.newlex-comment[data-comment-id]');

        marks.forEach((mark) => {
          if (!range.intersectsNode(mark)) return;
          const id = mark.getAttribute('data-comment-id');
          if (id) ids.add(id);
        });

        if (ids.size === 0 && range.collapsed) {
          const start = range.startContainer;
          const base =
            start instanceof HTMLElement
              ? start
              : (start.parentElement as HTMLElement | null);

          const mark = base?.closest('.newlex-comment[data-comment-id]') as HTMLElement | null;
          const id = mark?.getAttribute('data-comment-id');
          if (id) ids.add(id);
        }

        return Array.from(ids);
      }, []);

      const updateSelectionOverlay = useCallback(() => {
        const editor = editorRef.current;
        if (!editor || !isSelected || !isFocused) {
          setHasSelection(false);
          setToolbarPoint(null);
          setAddCommentPoint(null);
          setActiveCommentIds([]);
          setTableActionPoint(null);
          setTableSelectionMeta(null);
          setIsTableActionMenuOpen(false);
          return;
        }

        const range = getSelectionRangeInEditor(editor);
        if (!range) {
          setHasSelection(false);
          setToolbarPoint(null);
          setAddCommentPoint(null);
          setActiveCommentIds([]);
          setTableActionPoint(null);
          setTableSelectionMeta(null);
          setIsTableActionMenuOpen(false);
          return;
        }

        const tableContext = getSelectionTableContext(editor);
        if (tableContext) {
          const { table, rowIndex, columnIndex, rowCount, columnCount } = tableContext;
          const tableId = ensureTableIdentity(table);
          const cellRect = tableContext.cell.getBoundingClientRect();

          setTableActionPoint({
            left: cellRect.right - 8,
            top: cellRect.top + 6,
          });

          const row = table.rows.item(rowIndex);
          const hasRowHeader = Array.from(row?.cells || []).every(
            (cell) => cell.tagName === 'TH',
          );
          const hasColumnHeader = Array.from(table.rows).every((tableRow) => {
            const cell = tableRow.cells.item(columnIndex);
            return cell ? cell.tagName === 'TH' : false;
          });

          setTableSelectionMeta({
            tableId,
            rowIndex,
            columnIndex,
            rowCount,
            columnCount,
            hasRowHeader,
            hasColumnHeader,
            rowStriping: table.hasAttribute('data-newlex-row-striping'),
            firstRowFrozen: table.hasAttribute('data-newlex-freeze-first-row'),
            firstColumnFrozen: table.hasAttribute('data-newlex-freeze-first-column'),
          });
        } else {
          setTableActionPoint(null);
          setTableSelectionMeta(null);
          setIsTableActionMenuOpen(false);
        }

        const activeIds = getCommentIdsForRange(range);
        setActiveCommentIds((prev) => (arraysEqual(prev, activeIds) ? prev : activeIds));

        if (!showCommentInput && activeIds.length > 0 && !isCommentsPanelOpen) {
          setCommentsPanelOpen(true);
        }

        const point = getSelectionAnchorInEditor(editor);
        if (!point || range.collapsed) {
          setHasSelection(false);
          setToolbarPoint(null);
          setAddCommentPoint(null);
          return;
        }

        setHasSelection(true);
        setToolbarPoint(point);

        const rootRect = editor.getBoundingClientRect();
        setAddCommentPoint({
          left: rootRect.right - 20,
          top: point.top - 26,
        });
      }, [
        getCommentIdsForRange,
        isCommentsPanelOpen,
        isFocused,
        isSelected,
        setCommentsPanelOpen,
        showCommentInput,
      ]);

      const runTableMutation = useCallback(
        (
          mutate: (
            context: TableSelectionContext,
            editor: HTMLElement,
          ) => HTMLTableCellElement | HTMLElement | null | void,
          options?: { closeMenu?: boolean },
        ) => {
          const editor = editorRef.current;
          if (!editor) return;

          const context = getSelectionTableContext(editor);
          if (!context) return;

          const focusTarget = mutate(context, editor);

          if (focusTarget instanceof HTMLTableCellElement) {
            setCaretInCell(editor, focusTarget);
          } else if (focusTarget instanceof HTMLElement) {
            setCaretAtNodeStart(editor, focusTarget);
          }

          refreshFromEditor();
          window.requestAnimationFrame(updateSelectionOverlay);

          if (options?.closeMenu !== false) {
            setIsTableActionMenuOpen(false);
          }
        },
        [refreshFromEditor, updateSelectionOverlay],
      );

      const moveTableSelection = useCallback(
        (backwards: boolean): boolean => {
          const editor = editorRef.current;
          if (!editor) return false;

          const context = getSelectionTableContext(editor);
          if (!context) return false;

          const rows = Array.from(context.table.rows);
          const nextRowIndex = context.rowIndex;
          const nextColIndex = context.columnIndex;
          let targetCell: HTMLTableCellElement | null = null;
          let shouldRefresh = false;

          if (backwards) {
            if (nextColIndex > 0) {
              targetCell = getCellAt(context.table, nextRowIndex, nextColIndex - 1);
            } else if (nextRowIndex > 0) {
              const previousRow = context.table.rows.item(nextRowIndex - 1);
              if (previousRow) {
                targetCell = getCellAt(
                  context.table,
                  nextRowIndex - 1,
                  Math.max(0, previousRow.cells.length - 1),
                );
              }
            }
          } else {
            const currentRow = rows[nextRowIndex];
            if (currentRow && nextColIndex < currentRow.cells.length - 1) {
              targetCell = getCellAt(context.table, nextRowIndex, nextColIndex + 1);
            } else if (nextRowIndex < rows.length - 1) {
              targetCell = getCellAt(context.table, nextRowIndex + 1, 0);
            } else {
              const insertedRow = insertTableRow(context.table, nextRowIndex, true);
              targetCell = getCellAt(
                context.table,
                Array.from(context.table.rows).indexOf(insertedRow),
                0,
              );
              shouldRefresh = true;
            }
          }

          if (!targetCell) {
            return true;
          }

          setCaretInCell(editor, targetCell);

          if (shouldRefresh) {
            refreshFromEditor();
          }

          window.requestAnimationFrame(updateSelectionOverlay);
          return true;
        },
        [refreshFromEditor, updateSelectionOverlay],
      );

      const insertTableFromDialog = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const rows = Number.parseInt(tableRowsDraft, 10);
        const columns = Number.parseInt(tableColumnsDraft, 10);
        const valid =
          Number.isFinite(rows) &&
          Number.isFinite(columns) &&
          rows >= 1 &&
          rows <= TABLE_MAX_ROWS &&
          columns >= 1 &&
          columns <= TABLE_MAX_COLUMNS;

        if (!valid) return;

        const table = createTableElement(rows, columns, tableIncludeHeaders);
        const trailingParagraph = createEmptyParagraph();
        const range = getSelectionRangeInEditor(editor);
        const nestedCell = getClosestTableCell(range?.commonAncestorContainer || null);

        editor.focus();

        if (nestedCell) {
          const hostTable = nestedCell.closest('table');
          if (hostTable?.parentNode) {
            hostTable.parentNode.insertBefore(table, hostTable.nextSibling);
            table.parentNode?.insertBefore(trailingParagraph, table.nextSibling);
          }
        } else if (range) {
          range.deleteContents();
          range.insertNode(table);
          table.parentNode?.insertBefore(trailingParagraph, table.nextSibling);
        } else {
          editor.appendChild(table);
          editor.appendChild(trailingParagraph);
        }

        const firstCell = getCellAt(table, 0, 0);
        if (firstCell) {
          setCaretInCell(editor, firstCell);
        }

        setIsInsertTableDialogOpen(false);
        refreshFromEditor();
        window.requestAnimationFrame(updateSelectionOverlay);
      }, [
        refreshFromEditor,
        tableColumnsDraft,
        tableIncludeHeaders,
        tableRowsDraft,
        updateSelectionOverlay,
      ]);

      const openInsertTableDialog = useCallback(() => {
        setTableRowsDraft(String(DEFAULT_TABLE_ROWS));
        setTableColumnsDraft(String(DEFAULT_TABLE_COLUMNS));
        setTableIncludeHeaders(true);
        setIsInsertTableDialogOpen(true);
        setIsTableActionMenuOpen(false);
      }, []);

      const canInsertTable = useMemo(() => {
        const rows = Number.parseInt(tableRowsDraft, 10);
        const columns = Number.parseInt(tableColumnsDraft, 10);
        return (
          Number.isFinite(rows) &&
          Number.isFinite(columns) &&
          rows >= 1 &&
          rows <= TABLE_MAX_ROWS &&
          columns >= 1 &&
          columns <= TABLE_MAX_COLUMNS
        );
      }, [tableColumnsDraft, tableRowsDraft]);

      const insertTableRowAtSelection = useCallback(
        (insertAfter: boolean) => {
          runTableMutation((context) => {
            const row = insertTableRow(context.table, context.rowIndex, insertAfter);
            const nextRowIndex = Array.from(context.table.rows).indexOf(row);
            return getCellAt(context.table, nextRowIndex, context.columnIndex);
          });
        },
        [runTableMutation],
      );

      const insertTableColumnAtSelection = useCallback(
        (insertAfter: boolean) => {
          runTableMutation((context) => {
            insertTableColumn(context.table, context.columnIndex, insertAfter);
            const targetColumn = insertAfter
              ? context.columnIndex + 1
              : context.columnIndex;
            return getCellAt(context.table, context.rowIndex, targetColumn);
          });
        },
        [runTableMutation],
      );

      const deleteTableRowAtSelection = useCallback(() => {
        runTableMutation((context) => {
          if (context.table.rows.length <= 1) {
            return removeTableAndInsertParagraph(context.table);
          }

          context.table.deleteRow(context.rowIndex);
          const nextRowIndex = Math.max(
            0,
            Math.min(context.rowIndex, context.table.rows.length - 1),
          );
          return getCellAt(context.table, nextRowIndex, context.columnIndex);
        });
      }, [runTableMutation]);

      const deleteTableColumnAtSelection = useCallback(() => {
        runTableMutation((context) => {
          if (context.columnCount <= 1) {
            return removeTableAndInsertParagraph(context.table);
          }

          Array.from(context.table.rows).forEach((row) => {
            if (context.columnIndex < row.cells.length) {
              row.deleteCell(context.columnIndex);
            }
          });

          const nextColumnIndex = Math.max(0, context.columnIndex - 1);
          return getCellAt(context.table, context.rowIndex, nextColumnIndex);
        });
      }, [runTableMutation]);

      const deleteTableAtSelection = useCallback(() => {
        runTableMutation((context) => removeTableAndInsertParagraph(context.table));
      }, [runTableMutation]);

      const toggleRowHeaderAtSelection = useCallback(() => {
        runTableMutation((context) =>
          toggleRowHeader(context.table, context.rowIndex, context.columnIndex),
        );
      }, [runTableMutation]);

      const toggleColumnHeaderAtSelection = useCallback(() => {
        runTableMutation((context) =>
          toggleColumnHeader(context.table, context.columnIndex, context.rowIndex),
        );
      }, [runTableMutation]);

      const toggleRowStripingAtSelection = useCallback(() => {
        runTableMutation((context) => {
          toggleTableFlag(context.table, 'data-newlex-row-striping');
          return context.cell;
        });
      }, [runTableMutation]);

      const toggleFreezeFirstRowAtSelection = useCallback(() => {
        runTableMutation((context) => {
          toggleTableFlag(context.table, 'data-newlex-freeze-first-row');
          return context.cell;
        });
      }, [runTableMutation]);

      const toggleFreezeFirstColumnAtSelection = useCallback(() => {
        runTableMutation((context) => {
          toggleTableFlag(context.table, 'data-newlex-freeze-first-column');
          return context.cell;
        });
      }, [runTableMutation]);

      const setActiveCellBackground = useCallback(
        (color: string) => {
          runTableMutation(
            (context) => {
              context.cell.style.backgroundColor = color;
              return context.cell;
            },
            { closeMenu: false },
          );
        },
        [runTableMutation],
      );

      const setActiveCellVerticalAlign = useCallback(
        (value: 'top' | 'middle' | 'bottom') => {
          runTableMutation((context) => {
            context.cell.style.verticalAlign = value;
            return context.cell;
          });
        },
        [runTableMutation],
      );

      const focusThreadAnchor = useCallback(
        (threadId: string) => {
          const editor = editorRef.current;
          if (!editor) return;

          const mark = editor.querySelector<HTMLElement>(
            `.newlex-comment[data-comment-id="${threadId}"]`,
          );

          if (!mark) return;

          const range = document.createRange();
          range.selectNodeContents(mark);

          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }

          mark.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
          editor.focus();
          window.requestAnimationFrame(updateSelectionOverlay);
        },
        [updateSelectionOverlay],
      );

      const clearCommentInputState = useCallback(() => {
        setShowCommentInput(false);
        setCommentDraft('');
        setCommentInputPoint(null);
        setSelectionRects([]);
        pendingSelectionRef.current = null;
        pendingQuoteRef.current = '';
      }, []);

      const openCommentInputFromSelection = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const range = getSelectionRangeInEditor(editor);
        if (!range || range.collapsed) return;

        const cloned = range.cloneRange();
        pendingSelectionRef.current = cloned;

        let quote = cloned.toString().trim();
        if (quote.length > 100) {
          quote = `${quote.slice(0, 99)}…`;
        }

        pendingQuoteRef.current = quote;

        const rect = cloned.getBoundingClientRect();
        let correctedLeft = rect.left + rect.width / 2 - COMMENT_INPUT_WIDTH / 2;

        if (correctedLeft < 10) {
          correctedLeft = 10;
        }

        const maxLeft = window.innerWidth - COMMENT_INPUT_WIDTH - 10;
        if (correctedLeft > maxLeft) {
          correctedLeft = maxLeft;
        }

        const top = rect.bottom + 20 + (window.pageYOffset || document.documentElement.scrollTop);

        setCommentInputPoint({ left: correctedLeft, top });
        setSelectionRects(createRectListFromRange(cloned));
        setCommentDraft('');
        setShowCommentInput(true);
      }, []);

      const submitInlineComment = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const contentText = commentDraft.trim();
        if (!contentText) return;

        const savedRange = pendingSelectionRef.current;
        if (!savedRange) return;

        const selectedText = savedRange.toString().trim();
        if (!selectedText) {
          clearCommentInputState();
          return;
        }

        const threadId = createId('c');

        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }

        runNativeCommand(
          'insertHTML',
          `<span class="newlex-comment" data-comment-id="${escapeHtml(
            threadId,
          )}">${escapeHtml(selectedText)}</span>`,
        );

        const author = currentUser.trim() || 'You';

        const thread: NewLexCommentThread = {
          id: threadId,
          author,
          comment: contentText,
          commentDeleted: false,
          anchorText: pendingQuoteRef.current || selectedText,
          createdAt: Date.now(),
          resolved: false,
          collapsed: false,
          replies: [],
        };

        persistComments([...commentsRef.current, thread]);
        setSelectedCommentId(threadId);
        setCommentsPanelOpen(true);

        clearCommentInputState();
        window.requestAnimationFrame(updateSelectionOverlay);
      }, [
        clearCommentInputState,
        commentDraft,
        currentUser,
        persistComments,
        runNativeCommand,
        setCommentsPanelOpen,
        updateSelectionOverlay,
      ]);

      const updateThread = useCallback(
        (
          threadId: string,
          updater: (thread: NewLexCommentThread) => NewLexCommentThread,
        ) => {
          const next = commentsRef.current.map((thread) =>
            thread.id === threadId ? updater(thread) : thread,
          );
          persistComments(next);
        },
        [persistComments],
      );

      const deleteThread = useCallback(
        (threadId: string) => {
          const editor = editorRef.current;

          if (editor) {
            const marks = editor.querySelectorAll<HTMLElement>('.newlex-comment[data-comment-id]');
            marks.forEach((node) => {
              if (node.getAttribute('data-comment-id') !== threadId) return;

              const parent = node.parentNode;
              if (!parent) return;

              while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
              }
              parent.removeChild(node);
              parent.normalize();
            });

            refreshFromEditor();
          }

          const next = commentsRef.current.filter((thread) => thread.id !== threadId);
          persistComments(next);

          setReplyDraftByThread((current) => {
            const clone = { ...current };
            delete clone[threadId];
            return clone;
          });

          if (selectedCommentId === threadId) {
            setSelectedCommentId(null);
          }
        },
        [persistComments, refreshFromEditor, selectedCommentId],
      );

      const deleteComment = useCallback(
        (threadId: string, commentId?: string) => {
          if (!commentId) {
            updateThread(threadId, (thread) => ({
              ...thread,
              comment: '[Deleted Comment]',
              commentDeleted: true,
            }));
            return;
          }

          updateThread(threadId, (thread) => ({
            ...thread,
            replies: thread.replies.map((reply) =>
              reply.id === commentId
                ? {
                    ...reply,
                    message: '[Deleted Comment]',
                    deleted: true,
                  }
                : reply,
            ),
          }));
        },
        [updateThread],
      );

      const addReply = useCallback(
        (threadId: string) => {
          const draft = (replyDraftByThread[threadId] || '').trim();
          if (!draft) return;

          const reply: NewLexCommentReply = {
            id: createId('r'),
            author: currentUser.trim() || 'You',
            message: draft,
            createdAt: Date.now(),
            deleted: false,
          };

          updateThread(threadId, (thread) => ({
            ...thread,
            replies: [...thread.replies, reply],
          }));

          setReplyDraftByThread((current) => ({ ...current, [threadId]: '' }));
        },
        [currentUser, replyDraftByThread, updateThread],
      );

      const orderedComments = useMemo(
        () => [...comments].sort((a, b) => b.createdAt - a.createdAt),
        [comments],
      );

      const toggleRibbon = useCallback(() => {
        setIsRibbonVisible((current) => {
          const next = !current;

          try {
            window.localStorage.setItem(RIBBON_PREF_KEY, next ? '1' : '0');
          } catch {
            // noop
          }

          return next;
        });
      }, []);

      const handleInput = useCallback(() => {
        refreshFromEditor();
        window.requestAnimationFrame(updateSelectionOverlay);
      }, [refreshFromEditor, updateSelectionOverlay]);

      const handleFocus = useCallback(() => {
        setIsFocused(true);
        window.requestAnimationFrame(updateSelectionOverlay);
      }, [updateSelectionOverlay]);

      const handleBlur = useCallback(() => {
        setIsFocused(false);
        setHasSelection(false);
        setToolbarPoint(null);
        setAddCommentPoint(null);
        setTableActionPoint(null);
        setIsTableActionMenuOpen(false);

        if (pendingContentCommitRef.current !== null) {
          window.clearTimeout(pendingContentCommitRef.current);
          pendingContentCommitRef.current = null;
        }

        commitNote({ content: editorRef.current?.innerHTML || liveContentRef.current });
        flushPendingCommentsCommit();
      }, [commitNote, flushPendingCommentsCommit]);

      const handleSelectLikeEvent = useCallback(() => {
        window.requestAnimationFrame(updateSelectionOverlay);
      }, [updateSelectionOverlay]);

      const handleEditorClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
          const target = event.target as HTMLElement;
          const commentNode = target.closest('.newlex-comment[data-comment-id]');

          if (!commentNode) return;

          const threadId = (commentNode as HTMLElement).getAttribute('data-comment-id');
          if (!threadId) return;

          setSelectedCommentId(threadId);
          setCommentsPanelOpen(true);
        },
        [setCommentsPanelOpen],
      );

      const handleEditorContextMenu = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
          const editor = editorRef.current;
          if (!editor) return;

          const cell = getClosestTableCell(event.target as Node);
          if (!cell || !editor.contains(cell)) return;

          event.preventDefault();
          setCaretInCell(editor, cell);

          const rect = cell.getBoundingClientRect();
          setTableActionPoint({
            left: rect.right - 8,
            top: rect.top + 6,
          });
          setIsTableActionMenuOpen(true);
          window.requestAnimationFrame(updateSelectionOverlay);
        },
        [updateSelectionOverlay],
      );

      const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Escape') {
            if (isInsertTableDialogOpen) {
              event.preventDefault();
              setIsInsertTableDialogOpen(false);
              return;
            }

            if (isTableActionMenuOpen) {
              event.preventDefault();
              setIsTableActionMenuOpen(false);
              return;
            }

            if (showCommentInput) {
              event.preventDefault();
              clearCommentInputState();
              return;
            }

            event.preventDefault();
            onDeselect?.();
            return;
          }

          if (
            (event.metaKey || event.ctrlKey) &&
            event.shiftKey &&
            event.key.toLowerCase() === 't'
          ) {
            event.preventDefault();
            openInsertTableDialog();
            return;
          }

          if (event.key === 'Enter') {
            const editor = editorRef.current;
            if (editor && getSelectionTableContext(editor)) {
              event.preventDefault();
              document.execCommand('insertLineBreak');
              refreshFromEditor();
              window.requestAnimationFrame(updateSelectionOverlay);
              return;
            }
          }

          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            insertLink();
            return;
          }

          if (event.key === 'Tab') {
            event.preventDefault();
            if (moveTableSelection(event.shiftKey)) {
              return;
            }
            indentSelection(event.shiftKey);
            return;
          }

          if (
            (event.metaKey || event.ctrlKey) &&
            event.shiftKey &&
            event.key.toLowerCase() === 'm'
          ) {
            event.preventDefault();
            setCommentsPanelOpen(!isCommentsPanelOpen);
            return;
          }

          if (
            (event.metaKey || event.ctrlKey) &&
            event.shiftKey &&
            event.key.toLowerCase() === 'c'
          ) {
            event.preventDefault();
            openCommentInputFromSelection();
          }
        },
        [
          clearCommentInputState,
          indentSelection,
          insertLink,
          isCommentsPanelOpen,
          isInsertTableDialogOpen,
          isTableActionMenuOpen,
          moveTableSelection,
          onDeselect,
          openInsertTableDialog,
          openCommentInputFromSelection,
          refreshFromEditor,
          setCommentsPanelOpen,
          showCommentInput,
          updateSelectionOverlay,
        ],
      );

      useEffect(() => {
        refreshCommentMarkClasses();
      }, [activeCommentIds, content, refreshCommentMarkClasses, selectedCommentId]);

      useEffect(() => {
        const nextKey = tableSelectionMeta
          ? `${tableSelectionMeta.tableId}:${tableSelectionMeta.rowIndex}:${tableSelectionMeta.columnIndex}`
          : null;
        const previousKey = previousTableSelectionKeyRef.current;

        if (previousKey && previousKey !== nextKey) {
          setIsTableActionMenuOpen(false);
        }

        if (!nextKey) {
          setIsTableActionMenuOpen(false);
        }

        previousTableSelectionKeyRef.current = nextKey;
      }, [tableSelectionMeta]);

      useEffect(() => {
        if (!isTableActionMenuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
          const target = event.target as Node | null;
          if (!target) return;

          if (tableActionMenuRef.current?.contains(target)) return;
          if (tableActionButtonRef.current?.contains(target)) return;

          setIsTableActionMenuOpen(false);
        };

        window.addEventListener('mousedown', handlePointerDown, true);
        return () => window.removeEventListener('mousedown', handlePointerDown, true);
      }, [isTableActionMenuOpen]);

      useEffect(() => {
        if (!isSelected) {
          setIsFocused(false);
          setHasSelection(false);
          setToolbarPoint(null);
          setAddCommentPoint(null);
          setActiveCommentIds([]);
          setTableSelectionMeta(null);
          setTableActionPoint(null);
          setIsInsertTableDialogOpen(false);
          setIsTableActionMenuOpen(false);
          clearCommentInputState();
        }
      }, [clearCommentInputState, isSelected]);

      useEffect(() => {
        if (!selectedCommentId) return;
        if (comments.some((thread) => thread.id === selectedCommentId)) return;
        setSelectedCommentId(null);
      }, [comments, selectedCommentId]);

      useEffect(() => {
        const handleHighlight = (event: Event) => {
          const payload = (
            event as CustomEvent<{
              elementId: string;
              query: string;
              matchIndex?: number;
            }>
          ).detail;

          if (payload.elementId !== element.id || !payload.query.trim()) return;

          const editor = editorRef.current;
          if (!editor) return;

          const matchFound = selectNthTextMatch(
            editor,
            payload.query,
            payload.matchIndex ?? 0,
          );

          if (!matchFound) return;

          editor.focus();
          window.requestAnimationFrame(updateSelectionOverlay);
        };

        window.addEventListener('canvas:note-search-highlight', handleHighlight);
        return () =>
          window.removeEventListener('canvas:note-search-highlight', handleHighlight);
      }, [element.id, updateSelectionOverlay]);

      useEffect(() => {
        if (!isSelected || !isFocused) return;

        const onSelectionChange = () => updateSelectionOverlay();
        const onViewportChange = () => updateSelectionOverlay();

        document.addEventListener('selectionchange', onSelectionChange);
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('scroll', onViewportChange, true);

        return () => {
          document.removeEventListener('selectionchange', onSelectionChange);
          window.removeEventListener('resize', onViewportChange);
          window.removeEventListener('scroll', onViewportChange, true);
        };
      }, [isFocused, isSelected, updateSelectionOverlay]);

      const updateTransform = useCallback(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          angle: number,
          zoomValue: number,
          scrollX: number,
          scrollY: number,
        ) => {
          const node = containerRef.current;
          if (!node) return;

          const centerX = (x + width / 2 + scrollX) * zoomValue;
          const centerY = (y + height / 2 + scrollY) * zoomValue;

          node.style.top = `${centerY - height / 2}px`;
          node.style.left = `${centerX - width / 2}px`;
          node.style.width = `${width}px`;
          node.style.height = `${height}px`;
          node.style.transform = `scale(${zoomValue}) rotate(${angle}rad)`;
        },
        [],
      );

      useImperativeHandle(
        ref,
        () => ({
          updateTransform,
        }),
        [updateTransform],
      );

      const toolbarActions = useMemo(
        () => [
          { label: 'B', title: 'Bold', onClick: () => runNativeCommand('bold') },
          { label: 'I', title: 'Italic', onClick: () => runNativeCommand('italic') },
          { label: 'U', title: 'Underline', onClick: () => runNativeCommand('underline') },
          {
            label: 'S',
            title: 'Strikethrough',
            onClick: () => runNativeCommand('strikeThrough'),
          },
          { label: 'x2', title: 'Subscript', onClick: () => runNativeCommand('subscript') },
          {
            label: 'x^2',
            title: 'Superscript',
            onClick: () => runNativeCommand('superscript'),
          },
          {
            label: 'ABC',
            title: 'Uppercase',
            onClick: () => transformSelection((text) => text.toUpperCase()),
          },
          {
            label: 'abc',
            title: 'Lowercase',
            onClick: () => transformSelection((text) => text.toLowerCase()),
          },
          {
            label: 'Tt',
            title: 'Capitalize',
            onClick: () =>
              transformSelection((text) => text.replace(/\b\w/g, (char) => char.toUpperCase())),
          },
          { label: 'table', title: 'Insert table', onClick: openInsertTableDialog },
          { label: '<>', title: 'Code', onClick: insertCode },
          { label: 'link', title: 'Insert link', onClick: insertLink },
          { label: 'comment', title: 'Comment thread', onClick: openCommentInputFromSelection },
        ],
        [
          insertCode,
          insertLink,
          openCommentInputFromSelection,
          openInsertTableDialog,
          runNativeCommand,
          transformSelection,
        ],
      );

      return (
        <div
          ref={containerRef}
          style={containerStyle}
          className="newlex-note-container"
          data-newlex-id={element.id}
        >
          <div style={clipWrapperStyle}>
            <div style={contentStyle}>
              {isSelected && isRibbonVisible && (
                <div
                  style={{
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 10px',
                    borderBottom: '1px solid rgba(15,23,42,0.08)',
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {toolbarActions.map((action) => (
                    <button
                      key={`ribbon-${action.label}`}
                      type="button"
                      title={action.title}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={action.onClick}
                      style={{
                        border: '1px solid transparent',
                        background: 'transparent',
                        color: '#475569',
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '5px 7px',
                        borderRadius: 7,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleSelectLikeEvent}
                    onMouseUp={handleSelectLikeEvent}
                    onClick={handleEditorClick}
                    onContextMenu={handleEditorContextMenu}
                    onScroll={handleSelectLikeEvent}
                    data-newlex-editor=""
                    style={{
                      width: '100%',
                      minHeight: '100%',
                      height: '100%',
                      overflow: 'auto',
                      border: 'none',
                      outline: 'none',
                      margin: 0,
                      padding: '14px 16px',
                      background: 'transparent',
                      color: '#111827',
                      fontSize: 15,
                      lineHeight: 1.6,
                      fontFamily: '"IBM Plex Sans", "SF Pro Text", "Segoe UI", sans-serif',
                    }}
                    dangerouslySetInnerHTML={{ __html: content }}
                  />

                  {isSelected && (
                    <>
                      <button
                        type="button"
                        className={`CommentPlugin_ShowCommentsButton ${
                          isCommentsPanelOpen ? 'active' : ''
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setCommentsPanelOpen(!isCommentsPanelOpen)}
                        title={isCommentsPanelOpen ? 'Hide Comments' : 'Show Comments'}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 102,
                          zIndex: 6,
                        }}
                      >
                        <CommentIcon />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={toggleRibbon}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: 10,
                          border: '1px solid rgba(15,23,42,0.16)',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.95)',
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          zIndex: 6,
                        }}
                      >
                        {isRibbonVisible ? 'Hide Ribbon' : 'Show Ribbon'}
                      </button>
                    </>
                  )}
                </div>

                {isCommentsPanelOpen && (
                  <aside className="CommentPlugin_CommentsPanel" style={{ position: 'relative', width: 320, height: '100%', top: 0 }}>
                    <h2 className="CommentPlugin_CommentsPanel_Heading">Comments</h2>
                    {orderedComments.length === 0 ? (
                      <div className="CommentPlugin_CommentsPanel_Empty">No Comments</div>
                    ) : (
                      <ul className="CommentPlugin_CommentsPanel_List">
                        {orderedComments.map((thread) => {
                          const isActiveThread =
                            selectedCommentId === thread.id || activeCommentIds.includes(thread.id);

                          return (
                            <li
                              key={thread.id}
                              onClick={() => {
                                setSelectedCommentId(thread.id);
                                focusThreadAnchor(thread.id);
                              }}
                              className={`CommentPlugin_CommentsPanel_List_Thread interactive ${
                                isActiveThread ? 'active' : ''
                              }`}
                            >
                              <div className="CommentPlugin_CommentsPanel_List_Thread_QuoteBox">
                                <blockquote className="CommentPlugin_CommentsPanel_List_Thread_Quote">
                                  {'> '}<span>{thread.anchorText || '(empty quote)'}</span>
                                </blockquote>
                                <button
                                  type="button"
                                  className="CommentPlugin_CommentsPanel_List_DeleteButton"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (!window.confirm('Delete this thread?')) return;
                                    deleteThread(thread.id);
                                  }}
                                >
                                  <DeleteIcon />
                                </button>
                              </div>

                              <ul className="CommentPlugin_CommentsPanel_List_Thread_Comments">
                                <li className="CommentPlugin_CommentsPanel_List_Comment">
                                  <div className="CommentPlugin_CommentsPanel_List_Details">
                                    <span className="CommentPlugin_CommentsPanel_List_Comment_Author">
                                      {thread.author}
                                    </span>
                                    <span className="CommentPlugin_CommentsPanel_List_Comment_Time">
                                      · {formatTimestamp(thread.createdAt)}
                                    </span>
                                  </div>
                                  <p
                                    className={
                                      thread.commentDeleted
                                        ? 'CommentPlugin_CommentsPanel_DeletedComment'
                                        : ''
                                    }
                                  >
                                    {thread.comment || '(empty comment)'}
                                  </p>
                                  {!thread.commentDeleted && (
                                    <button
                                      type="button"
                                      className="CommentPlugin_CommentsPanel_List_DeleteButton"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        deleteComment(thread.id);
                                      }}
                                    >
                                      <DeleteIcon />
                                    </button>
                                  )}
                                </li>

                                {thread.replies.map((reply) => (
                                  <li key={reply.id} className="CommentPlugin_CommentsPanel_List_Comment">
                                    <div className="CommentPlugin_CommentsPanel_List_Details">
                                      <span className="CommentPlugin_CommentsPanel_List_Comment_Author">
                                        {reply.author}
                                      </span>
                                      <span className="CommentPlugin_CommentsPanel_List_Comment_Time">
                                        · {formatTimestamp(reply.createdAt)}
                                      </span>
                                    </div>
                                    <p
                                      className={
                                        reply.deleted
                                          ? 'CommentPlugin_CommentsPanel_DeletedComment'
                                          : ''
                                      }
                                    >
                                      {reply.message}
                                    </p>
                                    {!reply.deleted && (
                                      <button
                                        type="button"
                                        className="CommentPlugin_CommentsPanel_List_DeleteButton"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          deleteComment(thread.id, reply.id);
                                        }}
                                      >
                                        <DeleteIcon />
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>

                              <div className="CommentPlugin_CommentsPanel_List_Thread_Editor">
                                <div className="CommentPlugin_CommentInputBox_EditorContainer">
                                  <input
                                    className="CommentPlugin_CommentsPanel_Editor"
                                    value={replyDraftByThread[thread.id] || ''}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) =>
                                      setReplyDraftByThread((current) => ({
                                        ...current,
                                        [thread.id]: event.target.value,
                                      }))
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key !== 'Enter' || event.shiftKey) return;
                                      event.preventDefault();
                                      addReply(thread.id);
                                    }}
                                    placeholder="Reply to comment..."
                                  />
                                  <button
                                    type="button"
                                    className="CommentPlugin_CommentsPanel_SendButton"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      addReply(thread.id);
                                    }}
                                  >
                                    <SendIcon />
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </aside>
                )}
              </div>
            </div>
          </div>

          {isSelected &&
            isFocused &&
            hasSelection &&
            !isRibbonVisible &&
            toolbarPoint &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                style={{
                  position: 'fixed',
                  left: toolbarPoint.left,
                  top: toolbarPoint.top,
                  transform: 'translate(-50%, calc(-100% - 10px))',
                  display: 'flex',
                  gap: '4px',
                  padding: '8px 10px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(17,24,39,0.1)',
                  boxShadow: '0 12px 24px rgba(15,23,42,0.18)',
                  zIndex: 4000,
                  pointerEvents: 'auto',
                  alignItems: 'center',
                }}
              >
                {toolbarActions.map((action) => (
                  <button
                    key={`floating-${action.label}`}
                    type="button"
                    title={action.title}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={action.onClick}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#4b5563',
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '5px 6px',
                      borderRadius: 7,
                      cursor: 'pointer',
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>,
              document.body,
            )}

          {isSelected &&
            isFocused &&
            tableActionPoint &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                className="newlex-table-action-anchor"
                style={{
                  left: tableActionPoint.left,
                  top: tableActionPoint.top,
                }}
              >
                <button
                  ref={tableActionButtonRef}
                  type="button"
                  className="newlex-table-action-button"
                  title="Table actions"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setIsTableActionMenuOpen((open) => !open)}
                >
                  <span aria-hidden>▾</span>
                </button>

                {isTableActionMenuOpen && tableSelectionMeta && (
                  <div ref={tableActionMenuRef} className="newlex-table-action-menu">
                    <div className="newlex-table-action-meta">
                      Cell {tableSelectionMeta.rowIndex + 1}:{tableSelectionMeta.columnIndex + 1}{' '}
                      in {tableSelectionMeta.rowCount}x{tableSelectionMeta.columnCount}
                    </div>
                    <div className="newlex-table-action-divider" />
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertTableRowAtSelection(false)}
                    >
                      Insert row above
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertTableRowAtSelection(true)}
                    >
                      Insert row below
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertTableColumnAtSelection(false)}
                    >
                      Insert column left
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertTableColumnAtSelection(true)}
                    >
                      Insert column right
                    </button>
                    <div className="newlex-table-action-divider" />
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={toggleRowHeaderAtSelection}
                    >
                      {tableSelectionMeta.hasRowHeader ? 'Remove row header' : 'Add row header'}
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={toggleColumnHeaderAtSelection}
                    >
                      {tableSelectionMeta.hasColumnHeader
                        ? 'Remove column header'
                        : 'Add column header'}
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={toggleRowStripingAtSelection}
                    >
                      {tableSelectionMeta.rowStriping
                        ? 'Disable row striping'
                        : 'Enable row striping'}
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={toggleFreezeFirstRowAtSelection}
                    >
                      {tableSelectionMeta.firstRowFrozen
                        ? 'Unfreeze first row'
                        : 'Freeze first row'}
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={toggleFreezeFirstColumnAtSelection}
                    >
                      {tableSelectionMeta.firstColumnFrozen
                        ? 'Unfreeze first column'
                        : 'Freeze first column'}
                    </button>
                    <div className="newlex-table-action-divider" />
                    <div className="newlex-table-action-palette">
                      {[
                        '',
                        '#fef3c7',
                        '#dbeafe',
                        '#dcfce7',
                        '#fee2e2',
                        '#ede9fe',
                      ].map((color) => (
                        <button
                          key={color || 'transparent'}
                          type="button"
                          className="newlex-table-color-chip"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setActiveCellBackground(color)}
                          style={{
                            background:
                              color || 'linear-gradient(135deg, #ffffff 45%, #e2e8f0 45%, #e2e8f0 55%, #ffffff 55%)',
                          }}
                          title={color ? `Set cell color ${color}` : 'Clear cell color'}
                        />
                      ))}
                    </div>
                    <div className="newlex-table-action-divider" />
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setActiveCellVerticalAlign('top')}
                    >
                      Vertical align: top
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setActiveCellVerticalAlign('middle')}
                    >
                      Vertical align: middle
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setActiveCellVerticalAlign('bottom')}
                    >
                      Vertical align: bottom
                    </button>
                    <div className="newlex-table-action-divider" />
                    <button
                      type="button"
                      className="newlex-table-action-item danger"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={deleteTableColumnAtSelection}
                    >
                      Delete column
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item danger"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={deleteTableRowAtSelection}
                    >
                      Delete row
                    </button>
                    <button
                      type="button"
                      className="newlex-table-action-item danger"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={deleteTableAtSelection}
                    >
                      Delete table
                    </button>
                  </div>
                )}
              </div>,
              document.body,
            )}

          {isSelected &&
            isFocused &&
            addCommentPoint &&
            !showCommentInput &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                className="CommentPlugin_AddCommentBox"
                style={{ left: addCommentPoint.left, top: addCommentPoint.top }}
              >
                <button
                  className="CommentPlugin_AddCommentBox_button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={openCommentInputFromSelection}
                >
                  <AddCommentIcon />
                </button>
              </div>,
              document.body,
            )}

          {showCommentInput &&
            commentInputPoint &&
            typeof document !== 'undefined' &&
            createPortal(
              <>
                {selectionRects.map((rect, index) => (
                  <span
                    key={`selection-rect-${index}`}
                    style={{
                      position: 'fixed',
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                      backgroundColor: 'rgba(255, 212, 0, 0.3)',
                      pointerEvents: 'none',
                      zIndex: 3600,
                    }}
                  />
                ))}
                <div
                  className="CommentPlugin_CommentInputBox"
                  style={{ left: commentInputPoint.left, top: commentInputPoint.top }}
                >
                  <div className="CommentPlugin_CommentInputBox_EditorContainer">
                    <textarea
                      className="CommentPlugin_CommentInputBox_Editor"
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Type a comment..."
                    />
                  </div>
                  <div className="CommentPlugin_CommentInputBox_Buttons">
                    <button
                      type="button"
                      className="Button__root CommentPlugin_CommentInputBox_Button"
                      onClick={clearCommentInputState}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="Button__root CommentPlugin_CommentInputBox_Button primary"
                      disabled={!commentDraft.trim()}
                      onClick={submitInlineComment}
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </>,
              document.body,
            )}

          {isInsertTableDialogOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                className="newlex-table-dialog-backdrop"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setIsInsertTableDialogOpen(false);
                  }
                }}
              >
                <div
                  className="newlex-table-dialog"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <h3 className="newlex-table-dialog-title">Insert Table</h3>
                  <div className="newlex-table-dialog-grid">
                    <label className="newlex-table-dialog-label">
                      Rows
                      <input
                        type="number"
                        min={1}
                        max={TABLE_MAX_ROWS}
                        value={tableRowsDraft}
                        onChange={(event) => setTableRowsDraft(event.target.value)}
                      />
                    </label>
                    <label className="newlex-table-dialog-label">
                      Columns
                      <input
                        type="number"
                        min={1}
                        max={TABLE_MAX_COLUMNS}
                        value={tableColumnsDraft}
                        onChange={(event) => setTableColumnsDraft(event.target.value)}
                      />
                    </label>
                  </div>
                  <label className="newlex-table-dialog-checkbox">
                    <input
                      type="checkbox"
                      checked={tableIncludeHeaders}
                      onChange={(event) => setTableIncludeHeaders(event.target.checked)}
                    />
                    Include first-row headers
                  </label>
                  <p className="newlex-table-dialog-caption">
                    Lexical range: 1-{TABLE_MAX_ROWS} rows, 1-{TABLE_MAX_COLUMNS} columns
                  </p>
                  <div className="newlex-table-dialog-actions">
                    <button
                      type="button"
                      className="Button__root"
                      onClick={() => setIsInsertTableDialogOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="Button__root newlex-table-dialog-primary"
                      disabled={!canInsertTable}
                      onClick={insertTableFromDialog}
                    >
                      Insert
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )}

          <ZoomHint visible={zoomHintVisible} />

          <style>{`
            .newlex-note-container [data-newlex-editor] p {
              margin: 0 0 0.55em 0;
            }
            .newlex-note-container [data-newlex-editor] h1,
            .newlex-note-container [data-newlex-editor] h2,
            .newlex-note-container [data-newlex-editor] h3 {
              margin: 0.15em 0 0.45em 0;
              line-height: 1.2;
            }
            .newlex-note-container [data-newlex-editor] ul {
              margin: 0.35em 0 0.55em 1.2em;
              padding: 0;
            }
            .newlex-note-container [data-newlex-editor] code {
              font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
              font-size: 0.92em;
              background: rgba(15, 23, 42, 0.08);
              border-radius: 4px;
              padding: 0.08em 0.3em;
            }
            .newlex-note-container [data-newlex-editor] table.newlex-table {
              border-collapse: collapse;
              border-spacing: 0;
              margin: 0.5em 0 0.9em;
              width: 100%;
              table-layout: fixed;
              overflow: hidden;
              border-radius: 8px;
              border: 1px solid rgba(148, 163, 184, 0.5);
              background: #fff;
            }
            .newlex-note-container [data-newlex-editor] table.newlex-table td,
            .newlex-note-container [data-newlex-editor] table.newlex-table th {
              border: 1px solid rgba(148, 163, 184, 0.45);
              padding: 8px 10px;
              text-align: left;
              vertical-align: top;
              min-width: 110px;
            }
            .newlex-note-container [data-newlex-editor] table.newlex-table th {
              font-weight: 600;
              background: rgba(241, 245, 249, 0.95);
            }
            .newlex-note-container [data-newlex-editor] table.newlex-table td:focus-within,
            .newlex-note-container [data-newlex-editor] table.newlex-table th:focus-within {
              outline: 2px solid rgba(14, 165, 233, 0.55);
              outline-offset: -2px;
            }
            .newlex-note-container [data-newlex-editor] table.newlex-table[data-newlex-row-striping] tr:nth-child(odd) td {
              background: rgba(248, 250, 252, 0.9);
            }
            .newlex-note-container [data-newlex-editor] table.newlex-table[data-newlex-freeze-first-row] tr:first-child > td,
            .newlex-note-container [data-newlex-editor] table.newlex-table[data-newlex-freeze-first-row] tr:first-child > th {
              position: sticky;
              top: 0;
              z-index: 2;
            }
            .newlex-note-container [data-newlex-editor] table.newlex-table[data-newlex-freeze-first-column] tr > :first-child {
              position: sticky;
              left: 0;
              z-index: 1;
            }
            .newlex-note-container [data-newlex-editor] table.newlex-table[data-newlex-freeze-first-row][data-newlex-freeze-first-column] tr:first-child > :first-child {
              z-index: 3;
            }
            .newlex-note-container [data-newlex-editor] .newlex-comment {
              background: rgba(255, 212, 0, 0.24);
              border-bottom: 2px solid rgba(255, 212, 0, 0.3);
              border-radius: 2px;
              padding: 0 1px 2px;
            }
            .newlex-note-container [data-newlex-editor] .newlex-comment.newlex-comment-active {
              background: rgba(255, 212, 0, 0.35);
              border-bottom-color: rgba(255, 212, 0, 0.7);
            }
            .newlex-note-container [data-newlex-editor] .newlex-comment.newlex-comment-selected {
              background: rgba(255, 212, 0, 0.55);
              border-bottom-color: rgba(255, 212, 0, 1);
            }

            .Button__root {
              padding: 8px 12px;
              border: 0;
              background-color: #eee;
              border-radius: 5px;
              cursor: pointer;
              font-size: 13px;
            }
            .Button__root:hover {
              background-color: #ddd;
            }
            .Button__root[disabled] {
              cursor: not-allowed;
            }

            .newlex-table-action-anchor {
              position: fixed;
              transform: translate(-100%, 0);
              z-index: 4025;
            }
            .newlex-table-action-button {
              width: 24px;
              height: 24px;
              border-radius: 999px;
              border: 1px solid rgba(148, 163, 184, 0.85);
              background: rgba(255, 255, 255, 0.98);
              color: #475569;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 3px 9px rgba(15, 23, 42, 0.18);
            }
            .newlex-table-action-button:hover {
              color: #0f172a;
              border-color: rgba(71, 85, 105, 0.85);
            }
            .newlex-table-action-menu {
              margin-top: 6px;
              width: 210px;
              background: #fff;
              border: 1px solid rgba(148, 163, 184, 0.45);
              border-radius: 10px;
              box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
              padding: 6px;
            }
            .newlex-table-action-meta {
              color: #64748b;
              font-size: 11px;
              font-weight: 600;
              padding: 3px 8px;
            }
            .newlex-table-action-item {
              width: 100%;
              border: 0;
              border-radius: 8px;
              background: transparent;
              color: #334155;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
              padding: 7px 8px;
              cursor: pointer;
            }
            .newlex-table-action-item:hover {
              background: rgba(241, 245, 249, 0.9);
            }
            .newlex-table-action-item.danger {
              color: #b91c1c;
            }
            .newlex-table-action-item.danger:hover {
              background: rgba(254, 226, 226, 0.8);
            }
            .newlex-table-action-divider {
              height: 1px;
              background: rgba(148, 163, 184, 0.28);
              margin: 6px 4px;
            }
            .newlex-table-action-palette {
              display: flex;
              gap: 6px;
              flex-wrap: wrap;
              padding: 2px 4px;
            }
            .newlex-table-color-chip {
              width: 20px;
              height: 20px;
              border-radius: 6px;
              border: 1px solid rgba(100, 116, 139, 0.4);
              cursor: pointer;
            }

            .newlex-table-dialog-backdrop {
              position: fixed;
              inset: 0;
              z-index: 4030;
              background: rgba(15, 23, 42, 0.42);
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .newlex-table-dialog {
              width: 340px;
              max-width: calc(100vw - 28px);
              border-radius: 12px;
              background: #fff;
              border: 1px solid rgba(148, 163, 184, 0.28);
              box-shadow: 0 18px 36px rgba(15, 23, 42, 0.22);
              padding: 16px;
            }
            .newlex-table-dialog-title {
              margin: 0 0 12px;
              color: #0f172a;
              font-size: 16px;
            }
            .newlex-table-dialog-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .newlex-table-dialog-label {
              display: flex;
              flex-direction: column;
              gap: 6px;
              font-size: 12px;
              color: #334155;
              font-weight: 600;
            }
            .newlex-table-dialog-label input[type='number'] {
              height: 34px;
              border: 1px solid rgba(148, 163, 184, 0.6);
              border-radius: 8px;
              font-size: 14px;
              padding: 0 8px;
            }
            .newlex-table-dialog-checkbox {
              display: flex;
              align-items: center;
              gap: 8px;
              color: #334155;
              font-size: 13px;
              margin: 12px 0 6px;
            }
            .newlex-table-dialog-caption {
              margin: 0;
              color: #64748b;
              font-size: 12px;
            }
            .newlex-table-dialog-actions {
              margin-top: 14px;
              display: flex;
              justify-content: flex-end;
              gap: 8px;
            }
            .newlex-table-dialog-primary {
              background: #0284c7;
              color: #fff;
              font-weight: 700;
            }
            .newlex-table-dialog-primary:hover {
              background: #0369a1;
            }
            .newlex-table-dialog-primary[disabled] {
              background: #e2e8f0;
              color: #94a3b8;
            }

            .CommentPlugin_AddCommentBox {
              display: block;
              position: fixed;
              border-radius: 20px;
              background-color: white;
              width: 40px;
              height: 46px;
              box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
              z-index: 4010;
            }
            .CommentPlugin_AddCommentBox_button {
              border-radius: 20px;
              border: 0;
              background: none;
              width: 40px;
              height: 46px;
              position: absolute;
              top: 0;
              left: 0;
              cursor: pointer;
              color: #334155;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .CommentPlugin_AddCommentBox_button:hover {
              background-color: #f6f6f6;
            }

            .CommentPlugin_CommentInputBox {
              display: block;
              position: absolute;
              width: 250px;
              min-height: 80px;
              background-color: #fff;
              box-shadow: 0 0 5px 0 rgba(0, 0, 0, 0.1);
              border-radius: 5px;
              z-index: 4020;
              animation: newlex-show-input-box 0.22s ease;
            }
            .CommentPlugin_CommentInputBox::before {
              content: '';
              position: absolute;
              width: 0;
              height: 0;
              margin-left: 0.5em;
              right: -1em;
              top: 0;
              left: calc(50% + 0.25em);
              box-sizing: border-box;
              border: 0.5em solid black;
              border-color: transparent transparent #fff #fff;
              transform-origin: 0 0;
              transform: rotate(135deg);
              box-shadow: -3px 3px 3px 0 rgba(0, 0, 0, 0.05);
            }
            @keyframes newlex-show-input-box {
              0% {
                opacity: 0;
                transform: translateY(28px);
              }
              100% {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .CommentPlugin_CommentInputBox_Buttons {
              display: flex;
              flex-direction: row;
              padding: 0 10px 10px 10px;
              gap: 10px;
            }
            .CommentPlugin_CommentInputBox_Button {
              flex: 1;
            }
            .CommentPlugin_CommentInputBox_Button.primary {
              background-color: rgb(66, 135, 245);
              font-weight: bold;
              color: #fff;
            }
            .CommentPlugin_CommentInputBox_Button.primary:hover {
              background-color: rgb(53, 114, 211);
            }
            .CommentPlugin_CommentInputBox_Button[disabled] {
              background-color: #eee;
              opacity: 0.5;
              color: #444;
            }
            .CommentPlugin_CommentInputBox_EditorContainer {
              position: relative;
              margin: 10px;
              border-radius: 5px;
            }
            .CommentPlugin_CommentInputBox_Editor {
              position: relative;
              border: 1px solid #ccc;
              background-color: #fff;
              border-radius: 5px;
              font-size: 14px;
              caret-color: rgb(5, 5, 5);
              display: block;
              padding: 9px 10px 10px 9px;
              min-height: 76px;
              width: 100%;
              resize: vertical;
              font-family: inherit;
              line-height: 1.45;
              color: #0f172a;
              box-sizing: border-box;
            }
            .CommentPlugin_CommentInputBox_Editor:focus {
              outline: 1px solid rgb(66, 135, 245);
            }

            .CommentPlugin_ShowCommentsButton {
              background-color: #ddd;
              border-radius: 10px;
              width: 32px;
              height: 32px;
              border: 0;
              color: #111827;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              opacity: 0.72;
              transition: opacity 120ms ease;
            }
            .CommentPlugin_ShowCommentsButton:hover {
              opacity: 1;
            }
            .CommentPlugin_ShowCommentsButton.active {
              background-color: #ccc;
              opacity: 1;
            }

            .CommentPlugin_CommentsPanel {
              background-color: #fff;
              border-top-left-radius: 10px;
              box-shadow: -2px 0 10px rgba(0, 0, 0, 0.06);
              border-left: 1px solid #e5e7eb;
              animation: newlex-show-comments 0.2s ease;
            }
            @keyframes newlex-show-comments {
              0% {
                opacity: 0;
                transform: translateX(220px);
              }
              100% {
                opacity: 1;
                transform: translateX(0);
              }
            }
            .CommentPlugin_CommentsPanel_Heading {
              padding-left: 15px;
              padding-top: 10px;
              margin: 0;
              height: 34px;
              border-bottom: 1px solid #eee;
              font-size: 20px;
              display: block;
              width: 100%;
              color: #444;
              overflow: hidden;
            }
            .CommentPlugin_CommentsPanel_Empty {
              color: #777;
              font-size: 15px;
              text-align: center;
              position: absolute;
              top: calc(50% - 15px);
              margin: 0;
              padding: 0;
              width: 100%;
            }
            .CommentPlugin_CommentsPanel_List {
              list-style-type: none;
              margin: 0;
              padding: 0;
              width: 100%;
              position: absolute;
              top: 45px;
              overflow-y: auto;
              height: calc(100% - 45px);
            }
            .CommentPlugin_CommentsPanel_List_Thread {
              padding: 0;
              margin: 0;
              border-top: 1px solid #eee;
              border-bottom: 1px solid #eee;
              position: relative;
              transition: all 0.2s linear;
              border-left: 0 solid #eee;
            }
            .CommentPlugin_CommentsPanel_List_Thread:first-child,
            .CommentPlugin_CommentsPanel_List_Thread + .CommentPlugin_CommentsPanel_List_Thread {
              border-top: none;
            }
            .CommentPlugin_CommentsPanel_List_Thread.interactive {
              cursor: pointer;
            }
            .CommentPlugin_CommentsPanel_List_Thread.interactive:hover {
              background-color: #fafafa;
            }
            .CommentPlugin_CommentsPanel_List_Thread.active {
              background-color: #fafafa;
              border-left: 15px solid #eee;
              cursor: inherit;
            }
            .CommentPlugin_CommentsPanel_List_Thread_QuoteBox {
              padding-top: 10px;
              color: #ccc;
              display: block;
              position: relative;
            }
            .CommentPlugin_CommentsPanel_List_Thread_Quote {
              margin: 0px 10px 0 10px;
              font-size: 14px;
            }
            .CommentPlugin_CommentsPanel_List_Thread_Quote span {
              color: #222;
              background-color: rgba(255, 212, 0, 0.4);
              padding: 1px;
              line-height: 1.4;
              display: inline;
              font-weight: bold;
            }
            .CommentPlugin_CommentsPanel_List_Thread_Comments {
              padding-left: 10px;
              list-style-type: none;
              margin: 0;
            }
            .CommentPlugin_CommentsPanel_List_Thread_Comments .CommentPlugin_CommentsPanel_List_Comment:first-child {
              border: none;
              margin-left: 0;
              padding-left: 5px;
            }
            .CommentPlugin_CommentsPanel_List_Thread_Comments .CommentPlugin_CommentsPanel_List_Comment:first-child.CommentPlugin_CommentsPanel_List_Comment:last-child {
              padding-bottom: 5px;
            }
            .CommentPlugin_CommentsPanel_List_Thread_Comments .CommentPlugin_CommentsPanel_List_Comment {
              padding-left: 10px;
              border-left: 5px solid #eee;
              margin-left: 5px;
            }
            .CommentPlugin_CommentsPanel_List_Comment {
              padding: 15px 0 15px 15px;
              margin: 0;
              font-size: 13px;
              position: relative;
              transition: all 0.2s linear;
            }
            .CommentPlugin_CommentsPanel_List_Comment p {
              margin: 0;
              color: #444;
              white-space: pre-wrap;
            }
            .CommentPlugin_CommentsPanel_List_Details {
              color: #444;
              padding-bottom: 5px;
              vertical-align: top;
            }
            .CommentPlugin_CommentsPanel_List_Comment_Author {
              font-weight: bold;
              padding-right: 5px;
            }
            .CommentPlugin_CommentsPanel_List_Comment_Time {
              color: #999;
            }
            .CommentPlugin_CommentsPanel_DeletedComment {
              color: #94a3b8 !important;
              font-style: italic;
            }
            .CommentPlugin_CommentsPanel_List_Thread_Editor {
              position: relative;
              padding-top: 1px;
            }
            .CommentPlugin_CommentsPanel_Editor {
              position: relative;
              border: 1px solid #ccc;
              background-color: #fff;
              border-radius: 5px;
              font-size: 14px;
              caret-color: rgb(5, 5, 5);
              display: block;
              padding: 9px 34px 10px 9px;
              min-height: 20px;
              width: 100%;
              box-sizing: border-box;
            }
            .CommentPlugin_CommentsPanel_Editor::before {
              content: '';
              width: 30px;
              height: 20px;
              float: right;
            }
            .CommentPlugin_CommentsPanel_SendButton {
              position: absolute;
              right: 4px;
              top: 4px;
              background: none;
              border: 0;
              width: 30px;
              height: 30px;
              color: #475569;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            }
            .CommentPlugin_CommentsPanel_SendButton:hover {
              color: #0284c7;
            }
            .CommentPlugin_CommentsPanel_List_DeleteButton {
              position: absolute;
              top: 8px;
              right: 8px;
              width: 24px;
              height: 24px;
              background-color: transparent;
              border: 0;
              opacity: 0;
              color: #64748b;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            }
            .CommentPlugin_CommentsPanel_DeletedComment,
            .CommentPlugin_CommentsPanel_List_Comment:hover .CommentPlugin_CommentsPanel_List_DeleteButton,
            .CommentPlugin_CommentsPanel_List_Thread_QuoteBox:hover .CommentPlugin_CommentsPanel_List_DeleteButton {
              opacity: 0.5;
            }
            .CommentPlugin_CommentsPanel_List_DeleteButton:hover {
              opacity: 1;
              color: #0284c7;
            }
          `}</style>
        </div>
      );
    },
  ),
);

NewLexNoteInner.displayName = 'NewLexNoteInner';

export const NewLexNote = memo(
  forwardRef<NewLexNoteRef, NewLexNoteProps>((props, ref) => (
    <NewLexNoteInner {...props} ref={ref} />
  )),
);

NewLexNote.displayName = 'NewLexNote';
