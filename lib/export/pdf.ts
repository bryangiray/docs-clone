import type { JSONContent } from "@tiptap/react";
import type {
  Content,
  ContentText,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

// US Letter with one-inch margins, in points.
const PAGE_MARGIN = 72;
const CONTENT_WIDTH = 612 - 2 * PAGE_MARGIN;

const HEADING_SIZE: Record<number, number> = { 1: 20, 2: 16, 3: 13 };

function inline(nodes: JSONContent[] = []): Content[] {
  return nodes.map((node) => {
    if (node.type === "hardBreak") return "\n";
    const run: ContentText = { text: node.text ?? "" };
    const decoration: ("underline" | "lineThrough")[] = [];
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") run.bold = true;
      if (mark.type === "italic") run.italics = true;
      if (mark.type === "underline") decoration.push("underline");
      if (mark.type === "strike") decoration.push("lineThrough");
      if (mark.type === "code") run.background = "#f1f3f4";
      if (mark.type === "link" && typeof mark.attrs?.href === "string") {
        run.link = mark.attrs.href;
        run.color = "#1a73e8";
        decoration.push("underline");
      }
    }
    if (decoration.length > 0) run.decoration = decoration;
    return run;
  });
}

function plainText(node: JSONContent): string {
  return node.text ?? (node.content ?? []).map(plainText).join("");
}

function blocks(nodes: JSONContent[] = []): Content[] {
  return nodes.flatMap((node): Content[] => {
    switch (node.type) {
      case "paragraph":
        // An empty paragraph still takes up a line.
        return [
          {
            text: node.content ? inline(node.content) : " ",
            margin: [0, 0, 0, 7],
          },
        ];
      case "heading": {
        const fontSize = HEADING_SIZE[node.attrs?.level] ?? HEADING_SIZE[3];
        return [
          {
            text: inline(node.content),
            fontSize,
            bold: true,
            lineHeight: 1.15,
            margin: [0, fontSize * 0.6, 0, 6],
          },
        ];
      }
      case "bulletList":
        return [{ ul: listItems(node), margin: [0, 0, 0, 7] }];
      case "orderedList":
        return [
          {
            ol: listItems(node),
            start: node.attrs?.start ?? 1,
            margin: [0, 0, 0, 7],
          },
        ];
      case "blockquote":
        return [
          {
            table: {
              widths: ["*"],
              body: [[{ stack: blocks(node.content), color: "#5f6368" }]],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: (index) => (index === 0 ? 2 : 0),
              vLineColor: () => "#dadce0",
              paddingLeft: () => 10,
              paddingTop: () => 2,
              paddingBottom: () => 0,
            },
            margin: [0, 0, 0, 7],
          },
        ];
      case "codeBlock":
        return [
          {
            table: {
              widths: ["*"],
              body: [
                [
                  {
                    text: plainText(node) || " ",
                    fontSize: 9,
                    preserveLeadingSpaces: true,
                    fillColor: "#f1f3f4",
                    margin: [6, 4, 6, 4],
                  },
                ],
              ],
            },
            layout: "noBorders",
            margin: [0, 0, 0, 7],
          },
        ];
      case "horizontalRule":
        return [
          {
            canvas: [
              {
                type: "line",
                x1: 0,
                y1: 0,
                x2: CONTENT_WIDTH,
                y2: 0,
                lineWidth: 0.75,
                lineColor: "#dadce0",
              },
            ],
            margin: [0, 8, 0, 12],
          },
        ];
      default:
        // An unknown block: keep whatever it contains.
        return blocks(node.content);
    }
  });
}

function listItems(list: JSONContent): Content[] {
  return (list.content ?? []).map((item) => ({ stack: blocks(item.content) }));
}

/** The document as pdfmake content. */
export function pdfContent(doc: JSONContent): Content[] {
  return blocks(doc.content);
}

export function pdfFileName(title: string): string {
  const clean = title.replace(/[\\/:*?"<>|]/g, "").trim();
  return `${clean || "document"}.pdf`;
}

/**
 * Builds a PDF from the editor's content (`editor.getJSON()`) and downloads
 * it. The PDF library is large, so it's only loaded when someone exports.
 */
export async function downloadPdf(
  title: string,
  doc: JSONContent,
): Promise<void> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  // Missing from the published type definitions.
  (
    pdfMake as typeof pdfMake & { addVirtualFileSystem(vfs: unknown): void }
  ).addVirtualFileSystem(fonts);

  const definition: TDocumentDefinitions = {
    info: { title },
    pageSize: "LETTER",
    pageMargins: PAGE_MARGIN,
    defaultStyle: { fontSize: 11, lineHeight: 1.3 },
    content: pdfContent(doc),
  };
  await pdfMake.createPdf(definition).download(pdfFileName(title));
}
