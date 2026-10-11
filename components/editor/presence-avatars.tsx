import { Avatar } from "@/components/avatar";
import type { Presence, User } from "@/lib/types";

const MAX_SHOWN = 4;

/** The other people who have the document open, with a dot on those typing. */
export function PresenceAvatars({
  presence,
  users,
}: {
  presence: Presence[];
  users: User[];
}) {
  const people = presence.flatMap(({ userId, editing }) => {
    const user = users.find((user) => user.id === userId);
    return user ? [{ user, editing }] : [];
  });
  if (people.length === 0) return null;

  const editing = people.filter((person) => person.editing);
  return (
    <div className="flex shrink-0 items-center gap-2">
      {editing.length > 0 && (
        <span className="hidden text-xs text-green-700 md:inline">
          {editing.length === 1
            ? `${editing[0].user.name} is editing…`
            : `${editing.length} people are editing…`}
        </span>
      )}
      <ul aria-label="Also in this document" className="flex -space-x-2">
        {people.slice(0, MAX_SHOWN).map(({ user, editing }) => {
          const label = `${user.name} is ${editing ? "editing" : "viewing"}`;
          return (
            <li
              key={user.id}
              title={label}
              className={`relative rounded-full ring-2 ${
                editing ? "ring-green-500" : "ring-white"
              }`}
            >
              <Avatar user={user} size={28} />
              <span className="sr-only">{label}</span>
              {editing && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 animate-pulse rounded-full border border-white bg-green-500"
                />
              )}
            </li>
          );
        })}
        {people.length > MAX_SHOWN && (
          <li
            title={people
              .slice(MAX_SHOWN)
              .map(({ user }) => user.name)
              .join(", ")}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-700 ring-2 ring-white"
          >
            +{people.length - MAX_SHOWN}
          </li>
        )}
      </ul>
    </div>
  );
}
