import React, { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';

interface WordCountPluginProps {
  show: boolean;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export default function WordCountPlugin({ show }: WordCountPluginProps): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [words, setWords] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    const update = () => {
      editor.getEditorState().read(() => {
        const text = $getRoot().getTextContent();
        setWords(countWords(text));
        setChars(text.length);
      });
    };

    update();
    return editor.registerUpdateListener(update);
  }, [editor]);

  if (!show) return null;

  return (
    <div
      style={{
        padding: '4px 14px',
        fontSize: 11,
        color: '#9ca3af',
        borderTop: '1px solid #f3f4f6',
        background: '#fafafa',
        display: 'flex',
        gap: 12,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <span>{words} {words === 1 ? 'word' : 'words'}</span>
      <span style={{ color: '#d1d5db' }}>·</span>
      <span>{chars} {chars === 1 ? 'character' : 'characters'}</span>
    </div>
  );
}
