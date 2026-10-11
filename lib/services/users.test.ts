import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserError } from "@/lib/errors";
import * as repository from "@/lib/repositories/users";
import { normalizeUsername, registerUser } from "./users";

vi.mock("@/lib/repositories/users", () => ({
  insertUser: vi.fn(async () => true),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Ana.Cruz ")).toBe("ana.cruz");
  });
});

describe("registerUser", () => {
  it("creates a user with a valid username and display name", async () => {
    await registerUser("ana.cruz_1-x", "Ana Cruz");
    expect(repository.insertUser).toHaveBeenCalledWith(
      "ana.cruz_1-x",
      "Ana Cruz",
    );
  });

  it.each(["a", "Ana", "ana cruz", "ana@cruz", "x".repeat(51)])(
    "rejects the username %j",
    async (username) => {
      await expect(registerUser(username, "Ana")).rejects.toThrow(UserError);
      expect(repository.insertUser).not.toHaveBeenCalled();
    },
  );

  it.each(["", "x".repeat(101)])(
    "rejects the display name %j",
    async (name) => {
      await expect(registerUser("ana", name)).rejects.toThrow(UserError);
    },
  );

  it("rejects a username that is already taken", async () => {
    vi.mocked(repository.insertUser).mockResolvedValueOnce(false);
    await expect(registerUser("ana", "Ana")).rejects.toThrow(/already taken/);
  });
});
