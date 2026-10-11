"use client";

import { useState } from "react";
import { renameDocument } from "@/app/actions/documents";
import { DEFAULT_TITLE, MAX_TITLE_LENGTH } from "@/lib/limits";
import type { ActivityEntry } from "@/lib/types";

type Props = {
  docId: number;
  initialTitle: string;
  canEdit: boolean;
  onRenamed: (activity: ActivityEntry[]) => void;
};

/** The document's title: renames on blur or Enter, Escape cancels. */
export function TitleInput({ docId, initialTitle, canEdit, onRenamed }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);

  async function commit() {
    if (!canEdit) return;
    const next = title.trim() || DEFAULT_TITLE;
    setTitle(next);
    if (next === savedTitle) return;
    try {
      const result = await renameDocument(docId, next);
      setSavedTitle(result.title);
      setTitle(result.title);
      onRenamed(result.activity);
    } catch {
      setTitle(savedTitle);
    }
  }

  return (
    <>
      <title>{`${savedTitle} - Docs`}</title>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setTitle(savedTitle);
            event.currentTarget.blur();
          }
        }}
        maxLength={MAX_TITLE_LENGTH}
        readOnly={!canEdit}
        aria-label="Document title"
        className="w-full max-w-md truncate rounded border border-transparent px-1.5 py-0.5 text-lg text-gray-900 hover:border-gray-300 focus:border-blue-600 focus:outline-none"
      />
    </>
  );
}
