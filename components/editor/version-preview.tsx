"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { loadVersion } from "@/app/actions/versions";
import { formatDateTime } from "@/lib/format";
import type { VersionSummary } from "@/lib/types";

type Props = {
  docId: number;
  version: VersionSummary;
  authorName: string;
  /** Left out when this version can't be restored (no permission, or it's the latest). */
  onRestore?: () => Promise<void>;
  onClose: () => void;
};

/** A read-only look at one version, with the option to bring it back. */
export function VersionPreview({
  docId,
  version,
  authorName,
  onRestore,
  onClose,
}: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadVersion(docId, version.id)
      .then((result) => {
        if (cancelled) return;
        if (result.content !== undefined) setContent(result.content);
        else setError(result.error ?? "Couldn't load this version.");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this version.");
      });
    return () => {
      cancelled = true;
    };
  }, [docId, version.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function restore() {
    if (!onRestore) return;
    setRestoring(true);
    try {
      await onRestore();
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Version preview"
      className="fixed inset-0 z-30 flex flex-col bg-gray-900/60 p-4 sm:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[816px] flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-gray-900">
              Version from{" "}
              <time suppressHydrationWarning>{formatDateTime(version.at)}</time>
            </h2>
            <p className="text-xs text-gray-500">Saved by {authorName}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {onRestore && (
              <button
                type="button"
                onClick={restore}
                disabled={restoring || content === null}
                className="cursor-pointer rounded-full bg-blue-600 px-4 py-1 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-default disabled:opacity-60"
              >
                {restoring ? "Restoring…" : "Restore this version"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full border border-gray-300 px-4 py-1 text-sm text-gray-700 transition hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-16">
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : content === null ? (
            <div className="h-40 animate-pulse rounded bg-gray-100" />
          ) : (
            <VersionContent content={content} />
          )}
        </div>
      </div>
    </div>
  );
}

// Rendered through the editor rather than as raw HTML, so only what the
// document format allows ends up on the page.
function VersionContent({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Version content" },
    },
  });
  return <EditorContent editor={editor} />;
}
