"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import type { SignInState } from "@/app/actions/auth";
import type { User } from "@/lib/types";
import { Avatar } from "@/components/avatar";

const INITIAL_STATE: SignInState = {};

export function SignInForm({ users }: { users: User[] }) {
  const [state, formAction, isPending] = useActionState(signIn, INITIAL_STATE);

  return (
    <>
      <form action={formAction} className="mt-6 space-y-3">
        <label className="block text-left text-sm font-medium text-gray-700">
          Username
          <input
            name="username"
            autoComplete="username"
            autoFocus
            required
            placeholder="e.g. user1"
            aria-describedby={state.error ? "sign-in-error" : undefined}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </label>
        {state.error && (
          <p id="sign-in-error" role="alert" className="text-left text-sm text-red-600">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full cursor-pointer rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-default disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {users.length > 0 && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Quick sign-in
          </p>
          <div className="mt-3 space-y-2">
            {users.map((user) => (
              <form key={user.id} action={formAction}>
                <input type="hidden" name="username" value={user.username} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:cursor-default disabled:opacity-60"
                >
                  <Avatar user={user} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {user.name}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {user.username}
                    </span>
                  </span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
