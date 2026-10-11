"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth/session";
import { findUserByUsername } from "@/lib/repositories/users";
import { normalizeUsername } from "@/lib/services/users";

export type SignInState = { error?: string };

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  if (!username) return { error: "Enter your username." };
  const user = await findUserByUsername(username);
  if (!user) return { error: `No account found for “${username}”.` };

  await startSession(user);
  redirect("/dashboard");
}

export async function signOut() {
  await endSession();
  redirect("/sign-in");
}
