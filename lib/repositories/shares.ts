import "server-only";
import { query } from "@/lib/db/client";
import type { Share, ShareLevel } from "@/lib/types";

export async function listShares(docId: number): Promise<Share[]> {
  const rows = await query(
    "SELECT user_id, permission_level FROM document_shares WHERE document_id = $1 ORDER BY user_id",
    [docId],
  );
  return rows.map((row) => ({
    userId: Number(row.user_id),
    level: row.permission_level as ShareLevel,
  }));
}

export async function upsertShare(
  docId: number,
  userId: number,
  level: ShareLevel,
): Promise<void> {
  await query(
    `INSERT INTO document_shares (document_id, user_id, permission_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id)
     DO UPDATE SET permission_level = EXCLUDED.permission_level`,
    [docId, userId, level],
  );
}

export async function deleteShare(
  docId: number,
  userId: number,
): Promise<void> {
  await query(
    "DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2",
    [docId, userId],
  );
}
