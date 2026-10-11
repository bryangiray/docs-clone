import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserError } from "@/lib/errors";
import { MAX_COMMENT_LENGTH, MAX_QUOTE_LENGTH } from "@/lib/limits";
import * as repository from "@/lib/repositories/comments";
import type { User } from "@/lib/types";
import { addComment, deleteComment } from "./comments";

vi.mock("@/lib/repositories/comments", () => ({
  listComments: vi.fn(async () => []),
  insertComment: vi.fn(async () => {}),
  insertReply: vi.fn(async () => true),
  setResolved: vi.fn(async () => {}),
  deleteCommentAs: vi.fn(async () => true),
}));

const actor: User = { id: 7, username: "ana", name: "Ana" };
const DOC = 3;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addComment", () => {
  it("stores a trimmed comment with its quote", async () => {
    await addComment(actor, DOC, {
      body: "  Looks good  ",
      quote: "lazy dog",
      quoteOffset: 12,
    });
    expect(repository.insertComment).toHaveBeenCalledWith(
      DOC,
      actor.id,
      "Looks good",
      "lazy dog",
      12,
    );
  });

  it("stores a comment on the whole document without a quote or offset", async () => {
    await addComment(actor, DOC, { body: "General note", quoteOffset: 5 });
    await addComment(actor, DOC, { body: "General note", quote: "   " });
    expect(repository.insertComment).toHaveBeenNthCalledWith(
      1,
      DOC,
      actor.id,
      "General note",
      null,
      null,
    );
    expect(repository.insertComment).toHaveBeenNthCalledWith(
      2,
      DOC,
      actor.id,
      "General note",
      null,
      null,
    );
  });

  it("caps the quote and ignores an offset that isn't a whole number", async () => {
    await addComment(actor, DOC, {
      body: "Long",
      quote: "q".repeat(MAX_QUOTE_LENGTH + 50),
      quoteOffset: 1.5,
    });
    expect(repository.insertComment).toHaveBeenCalledWith(
      DOC,
      actor.id,
      "Long",
      "q".repeat(MAX_QUOTE_LENGTH),
      null,
    );
  });

  it("rejects empty and overlong comments", async () => {
    await expect(addComment(actor, DOC, { body: "   " })).rejects.toThrow(
      UserError,
    );
    await expect(
      addComment(actor, DOC, { body: "x".repeat(MAX_COMMENT_LENGTH + 1) }),
    ).rejects.toThrow(UserError);
    expect(repository.insertComment).not.toHaveBeenCalled();
  });

  it("stores a reply under its thread", async () => {
    await addComment(actor, DOC, { body: "Agreed", parentId: 42 });
    expect(repository.insertReply).toHaveBeenCalledWith(
      DOC,
      actor.id,
      42,
      "Agreed",
    );
    expect(repository.insertComment).not.toHaveBeenCalled();
  });

  it("rejects a reply to a thread that no longer exists", async () => {
    vi.mocked(repository.insertReply).mockResolvedValueOnce(false);
    await expect(
      addComment(actor, DOC, { body: "Agreed", parentId: 42 }),
    ).rejects.toThrow(UserError);
  });

  it("returns the document's comments", async () => {
    const stored = [
      {
        id: 1,
        userId: actor.id,
        parentId: null,
        body: "Hi",
        quote: null,
        quoteOffset: null,
        resolved: false,
        at: 0,
      },
    ];
    vi.mocked(repository.listComments).mockResolvedValueOnce(stored);
    expect(await addComment(actor, DOC, { body: "Hi" })).toEqual(stored);
  });
});

describe("deleteComment", () => {
  it("rejects deleting a comment the person may not delete", async () => {
    vi.mocked(repository.deleteCommentAs).mockResolvedValueOnce(false);
    await expect(deleteComment(actor, DOC, 9)).rejects.toThrow(UserError);
  });
});
