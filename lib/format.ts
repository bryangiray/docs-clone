const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(ms: number): string {
  return formatter.format(new Date(ms));
}
