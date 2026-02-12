import { describe, expect, it } from "vitest";

import { buildFixSliceBranchName } from "../src/lib/plugins-lifecycle/fix-slice";

describe("buildFixSliceBranchName", () => {
  it("builds a predictable branch name from current branch and change unit", () => {
    const name = buildFixSliceBranchName({
      baseBranch: "codex/dev-plugin-lifecycle-quality-system",
      changeUnitId: "cli:plugins/cli/plugins/src/commands/plugins/improve.ts",
      now: new Date("2026-02-11T19:22:33.000Z"),
    });

    expect(name).toBe(
      "codex/dev-plugin-lifecycle-quality-system-fix-cli-plugins-cli-plugins-src-commands-plugins-imp-20260211192233",
    );
  });

  it("falls back to a stable token when base branch or change id are blank", () => {
    const name = buildFixSliceBranchName({
      baseBranch: "   ",
      changeUnitId: " ::: ",
      now: new Date("2026-02-11T00:00:00.000Z"),
    });

    expect(name).toBe("branch-fix-change-20260211000000");
  });
});
