import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";
import type { User, VersionSummary } from "@/lib/types";

export function HistoryPanel({
  versions,
  users,
  currentUserId,
  onView,
}: {
  /** Newest first. */
  versions: VersionSummary[];
  users: User[];
  currentUserId: number;
  onView: (version: VersionSummary) => void;
}) {
  return (
    <aside
      id="history-panel"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 className="text-sm font-medium text-gray-900">Version history</h2>
      {versions.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          Versions appear here as the document is edited.
        </p>
      ) : (
        <ol className="mt-3 max-h-[45vh] space-y-1 overflow-y-auto">
          {versions.map((version, index) => {
            const user = users.find((user) => user.id === version.userId);
            return (
              <li key={version.id}>
                <button
                  type="button"
                  onClick={() => onView(version)}
                  className="flex w-full cursor-pointer items-start gap-2 rounded-lg p-2 text-left text-sm hover:bg-gray-100"
                >
                  {user && <Avatar user={user} size={24} />}
                  <span className="min-w-0 flex-1">
                    {/* Server and browser may format in different time zones. */}
                    <time
                      suppressHydrationWarning
                      dateTime={new Date(version.at).toISOString()}
                      className="block text-gray-800"
                    >
                      {formatDateTime(version.at)}
                    </time>
                    <span className="text-xs text-gray-500">
                      {version.userId === currentUserId
                        ? "You"
                        : (user?.name ?? "Unknown user")}
                    </span>
                  </span>
                  {index === 0 && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                      Latest
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
