"use server";

import { authorize } from "@/lib/auth/authorize";
import * as sharing from "@/lib/services/sharing";
import type { ShareLevel } from "@/lib/types";

export async function setShare(
  id: number,
  userId: number,
  level: ShareLevel | "none",
) {
  const owner = await authorize(id, "share");
  return { shares: await sharing.setShare(owner, id, userId, level) };
}
