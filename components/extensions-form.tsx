"use client";

import { useActionState } from "react";
import { updateAllowedExtensions } from "@/app/actions";
import type { ExtensionsState } from "@/app/actions";

const INITIAL_STATE: ExtensionsState = {};

export function ExtensionsForm({ current }: { current: string }) {
  const [state, formAction, isPending] = useActionState(
    updateAllowedExtensions,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Extensions, separated by |
        <input
          name="extensions"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="txt|docx|md"
          defaultValue={state.saved ?? state.value ?? current}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-base font-normal text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </label>
      <p className="text-xs text-gray-500">
        .docx and .md files keep their formatting. Any other extension is
        imported as plain text, so only add text-based formats.
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-green-700">
          Saved: {state.saved}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-default disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
