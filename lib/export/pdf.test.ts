import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { pdfContent, pdfFileName } from "./pdf";

type Mark = NonNullable<JSONContent["marks"]>[number];

const text = (value: string, ...marks: Mark[]): JSONContent => ({
  type: "text",
  text: value,
  marks: marks.length > 0 ? marks : undefined,
});
const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content: content.length > 0 ? content : undefined,
});
const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});

describe("pdfContent", () => {
  it("turns text formatting into pdfmake styles", () => {
    const [block] = pdfContent(
      doc(
        paragraph(
          text("plain"),
          text("bold", { type: "bold" }),
          text("both", { type: "italic" }, { type: "underline" }),
          text("gone", { type: "strike" }),
        ),
      ),
    );
    expect(block).toMatchObject({
      text: [
        { text: "plain" },
        { text: "bold", bold: true },
        { text: "both", italics: true, decoration: ["underline"] },
        { text: "gone", decoration: ["lineThrough"] },
      ],
    });
  });

  it("keeps links clickable", () => {
    const link = { type: "link", attrs: { href: "https://example.com" } };
    expect(pdfContent(doc(paragraph(text("site", link))))[0]).toMatchObject({
      text: [{ text: "site", link: "https://example.com" }],
    });
  });

  it("keeps line breaks and empty paragraphs", () => {
    const content = pdfContent(
      doc(paragraph(text("a"), { type: "hardBreak" }, text("b")), paragraph()),
    );
    expect(content[0]).toMatchObject({
      text: [{ text: "a" }, "\n", { text: "b" }],
    });
    expect(content[1]).toMatchObject({ text: " " });
  });

  it("sizes headings by level", () => {
    const heading = (level: number): JSONContent => ({
      type: "heading",
      attrs: { level },
      content: [text("Title")],
    });
    const sizes = pdfContent(doc(heading(1), heading(2), heading(3))).map(
      (block) => (block as { fontSize: number }).fontSize,
    );
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(new Set(sizes).size).toBe(3);
  });

  it("keeps nested lists and where a numbered list starts", () => {
    const item = (...content: JSONContent[]): JSONContent => ({
      type: "listItem",
      content,
    });
    const [list] = pdfContent(
      doc({
        type: "orderedList",
        attrs: { start: 3 },
        content: [
          item(paragraph(text("three"))),
          item(paragraph(text("four")), {
            type: "bulletList",
            content: [item(paragraph(text("nested")))],
          }),
        ],
      }),
    );
    expect(list).toMatchObject({
      start: 3,
      ol: [
        { stack: [{ text: [{ text: "three" }] }] },
        {
          stack: [
            { text: [{ text: "four" }] },
            { ul: [{ stack: [{ text: [{ text: "nested" }] }] }] },
          ],
        },
      ],
    });
  });

  it("keeps the text of quotes and code blocks", () => {
    const content = pdfContent(
      doc(
        { type: "blockquote", content: [paragraph(text("quoted"))] },
        { type: "codeBlock", content: [text("let a  = 1;")] },
      ),
    );
    expect(JSON.stringify(content[0])).toContain('"quoted"');
    expect(JSON.stringify(content[1])).toContain("let a  = 1;");
  });

  it("returns nothing for an empty document", () => {
    expect(pdfContent({ type: "doc" })).toEqual([]);
  });
});

describe("pdfFileName", () => {
  it("drops characters that aren't allowed in file names", () => {
    expect(pdfFileName('Q3: plan / "draft"?')).toBe("Q3 plan  draft.pdf");
  });

  it("falls back to a default name", () => {
    expect(pdfFileName(" /// ")).toBe("document.pdf");
  });
});
