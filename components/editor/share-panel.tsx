"use client";

import { useState } from "react";
import { setShare } from "@/app/actions/sharing";
import { Avatar } from "@/components/avatar";
import type { Share, User } from "@/lib/types";

export function SharePanel({
  docId,
  ownerId,
  canShare,
  users,
  initialShares,
  currentUserId,
}: {
  docId: number;
  ownerId: number;
  canShare: boolean;
  users: User[];
  initialShares: Share[];
  currentUserId: number;
}) {
  const [shares, setShares] = useState(initialShares);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [newLevel, setNewLevel] = useState<Share["level"]>("viewer");

  async function change(userId: number, level: Share["level"] | "none") {
    setError(null);
    try {
      const result = await setShare(docId, userId, level);
      setShares(result.shares);
    } catch {
      setError("Couldn't update sharing. Try again.");
    }
  }

  function add(user: User) {
    setSearch("");
    change(user.id, newLevel);
  }

  const levelOf = (userId: number) =>
    shares.find((share) => share.userId === userId)?.level;
  // Only the owner and people the document is shared with are listed.
  const people = users.filter(
    (user) => user.id === ownerId || levelOf(user.id) !== undefined,
  );

  const query = search.trim().toLowerCase();
  const matches = query
    ? users
        .filter(
          (user) =>
            user.id !== ownerId &&
            levelOf(user.id) === undefined &&
            (user.name.toLowerCase().includes(query) ||
              user.username.toLowerCase().includes(query)),
        )
        .slice(0, 6)
    : [];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-medium text-gray-900">
        {canShare ? "Share" : "People with access"}
      </h2>

      {canShare && (
        <div className="relative mt-3">
          <div className="flex gap-1">
            <input
              type="search"
              role="combobox"
              aria-label="Add people by name"
              aria-expanded={query !== ""}
              aria-controls="share-suggestions"
              autoComplete="off"
              placeholder="Add people by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches[0]) add(matches[0]);
                if (event.key === "Escape") setSearch("");
              }}
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            />
            <select
              aria-label="Access for new people"
              value={newLevel}
              onChange={(event) =>
                setNewLevel(event.target.value as Share["level"])
              }
              className="cursor-pointer rounded border border-gray-300 px-1 text-xs text-gray-800"
            >
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          {query !== "" && (
            <ul
              id="share-suggestions"
              role="listbox"
              aria-label="Matching users"
              className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-500">
                  No matching users to add.
                </li>
              ) : (
                matches.map((user) => (
                  <li key={user.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => add(user)}
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                    >
                      <Avatar user={user} size={22} />
                      <span className="min-w-0 flex-1 truncate text-gray-800">
                        {user.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {user.username}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      <ul className="mt-3 space-y-2" aria-label="People with access">
        {people.map((user) => (
          <li key={user.id} className="flex items-center gap-2 text-sm">
            <Avatar user={user} size={24} />
            <span className="min-w-0 flex-1 truncate text-gray-800">
              {user.name}
              {user.id === currentUserId && " (you)"}
            </span>
            {user.id === ownerId ? (
              <span className="text-xs text-gray-500">Owner</span>
            ) : canShare ? (
              <select
                aria-label={`Access for ${user.name}`}
                value={levelOf(user.id)}
                onChange={(event) =>
                  change(user.id, event.target.value as Share["level"] | "none")
                }
                className="cursor-pointer rounded border border-gray-300 px-1 py-0.5 text-xs text-gray-800"
              >
                <option value="viewer">Viewer</option>
                <option value="commenter">Commenter</option>
                <option value="editor">Editor</option>
                <option value="none">Remove access</option>
              </select>
            ) : (
              <span className="text-xs capitalize text-gray-500">
                {levelOf(user.id)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
