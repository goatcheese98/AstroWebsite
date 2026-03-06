import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import type { EditorState } from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { EquationNode } from './nodes/EquationNode';
import { ImageNode } from './nodes/ImageNode';
import EquationPlugin from './plugins/EquationPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import TableActionMenuPlugin from './plugins/TableActionMenuPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import AutoCodeLanguagePlugin from './plugins/AutoCodeLanguagePlugin';
import CodeCopyButtonPlugin from './plugins/CodeCopyButtonPlugin';
import FloatingFormatToolbar from './plugins/FloatingFormatToolbar';
import ImagesPlugin from './plugins/ImagesPlugin';
import WordCountPlugin from './plugins/WordCountPlugin';
import NewLexToolbar from './NewLexToolbar';
import { DEFAULT_NEWLEX_CONTENT } from './types';

const newlexTheme = {
  root: 'newlex-editor-root',
  paragraph: 'newlex-paragraph',
  quote: 'newlex-quote',
  heading: {
    h1: 'newlex-h1',
    h2: 'newlex-h2',
    h3: 'newlex-h3',
  },
  list: {
    ul: 'newlex-ul',
    ol: 'newlex-ol',
    listitem: 'newlex-listitem',
    listitemChecked: 'newlex-listitem-checked',
    listitemUnchecked: 'newlex-listitem-unchecked',
    nested: {
      listitem: 'newlex-nested-listitem',
    },
  },
  link: 'newlex-link',
  text: {
    bold: 'newlex-text-bold',
    italic: 'newlex-text-italic',
    underline: 'newlex-text-underline',
    strikethrough: 'newlex-text-strikethrough',
    underlineStrikethrough: 'newlex-text-underline-strikethrough',
    code: 'newlex-text-code',
  },
  table: 'newlex-table',
  tableCell: 'newlex-table-cell',
  tableCellHeader: 'newlex-table-cell-header',
  tableRow: 'newlex-table-row',
  code: 'newlex-code',
  codeHighlight: {
    atrule: 'newlex-token-atrule',
    attr: 'newlex-token-attr',
    boolean: 'newlex-token-boolean',
    builtin: 'newlex-token-builtin',
    cdata: 'newlex-token-cdata',
    char: 'newlex-token-char',
    class: 'newlex-token-class',
    'class-name': 'newlex-token-class-name',
    comment: 'newlex-token-comment',
    constant: 'newlex-token-constant',
    deleted: 'newlex-token-deleted',
    doctype: 'newlex-token-doctype',
    entity: 'newlex-token-entity',
    function: 'newlex-token-function',
    important: 'newlex-token-important',
    inserted: 'newlex-token-inserted',
    keyword: 'newlex-token-keyword',
    namespace: 'newlex-token-namespace',
    number: 'newlex-token-number',
    operator: 'newlex-token-operator',
    prolog: 'newlex-token-prolog',
    property: 'newlex-token-property',
    punctuation: 'newlex-token-punctuation',
    regex: 'newlex-token-regex',
    selector: 'newlex-token-selector',
    string: 'newlex-token-string',
    symbol: 'newlex-token-symbol',
    tag: 'newlex-token-tag',
    url: 'newlex-token-url',
    variable: 'newlex-token-variable',
  },
  hr: 'newlex-hr',
  image: 'newlex-editor-image',
};

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  HorizontalRuleNode,
  EquationNode,
  ImageNode,
];

interface NewLexEditorProps {
  initialState: string;
  onChange: (lexicalState: string) => void;
  onRequestComment?: (selectedText: string) => void;
  onToggleCommentsPanel?: () => void;
  isCommentsPanelOpen?: boolean;
  isEditing: boolean;
}

