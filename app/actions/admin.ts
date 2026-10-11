"use server";

import { refresh } from "next/cache";
import { UserError } from "@/lib/errors";
import { updateAllowedExtensions as saveExtensions } from "@/lib/services/settings";
import { normalizeUsername, registerUser } from "@/lib/services/users";

export type AddUserState = {
  error?: string;
  added?: string;
  username?: string;
  displayName?: string;
};

export async function addUser(
  _previous: AddUserState,
  formData: FormData,
): Promise<AddUserState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const displayName = String(formData.get("displayName") ?? "").trim();
  try {
    await registerUser(username, displayName);
  } catch (error) {
    if (error instanceof UserError) {
      return { username, displayName, error: error.message };
    }
    throw error;
  }
  refresh();
  return { added: `${displayName} (${username})` };
}

export type ExtensionsState = { error?: string; saved?: string; value?: string };

export async function updateAllowedExtensions(
  _previous: ExtensionsState,
  formData: FormData,
): Promise<ExtensionsState> {
  const value = String(formData.get("extensions") ?? "");
  let saved: string;
  try {
    saved = await saveExtensions(value);
  } catch (error) {
    if (error instanceof UserError) return { value, error: error.message };
    throw error;
  }
  refresh();
  return { saved };
}
