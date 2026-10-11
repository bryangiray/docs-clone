"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  recordView,
  renameDocument,
  saveDocument,
  setShare,
} from "@/app/actions";
import { formatDateTime } from "@/lib/format";
import type { ActivityEntry, Role, Share, User } from "@/lib/types";
import { Avatar } from "./avatar";
import { Logo } from "./logo";

const AUTOSAVE_DELAY_MS = 800;

type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Save failed",
};

const ACTION_LABEL: Record<ActivityEntry["action"], string> = {
  created: "created the document",
  viewed: "viewed",
  edited: "edited",
  renamed: "renamed the document",
};

type Props = {
  doc: { id: number; title: string; content: string; ownerId: number };
  role: Role;
  users: User[];
  initialShares: Share[];
  initialActivity: ActivityEntry[];
  currentUserId: number;
  userMenu: ReactNode;
};

export function DocumentEditor({
  doc,
  role,
  users,
  initialShares,
  initialActivity,
  currentUserId,
  userMenu,
}: Props) {
  const canEdit = role !== "viewer";
  const [title, setTitle] = useState(doc.title);
  const [savedTitle, setSavedTitle] = useState(doc.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [activity, setActivity] = useState(initialActivity);
  const [showActivity, setShowActivity] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const latestHtml = useRef(doc.content);
  const dirty = useRef(false);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const router = useRouter();

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Document body" },
    },
  });

  const save = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    if (saving.current) return false;
    saving.current = true;
    try {
      // Loop so edits made while a request is in flight are saved too.
      while (dirty.current) {
        dirty.current = false;
        setStatus("saving");
        const result = await saveDocument(doc.id, latestHtml.current);
        setActivity(result.activity);
      }
      setStatus("saved");
      return true;
    } catch {
      dirty.current = true;
      setStatus("error");
      return false;
    } finally {
      saving.current = false;
    }
  }, [doc.id]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      latestHtml.current = editor.getHTML();
      dirty.current = true;
      setStatus((current) => (current === "saving" ? current : "unsaved"));
      clearTimeout(timer.current);
      timer.current = setTimeout(save, AUTOSAVE_DELAY_MS);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor, save]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current || saving.current) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [save]);

  // Leaving the page inside the app: don't drop edits still waiting on the timer.
  useEffect(() => {
    const docId = doc.id;
    return () => {
      clearTimeout(timer.current);
      if (dirty.current) {
        dirty.current = false;
        // Refresh so the page we landed on shows the just-saved edit.
        saveDocument(docId, latestHtml.current)
          .then(() => router.refresh())
          .catch(() => {});
      }
    };
  }, [doc.id, router]);

  useEffect(() => {
    let cancelled = false;
    recordView(doc.id)
      .then((result) => {
        if (!cancelled) setActivity(result.activity);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [doc.id, currentUserId]);

  // The toast is only for the Save button; autosave stays quiet.
  async function saveFromButton() {
    const ok = await save();
    setToast(
      ok
        ? { ok: true, text: "Document saved" }
        : { ok: false, text: "Couldn't save. Try again." },
    );
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function commitTitle() {
    if (!canEdit) return;
    const next = title.trim() || "Untitled document";
    setTitle(next);
    if (next === savedTitle) return;
    try {
      const result = await renameDocument(doc.id, next);
      setSavedTitle(result.title);
      setTitle(result.title);
      setActivity(result.activity);
    } catch {
      setTitle(savedTitle);
    }
  }

  const owner = users.find((user) => user.id === doc.ownerId);

  return (
    <>
      <title>{`${savedTitle} - Docs`}</title>
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
            toast.ok ? "bg-gray-900" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link
              href="/dashboard"
              title="Back to dashboard"
              aria-label="Back to dashboard"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
            >
              <Icon d="M19 12H5M11 6l-6 6 6 6" />
            </Link>
            <Logo size={36} />
            <div className="min-w-0 flex-1">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    setTitle(savedTitle);
                    event.currentTarget.blur();
                  }
                }}
                maxLength={200}
                readOnly={!canEdit}
                aria-label="Document title"
                className="w-full max-w-md truncate rounded border border-transparent px-1.5 py-0.5 text-lg text-gray-900 hover:border-gray-300 focus:border-blue-600 focus:outline-none"
              />
              <p className="flex flex-wrap items-center gap-x-3 px-1.5 text-xs text-gray-500">
                <span>
                  Owner:{" "}
                  {doc.ownerId === currentUserId
                    ? "me"
                    : (owner?.name ?? "unknown")}
                </span>
                {canEdit ? (
                  <span
                    role="status"
                    className={status === "error" ? "text-red-600" : undefined}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                    View only
                  </span>
                )}
                {status === "error" && (
                  <button
                    type="button"
                    onClick={save}
                    className="cursor-pointer text-blue-600 underline"
                  >
                    Retry
                  </button>
                )}
              </p>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={saveFromButton}
              disabled={status === "saving"}
              title="Save now (⌘S)"
              className="shrink-0 cursor-pointer rounded-full bg-blue-600 px-4 py-1 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-default disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Save"}
            </button>
          )}
          <button
            type="button"
            aria-expanded={showActivity}
            aria-controls="activity-panel"
            onClick={() => setShowActivity((shown) => !shown)}
            className={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-sm transition ${
              showActivity
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Activity
          </button>
          {userMenu}
        </div>
        {canEdit && <Toolbar editor={editor} />}
      </header>

      <div className="flex flex-1 flex-col items-start gap-6 px-4 py-6 lg:flex-row lg:justify-center">
        <main
          className="w-full max-w-[816px] bg-white px-6 py-10 shadow-[0_1px_3px_rgba(60,64,67,0.3)] sm:px-24 sm:py-20"
          onClick={(event) => {
            if (event.target === event.currentTarget) editor?.commands.focus("end");
          }}
        >
          <EditorContent editor={editor} />
        </main>
        <div className="w-full max-w-[816px] space-y-4 lg:sticky lg:top-32 lg:w-72 lg:shrink-0">
          <SharePanel
            docId={doc.id}
            ownerId={doc.ownerId}
            isOwner={role === "owner"}
            users={users}
            initialShares={initialShares}
            currentUserId={currentUserId}
          />
          {showActivity && (
            <ActivityPanel
              activity={activity}
              users={users}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>
    </>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor && {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        block: editor.isActive("heading", { level: 1 })
          ? "1"
          : editor.isActive("heading", { level: 2 })
            ? "2"
            : editor.isActive("heading", { level: 3 })
              ? "3"
              : "p",
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      },
  });

  const disabled = !editor || !state;

  function setBlock(value: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "p") chain.setParagraph().run();
    else chain.setHeading({ level: Number(value) as 1 | 2 | 3 }).run();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="mx-3 mb-2 flex flex-wrap items-center gap-1 rounded-full bg-[#edf2fa] px-3 py-1"
    >
      <ToolButton
        label="Undo (⌘Z)"
        disabled={disabled || !state.canUndo}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <Icon d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
      </ToolButton>
      <ToolButton
        label="Redo (⌘⇧Z)"
        disabled={disabled || !state.canRedo}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <Icon d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
      </ToolButton>
      <Divider />
      <select
        aria-label="Text style"
        value={state?.block ?? "p"}
        disabled={disabled}
        onChange={(event) => setBlock(event.target.value)}
        className="h-8 cursor-pointer rounded px-2 text-sm text-gray-800 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <option value="p">Normal text</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>
      <Divider />
      <ToolButton
        label="Bold (⌘B)"
        active={state?.bold}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton
        label="Italic (⌘I)"
        active={state?.italic}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton
        label="Underline (⌘U)"
        active={state?.underline}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolButton>
      <Divider />
      <ToolButton
        label="Bulleted list"
        active={state?.bulletList}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={state?.orderedList}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <Icon d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5v4M4 8.5h3M4 14.5h3l-3 4h3" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the text selection in the document when the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm text-gray-800 disabled:cursor-default disabled:opacity-40 ${
        active ? "bg-blue-200 text-blue-900" : "hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-gray-300" />;
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

function SharePanel({
  docId,
  ownerId,
  isOwner,
  users,
  initialShares,
  currentUserId,
}: {
  docId: number;
  ownerId: number;
  isOwner: boolean;
  users: User[];
  initialShares: Share[];
  currentUserId: number;
}) {
  const [shares, setShares] = useState(initialShares);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [newLevel, setNewLevel] = useState<Share["level"]>("viewer");

  async function change(userId: number, level: Share["level"] | "none") {
    setError(null);
    try {
      const result = await setShare(docId, userId, level);
      setShares(result.shares);
    } catch {
      setError("Couldn't update sharing. Try again.");
    }
  }

  function add(user: User) {
    setSearch("");
    change(user.id, newLevel);
  }

  const levelOf = (userId: number) =>
    shares.find((share) => share.userId === userId)?.level;
  // Only the owner and people the document is shared with are listed.
  const people = users.filter(
    (user) => user.id === ownerId || levelOf(user.id) !== undefined,
  );

  const query = search.trim().toLowerCase();
  const matches = query
    ? users
        .filter(
          (user) =>
            user.id !== ownerId &&
            levelOf(user.id) === undefined &&
            (user.name.toLowerCase().includes(query) ||
              user.username.toLowerCase().includes(query)),
        )
        .slice(0, 6)
    : [];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-medium text-gray-900">
        {isOwner ? "Share" : "People with access"}
      </h2>

      {isOwner && (
        <div className="relative mt-3">
          <div className="flex gap-1">
            <input
              type="search"
              role="combobox"
              aria-label="Add people by name"
              aria-expanded={query !== ""}
              aria-controls="share-suggestions"
              autoComplete="off"
              placeholder="Add people by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches[0]) add(matches[0]);
                if (event.key === "Escape") setSearch("");
              }}
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            />
            <select
              aria-label="Access for new people"
              value={newLevel}
              onChange={(event) =>
                setNewLevel(event.target.value as Share["level"])
              }
              className="cursor-pointer rounded border border-gray-300 px-1 text-xs text-gray-800"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          {query !== "" && (
            <ul
              id="share-suggestions"
              role="listbox"
              aria-label="Matching users"
              className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-500">
                  No matching users to add.
                </li>
              ) : (
                matches.map((user) => (
                  <li key={user.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => add(user)}
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                    >
                      <Avatar user={user} size={22} />
                      <span className="min-w-0 flex-1 truncate text-gray-800">
                        {user.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {user.username}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      <ul className="mt-3 space-y-2" aria-label="People with access">
        {people.map((user) => (
          <li key={user.id} className="flex items-center gap-2 text-sm">
            <Avatar user={user} size={24} />
            <span className="min-w-0 flex-1 truncate text-gray-800">
              {user.name}
              {user.id === currentUserId && " (you)"}
            </span>
            {user.id === ownerId ? (
              <span className="text-xs text-gray-500">Owner</span>
            ) : isOwner ? (
              <select
                aria-label={`Access for ${user.name}`}
                value={levelOf(user.id)}
                onChange={(event) =>
                  change(user.id, event.target.value as Share["level"] | "none")
                }
                className="cursor-pointer rounded border border-gray-300 px-1 py-0.5 text-xs text-gray-800"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="none">Remove access</option>
              </select>
            ) : (
              <span className="text-xs capitalize text-gray-500">
                {levelOf(user.id)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

function ActivityPanel({
  activity,
  users,
  currentUserId,
}: {
  activity: ActivityEntry[];
  users: User[];
  currentUserId: number;
}) {
  return (
    <aside
      id="activity-panel"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 className="text-sm font-medium text-gray-900">Activity</h2>
      {activity.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No activity yet.</p>
      ) : (
        <ol className="mt-3 max-h-[45vh] space-y-3 overflow-y-auto">
          {activity.map((entry) => {
            const user = users.find((user) => user.id === entry.userId);
            return (
              <li key={entry.id} className="flex items-start gap-2 text-sm">
                {user && <Avatar user={user} size={24} />}
                <div className="min-w-0">
                  <p className="text-gray-800">
                    <span className="font-medium">
                      {entry.userId === currentUserId
                        ? "You"
                        : (user?.name ?? "Unknown user")}
                    </span>{" "}
                    {ACTION_LABEL[entry.action]}
                  </p>
                  {/* Server and browser may format in different time zones. */}
                  <time
                    suppressHydrationWarning
                    dateTime={new Date(entry.at).toISOString()}
                    className="text-xs text-gray-500"
                  >
                    {formatDateTime(entry.at)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
