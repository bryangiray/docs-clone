import type { Role } from "./types";

export type Capability = "view" | "comment" | "edit" | "share" | "delete";

// The single place that says what each role may do. Adding a role or a
// capability is a change here, not in the code that checks permissions.
const CAPABILITIES: Record<Role, readonly Capability[]> = {
  owner: ["view", "comment", "edit", "share", "delete"],
  editor: ["view", "comment", "edit"],
  commenter: ["view", "comment"],
  viewer: ["view"],
};

/** How a share level reads to the person it was given to. */
export const ACCESS_LABEL: Record<Exclude<Role, "owner">, string> = {
  editor: "Can edit",
  commenter: "Can comment",
  viewer: "View only",
};

export function can(role: Role | null, capability: Capability): boolean {
  return role !== null && CAPABILITIES[role].includes(capability);
}
