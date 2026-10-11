"use client";

import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import {
  addComment,
  deleteComment,
  resolveComment,
} from "@/app/actions/comments";
import type { CommentsResult } from "@/app/actions/comments";
import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";
import { MAX_COMMENT_LENGTH } from "@/lib/limits";
import type { Comment, User } from "@/lib/types";
import { quoteSelection } from "./comment-highlights";

type Props = {
  docId: number;
  editor: Editor | null;
  comments: Comment[];
  users: User[];
  currentUserId: number;
  canComment: boolean;
  /** The document's owner can delete anyone's comments. */
  isOwner: boolean;
  activeId: number | null;
  onActivate: (commentId: number) => void;
  onChange: (comments: Comment[]) => void;
};

export function CommentsPanel({
  docId,
  editor,
  comments,
  users,
  currentUserId,
  canComment,
  isOwner,
  activeId,
  onActivate,
  onChange,
}: Props) {
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The text selected in the document, which a new comment will be about.
  const selection = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor && !editor.state.selection.empty
        ? quoteSelection(
            editor.state.doc,
            editor.state.selection.from,
            editor.state.selection.to,
          )
        : null,
  });

  useEffect(() => {
    if (activeId === null) return;
    document
      .getElementById(`comment-${activeId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  /** Resolves to whether the change went through. */
  async function apply(request: Promise<CommentsResult>): Promise<boolean> {
    setError(null);
    setPending(true);
    try {
      const result = await request;
      if (result.comments) onChange(result.comments);
      else setError(result.error ?? "Something went wrong. Try again.");
      return result.comments !== undefined;
    } catch {
      setError("Something went wrong. Try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function submitComment() {
    const added = await apply(
      addComment(docId, {
        body: draft,
        quote: selection?.quote,
        quoteOffset: selection?.offset,
      }),
    );
    if (added) setDraft("");
  }

  async function submitReply(parentId: number) {
    if (await apply(addComment(docId, { body: reply, parentId }))) {
      setReply("");
      setReplyTo(null);
    }
  }

  const threads = comments.filter((comment) => comment.parentId === null);
  const open = threads.filter((thread) => !thread.resolved);
  const resolved = threads.filter((thread) => thread.resolved);
  const shown = showResolved ? [...open, ...resolved] : open;

  const entry = (comment: Comment) => (
    <CommentEntry
      comment={comment}
      user={users.find((user) => user.id === comment.userId)}
      isMine={comment.userId === currentUserId}
      onDelete={
        canComment && (isOwner || comment.userId === currentUserId)
          ? () => apply(deleteComment(docId, comment.id))
          : undefined
      }
    />
  );

  return (
    <aside
      id="comments-panel"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 className="text-sm font-medium text-gray-900">Comments</h2>

      {canComment && (
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitComment();
          }}
        >
          {selection ? (
            <p className="mb-2 line-clamp-2 border-l-2 border-amber-400 pl-2 text-xs text-gray-600">
              {selection.quote}
            </p>
          ) : (
            <p className="mb-2 text-xs text-gray-500">
              Select text in the document to comment on it.
            </p>
          )}
          <textarea
            aria-label="New comment"
            placeholder={
              selection ? "Comment on the selection" : "Comment on the document"
            }
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            rows={2}
            className="w-full resize-y rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="mt-1 cursor-pointer rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
          >
            Comment
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No open comments.</p>
      ) : (
        <ul className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto">
          {shown.map((thread) => (
            <li
              key={thread.id}
              id={`comment-${thread.id}`}
              className={`rounded-lg border p-3 ${
                thread.id === activeId
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-200"
              } ${thread.resolved ? "opacity-70" : ""}`}
            >
              {thread.quote && (
                <button
                  type="button"
                  title="Show in the document"
                  onClick={() => onActivate(thread.id)}
                  className="mb-2 line-clamp-2 w-full cursor-pointer border-l-2 border-amber-400 pl-2 text-left text-xs text-gray-600 hover:text-gray-900"
                >
                  {thread.quote}
                </button>
              )}
              {entry(thread)}
              {comments
                .filter((comment) => comment.parentId === thread.id)
                .map((comment) => (
                  <div
                    key={comment.id}
                    className="mt-2 border-t border-gray-100 pt-2"
                  >
                    {entry(comment)}
                  </div>
                ))}

              {canComment && replyTo === thread.id ? (
                <form
                  className="mt-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitReply(thread.id);
                  }}
                >
                  <textarea
                    aria-label="Reply"
                    placeholder="Reply"
                    autoFocus
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    maxLength={MAX_COMMENT_LENGTH}
                    rows={2}
                    className="w-full resize-y rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
                  />
                  <div className="mt-1 flex gap-3 text-xs">
                    <button
                      type="submit"
                      disabled={pending || !reply.trim()}
                      className="cursor-pointer font-medium text-blue-600 hover:underline disabled:cursor-default disabled:opacity-50"
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="cursor-pointer text-gray-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                canComment && (
                  <div className="mt-2 flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setReply("");
                        setReplyTo(thread.id);
                      }}
                      className="cursor-pointer text-blue-600 hover:underline"
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        apply(
                          resolveComment(docId, thread.id, !thread.resolved),
                        )
                      }
                      className="cursor-pointer text-blue-600 hover:underline"
                    >
                      {thread.resolved ? "Reopen" : "Resolve"}
                    </button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <button
          type="button"
          aria-expanded={showResolved}
          onClick={() => setShowResolved((shown) => !shown)}
          className="mt-3 cursor-pointer text-xs text-gray-600 hover:underline"
        >
          {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
        </button>
      )}
    </aside>
  );
}

function CommentEntry({
  comment,
  user,
  isMine,
  onDelete,
}: {
  comment: Comment;
  user: User | undefined;
  isMine: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {user && <Avatar user={user} size={24} />}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-gray-800">
            {isMine ? "You" : (user?.name ?? "Unknown user")}
          </span>
          {/* Server and browser may format in different time zones. */}
          <time
            suppressHydrationWarning
            dateTime={new Date(comment.at).toISOString()}
            className="text-xs text-gray-500"
          >
            {formatDateTime(comment.at)}
          </time>
        </p>
        <p className="whitespace-pre-wrap break-words text-gray-800">
          {comment.body}
        </p>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 cursor-pointer text-xs text-gray-500 hover:text-red-600 hover:underline"
        >
          Delete
        </button>
      )}
    </div>
  );
}
