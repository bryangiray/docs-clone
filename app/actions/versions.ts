"use server";

import { authorize } from "@/lib/auth/authorize";
import { UserError } from "@/lib/errors";
import * as versions from "@/lib/services/versions";

export type VersionResult = { content?: string; error?: string };

export async function loadVersion(
  id: number,
  versionId: number,
): Promise<VersionResult> {
  await authorize(id, "view");
  try {
    return { content: await versions.getVersionContent(id, versionId) };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}

export async function restoreVersion(
  id: number,
  versionId: number,
): Promise<{ error?: string }> {
  const user = await authorize(id, "edit");
  try {
    await versions.restoreVersion(user, id, versionId);
    return {};
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}
