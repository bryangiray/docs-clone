"use client";

import { useActionState } from "react";
import { addUser } from "@/app/actions";
import type { AddUserState } from "@/app/actions";

const INITIAL_STATE: AddUserState = {};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600";

export function AddUserForm() {
  const [state, formAction, isPending] = useActionState(addUser, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Username
          <input
            name="username"
            required
            maxLength={50}
            autoComplete="off"
            autoCapitalize="none"
            placeholder="e.g. user4"
            defaultValue={state.username ?? ""}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Display name
          <input
            name="displayName"
            required
            maxLength={100}
            autoComplete="off"
            placeholder="e.g. Dana Giray"
            defaultValue={state.displayName ?? ""}
            className={INPUT_CLASS}
          />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.added && (
        <p role="status" className="text-sm text-green-700">
          Added {state.added}.
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-default disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}
