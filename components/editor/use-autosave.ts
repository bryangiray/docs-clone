"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTOSAVE_DELAY_MS = 800;

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

type Options = {
  editor: Editor | null;
  initialContent: string;
  /** Stores the HTML; must reject when the save fails. Keep it stable. */
  persist: (html: string) => Promise<void>;
  /** Called after edits were saved while leaving the page. */
  onSavedOnLeave: () => void;
};

/**
 * Saves the editor's content shortly after each change, on Cmd/Ctrl+S, and
 * when the page is left. `save()` resolves to whether everything is stored.
 */
export function useAutosave({
  editor,
  initialContent,
  persist,
  onSavedOnLeave,
}: Options): { status: SaveStatus; save: () => Promise<boolean> } {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const latestHtml = useRef(initialContent);
  const dirty = useRef(false);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const save = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    if (saving.current) return false;
    saving.current = true;
    try {
      // Loop so edits made while a request is in flight are saved too.
      while (dirty.current) {
        dirty.current = false;
        setStatus("saving");
        await persist(latestHtml.current);
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
  }, [persist]);

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
    return () => {
      clearTimeout(timer.current);
      if (dirty.current) {
        dirty.current = false;
        persist(latestHtml.current)
          .then(onSavedOnLeave)
          .catch(() => {});
      }
    };
  }, [persist, onSavedOnLeave]);

  return { status, save };
}
