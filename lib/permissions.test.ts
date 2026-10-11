import { describe, expect, it } from "vitest";
import { can, type Capability } from "./permissions";
import type { Role } from "./types";

const ALL: Capability[] = ["view", "comment", "edit", "share", "delete"];

describe("can", () => {
  it.each<[Role, Capability[]]>([
    ["owner", ["view", "comment", "edit", "share", "delete"]],
    ["editor", ["view", "comment", "edit"]],
    ["commenter", ["view", "comment"]],
    ["viewer", ["view"]],
  ])("lets a %s do exactly %j", (role, allowed) => {
    expect(ALL.filter((capability) => can(role, capability))).toEqual(allowed);
  });

  it("lets someone without access do nothing", () => {
    expect(ALL.filter((capability) => can(null, capability))).toEqual([]);
  });
});
