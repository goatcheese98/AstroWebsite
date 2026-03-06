import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isCodeNode, CodeNode } from '@lexical/code';
import { $getNodeByKey } from 'lexical';

const BTN_CLASS = 'newlex-code-copy';

function injectCopyButton(editor: ReturnType<typeof useLexicalComposerContext>[0], key: string) {
  const element = editor.getElementByKey(key);
  if (!element) return;

  // Remove stale button from a previous render of this node
  element.querySelector(`.${BTN_CLASS}`)?.remove();

  const btn = document.createElement('button');
  btn.className = BTN_CLASS;
  btn.type = 'button';
  btn.textContent = 'Copy';

  btn.addEventListener('mousedown', (e) => {
    // Prevent the click from collapsing the Lexical selection
    e.preventDefault();
  });

  btn.addEventListener('click', () => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(key);
      if (!$isCodeNode(node)) return;
      const code = node.getTextContent();
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✓ Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      });
    });
  });

  element.prepend(btn);
}

export default function CodeCopyButtonPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerMutationListener(CodeNode, (mutations) => {
      for (const [key, mutation] of mutations) {
        if (mutation === 'destroyed') continue;
        // Use rAF so Lexical has finished patching the DOM before we read/inject
        requestAnimationFrame(() => injectCopyButton(editor, key));
      }
    });
  }, [editor]);

  return null;
}
