import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const frontmatterLine = Decoration.line({ class: 'cm-ws-frontmatter' });

function buildFrontmatterDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  if (doc.line(1).text.trim() !== '---') return builder.finish();

  let endLine = -1;
  for (let n = 2; n <= doc.lines; n++) {
    if (doc.line(n).text.trim() === '---') {
      endLine = n;
      break;
    }
  }
  if (endLine === -1) return builder.finish();

  for (let n = 1; n <= endLine; n++) {
    const line = doc.line(n);
    builder.add(line.from, line.from, frontmatterLine);
  }
  return builder.finish();
}

/**
 * Marks the YAML frontmatter block (first `--- ... ---` lines) of a SKILL.md
 * document so the universal skill format boundary is visually explicit.
 */
export const frontmatterHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildFrontmatterDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildFrontmatterDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
