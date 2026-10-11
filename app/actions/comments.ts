"use server";

import { authorize } from "@/lib/auth/authorize";
import { UserError } from "@/lib/errors";
import * as comments from "@/lib/services/comments";
import type { Comment, NewComment } from "@/lib/types";

export type CommentsResult = { comments?: Comment[]; error?: string };

// Expected failures come back as `error` so their message reaches the person;
// thrown errors are hidden from the browser in production.
async function run(work: () => Promise<Comment[]>): Promise<CommentsResult> {
  try {
    return { comments: await work() };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}

export async function addComment(id: number, input: NewComment) {
  const user = await authorize(id, "comment");
  return run(() => comments.addComment(user, id, input));
}

export async function resolveComment(
  id: number,
  commentId: number,
  resolved: boolean,
) {
  await authorize(id, "comment");
  return run(() => comments.setResolved(id, commentId, resolved));
}

export async function deleteComment(id: number, commentId: number) {
  const user = await authorize(id, "comment");
  return run(() => comments.deleteComment(user, id, commentId));
}
