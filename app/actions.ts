"use server";

import { refresh } from "next/cache";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { convertUpload, extensionOf, MAX_UPLOAD_BYTES } from "@/lib/import";
import { requireUser, SESSION_COOKIE } from "@/lib/session";
import type { Role, ShareLevel } from "@/lib/types";

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 2_000_000;

async function requireRole(docId: number, allowed: Role[]) {
  const user = await requireUser();
  if (!Number.isInteger(docId)) throw new Error("Document not found");
  const role = await db.getRole(docId, user.id);
  if (!role || !allowed.includes(role)) {
    throw new Error("You don't have permission to do that");
  }
  return user;
}

export type SignInState = { error?: string };

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  if (!username) return { error: "Enter your username." };
  const user = (await db.listUsers()).find(
    (candidate) => candidate.username.toLowerCase() === username,
  );
  if (!user) return { error: `No account found for “${username}”.` };

  (await cookies()).set(SESSION_COOKIE, String(user.id), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: true,
  });
  redirect("/dashboard");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/sign-in");
}

export async function createDocument() {
  const user = await requireUser();
  const id = await db.createDocument(user.id);
  redirect(`/d/${id}`);
}

export type UploadState = { error?: string };

export async function uploadDocument(
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (formData.get("tooLarge")) {
    return { error: "That file is larger than 10 MB." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  const docType = extensionOf(file.name);
  const allowed = await db.getAllowedExtensions();
  if (!allowed.includes(docType)) {
    return {
      error: `Only ${allowed.map((extension) => `.${extension}`).join(", ")} files can be uploaded.`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That file is larger than 10 MB." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let converted;
  try {
    converted = await convertUpload(file.name, bytes);
  } catch {
    return {
      error: `Couldn't read “${file.name}” as a .${docType} document.`,
    };
  }
  if (converted.html.length > MAX_CONTENT_LENGTH) {
    return { error: "That document is too long to import." };
  }

  // Keep the original next to the app; the stored name is generated, never
  // taken from the upload.
  const filePath = path.join("uploads", `${crypto.randomUUID()}.${docType}`);
  await mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
  await writeFile(path.join(process.cwd(), filePath), bytes);

  const id = await db.createDocument(user.id, {
    title: converted.title,
    content: converted.html,
    docType,
    originalFileName: file.name.slice(0, 255),
    filePath,
  });
  redirect(`/d/${id}`);
}

export async function deleteDocument(id: number) {
  await requireRole(id, ["owner"]);
  const filePath = await db.deleteDocument(id);
  if (filePath) {
    // Only ever remove files inside the uploads folder.
    const uploads = path.join(process.cwd(), "uploads");
    const target = path.resolve(process.cwd(), filePath);
    if (target.startsWith(uploads + path.sep)) {
      await rm(target, { force: true });
    }
  }
  refresh();
}

export async function renameDocument(id: number, title: string) {
  const user = await requireRole(id, ["owner", "editor"]);
  const clean =
    String(title).trim().slice(0, MAX_TITLE_LENGTH) || "Untitled document";
  await db.renameDocument(id, clean, user.id);
  return { title: clean, activity: await db.listActivity(id) };
}

export async function saveDocument(id: number, content: string) {
  const user = await requireRole(id, ["owner", "editor"]);
  if (typeof content !== "string" || content.length > MAX_CONTENT_LENGTH) {
    throw new Error("Document is too large to save");
  }
  await db.saveDocumentContent(id, content, user.id);
  return { activity: await db.listActivity(id) };
}

export async function recordView(id: number) {
  const user = await requireRole(id, ["owner", "editor", "viewer"]);
  await db.logActivity(id, user.id, "viewed");
  return { activity: await db.listActivity(id) };
}

export async function setShare(
  id: number,
  userId: number,
  level: ShareLevel | "none",
) {
  const owner = await requireRole(id, ["owner"]);
  if (userId === owner.id) throw new Error("The owner always has access");
  if (!(await db.listUsers()).some((user) => user.id === userId)) {
    throw new Error("Unknown user");
  }
  if (level !== "none" && level !== "editor" && level !== "viewer") {
    throw new Error("Unknown permission level");
  }
  await db.setShare(id, userId, level === "none" ? null : level);
  return { shares: await db.listShares(id) };
}

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
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const values = { username, displayName };

  if (!/^[a-z0-9._-]{2,50}$/.test(username)) {
    return {
      ...values,
      error:
        "Username must be 2–50 characters: letters, numbers, dot, dash or underscore.",
    };
  }
  if (!displayName || displayName.length > 100) {
    return { ...values, error: "Display name must be 1–100 characters." };
  }
  if (!(await db.createUser(username, displayName))) {
    return { ...values, error: `Username “${username}” is already taken.` };
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
  const extensions = [
    ...new Set(
      value
        .split(/[|,\s]+/)
        .map((extension) => extension.trim().toLowerCase().replace(/^\./, ""))
        .filter(Boolean),
    ),
  ];
  if (extensions.length === 0) {
    return { value, error: "Enter at least one extension, e.g. txt|docx|md." };
  }
  const invalid = extensions.find(
    (extension) => !/^[a-z0-9]{1,10}$/.test(extension),
  );
  if (invalid) {
    return {
      value,
      error: `“${invalid}” isn't a valid extension. Use letters and numbers only.`,
    };
  }
  await db.setAllowedExtensions(extensions);
  refresh();
  return { saved: extensions.join("|") };
}
