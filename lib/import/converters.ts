import "server-only";
import mammoth from "mammoth";
import { marked } from "marked";

/** Turns the bytes of an uploaded file into the HTML the editor stores. */
export type DocumentConverter = (bytes: Buffer) => Promise<string>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Throws on anything that isn't UTF-8 text, such as a PDF or an image.
function decodeText(bytes: Buffer): string {
  const text = new TextDecoder("utf-8", { fatal: true })
    .decode(bytes)
    .replace(/^﻿/, "");
  if (text.includes("\0")) throw new Error("Not a text file");
  return text;
}

const convertWord: DocumentConverter = async (bytes) => {
  const result = await mammoth.convertToHtml(
    { buffer: bytes },
    { styleMap: ["u => u"] },
  );
  // The editor has no image support, so don't store embedded image data.
  return result.value.replace(/<img\b[^>]*>/gi, "");
};

const convertMarkdown: DocumentConverter = async (bytes) =>
  marked.parse(decodeText(bytes), { gfm: true });

const convertPlainText: DocumentConverter = async (bytes) =>
  decodeText(bytes)
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

// Formats that keep their formatting. To support a new one, register its
// converter here; nothing else needs to change.
const CONVERTERS: Record<string, DocumentConverter> = {
  docx: convertWord,
  md: convertMarkdown,
  markdown: convertMarkdown,
};

/** Any extension without its own converter is imported as plain text. */
export function converterFor(extension: string): DocumentConverter {
  return CONVERTERS[extension] ?? convertPlainText;
}
