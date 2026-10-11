import type { User } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{
        backgroundColor: user.color,
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
    >
      {initials(user.name)}
    </span>
  );
}
