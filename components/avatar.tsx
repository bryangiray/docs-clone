import type { User } from "@/lib/types";

const COLORS = [
  "#1a73e8",
  "#d93025",
  "#188038",
  "#e37400",
  "#9334e6",
  "#00796b",
];

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
        backgroundColor: COLORS[(user.id - 1) % COLORS.length],
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
    >
      {initials(user.name)}
    </span>
  );
}
