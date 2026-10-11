import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserError } from "@/lib/errors";
import * as repository from "@/lib/repositories/settings";
import { getAllowedExtensions, updateAllowedExtensions } from "./settings";

vi.mock("@/lib/repositories/settings", () => ({
  getSetting: vi.fn(async () => undefined),
  setSetting: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAllowedExtensions", () => {
  it("falls back to the defaults until something is saved", async () => {
    expect(await getAllowedExtensions()).toEqual(["txt", "docx", "md"]);
  });

  it("reads the stored list", async () => {
    vi.mocked(repository.getSetting).mockResolvedValueOnce("txt| .PDF |");
    expect(await getAllowedExtensions()).toEqual(["txt", "pdf"]);
  });
});

describe("updateAllowedExtensions", () => {
  it("normalizes what was typed and stores it", async () => {
    expect(await updateAllowedExtensions(" .TXT, md  docx|txt ")).toBe(
      "txt|md|docx",
    );
    expect(repository.setSetting).toHaveBeenCalledWith(
      "allowed_extensions",
      "txt|md|docx",
    );
  });

  it.each(["", " , | ", "txt|tar.gz", "txt|way-too-long-extension"])(
    "rejects %j",
    async (input) => {
      await expect(updateAllowedExtensions(input)).rejects.toThrow(UserError);
      expect(repository.setSetting).not.toHaveBeenCalled();
    },
  );
});
