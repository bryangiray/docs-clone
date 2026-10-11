import { signOut } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";
import { Avatar } from "./avatar";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="flex items-center gap-2 text-sm text-gray-700">
        <Avatar user={user} size={30} />
        <span className="hidden sm:inline">
          {user.name}{" "}
          <span className="text-gray-500">({user.username})</span>
        </span>
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="cursor-pointer rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export function UserMenuFallback() {
  return <div className="h-8 w-44 animate-pulse rounded-full bg-gray-200" />;
}
