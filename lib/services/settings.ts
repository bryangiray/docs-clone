import "server-only";
import { UserError } from "@/lib/errors";
import { getSetting, setSetting } from "@/lib/repositories/settings";

const ALLOWED_EXTENSIONS_KEY = "allowed_extensions";
const DEFAULT_ALLOWED_EXTENSIONS = ["txt", "docx", "md"];
// Stored as "txt|docx|md".
const SEPARATOR = "|";

function normalize(extension: string): string {
  return extension.trim().toLowerCase().replace(/^\./, "");
}

export async function getAllowedExtensions(): Promise<string[]> {
  const stored = await getSetting(ALLOWED_EXTENSIONS_KEY);
  if (stored === undefined) return DEFAULT_ALLOWED_EXTENSIONS;
  return stored.split(SEPARATOR).map(normalize).filter(Boolean);
}

/** Validates and saves what an admin typed; returns the stored value. */
export async function updateAllowedExtensions(input: string): Promise<string> {
  const extensions = [
    ...new Set(input.split(/[|,\s]+/).map(normalize).filter(Boolean)),
  ];
  if (extensions.length === 0) {
    throw new UserError("Enter at least one extension, e.g. txt|docx|md.");
  }
  const invalid = extensions.find(
    (extension) => !/^[a-z0-9]{1,10}$/.test(extension),
  );
  if (invalid) {
    throw new UserError(
      `“${invalid}” isn't a valid extension. Use letters and numbers only.`,
    );
  }
  const value = extensions.join(SEPARATOR);
  await setSetting(ALLOWED_EXTENSIONS_KEY, value);
  return value;
}
