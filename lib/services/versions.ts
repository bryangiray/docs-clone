import "server-only";
import { UserError } from "@/lib/errors";
import { logActivity } from "@/lib/repositories/activity";
import { updateContent } from "@/lib/repositories/documents";
import * as versions from "@/lib/repositories/versions";
import type { User } from "@/lib/types";

// Callers are expected to have authorized `actor` for the document already
// (see lib/auth/authorize.ts).

export async function getVersionContent(
  docId: number,
  versionId: number,
): Promise<string> {
  const content = await versions.findVersionContent(docId, versionId);
  if (content === undefined) throw new UserError("That version no longer exists.");
  return content;
}

/**
 * Makes an old version the current content. It is added as a new version, so
 * nothing in the history is lost and a restore can itself be undone.
 */
export async function restoreVersion(
  actor: User,
  docId: number,
  versionId: number,
): Promise<void> {
  const content = await getVersionContent(docId, versionId);
  await updateContent(docId, content);
  await versions.insertVersion(docId, actor.id, content);
  await logActivity(docId, actor.id, "restored");
}
