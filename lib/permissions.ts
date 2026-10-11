import type { Role } from "./types";

export type Capability = "view" | "edit" | "share" | "delete";

// The single place that says what each role may do. Adding a role or a
// capability is a change here, not in the code that checks permissions.
const CAPABILITIES: Record<Role, readonly Capability[]> = {
  owner: ["view", "edit", "share", "delete"],
  editor: ["view", "edit"],
  viewer: ["view"],
};

export function can(role: Role | null, capability: Capability): boolean {
  return role !== null && CAPABILITIES[role].includes(capability);
}
