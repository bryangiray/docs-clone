import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";
import type { ActivityEntry, User } from "@/lib/types";

const ACTION_LABEL: Record<ActivityEntry["action"], string> = {
  created: "created the document",
  viewed: "viewed",
  edited: "edited",
  renamed: "renamed the document",
};

export function ActivityPanel({
  activity,
  users,
  currentUserId,
}: {
  activity: ActivityEntry[];
  users: User[];
  currentUserId: number;
}) {
  return (
    <aside
      id="activity-panel"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 className="text-sm font-medium text-gray-900">Activity</h2>
      {activity.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No activity yet.</p>
      ) : (
        <ol className="mt-3 max-h-[45vh] space-y-3 overflow-y-auto">
          {activity.map((entry) => {
            const user = users.find((user) => user.id === entry.userId);
            return (
              <li key={entry.id} className="flex items-start gap-2 text-sm">
                {user && <Avatar user={user} size={24} />}
                <div className="min-w-0">
                  <p className="text-gray-800">
                    <span className="font-medium">
                      {entry.userId === currentUserId
                        ? "You"
                        : (user?.name ?? "Unknown user")}
                    </span>{" "}
                    {ACTION_LABEL[entry.action]}
                  </p>
                  {/* Server and browser may format in different time zones. */}
                  <time
                    suppressHydrationWarning
                    dateTime={new Date(entry.at).toISOString()}
                    className="text-xs text-gray-500"
                  >
                    {formatDateTime(entry.at)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
