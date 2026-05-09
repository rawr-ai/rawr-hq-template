import { describe, expect, it } from "vitest";
import DevRepoSyncUpstream from "../src/commands/dev/repo/sync-upstream";
import DevStackDoctor from "../src/commands/dev/stack/doctor";
import DevStackDrain from "../src/commands/dev/stack/drain";
import DevWorktreeCleanup from "../src/commands/dev/worktree/cleanup";

describe("@rawr/plugin-devops command projections", () => {
  it("keeps devops commands thin and discoverable", () => {
    expect(DevStackDoctor.description).toContain("Inspect");
    expect(DevStackDrain.flags).toHaveProperty("apply");
    expect(DevRepoSyncUpstream.flags).toHaveProperty("upstream-ref");
    expect(DevWorktreeCleanup.flags).toHaveProperty("prefix");
  });
});
