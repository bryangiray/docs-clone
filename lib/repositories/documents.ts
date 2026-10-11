import "server-only";
import { query, toMs, type Row } from "@/lib/db/client";
import type {
  DocumentForUser,
  DocumentSummary,
  NewDocument,
  Role,
} from "@/lib/types";

// $1 is always the user the role is computed for: owner, or their share level.
const ROLE = `CASE WHEN d.owner_id = $1 THEN 'owner' ELSE s.permission_level END`;

const COLUMNS = `
  d.id, d.title, d.doc_type, d.owner_id, d.updated_at, ${ROLE} AS role,
  (SELECT a.user_id FROM document_activity a
    WHERE a.document_id = d.id AND a.action <> 'viewed'
    ORDER BY a.id DESC LIMIT 1) AS updated_by`;

const FROM = `
  FROM documents d
  LEFT JOIN document_shares s ON s.document_id = d.id AND s.user_id = $1`;

function toSummary(row: Row): DocumentSummary {
  return {
    id: Number(row.id),
    title: String(row.title),
    docType: String(row.doc_type ?? "rich-text"),
    ownerId: Number(row.owner_id),
    updatedAt: toMs(row.updated_at),
    updatedBy: row.updated_by == null ? null : Number(row.updated_by),
    role: row.role as Role,
  };
}

/** Documents the user owns or that are shared with them. */
export async function listDocumentsFor(
  userId: number,
): Promise<DocumentSummary[]> {
  const rows = await query(
    `SELECT ${COLUMNS} ${FROM}
     WHERE d.owner_id = $1 OR s.user_id IS NOT NULL
     ORDER BY d.updated_at DESC`,
    [userId],
  );
  return rows.map(toSummary);
}

/** Returns null when the document doesn't exist. */
export async function findDocumentFor(
  id: number,
  userId: number,
): Promise<DocumentForUser | null> {
  const [row] = await query(
    `SELECT ${COLUMNS}, d.content ${FROM} WHERE d.id = $2`,
    [userId, id],
  );
  if (!row) return null;
  return {
    ...toSummary(row),
    role: (row.role as Role | null) ?? null,
    content: String(row.content ?? ""),
  };
}

export async function findRole(
  id: number,
  userId: number,
): Promise<Role | null> {
  const [row] = await query(`SELECT ${ROLE} AS role ${FROM} WHERE d.id = $2`, [
    userId,
    id,
  ]);
  return (row?.role as Role | null | undefined) ?? null;
}

export async function insertDocument(
  ownerId: number,
  doc: NewDocument,
): Promise<number> {
  const [row] = await query(
    `INSERT INTO documents
       (title, content, doc_type, original_file_name, file_path, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      doc.title,
      doc.content,
      doc.docType,
      doc.originalFileName,
      doc.filePath,
      ownerId,
    ],
  );
  return Number(row.id);
}

export async function updateTitle(id: number, title: string): Promise<void> {
  await query(
    "UPDATE documents SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [title, id],
  );
}

export async function updateContent(
  id: number,
  content: string,
): Promise<void> {
  await query(
    "UPDATE documents SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [content, id],
  );
}

/**
 * Deletes the document; the database cascades to its shares, activity and
 * attachments. Returns the stored upload path, if any.
 */
export async function deleteDocument(id: number): Promise<string | null> {
  const [row] = await query(
    "DELETE FROM documents WHERE id = $1 RETURNING file_path",
    [id],
  );
  return row?.file_path == null ? null : String(row.file_path);
}
