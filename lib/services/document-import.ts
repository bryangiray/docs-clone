import "server-only";
import { UserError } from "@/lib/errors";
import { converterFor } from "@/lib/import/converters";
import {
  DEFAULT_TITLE,
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
} from "@/lib/limits";
import { uploadStorage } from "@/lib/storage/uploads";
import type { User } from "@/lib/types";
import { createDocument } from "./documents";
import { getAllowedExtensions } from "./settings";

const TOO_LARGE = "That file is larger than 10 MB.";

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

function titleOf(fileName: string): string {
  return (
    fileName.replace(/\.[^.]+$/, "").trim().slice(0, MAX_TITLE_LENGTH) ||
    DEFAULT_TITLE
  );
}

/** Turns an uploaded file into a new document owned by `owner`. */
export async function importDocument(
  owner: User,
  file: File | null,
  flaggedTooLarge: boolean,
): Promise<number> {
  if (flaggedTooLarge) throw new UserError(TOO_LARGE);
  if (!file || file.size === 0) throw new UserError("Choose a file to upload.");

  const extension = extensionOf(file.name);
  const allowed = await getAllowedExtensions();
  if (!allowed.includes(extension)) {
    const list = allowed.map((allowedExtension) => `.${allowedExtension}`);
    throw new UserError(`Only ${list.join(", ")} files can be uploaded.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new UserError(TOO_LARGE);

  const bytes = Buffer.from(await file.arrayBuffer());
  let content: string;
  try {
    content = await converterFor(extension)(bytes);
  } catch {
    throw new UserError(
      `Couldn't read “${file.name}” as a .${extension} document.`,
    );
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new UserError("That document is too long to import.");
  }

  return createDocument(owner, {
    title: titleOf(file.name),
    content,
    docType: extension,
    originalFileName: file.name.slice(0, 255),
    filePath: await uploadStorage.save(bytes, extension),
  });
}
