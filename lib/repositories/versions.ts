import "server-only";
import { query, toMs } from "@/lib/db/client";
import type { VersionSummary } from "@/lib/types";

/** Newest first, without the content. */
export async function listVersions(
  docId: number,
  limit = 100,
): Promise<VersionSummary[]> {
  const rows = await query(
    `SELECT id, user_id, updated_at FROM document_versions
     WHERE document_id = $1 ORDER BY id DESC LIMIT $2`,
    [docId, limit],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    at: toMs(row.updated_at),
  }));
}

export async function findVersionContent(
  docId: number,
  versionId: number,
): Promise<string | undefined> {
  const [row] = await query(
    "SELECT content FROM document_versions WHERE id = $2 AND document_id = $1",
    [docId, versionId],
  );
  return row && String(row.content);
}

export async function insertVersion(
  docId: number,
  userId: number,
  content: string,
): Promise<void> {
  await query(
    "INSERT INTO document_versions (document_id, user_id, content) VALUES ($1, $2, $3)",
    [docId, userId, content],
  );
}

/**
 * Records an autosave. While the same person keeps editing, their latest
 * version is refreshed in place and a new one starts every 10 minutes, so
 * autosave doesn't add a version per keystroke. A document's first version is
 * never refreshed: it keeps the content the document started with.
 */
export async function saveVersion(
  docId: number,
  userId: number,
  content: string,
): Promise<void> {
  await query(
    `WITH last AS (
       SELECT id, user_id, created_at FROM document_versions
       WHERE document_id = $1::int ORDER BY id DESC LIMIT 1
     ), refreshed AS (
       UPDATE document_versions v
       SET content = $3::text, updated_at = CURRENT_TIMESTAMP
       FROM last
       WHERE v.id = last.id AND last.user_id = $2::int
         AND last.created_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
         AND EXISTS (SELECT 1 FROM document_versions f
                     WHERE f.document_id = $1::int AND f.id < last.id)
       RETURNING v.id
     )
     INSERT INTO document_versions (document_id, user_id, content)
     SELECT $1::int, $2::int, $3::text
     WHERE NOT EXISTS (SELECT 1 FROM refreshed)`,
    [docId, userId, content],
  );
}
