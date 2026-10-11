import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findUserById } from "@/lib/repositories/users";
import type { User } from "@/lib/types";
import { SESSION_COOKIE } from "./session-cookie";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const getCurrentUser = cache(async (): Promise<User | undefined> => {
  const id = Number((await cookies()).get(SESSION_COOKIE)?.value);
  if (!Number.isInteger(id)) return undefined;
  return findUserById(id);
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function startSession(user: User): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, String(user.id), {
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