// Inner component that can use hooks requiring LexicalComposerContext
function NewLexInner({
  onChange,
  onRequestComment,
  onToggleCommentsPanel,
  isCommentsPanelOpen,
  isEditing,
  anchorRef,
}: Omit<NewLexEditorProps, 'initialState'> & { anchorRef: React.RefObject<HTMLDivElement | null> }): React.ReactElement {
  const [showWordCount, setShowWordCount] = useState(false);

  const handleChange = useCallback(
    (editorState: EditorState) => {
      const json = JSON.stringify(editorState.toJSON());
      onChange(json);
    },
    [onChange],
  );

  return (
    <>
      {isEditing && (
        <NewLexToolbar
          onRequestComment={onRequestComment}
          onToggleCommentsPanel={onToggleCommentsPanel}
          isCommentsPanelOpen={isCommentsPanelOpen}
          showWordCount={showWordCount}
          onToggleWordCount={() => setShowWordCount((v) => !v)}
        />
      )}

      <div
        ref={anchorRef}
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                outline: 'none',
                padding: '14px 16px',
                boxSizing: 'border-box',
                color: '#111827',
                fontSize: 15,
                lineHeight: 1.6,
                fontFamily: '"IBM Plex Sans", "SF Pro Text", "Segoe UI", sans-serif',
                position: 'absolute',
                inset: 0,
                cursor: isEditing ? 'text' : 'default',
              }}
              aria-placeholder="Start writing..."
              placeholder={
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 16,
                    color: '#9ca3af',
                    fontSize: 15,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  Start writing...
                </div>
              }
            />
          }
          ErrorBoundary={({ children }) => <>{children}</>}
        />

        <EditablePlugin editable={isEditing} />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <TablePlugin />
        <HorizontalRulePlugin />
        <CodeHighlightPlugin />
        <AutoCodeLanguagePlugin />
        <CodeCopyButtonPlugin />
        <FloatingFormatToolbar />
        <EquationPlugin />
        <ImagesPlugin />
        <AutoLinkPlugin />
        <FloatingLinkEditorPlugin anchorElem={anchorRef.current ?? undefined} />
        <TableActionMenuPlugin anchorElem={anchorRef.current ?? undefined} />

        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>

      <WordCountPlugin show={showWordCount} />
    </>
  );
}

function EditablePlugin({ editable }: { editable: boolean }): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(editable);
  }, [editor, editable]);

  return null;
}

