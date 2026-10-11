import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Where the original copies of uploaded documents are kept. */
export interface UploadStorage {
  /** Stores the bytes and returns the path to record on the document. */
  save(bytes: Buffer, extension: string): Promise<string>;
  /** Removes a previously stored file; unknown paths are ignored. */
  remove(storedPath: string): Promise<void>;
}

const UPLOADS_FOLDER = "uploads";

class LocalUploadStorage implements UploadStorage {
  async save(bytes: Buffer, extension: string): Promise<string> {
    // The stored name is generated, never taken from the upload.
    const storedPath = path.join(
      UPLOADS_FOLDER,
      `${crypto.randomUUID()}.${extension}`,
    );
    await mkdir(path.join(process.cwd(), UPLOADS_FOLDER), { recursive: true });
    await writeFile(path.join(process.cwd(), storedPath), bytes);
    return storedPath;
  }

  async remove(storedPath: string): Promise<void> {
    // Only the file name is used, so nothing outside the folder can be removed.
    const target = path.join(
      process.cwd(),
      UPLOADS_FOLDER,
      path.basename(storedPath),
    );
    await rm(target, { force: true });
  }
}

export const uploadStorage: UploadStorage = new LocalUploadStorage();
