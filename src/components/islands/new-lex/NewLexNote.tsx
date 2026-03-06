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
import NewLexEditor from './NewLexEditor';

const CONTENT_COMMIT_DEBOUNCE_MS = 300;
const COMMENTS_COMMIT_DEBOUNCE_MS = 160;
const USER_NAME_PREF_KEY = 'newlex.comment.author';

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimestamp(value: number): string {
  const seconds = Math.round((value - Date.now()) / 1000);
  const minutes = Math.round(seconds / 60);

  if (seconds > -10) return 'Just now';

  const formatter = new Intl.RelativeTimeFormat('en', {
    localeMatcher: 'best fit',
    numeric: 'auto',
    style: 'short',
  });

  return formatter.format(minutes, 'minute');
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

function getInitialUserName(): string {
  if (typeof window === 'undefined') return 'You';
  try {
    return window.localStorage.getItem(USER_NAME_PREF_KEY) || 'You';
  } catch {
    return 'You';
  }
}

// --- Icons ---

function CommentIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
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

// --- Main component ---

const NewLexNoteInner = memo(
  forwardRef<NewLexNoteRef, NewLexNoteProps>(
    ({ element, appState, stackIndex = 0, onChange, onDeselect }, ref) => {
      const [isEditing, setIsEditing] = useState(false);
      const [comments, setComments] = useState<NewLexCommentThread[]>(
        normalizeIncomingComments(element.customData?.comments),
      );
      const [isCommentsPanelOpen, setIsCommentsPanelOpenState] = useState(
        element.customData?.commentsPanelOpen ?? false,
      );
      const [currentUser, setCurrentUser] = useState(getInitialUserName);
      const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
      const [replyDraftByThread, setReplyDraftByThread] = useState<Record<string, string>>({});
      const [showCommentInput, setShowCommentInput] = useState(false);
      const [commentDraft, setCommentDraft] = useState('');
      const [pendingAnchorText, setPendingAnchorText] = useState('');

      const containerRef = useRef<HTMLDivElement>(null);
      const pendingLexicalCommitRef = useRef<number | null>(null);
      const pendingCommentsCommitRef = useRef<number | null>(null);
      const commentsRef = useRef<NewLexCommentThread[]>(comments);
      const pendingLexicalStateRef = useRef<string | null>(null);

      useEffect(() => {
        commentsRef.current = comments;
      }, [comments]);

      const isSelected = appState.selectedElementIds?.[element.id] === true;
      const isInteractive = isEditing || isSelected;
      const { visible: zoomHintVisible } = useZoomHint(
        containerRef,
        isSelected && !isEditing,
        isSelected,
      );

      // ---- Commit helpers ----

      const commitNote = useCallback(
        (updates: {
          lexicalState?: string;
          comments?: NewLexCommentThread[];
          commentsPanelOpen?: boolean;
        }) => {
          onChange(element.id, updates);
        },
        [element.id, onChange],
      );

      const scheduleLexicalCommit = useCallback(
        (nextState: string) => {
          pendingLexicalStateRef.current = nextState;
          if (pendingLexicalCommitRef.current !== null) {
            window.clearTimeout(pendingLexicalCommitRef.current);
          }
          pendingLexicalCommitRef.current = window.setTimeout(() => {
            pendingLexicalCommitRef.current = null;
            pendingLexicalStateRef.current = null;
            commitNote({ lexicalState: nextState });
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

      const flushPendingLexicalCommit = useCallback(() => {
        if (pendingLexicalCommitRef.current === null) return;
        window.clearTimeout(pendingLexicalCommitRef.current);
        pendingLexicalCommitRef.current = null;
        if (pendingLexicalStateRef.current !== null) {
          commitNote({ lexicalState: pendingLexicalStateRef.current });
          pendingLexicalStateRef.current = null;
        }
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
          setIsCommentsPanelOpenState(open);
          commitNote({ commentsPanelOpen: open });
        },
        [commitNote],
      );

      // Sync comments from element when collaborating
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
        setIsCommentsPanelOpenState(incomingOpen);
      }, [element.customData?.commentsPanelOpen]);

      // Cleanup on unmount — flush any pending debounced writes so content isn't lost
      useEffect(
        () => () => {
          flushPendingLexicalCommit();
          flushPendingCommentsCommit();
        },
        [flushPendingLexicalCommit, flushPendingCommentsCommit],
      );

      useEffect(() => {
        try {
          window.localStorage.setItem(USER_NAME_PREF_KEY, currentUser.trim() || 'You');
        } catch {
          // noop
        }
      }, [currentUser]);

      // Deselect when not selected
      useEffect(() => {
        if (!isSelected) {
          setIsEditing(false);
        }
      }, [isSelected]);

      useEffect(() => {
        if (!isSelected) {
          setShowCommentInput(false);
          setCommentDraft('');
          setPendingAnchorText('');
        }
      }, [isSelected]);

      const enterEditMode = useCallback(() => {
        setIsEditing(true);
      }, []);

      const isPointInNote = useCallback((clientX: number, clientY: number) => {
        if (!containerRef.current) return { inNote: false };

        const zoomValue = appState.zoom.value;
        const screenX = (element.x + appState.scrollX) * zoomValue;
        const screenY = (element.y + appState.scrollY) * zoomValue;
        const screenWidth = element.width * zoomValue;
        const screenHeight = element.height * zoomValue;
        const centerX = screenX + screenWidth / 2;
        const centerY = screenY + screenHeight / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;

        if (element.angle) {
          const cos = Math.cos(-element.angle);
          const sin = Math.sin(-element.angle);
          const rx = dx * cos - dy * sin;
          const ry = dx * sin + dy * cos;
          dx = rx;
          dy = ry;
        }

        const halfWidth = screenWidth / 2;
        const halfHeight = screenHeight / 2;
        const inNote =
          dx >= -halfWidth &&
          dx <= halfWidth &&
          dy >= -halfHeight &&
          dy <= halfHeight;

        return { inNote };
      }, [
        appState.scrollX,
        appState.scrollY,
        appState.zoom.value,
        element.angle,
        element.height,
        element.width,
        element.x,
        element.y,
      ]);

      useEffect(() => {
        if (isEditing) return;

        const handleGlobalDblClick = (event: MouseEvent) => {
          const { inNote } = isPointInNote(event.clientX, event.clientY);
          if (!inNote) return;

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          enterEditMode();
        };

        document.addEventListener('dblclick', handleGlobalDblClick, true);
        return () => {
          document.removeEventListener('dblclick', handleGlobalDblClick, true);
        };
      }, [enterEditMode, isEditing, isPointInNote]);

      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as Node | null;
          if (containerRef.current && target && containerRef.current.contains(target)) {
            return;
          }

          const { inNote } = isPointInNote(event.clientX, event.clientY);
          if (!inNote && isEditing) {
            setIsEditing(false);
          }
        };

        document.addEventListener('click', handleClickOutside, true);
        return () => {
          document.removeEventListener('click', handleClickOutside, true);
        };
      }, [isEditing, isPointInNote]);

      useEffect(() => {
        const handleEscapeToDeselect = (event: KeyboardEvent) => {
          if (event.key !== 'Escape') return;
          if (!isSelected) return;

          if (isEditing) {
            setIsEditing(false);
          }
          onDeselect?.();
        };

        window.addEventListener('keydown', handleEscapeToDeselect, true);
        return () => window.removeEventListener('keydown', handleEscapeToDeselect, true);
      }, [isEditing, isSelected, onDeselect]);

      useEffect(() => {
        if (!isEditing) return;

        const frame = window.requestAnimationFrame(() => {
          const editable = containerRef.current?.querySelector<HTMLElement>(
            '[contenteditable="true"]',
          );
          editable?.focus();
        });

        return () => window.cancelAnimationFrame(frame);
      }, [isEditing]);

      useEffect(() => {
        if (!selectedCommentId) return;
        if (comments.some((thread) => thread.id === selectedCommentId)) return;
        setSelectedCommentId(null);
      }, [comments, selectedCommentId]);

      // ---- Comment actions ----

      const handleRequestComment = useCallback((selectedText: string) => {
        setPendingAnchorText(selectedText.length > 100 ? `${selectedText.slice(0, 99)}…` : selectedText);
        setCommentDraft('');
        setShowCommentInput(true);
      }, []);

      const clearCommentInputState = useCallback(() => {
        setShowCommentInput(false);
        setCommentDraft('');
        setPendingAnchorText('');
      }, []);

      const submitInlineComment = useCallback(() => {
        const contentText = commentDraft.trim();
        if (!contentText) return;

        const threadId = createId('c');
        const author = currentUser.trim() || 'You';

        const thread: NewLexCommentThread = {
          id: threadId,
          author,
          comment: contentText,
          commentDeleted: false,
          anchorText: pendingAnchorText,
          createdAt: Date.now(),
          resolved: false,
          collapsed: false,
          replies: [],
        };

        persistComments([...commentsRef.current, thread]);
        setSelectedCommentId(threadId);
        setCommentsPanelOpen(true);
        clearCommentInputState();
      }, [
        clearCommentInputState,
        commentDraft,
        currentUser,
        pendingAnchorText,
        persistComments,
        setCommentsPanelOpen,
      ]);

      const updateThread = useCallback(
        (threadId: string, updater: (thread: NewLexCommentThread) => NewLexCommentThread) => {
          const next = commentsRef.current.map((thread) =>
            thread.id === threadId ? updater(thread) : thread,
          );
          persistComments(next);
        },
        [persistComments],
      );

      const deleteThread = useCallback(
        (threadId: string) => {
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
        [persistComments, selectedCommentId],
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
                ? { ...reply, message: '[Deleted Comment]', deleted: true }
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

      // ---- Transform ----

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

      useImperativeHandle(ref, () => ({ updateTransform }), [updateTransform]);

      // ---- Styling ----

      const borderRadius = getExcalidrawCornerRadius(
        element.width,
        element.height,
        element.roundness,
      );

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
        zIndex: getOverlayZIndex(isSelected, isEditing, stackIndex),
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
        pointerEvents: isInteractive ? 'auto' : 'none',
        userSelect: isEditing ? 'auto' : 'none',
        WebkitUserSelect: isEditing ? 'auto' : 'none',
        cursor: isEditing ? 'text' : 'default',
        boxShadow: isSelected ? '0 0 0 2px #0ea5e9' : 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        position: 'relative',
      };

      return (
        <div
          ref={containerRef}
          style={containerStyle}
          className="newlex-note-container"
          data-newlex-id={element.id}
        >
          <div style={clipWrapperStyle}>
            <div style={contentStyle}>
              {/* Main editor area */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                <NewLexEditor
                  initialState={element.customData?.lexicalState || DEFAULT_NEWLEX_CONTENT}
                  onChange={scheduleLexicalCommit}
                  onRequestComment={handleRequestComment}
                  onToggleCommentsPanel={() => setCommentsPanelOpen(!isCommentsPanelOpen)}
                  isCommentsPanelOpen={isCommentsPanelOpen}
                  isEditing={isEditing}
                />
              </div>

              {/* Comments panel */}
              {isCommentsPanelOpen && (
                <aside
                  className="CommentPlugin_CommentsPanel"
                  style={{ position: 'relative', width: 300, height: '100%', top: 0, flexShrink: 0 }}
                >
                  <h2 className="CommentPlugin_CommentsPanel_Heading">Comments</h2>
                  {orderedComments.length === 0 ? (
                    <div className="CommentPlugin_CommentsPanel_Empty">No Comments</div>
                  ) : (
                    <ul className="CommentPlugin_CommentsPanel_List">
                      {orderedComments.map((thread) => {
                        const isActiveThread = selectedCommentId === thread.id;

                        return (
                          <li
                            key={thread.id}
                            onClick={() => setSelectedCommentId(thread.id)}
                            className={`CommentPlugin_CommentsPanel_List_Thread interactive ${
                              isActiveThread ? 'active' : ''
                            }`}
                          >
                            <div className="CommentPlugin_CommentsPanel_List_Thread_QuoteBox">
                              <blockquote className="CommentPlugin_CommentsPanel_List_Thread_Quote">
                                {'> '}<span>{thread.anchorText || '(no selection)'}</span>
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

          {/* Comment input box — appears inside the note via portal */}
          {showCommentInput &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 4020,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    pointerEvents: 'auto',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                    padding: 16,
                    width: 300,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {pendingAnchorText && (
                    <blockquote
                      style={{
                        margin: 0,
                        padding: '4px 8px',
                        borderLeft: '3px solid #e5e7eb',
                        color: '#6b7280',
                        fontSize: 13,
                      }}
                    >
                      {pendingAnchorText}
                    </blockquote>
                  )}
                  <textarea
                    autoFocus
                    className="CommentPlugin_CommentInputBox_Editor"
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        submitInlineComment();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        clearCommentInputState();
                      }
                    }}
                    placeholder="Type a comment..."
                    style={{ minHeight: 80, resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="Button__root"
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
              </div>,
              document.body,
            )}

          <ZoomHint visible={zoomHintVisible} />

          <style>{`
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
              0% { opacity: 0; transform: translateX(220px); }
              100% { opacity: 1; transform: translateX(0); }
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
            .CommentPlugin_CommentInputBox_Editor {
              position: relative;
              border: 1px solid #ccc;
              background-color: #fff;
              border-radius: 5px;
              font-size: 14px;
              caret-color: rgb(5, 5, 5);
              display: block;
              padding: 9px 10px 10px 9px;
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
