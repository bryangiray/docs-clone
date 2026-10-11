"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { recordView, saveDocument } from "@/app/actions/documents";
import { Logo } from "@/components/logo";
import { can } from "@/lib/permissions";
import type { ActivityEntry, Role, Share, User } from "@/lib/types";
import { ActivityPanel } from "./activity-panel";
import { Icon } from "./icon";
import { SaveStatusLabel } from "./save-status";
import { SharePanel } from "./share-panel";
import { TitleInput } from "./title-input";
import { Toast, useToast } from "./toast";
import { Toolbar } from "./toolbar";
import { useAutosave } from "./use-autosave";

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
  const canEdit = can(role, "edit");
  const [activity, setActivity] = useState(initialActivity);
  const [showActivity, setShowActivity] = useState(false);
  const { toast, showToast } = useToast();
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

  const persist = useCallback(
    async (html: string) => {
      setActivity((await saveDocument(doc.id, html)).activity);
    },
    [doc.id],
  );
  // Refresh so the page we landed on shows the just-saved edit.
  const refreshAfterLeave = useCallback(() => router.refresh(), [router]);

  const { status, save } = useAutosave({
    editor,
    initialContent: doc.content,
    persist,
    onSavedOnLeave: refreshAfterLeave,
  });

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
    showToast(
      (await save())
        ? { ok: true, text: "Document saved" }
        : { ok: false, text: "Couldn't save. Try again." },
    );
  }

  const owner = users.find((user) => user.id === doc.ownerId);

  return (
    <>
      <Toast toast={toast} />
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
              <TitleInput
                docId={doc.id}
                initialTitle={doc.title}
                canEdit={canEdit}
                onRenamed={setActivity}
              />
              <p className="flex flex-wrap items-center gap-x-3 px-1.5 text-xs text-gray-500">
                <span>
                  Owner:{" "}
                  {doc.ownerId === currentUserId
                    ? "me"
                    : (owner?.name ?? "unknown")}
                </span>
                {canEdit ? (
                  <SaveStatusLabel status={status} onRetry={save} />
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                    View only
                  </span>
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
            canShare={can(role, "share")}
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
