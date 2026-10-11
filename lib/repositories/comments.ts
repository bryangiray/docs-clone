import "server-only";
import { query, toMs } from "@/lib/db/client";
import type { Comment } from "@/lib/types";

/** Oldest first, so a thread's replies read top to bottom. */
export async function listComments(docId: number): Promise<Comment[]> {
  const rows = await query(
    `SELECT id, user_id, parent_id, body, quote, quote_offset, resolved, created_at
     FROM document_comments WHERE document_id = $1 ORDER BY id`,
    [docId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    parentId: row.parent_id == null ? null : Number(row.parent_id),
    body: String(row.body),
    quote: row.quote == null ? null : String(row.quote),
    quoteOffset: row.quote_offset == null ? null : Number(row.quote_offset),
    resolved: Boolean(row.resolved),
    at: toMs(row.created_at),
  }));
}

export async function insertComment(
  docId: number,
  userId: number,
  body: string,
  quote: string | null,
  quoteOffset: number | null,
): Promise<void> {
  await query(
    `INSERT INTO document_comments (document_id, user_id, body, quote, quote_offset)
     VALUES ($1, $2, $3, $4, $5)`,
    [docId, userId, body, quote, quoteOffset],
  );
}

/** Returns false when `parentId` isn't the first comment of a thread here. */
export async function insertReply(
  docId: number,
  userId: number,
  parentId: number,
  body: string,
): Promise<boolean> {
  const rows = await query(
    `INSERT INTO document_comments (document_id, user_id, parent_id, body)
     SELECT document_id, $2, id, $4 FROM document_comments
     WHERE id = $3 AND document_id = $1 AND parent_id IS NULL
     RETURNING id`,
    [docId, userId, parentId, body],
  );
  return rows.length > 0;
}

export async function setResolved(
  docId: number,
  commentId: number,
  resolved: boolean,
): Promise<void> {
  await query(
    `UPDATE document_comments SET resolved = $3
     WHERE id = $2 AND document_id = $1 AND parent_id IS NULL`,
    [docId, commentId, resolved],
  );
}

/**
 * Deletes a comment written by `userId`, or any comment when they own the
 * document; replies go with their thread. Returns whether one was deleted.
 */
export async function deleteCommentAs(
  docId: number,
  commentId: number,
  userId: number,
): Promise<boolean> {
  const rows = await query(
    `DELETE FROM document_comments c USING documents d
     WHERE c.id = $2 AND c.document_id = $1 AND d.id = c.document_id
       AND (c.user_id = $3 OR d.owner_id = $3)
     RETURNING c.id`,
    [docId, commentId, userId],
  );
  return rows.length > 0;
}
