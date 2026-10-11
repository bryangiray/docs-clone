import { beforeEach, describe, expect, it, vi } from "vitest";
import * as shares from "@/lib/repositories/shares";
import * as users from "@/lib/repositories/users";
import type { ShareLevel, User } from "@/lib/types";
import { setShare } from "./sharing";

vi.mock("@/lib/repositories/shares", () => ({
  listShares: vi.fn(async () => []),
  upsertShare: vi.fn(async () => {}),
  deleteShare: vi.fn(async () => {}),
}));
vi.mock("@/lib/repositories/users", () => ({
  findUserById: vi.fn(async (id: number) => ({ id, username: "u", name: "U" })),
}));

const owner: User = { id: 1, username: "owner", name: "Owner" };
const DOC = 3;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setShare", () => {
  it.each<ShareLevel>(["editor", "commenter", "viewer"])(
    "grants %s access",
    async (level) => {
      await setShare(owner, DOC, 2, level);
      expect(shares.upsertShare).toHaveBeenCalledWith(DOC, 2, level);
    },
  );

  it('removes access with "none"', async () => {
    await setShare(owner, DOC, 2, "none");
    expect(shares.deleteShare).toHaveBeenCalledWith(DOC, 2);
    expect(shares.upsertShare).not.toHaveBeenCalled();
  });

  it("rejects a level that doesn't exist", async () => {
    await expect(
      setShare(owner, DOC, 2, "owner" as ShareLevel),
    ).rejects.toThrow();
    expect(shares.upsertShare).not.toHaveBeenCalled();
  });

  it("never changes the owner's own access", async () => {
    await expect(setShare(owner, DOC, owner.id, "viewer")).rejects.toThrow();
    expect(shares.upsertShare).not.toHaveBeenCalled();
  });

  it("rejects sharing with a user that doesn't exist", async () => {
    vi.mocked(users.findUserById).mockResolvedValueOnce(undefined);
    await expect(setShare(owner, DOC, 99, "viewer")).rejects.toThrow();
    expect(shares.upsertShare).not.toHaveBeenCalled();
  });
});
