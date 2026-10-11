import "server-only";
import { Pool } from "pg";
import type {
  ActivityAction,
  DocType,
  ActivityEntry,
  DocumentRecord,
  DocumentSummary,
  Role,
  Share,
  ShareLevel,
  User,
} from "./types";

const AVATAR_COLORS = [
  "#1a73e8",
  "#d93025",
  "#188038",
  "#e37400",
  "#9334e6",
  "#00796b",
];

// Cached on globalThis so dev hot reloads reuse one pool.
const globalForDb = globalThis as unknown as { docsPool?: Pool };

function pool(): Pool {
  return (globalForDb.docsPool ??= new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgres://localhost:5432/docs_app_db",
  }));
}

type Row = Record<string, unknown>;

async function query(text: string, values: unknown[] = []): Promise<Row[]> {
  return (await pool().query(text, values)).rows;
}

function toMs(value: unknown): number {
  return value instanceof Date ? value.getTime() : 0;
}

export async function listUsers(): Promise<User[]> {
  const rows = await query(
    "SELECT id, username, display_name FROM users ORDER BY id",
  );
  return rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    name: String(row.display_name),
    color: AVATAR_COLORS[(Number(row.id) - 1) % AVATAR_COLORS.length],
  }));
}

const ALLOWED_EXTENSIONS_KEY = "allowed_extensions";
const DEFAULT_ALLOWED_EXTENSIONS = ["txt", "docx", "md"];

/** Upload extensions from global_settings, stored as "txt|docx|md". */
export async function getAllowedExtensions(): Promise<string[]> {
  const [row] = await query(
    "SELECT setting_value FROM global_settings WHERE setting_key = $1",
    [ALLOWED_EXTENSIONS_KEY],
  );
  if (!row) return DEFAULT_ALLOWED_EXTENSIONS;
  return String(row.setting_value)
    .split("|")
    .map((extension) => extension.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

export async function setAllowedExtensions(
  extensions: string[],
): Promise<void> {
  await query(
    `INSERT INTO global_settings (setting_key, setting_value)
     VALUES ($1, $2)
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value,
                   updated_at = CURRENT_TIMESTAMP`,
    [ALLOWED_EXTENSIONS_KEY, extensions.join("|")],
  );
}

/** Returns false when the username is already taken. */
export async function createUser(
  username: string,
  displayName: string,
): Promise<boolean> {
  const rows = await query(
    `INSERT INTO users (username, display_name) VALUES ($1, $2)
     ON CONFLICT (username) DO NOTHING RETURNING id`,
    [username, displayName],
  );
  return rows.length > 0;
}

// Role of the given user on each document: owner, or their share level.
const DOCUMENT_COLUMNS = `
  d.id, d.title, d.doc_type, d.owner_id, d.updated_at,
  CASE WHEN d.owner_id = $1 THEN 'owner' ELSE s.permission_level END AS role,
  (SELECT a.user_id FROM document_activity a
    WHERE a.document_id = d.id AND a.action <> 'viewed'
    ORDER BY a.id DESC LIMIT 1) AS updated_by`;

const DOCUMENT_FROM = `
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
    `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_FROM}
     WHERE d.owner_id = $1 OR s.user_id IS NOT NULL
     ORDER BY d.updated_at DESC`,
    [userId],
  );
  return rows.map(toSummary);
}

/**
 * Returns `null` when the document doesn't exist and `{ role: null }` when it
 * exists but the user has no access to it.
 */
export async function getDocumentFor(
  id: number,
  userId: number,
): Promise<(Omit<DocumentRecord, "role"> & { role: Role | null }) | null> {
  const [row] = await query(
    `SELECT ${DOCUMENT_COLUMNS}, d.content ${DOCUMENT_FROM} WHERE d.id = $2`,
    [userId, id],
  );
  if (!row) return null;
  return {
    ...toSummary(row),
    role: (row.role as Role | null) ?? null,
    content: String(row.content ?? ""),
  };
}

export async function getRole(
  id: number,
  userId: number,
): Promise<Role | null> {
  const [row] = await query(
    `SELECT CASE WHEN d.owner_id = $1 THEN 'owner' ELSE s.permission_level END AS role
     ${DOCUMENT_FROM} WHERE d.id = $2`,
    [userId, id],
  );
  return (row?.role as Role | null | undefined) ?? null;
}

type NewDocument = {
  title: string;
  content: string;
  docType: DocType;
  originalFileName: string | null;
  filePath: string | null;
};

const BLANK_DOCUMENT: NewDocument = {
  title: "Untitled document",
  content: "",
  docType: "rich-text",
  originalFileName: null,
  filePath: null,
};

export async function createDocument(
  ownerId: number,
  doc: NewDocument = BLANK_DOCUMENT,
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
  const id = Number(row.id);
  await logActivity(id, ownerId, "created");
  return id;
}

/**
 * Deletes the document along with its shares, activity and attachments
 * (cascaded by the database). Returns the stored upload path, if any.
 */
export async function deleteDocument(id: number): Promise<string | null> {
  const [row] = await query(
    "DELETE FROM documents WHERE id = $1 RETURNING file_path",
    [id],
  );
  return row?.file_path == null ? null : String(row.file_path);
}

export async function renameDocument(
  id: number,
  title: string,
  userId: number,
): Promise<void> {
  await query(
    "UPDATE documents SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [title, id],
  );
  await logActivity(id, userId, "renamed");
}

export async function saveDocumentContent(
  id: number,
  content: string,
  userId: number,
): Promise<void> {
  await query(
    "UPDATE documents SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [content, id],
  );
  await logActivity(id, userId, "edited");
}

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

export async function setShare(
  docId: number,
  userId: number,
  level: ShareLevel | null,
): Promise<void> {
  if (level === null) {
    await query(
      "DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2",
      [docId, userId],
    );
    return;
  }
  await query(
    `INSERT INTO document_shares (document_id, user_id, permission_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id)
     DO UPDATE SET permission_level = EXCLUDED.permission_level`,
    [docId, userId, level],
  );
}
