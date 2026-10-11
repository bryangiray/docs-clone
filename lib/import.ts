import "server-only";
import mammoth from "mammoth";
import { marked } from "marked";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type ImportedFile = { title: string; html: string };

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

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/**
 * Converts an uploaded file into the HTML the editor stores. Word and
 * Markdown files keep their formatting; any other extension the admin allows
 * is imported as plain text.
 */
export async function convertUpload(
  fileName: string,
  bytes: Buffer,
): Promise<ImportedFile> {
  const extension = extensionOf(fileName);
  const title =
    fileName.replace(/\.[^.]+$/, "").trim().slice(0, 200) ||
    "Untitled document";

  let html: string;
  if (extension === "docx") {
    const result = await mammoth.convertToHtml(
      { buffer: bytes },
      { styleMap: ["u => u"] },
    );
    // The editor has no image support, so don't store embedded image data.
    html = result.value.replace(/<img\b[^>]*>/gi, "");
  } else if (extension === "md" || extension === "markdown") {
    html = await marked.parse(decodeText(bytes), { gfm: true });
  } else {
    html = decodeText(bytes)
      .split(/\r?\n/)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("");
  }

  return { title, html };
}
