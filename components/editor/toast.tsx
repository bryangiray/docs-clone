"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 2500;

export type ToastMessage = { ok: boolean; text: string };

/** One short-lived message at a time; a new one replaces the current one. */
export function useToast(): {
  toast: ToastMessage | null;
  showToast: (message: ToastMessage) => void;
} {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((message: ToastMessage) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
        toast.ok ? "bg-gray-900" : "bg-red-600"
      }`}
    >
      {toast.text}
    </div>
  );
}
