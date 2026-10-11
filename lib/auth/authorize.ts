import "server-only";
import { can, type Capability } from "@/lib/permissions";
import { findRole } from "@/lib/repositories/documents";
import type { User } from "@/lib/types";
import { requireUser } from "./session";

/**
 * Resolves the signed-in user and checks they may do `capability` on the
 * document. Every Server Action that touches a document goes through this.
 */
export async function authorize(
  docId: number,
  capability: Capability,
): Promise<User> {
  const user = await requireUser();
  if (!Number.isInteger(docId)) throw new Error("Document not found");
  if (!can(await findRole(docId, user.id), capability)) {
    throw new Error("You don't have permission to do that");
  }
  return user;
}
