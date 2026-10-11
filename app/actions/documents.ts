"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth/authorize";
import { requireUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { importDocument } from "@/lib/services/document-import";
import * as documents from "@/lib/services/documents";

export async function createDocument() {
  const id = await documents.createDocument(await requireUser());
  redirect(`/d/${id}`);
}

export type UploadState = { error?: string };

export async function uploadDocument(
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireUser();
  const file = formData.get("file");
  let id: number;
  try {
    id = await importDocument(
      user,
      file instanceof File ? file : null,
      formData.has("tooLarge"),
    );
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
  redirect(`/d/${id}`);
}

export async function renameDocument(id: number, title: string) {
  return documents.renameDocument(await authorize(id, "edit"), id, title);
}

export async function saveDocument(id: number, content: string) {
  const user = await authorize(id, "edit");
  return { activity: await documents.saveContent(user, id, content) };
}

export async function recordView(id: number) {
  const user = await authorize(id, "view");
  return { activity: await documents.recordView(user, id) };
}

export async function deleteDocument(id: number) {
  await authorize(id, "delete");
  await documents.deleteDocument(id);
  refresh();
}
