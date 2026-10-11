import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { listUsers } from "./db";
import type { User } from "./types";

export const SESSION_COOKIE = "docs_session";

export const getCurrentUser = cache(async (): Promise<User | undefined> => {
  const id = Number((await cookies()).get(SESSION_COOKIE)?.value);
  if (!Number.isInteger(id)) return undefined;
  return (await listUsers()).find((user) => user.id === id);
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
