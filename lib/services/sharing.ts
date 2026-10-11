import "server-only";
import { deleteShare, listShares, upsertShare } from "@/lib/repositories/shares";
import { findUserById } from "@/lib/repositories/users";
import type { Share, ShareLevel, User } from "@/lib/types";

const LEVELS: readonly string[] = ["editor", "viewer"] satisfies ShareLevel[];

/** Grants, changes or (with "none") removes one user's access. */
export async function setShare(
  owner: User,
  docId: number,
  userId: number,
  level: ShareLevel | "none",
): Promise<Share[]> {
  if (userId === owner.id) throw new Error("The owner always has access");
  if (!(await findUserById(userId))) throw new Error("Unknown user");

  if (level === "none") {
    await deleteShare(docId, userId);
  } else if (LEVELS.includes(level)) {
    await upsertShare(docId, userId, level);
  } else {
    throw new Error("Unknown permission level");
  }
  return listShares(docId);
}
