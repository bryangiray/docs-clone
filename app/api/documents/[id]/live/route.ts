import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { listComments } from "@/lib/repositories/comments";
import { findRole } from "@/lib/repositories/documents";
import {
  clearPresence,
  listOthersPresent,
  touchPresence,
} from "@/lib/repositories/presence";

type Context = RouteContext<"/api/documents/[id]/live">;

// Resolves the caller and the document, or the error response to send back.
async function resolve(context: Context) {
  const user = await getCurrentUser();
  if (!user) return { error: new Response(null, { status: 401 }) };

  const docId = Number((await context.params).id);
  const role = Number.isInteger(docId) ? await findRole(docId, user.id) : null;
  if (!can(role, "view")) return { error: new Response(null, { status: 403 }) };
  return { user, docId };
}

/**
 * Heartbeat from an open editor: records that the caller is here (and whether
 * they are typing) and returns what may have changed since the last one.
 */
export async function POST(request: NextRequest, context: Context) {
  const resolved = await resolve(context);
  if (resolved.error) return resolved.error;
  const { user, docId } = resolved;

  const body = await request.json().catch(() => null);
  await touchPresence(docId, user.id, body?.editing === true);

  const [presence, comments] = await Promise.all([
    listOthersPresent(docId, user.id),
    listComments(docId),
  ]);
  return Response.json({ presence, comments });
}

/** Sent when the editor is closed, so the caller disappears right away. */
export async function DELETE(_request: NextRequest, context: Context) {
  const resolved = await resolve(context);
  if (resolved.error) return resolved.error;
  await clearPresence(resolved.docId, resolved.user.id);
  return new Response(null, { status: 204 });
}
