"use client";

import { useTransition } from "react";
import { deleteDocument } from "@/app/actions/documents";

export function DeleteDocumentButton({
  id,
  title,
}: {
  id: number;
  title: string;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(`Delete “${title}”? This can't be undone.`)) return;
    startTransition(() => deleteDocument(id));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      data-pending={isPending ? "" : undefined}
      title="Delete document"
      aria-label={`Delete ${title}`}
      className="mr-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-default"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
      </svg>
    </button>
  );
}
