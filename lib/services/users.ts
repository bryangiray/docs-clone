import "server-only";
import { UserError } from "@/lib/errors";
import { insertUser } from "@/lib/repositories/users";

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function registerUser(
  username: string,
  displayName: string,
): Promise<void> {
  if (!/^[a-z0-9._-]{2,50}$/.test(username)) {
    throw new UserError(
      "Username must be 2–50 characters: letters, numbers, dot, dash or underscore.",
    );
  }
  if (!displayName || displayName.length > 100) {
    throw new UserError("Display name must be 1–100 characters.");
  }
  if (!(await insertUser(username, displayName))) {
    throw new UserError(`Username “${username}” is already taken.`);
  }
}
