import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { indentWithTab } from '@codemirror/commands';
import { EditorView, keymap } from '@codemirror/view';
import { useUiStore } from '../../stores/uiStore.js';
import { frontmatterHighlight } from './codemirrorFrontmatter.js';

/**
 * Shared CodeMirror setup for SKILL.md editing: markdown highlighting,
 * frontmatter block marking, Tab indentation, theme following the app,
 * and a bounded height so long documents scroll inside the container.
 * Render inside a parent that gives it a height (h-full or a fixed one).
 */
export default function SkillCodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useUiStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  const extensions = useMemo(
    () => [
      markdown(),
      frontmatterHighlight,
      keymap.of([indentWithTab]),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    ],
    [],
  );

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemDark(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={isDark ? 'dark' : 'light'}
        // `style` lands on the component root div; without an explicit height
        // the editor grows unbounded instead of scrolling.
        style={{ height: '100%', fontSize: 13 }}
        extensions={extensions}
      />
    </div>
  );
}
