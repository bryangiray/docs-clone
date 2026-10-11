"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { recordView, saveDocument } from "@/app/actions/documents";
import { restoreVersion } from "@/app/actions/versions";
import { Logo } from "@/components/logo";
import { downloadPdf } from "@/lib/export/pdf";
import { ACCESS_LABEL, can } from "@/lib/permissions";
import type {
  ActivityEntry,
  Comment,
  Role,
  Share,
  User,
  VersionSummary,
} from "@/lib/types";
import { ActivityPanel } from "./activity-panel";
import { CommentHighlights, setCommentHighlights } from "./comment-highlights";
import { CommentsPanel } from "./comments-panel";
import { HistoryPanel } from "./history-panel";
import { Icon } from "./icon";
import { PresenceAvatars } from "./presence-avatars";
import { SaveStatusLabel } from "./save-status";
import { SharePanel } from "./share-panel";
import { TitleInput } from "./title-input";
import { Toast, useToast } from "./toast";
import { Toolbar } from "./toolbar";
import { useAutosave } from "./use-autosave";
import { useLive } from "./use-live";
import { VersionPreview } from "./version-preview";

type Props = {
  doc: { id: number; title: string; content: string; ownerId: number };
  role: Role;
  users: User[];
  initialShares: Share[];
  initialActivity: ActivityEntry[];
  initialComments: Comment[];
  initialVersions: VersionSummary[];
  currentUserId: number;
  userMenu: ReactNode;
};

type Panel = "comments" | "history" | "activity";

export function DocumentEditor({
  doc,
  role,
  users,
  initialShares,
  initialActivity,
  initialComments,
  initialVersions,
  currentUserId,
  userMenu,
}: Props) {
  const canEdit = can(role, "edit");
  const [activity, setActivity] = useState(initialActivity);
  const [versions, setVersions] = useState(initialVersions);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [previewed, setPreviewed] = useState<VersionSummary | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast, showToast } = useToast();
  const router = useRouter();

  // Clicking highlighted text opens its comment. The editor keeps the handler
  // it was created with, which is fine: it only uses state setters.
  const openComment = useCallback((commentId: number) => {
    setActiveCommentId(commentId);
    setPanel("comments");
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      CommentHighlights.configure({ onSelect: openComment }),
    ],
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Document body" },
    },
  });

  const persist = useCallback(
    async (html: string) => {
      const saved = await saveDocument(doc.id, html);
      setActivity(saved.activity);
      setVersions(saved.versions);
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

  const { presence, comments, setComments } = useLive({
    docId: doc.id,
    editor,
    initialComments,
  });

  // Open threads that quote the document get highlighted in it.
  const anchors = useMemo(
    () =>
      comments.flatMap((comment) =>
        comment.quote && !comment.resolved && comment.parentId === null
          ? [
              {
                id: comment.id,
                quote: comment.quote,
                offset: comment.quoteOffset ?? 0,
              },
            ]
          : [],
      ),
    [comments],
  );
  useEffect(() => {
    if (editor) setCommentHighlights(editor, anchors, activeCommentId);
  }, [editor, anchors, activeCommentId]);

  function showCommentInDocument(commentId: number) {
    setActiveCommentId(commentId);
    // Wait for the highlight to be drawn as the active one.
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-comment-id="${commentId}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  async function exportPdf() {
    if (!editor) return;
    setExporting(true);
    try {
      await downloadPdf(document.title.replace(/ - Docs$/, ""), editor.getJSON());
    } catch {
      showToast({ ok: false, text: "Couldn't create the PDF. Try again." });
    } finally {
      setExporting(false);
    }
  }

  async function restore(version: VersionSummary) {
    // Store pending edits first, so they are in the history and autosave
    // doesn't write them over the restored version.
    if (canEdit && !(await save())) {
      showToast({ ok: false, text: "Couldn't save your latest edits. Try again." });
      return;
    }
    const result = await restoreVersion(doc.id, version.id).catch(() => ({
      error: "Couldn't restore this version. Try again.",
    }));
    if (result.error) {
      showToast({ ok: false, text: result.error });
      return;
    }
    // The page reloads the document, which remounts this editor with it.
    router.refresh();
  }

  const togglePanel = (name: Panel) =>
    setPanel((current) => (current === name ? null : name));
  const openThreads = comments.filter(
    (comment) => comment.parentId === null && !comment.resolved,
  ).length;
  const nameOf = (userId: number) =>
    userId === currentUserId
      ? "you"
      : (users.find((user) => user.id === userId)?.name ?? "an unknown user");

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
      {previewed && (
        <VersionPreview
          docId={doc.id}
          version={previewed}
          authorName={nameOf(previewed.userId)}
          onRestore={
            canEdit && previewed.id !== versions[0]?.id
              ? () => restore(previewed)
              : undefined
          }
          onClose={() => setPreviewed(null)}
        />
      )}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2">
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
                    {role === "owner" ? "View only" : ACCESS_LABEL[role]}
                  </span>
                )}
              </p>
            </div>
          </div>
          <PresenceAvatars presence={presence} users={users} />
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
          <PanelButton
            panel="comments"
            open={panel}
            onToggle={togglePanel}
            label={openThreads > 0 ? `Comments (${openThreads})` : "Comments"}
          />
          <PanelButton
            panel="history"
            open={panel}
            onToggle={togglePanel}
            label="History"
          />
          <PanelButton
            panel="activity"
            open={panel}
            onToggle={togglePanel}
            label="Activity"
          />
          <button
            type="button"
            onClick={exportPdf}
            disabled={!editor || exporting}
            title="Download as PDF"
            aria-label="Download as PDF"
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-gray-300 px-3 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-default disabled:opacity-60"
          >
            <Icon d="M12 4v11M7 11l5 5 5-5M5 20h14" />
            {exporting ? "Exporting…" : "PDF"}
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
          {panel === "comments" && (
            <CommentsPanel
              docId={doc.id}
              editor={editor}
              comments={comments}
              users={users}
              currentUserId={currentUserId}
              canComment={can(role, "comment")}
              isOwner={role === "owner"}
              activeId={activeCommentId}
              onActivate={showCommentInDocument}
              onChange={setComments}
            />
          )}
          {panel === "history" && (
            <HistoryPanel
              versions={versions}
              users={users}
              currentUserId={currentUserId}
              onView={setPreviewed}
            />
          )}
          {panel === "activity" && (
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

function PanelButton({
  panel,
  open,
  onToggle,
  label,
}: {
  panel: Panel;
  open: Panel | null;
  onToggle: (panel: Panel) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open === panel}
      aria-controls={`${panel}-panel`}
      onClick={() => onToggle(panel)}
      className={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-sm transition ${
        open === panel
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : "border-gray-300 text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
