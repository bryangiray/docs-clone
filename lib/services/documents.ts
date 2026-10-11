import "server-only";
import {
  DEFAULT_TITLE,
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
} from "@/lib/limits";
import { listActivity, logActivity } from "@/lib/repositories/activity";
import * as documents from "@/lib/repositories/documents";
import { insertVersion, saveVersion } from "@/lib/repositories/versions";
import { uploadStorage } from "@/lib/storage/uploads";
import type { ActivityEntry, NewDocument, User } from "@/lib/types";

// Callers are expected to have authorized `actor` for the document already
// (see lib/auth/authorize.ts).

const BLANK_DOCUMENT: NewDocument = {
  title: DEFAULT_TITLE,
  content: "",
  docType: "rich-text",
  originalFileName: null,
  filePath: null,
};

export async function createDocument(
  owner: User,
  doc: NewDocument = BLANK_DOCUMENT,
): Promise<number> {
  const id = await documents.insertDocument(owner.id, doc);
  await logActivity(id, owner.id, "created");
  // Keep what an imported document started with.
  if (doc.content) await insertVersion(id, owner.id, doc.content);
  return id;
}

export async function renameDocument(
  actor: User,
  id: number,
  title: string,
): Promise<{ title: string; activity: ActivityEntry[] }> {
  const clean =
    String(title).trim().slice(0, MAX_TITLE_LENGTH) || DEFAULT_TITLE;
  await documents.updateTitle(id, clean);
  await logActivity(id, actor.id, "renamed");
  return { title: clean, activity: await listActivity(id) };
}

export async function saveContent(
  actor: User,
  id: number,
  content: string,
): Promise<ActivityEntry[]> {
  if (typeof content !== "string" || content.length > MAX_CONTENT_LENGTH) {
    throw new Error("Document is too large to save");
  }
  await documents.updateContent(id, content);
  await saveVersion(id, actor.id, content);
  await logActivity(id, actor.id, "edited");
  return listActivity(id);
}

export async function recordView(
  actor: User,
  id: number,
): Promise<ActivityEntry[]> {
  await logActivity(id, actor.id, "viewed");
  return listActivity(id);
}

export async function deleteDocument(id: number): Promise<void> {
  const storedPath = await documents.deleteDocument(id);
  if (storedPath) await uploadStorage.remove(storedPath);
}
