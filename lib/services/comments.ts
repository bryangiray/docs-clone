import "server-only";
import { UserError } from "@/lib/errors";
import { MAX_COMMENT_LENGTH, MAX_QUOTE_LENGTH } from "@/lib/limits";
import * as comments from "@/lib/repositories/comments";
import type { Comment, NewComment, User } from "@/lib/types";

// Callers are expected to have authorized `actor` for the document already
// (see lib/auth/authorize.ts).

export async function addComment(
  actor: User,
  docId: number,
  input: NewComment,
): Promise<Comment[]> {
  const body = String(input.body ?? "").trim();
  if (!body) throw new UserError("Write a comment first.");
  if (body.length > MAX_COMMENT_LENGTH) {
    throw new UserError(
      `Comments can be up to ${MAX_COMMENT_LENGTH} characters long.`,
    );
  }

  if (input.parentId != null) {
    if (!(await comments.insertReply(docId, actor.id, input.parentId, body))) {
      throw new UserError("That comment was deleted.");
    }
  } else {
    const quote =
      typeof input.quote === "string" && input.quote.trim()
        ? input.quote.slice(0, MAX_QUOTE_LENGTH)
        : null;
    const offset = Number.isInteger(input.quoteOffset)
      ? Math.max(0, input.quoteOffset as number)
      : null;
    await comments.insertComment(
      docId,
      actor.id,
      body,
      quote,
      quote === null ? null : offset,
    );
  }
  return comments.listComments(docId);
}

export async function setResolved(
  docId: number,
  commentId: number,
  resolved: boolean,
): Promise<Comment[]> {
  await comments.setResolved(docId, commentId, Boolean(resolved));
  return comments.listComments(docId);
}

/** People delete their own comments; the document's owner can delete any. */
export async function deleteComment(
  actor: User,
  docId: number,
  commentId: number,
): Promise<Comment[]> {
  if (!(await comments.deleteCommentAs(docId, commentId, actor.id))) {
    throw new UserError("You can only delete your own comments.");
  }
  return comments.listComments(docId);
}
