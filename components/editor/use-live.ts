"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Comment, Presence } from "@/lib/types";

const HEARTBEAT_MS = 4000;
// How long after the last keystroke someone still counts as editing.
const EDITING_WINDOW_MS = 6000;

type Options = {
  docId: number;
  editor: Editor | null;
  initialComments: Comment[];
};

// Keeps the previous value when nothing changed, so a heartbeat that brings no
// news doesn't re-render the editor.
function unlessSame<T>(next: T): (previous: T) => T {
  return (previous) =>
    JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}

/**
 * Tells the server this person has the document open (and whether they are
 * typing) every few seconds while the tab is visible, and keeps the list of
 * other people present and the comments up to date from the answers.
 */
export function useLive({ docId, editor, initialComments }: Options): {
  presence: Presence[];
  comments: Comment[];
  setComments: (comments: Comment[]) => void;
} {
  const [presence, setPresence] = useState<Presence[]>([]);
  const [comments, setPolledComments] = useState(initialComments);
  const lastEditAt = useRef(0);
  const reportedEditing = useRef(false);
  const localChanges = useRef(0);
  const beat = useRef(() => {});
  // Requests go out one after another so "left" can't overtake "here".
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const setComments = useCallback((next: Comment[]) => {
    localChanges.current++;
    setPolledComments(next);
  }, []);

  useEffect(() => {
    const url = `/api/documents/${docId}/live`;
    let stopped = false;

    async function heartbeat() {
      if (stopped || document.hidden) return;
      const editing = Date.now() - lastEditAt.current < EDITING_WINDOW_MS;
      reportedEditing.current = editing;
      const changesBefore = localChanges.current;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editing }),
      });
      if (stopped || !response.ok) return;
      const data: { presence: Presence[]; comments: Comment[] } =
        await response.json();
      setPresence(unlessSame(data.presence));
      // A comment written here while the request was under way is newer.
      if (changesBefore === localChanges.current) {
        setPolledComments(unlessSame(data.comments));
      }
    }
    const leave = () => fetch(url, { method: "DELETE", keepalive: true });
    const enqueue = (request: () => Promise<unknown>) => {
      queue.current = queue.current.then(request).catch(() => {});
    };

    beat.current = () => enqueue(heartbeat);
    const onVisibilityChange = () => enqueue(document.hidden ? leave : heartbeat);
    // The page is going away: there is no time to wait for the queue.
    const onPageHide = () => void leave().catch(() => {});

    beat.current();
    const timer = setInterval(beat.current, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      stopped = true;
      beat.current = () => {};
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      enqueue(leave);
    };
  }, [docId]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      lastEditAt.current = Date.now();
      // Don't make others wait for the next heartbeat to see the first keystroke.
      if (!reportedEditing.current) {
        reportedEditing.current = true;
        beat.current();
      }
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  return { presence, comments, setComments };
}
