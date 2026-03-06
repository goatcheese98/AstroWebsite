import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $nodesOfType } from 'lexical';
import { $isCodeNode, CodeNode } from '@lexical/code';
import { detectCodeLanguage } from '../utils/detectCodeLanguage';

const DEBOUNCE_MS = 500;
// Tag used to mark our own updates so we don't re-trigger detection in a loop.
const UPDATE_TAG = 'auto-lang-detect';

export default function AutoCodeLanguagePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unregister = editor.registerUpdateListener(({ tags }) => {
      // Skip updates that we ourselves triggered to avoid infinite loops.
      if (tags.has(UPDATE_TAG)) return;

      if (timer !== null) clearTimeout(timer);

      timer = setTimeout(() => {
        timer = null;

        // Collect code nodes that still want auto-detection.
        const pending: Array<{ key: string; code: string }> = [];

        editor.getEditorState().read(() => {
          for (const node of $nodesOfType(CodeNode)) {
            if (!$isCodeNode(node)) continue;
            if (node.getLanguage() !== 'auto') continue;
            const code = node.getTextContent();
            if (code.trim().length > 0) {
              pending.push({ key: node.getKey(), code });
            }
          }
        });

        if (pending.length === 0) return;

        // Detect and apply — run detections outside the Lexical read context.
        const detections: Array<{ key: string; lang: string }> = [];
        for (const { key, code } of pending) {
          const lang = detectCodeLanguage(code);
          if (lang) detections.push({ key, lang });
        }

        if (detections.length === 0) return;

        editor.update(
          () => {
            for (const { key, lang } of detections) {
              const node = editor.getEditorState()._nodeMap.get(key);
              if (node && $isCodeNode(node)) {
                node.setLanguage(lang);
              }
            }
          },
          { tag: UPDATE_TAG },
        );
      }, DEBOUNCE_MS);
    });

    return () => {
      unregister();
      if (timer !== null) clearTimeout(timer);
    };
  }, [editor]);

  return null;
}
