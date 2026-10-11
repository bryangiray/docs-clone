import "server-only";
import { query, type Row } from "@/lib/db/client";
import type { User } from "@/lib/types";

const COLUMNS = "id, username, display_name";

function toUser(row: Row): User {
  return {
    id: Number(row.id),
    username: String(row.username),
    name: String(row.display_name),
  };
}

export async function listUsers(): Promise<User[]> {
  return (await query(`SELECT ${COLUMNS} FROM users ORDER BY id`)).map(toUser);
}

export async function findUserById(id: number): Promise<User | undefined> {
  const [row] = await query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return row && toUser(row);
}

export async function findUserByUsername(
  username: string,
): Promise<User | undefined> {
  const [row] = await query(
    `SELECT ${COLUMNS} FROM users WHERE LOWER(username) = LOWER($1)`,
    [username],
  );
  return row && toUser(row);
}

/** Returns false when the username is already taken. */
export async function insertUser(
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
