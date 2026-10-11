import { Extension } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { MAX_QUOTE_LENGTH } from "@/lib/limits";

/** A comment's quoted text and roughly where it sat when it was written. */
export type CommentAnchor = { id: number; quote: string; offset: number };

type Highlights = { anchors: CommentAnchor[]; activeId: number | null };
type PluginState = Highlights & { decorations: DecorationSet };

const key = new PluginKey<PluginState>("commentHighlights");

// The document as one string, with the editor position of every character
// (-1 for the line breaks added between blocks).
function flatten(doc: Node): { text: string; positions: number[] } {
  let text = "";
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) positions.push(pos + i);
      text += node.text;
    } else if (node.isTextblock && text && !text.endsWith("\n")) {
      positions.push(-1);
      text += "\n";
    }
  });
  return { text, positions };
}

/** The selected text in the form comments store it, or null for no text. */
export function quoteSelection(
  doc: Node,
  from: number,
  to: number,
): { quote: string; offset: number } | null {
  const { text, positions } = flatten(doc);
  let start = positions.findIndex((pos) => pos >= from);
  if (start === -1) return null;
  let end = start;
  while (
    end < positions.length &&
    (positions[end] === -1 || positions[end] < to)
  ) {
    end++;
  }
  end = Math.min(end, start + MAX_QUOTE_LENGTH);
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return start < end ? { quote: text.slice(start, end), offset: start } : null;
}

// Comments aren't stored inside the document. Each one is found again by its
// quote; when the text appears more than once, the occurrence nearest to where
// the comment was written wins.
function locate(
  { text, positions }: ReturnType<typeof flatten>,
  { quote, offset }: Pick<CommentAnchor, "quote" | "offset">,
): { from: number; to: number } | null {
  let best = -1;
  for (
    let index = text.indexOf(quote);
    index !== -1;
    index = text.indexOf(quote, index + 1)
  ) {
    if (best === -1 || Math.abs(index - offset) < Math.abs(best - offset)) {
      best = index;
    }
  }
  if (best === -1) return null;
  return {
    from: positions[best],
    to: positions[best + quote.length - 1] + 1,
  };
}

/** Where a comment's quote is in the document now, or null if it was edited away. */
export function locateQuote(
  doc: Node,
  anchor: Pick<CommentAnchor, "quote" | "offset">,
): { from: number; to: number } | null {
  return locate(flatten(doc), anchor);
}

function decorate(doc: Node, { anchors, activeId }: Highlights): DecorationSet {
  if (anchors.length === 0) return DecorationSet.empty;
  const flat = flatten(doc);
  const decorations: Decoration[] = [];
  for (const anchor of anchors) {
    const range = locate(flat, anchor);
    if (!range) continue;
    decorations.push(
      Decoration.inline(
        range.from,
        range.to,
        {
          class:
            anchor.id === activeId
              ? "comment-highlight is-active"
              : "comment-highlight",
          "data-comment-id": String(anchor.id),
        },
        { commentId: anchor.id },
      ),
    );
  }
  return DecorationSet.create(doc, decorations);
}

/** Highlights the text that open comments are about. */
export const CommentHighlights = Extension.create<{
  onSelect: (commentId: number) => void;
}>({
  name: "commentHighlights",

  addOptions() {
    return { onSelect: () => {} };
  },

  addProseMirrorPlugins() {
    const { onSelect } = this.options;
    return [
      new Plugin<PluginState>({
        key,
        state: {
          init: () => ({
            anchors: [],
            activeId: null,
            decorations: DecorationSet.empty,
          }),
          apply(transaction, previous) {
            const next: Highlights = transaction.getMeta(key) ?? previous;
            if (next === previous && !transaction.docChanged) return previous;
            return {
              anchors: next.anchors,
              activeId: next.activeId,
              decorations: decorate(transaction.doc, next),
            };
          },
        },
        props: {
          decorations: (state) => key.getState(state)?.decorations,
          handleClick(view, pos) {
            const [hit] =
              key.getState(view.state)?.decorations.find(pos, pos) ?? [];
            if (hit) onSelect(hit.spec.commentId);
            return false;
          },
        },
      }),
    ];
  },
});

export function setCommentHighlights(
  editor: Editor,
  anchors: CommentAnchor[],
  activeId: number | null,
): void {
  const highlights: Highlights = { anchors, activeId };
  editor.view.dispatch(editor.state.tr.setMeta(key, highlights));
}
