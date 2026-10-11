import "server-only";
import { query } from "@/lib/db/client";
import { toMs } from "@/lib/db/client";
import type { ActivityAction, ActivityEntry } from "@/lib/types";

// A repeated view/edit by the same user within 30 minutes refreshes the latest
// log row instead of adding one, so autosave doesn't flood the log.
export async function logActivity(
  docId: number,
  userId: number,
  action: ActivityAction,
): Promise<void> {
  await query(
    `WITH last AS (
       SELECT id, user_id, action, created_at FROM document_activity
       WHERE document_id = $1::int ORDER BY id DESC LIMIT 1
     ), bumped AS (
       UPDATE document_activity a SET created_at = CURRENT_TIMESTAMP
       FROM last
       WHERE a.id = last.id AND last.user_id = $2::int
         AND last.action = $3::varchar
         AND last.created_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
       RETURNING a.id
     )
     INSERT INTO document_activity (document_id, user_id, action)
     SELECT $1::int, $2::int, $3::varchar
     WHERE NOT EXISTS (SELECT 1 FROM bumped)`,
    [docId, userId, action],
  );
}

export async function listActivity(
  docId: number,
  limit = 100,
): Promise<ActivityEntry[]> {
  const rows = await query(
    "SELECT id, user_id, action, created_at FROM document_activity WHERE document_id = $1 ORDER BY id DESC LIMIT $2",
    [docId, limit],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    action: row.action as ActivityAction,
    at: toMs(row.created_at),
  }));
}
