import "server-only";
import { query } from "@/lib/db/client";
import type { Presence } from "@/lib/types";

// The editor sends a heartbeat every few seconds; anyone not heard from for
// this long has left or put the tab in the background.
const STALE_AFTER = "12 seconds";

export async function touchPresence(
  docId: number,
  userId: number,
  editing: boolean,
): Promise<void> {
  await query(
    `INSERT INTO document_presence (document_id, user_id, editing)
     VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id)
     DO UPDATE SET editing = EXCLUDED.editing, last_seen_at = CURRENT_TIMESTAMP`,
    [docId, userId, editing],
  );
}

export async function clearPresence(
  docId: number,
  userId: number,
): Promise<void> {
  await query(
    "DELETE FROM document_presence WHERE document_id = $1 AND user_id = $2",
    [docId, userId],
  );
}

/** Everyone but `userId` who currently has the document open. */
export async function listOthersPresent(
  docId: number,
  userId: number,
): Promise<Presence[]> {
  const rows = await query(
    `SELECT user_id, editing FROM document_presence
     WHERE document_id = $1 AND user_id <> $2
       AND last_seen_at > CURRENT_TIMESTAMP - INTERVAL '${STALE_AFTER}'
     ORDER BY user_id`,
    [docId, userId],
  );
  return rows.map((row) => ({
    userId: Number(row.user_id),
    editing: Boolean(row.editing),
  }));
}