export default function NewLexEditor({
  initialState,
  onChange,
  onRequestComment,
  onToggleCommentsPanel,
  isCommentsPanelOpen,
  isEditing,
}: NewLexEditorProps): React.ReactElement {
  const anchorRef = useRef<HTMLDivElement>(null);

  const initialConfig = {
    namespace: 'newlex-editor',
    theme: newlexTheme,
    nodes: EDITOR_NODES,
    editorState: initialState || DEFAULT_NEWLEX_CONTENT,
    editable: isEditing,
    onError: (error: Error) => {
      console.error('NewLex Lexical error:', error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <NewLexInner
          onChange={onChange}
          onRequestComment={onRequestComment}
          onToggleCommentsPanel={onToggleCommentsPanel}
          isCommentsPanelOpen={isCommentsPanelOpen}
          isEditing={isEditing}
          anchorRef={anchorRef}
        />

        <style>{`
          .newlex-editor-root {
            position: relative;
          }
          .newlex-paragraph {
            margin: 0 0 8px 0;
          }
          .newlex-paragraph:last-child {
            margin-bottom: 0;
          }
          .newlex-h1 {
            font-size: 1.8em;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: #111827;
            line-height: 1.3;
          }
          .newlex-h2 {
            font-size: 1.4em;
            font-weight: 600;
            margin: 0 0 10px 0;
            color: #1f2937;
            line-height: 1.35;
          }
          .newlex-h3 {
            font-size: 1.15em;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: #374151;
            line-height: 1.4;
          }
          .newlex-quote {
            border-left: 3px solid #d1d5db;
            margin: 0 0 8px 0;
            padding: 4px 0 4px 12px;
            color: #6b7280;
            font-style: italic;
          }
          .newlex-ul {
            margin: 0 0 8px 0;
            padding-left: 20px;
            list-style-type: disc;
          }
          .newlex-ol {
            margin: 0 0 8px 0;
            padding-left: 20px;
            list-style-type: decimal;
          }
          .newlex-listitem {
            margin: 2px 0;
          }
          .newlex-listitem-checked,
          .newlex-listitem-unchecked {
            position: relative;
            margin: 2px 0;
            padding-left: 4px;
            list-style-type: none;
          }
          .newlex-listitem-checked:before,
          .newlex-listitem-unchecked:before {
            content: '';
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 1.5px solid #9ca3af;
            border-radius: 3px;
            margin-right: 6px;
            vertical-align: middle;
          }
          .newlex-listitem-checked:before {
            background: #374151;
            border-color: #374151;
          }
          .newlex-nested-listitem {
            list-style-type: none;
          }
          .newlex-link {
            color: #2563eb;
            text-decoration: underline;
            cursor: pointer;
          }
          .newlex-text-bold {
            font-weight: 700;
          }
          .newlex-text-italic {
            font-style: italic;
          }
          .newlex-text-underline {
            text-decoration: underline;
          }
          .newlex-text-strikethrough {
            text-decoration: line-through;
          }
          .newlex-text-underline-strikethrough {
            text-decoration: underline line-through;
          }
          .newlex-text-code {
            font-family: 'Fira Code', 'Courier New', monospace;
            background: rgba(15,23,42,0.06);
            border-radius: 3px;
            padding: 1px 4px;
            font-size: 0.9em;
          }
          .newlex-code {
            font-family: 'Fira Code', 'JetBrains Mono', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            background: #f8f9fc;
            border: 1px solid #e1e4ed;
            border-radius: 6px;
            padding: 10px 14px;
            padding-top: 30px;
            margin: 0 0 8px 0;
            display: block;
            white-space: pre;
            overflow-x: auto;
            position: relative;
            tab-size: 2;
          }
          .newlex-code::before {
            content: attr(data-highlight-language);
            display: block;
            position: absolute;
            top: 0;
            right: 0;
            padding: 2px 10px;
            font-size: 10px;
            font-family: 'IBM Plex Sans', 'SF Pro Text', sans-serif;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #6b7280;
            background: #eef0f6;
            border-bottom-left-radius: 5px;
            border-top-right-radius: 5px;
            pointer-events: none;
          }
          .newlex-code-copy {
            position: absolute;
            top: 3px;
            right: 8px;
            padding: 1px 8px;
            font-size: 10px;
            font-family: 'IBM Plex Sans', 'SF Pro Text', sans-serif;
            font-weight: 500;
            color: #9ca3af;
            background: transparent;
            border: 1px solid #e1e4ed;
            border-radius: 4px;
            cursor: pointer;
            line-height: 1.7;
            letter-spacing: 0.02em;
            transition: color 0.12s, border-color 0.12s, background 0.12s;
            z-index: 1;
            margin-right: 56px;
          }
          .newlex-code-copy:hover {
            color: #374151;
            border-color: #9ca3af;
            background: rgba(0,0,0,0.03);
          }
          .newlex-code-copy.copied {
            color: #16a34a;
            border-color: #86efac;
            background: #f0fdf4;
          }

          /* Syntax token colors — VS Code Light+ palette */
          .newlex-token-comment,
          .newlex-token-prolog,
          .newlex-token-doctype,
          .newlex-token-cdata { color: #6a9955; font-style: italic; }

          .newlex-token-punctuation { color: #555; }

          .newlex-token-property,
          .newlex-token-tag,
          .newlex-token-constant,
          .newlex-token-symbol,
          .newlex-token-deleted { color: #c7254e; }

          .newlex-token-boolean,
          .newlex-token-number { color: #098658; }

          .newlex-token-selector,
          .newlex-token-attr,
          .newlex-token-string,
          .newlex-token-char,
          .newlex-token-builtin,
          .newlex-token-inserted { color: #a31515; }

          .newlex-token-operator,
          .newlex-token-entity,
          .newlex-token-url { color: #000; }

          .newlex-token-atrule,
          .newlex-token-keyword { color: #0000ff; font-weight: 600; }

          .newlex-token-function,
          .newlex-token-class-name,
          .newlex-token-class { color: #795e26; }

          .newlex-token-regex,
          .newlex-token-important { color: #d16a00; }

          .newlex-token-variable,
          .newlex-token-namespace { color: #001080; }

          .newlex-token-important,
          .newlex-token-bold { font-weight: bold; }
          .newlex-token-italic { font-style: italic; }
          .newlex-table {
            border-collapse: collapse;
            width: 100%;
            margin: 0 0 12px 0;
          }
          .newlex-table-cell,
          .newlex-table-cell-header {
            border: 1px solid #d1d5db;
            padding: 6px 10px;
            min-width: 60px;
            vertical-align: top;
          }
          .newlex-table-cell-header {
            background: rgba(15,23,42,0.04);
            font-weight: 600;
          }
          .newlex-hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 12px 0;
          }
          .inline-equation {
            display: inline-block;
          }
          .equation {
            margin: 1em 0;
          }
        `}</style>
      </div>
    </LexicalComposer>
  );
}
