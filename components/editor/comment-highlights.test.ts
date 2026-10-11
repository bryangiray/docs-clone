import { getSchema } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { MAX_QUOTE_LENGTH } from "@/lib/limits";
import { locateQuote, quoteSelection } from "./comment-highlights";

const schema = getSchema([StarterKit]);

const paragraph = (text: string) => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : undefined,
});

function docOf(...paragraphs: string[]) {
  return schema.nodeFromJSON({
    type: "doc",
    content: paragraphs.map(paragraph),
  });
}

/** Editor positions of the first occurrence of `text`. */
function rangeOf(doc: ReturnType<typeof docOf>, text: string) {
  let from = -1;
  doc.descendants((node, pos) => {
    const index = node.text?.indexOf(text) ?? -1;
    if (from === -1 && index !== -1) from = pos + index;
  });
  return { from, to: from + text.length };
}

describe("quoteSelection", () => {
  const doc = docOf("The quick brown fox", "jumps over the lazy dog");

  it("returns the selected text and where it starts", () => {
    const { from, to } = rangeOf(doc, "quick brown");
    expect(quoteSelection(doc, from, to)).toEqual({
      quote: "quick brown",
      offset: 4,
    });
  });

  it("leaves surrounding whitespace out of the quote", () => {
    const { from, to } = rangeOf(doc, " quick ");
    expect(quoteSelection(doc, from, to)).toEqual({
      quote: "quick",
      offset: 4,
    });
  });

  it("joins a selection across paragraphs with a line break", () => {
    const { from } = rangeOf(doc, "fox");
    const { to } = rangeOf(doc, "jumps");
    expect(quoteSelection(doc, from, to)?.quote).toBe("fox\njumps");
  });

  it("returns null when no text is selected", () => {
    const { from } = rangeOf(doc, "quick");
    expect(quoteSelection(doc, from, from)).toBeNull();
    expect(quoteSelection(docOf(""), 0, 2)).toBeNull();
  });

  it("caps very long selections", () => {
    const long = docOf("x".repeat(MAX_QUOTE_LENGTH * 2));
    const quote = quoteSelection(long, 1, long.content.size - 1)?.quote;
    expect(quote).toHaveLength(MAX_QUOTE_LENGTH);
  });
});

describe("locateQuote", () => {
  it("finds the range a quote was taken from", () => {
    const doc = docOf("The quick brown fox", "jumps over the lazy dog");
    const selected = rangeOf(doc, "lazy dog");
    const anchor = quoteSelection(doc, selected.from, selected.to)!;
    expect(locateQuote(doc, anchor)).toEqual(selected);
  });

  it("finds a quote that spans paragraphs", () => {
    const doc = docOf("The quick brown fox", "jumps over the lazy dog");
    const range = {
      from: rangeOf(doc, "fox").from,
      to: rangeOf(doc, "jumps").to,
    };
    const anchor = quoteSelection(doc, range.from, range.to)!;
    expect(locateQuote(doc, anchor)).toEqual(range);
  });

  it("picks the occurrence nearest to where the comment was written", () => {
    const doc = docOf("fox one", "fox two", "fox three");
    const located = (offset: number) =>
      doc.textBetween(
        locateQuote(doc, { quote: "fox", offset })!.from,
        doc.content.size,
        "\n",
      );
    expect(located(0)).toBe("fox one\nfox two\nfox three");
    expect(located(9)).toBe("fox two\nfox three");
    expect(located(100)).toBe("fox three");
  });

  it("still finds the quote after text was added before it", () => {
    const before = docOf("The lazy dog");
    const { from, to } = rangeOf(before, "lazy dog");
    const anchor = quoteSelection(before, from, to)!;

    const after = docOf("A new first paragraph", "The very lazy dog");
    expect(locateQuote(after, anchor)).toEqual(rangeOf(after, "lazy dog"));
  });

  it("returns null when the quoted text was edited away", () => {
    expect(
      locateQuote(docOf("The energetic dog"), { quote: "lazy dog", offset: 4 }),
    ).toBeNull();
  });
});
