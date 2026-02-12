import { describe, expect, it } from "vitest";
import {
  matchTemplateManagedFiles,
  normalizeMode,
  resolveGuardModeFromInputs,
} from "../../../scripts/githooks/template-managed-guard-lib";

describe("template-managed guard mode resolution", () => {
  it("prefers explicit env mode", () => {
    expect(resolveGuardModeFromInputs({ role: "personal", envMode: "block" })).toBe("block");
  });

  it("uses config mode when env mode is absent", () => {
    expect(resolveGuardModeFromInputs({ role: "personal", configMode: "off" })).toBe("off");
  });

  it("applies owner mode when owner and current emails match", () => {
    expect(
      resolveGuardModeFromInputs({
        role: "personal",
        ownerEmail: "tools@matei.work",
        ownerMode: "block",
        currentEmail: "tools@matei.work",
      }),
    ).toBe("block");
  });

  it("defaults to warn in personal repos and off in template repos", () => {
    expect(resolveGuardModeFromInputs({ role: "personal" })).toBe("warn");
    expect(resolveGuardModeFromInputs({ role: "template" })).toBe("off");
  });

  it("normalizes only valid modes", () => {
    expect(normalizeMode("warn")).toBe("warn");
    expect(normalizeMode("BLOCK")).toBe("block");
    expect(normalizeMode("bad-mode")).toBeNull();
  });
});

describe("template-managed path matching", () => {
  const patterns = [
    "plugins/cli/plugins/**",
    "plugins/agents/hq/skills/agent-plugin-management/**",
    "plugins/agents/hq/workflows/lifecycle-skill.md",
  ];

  it("matches toolkit lifecycle code paths", () => {
    const matched = matchTemplateManagedFiles(["plugins/cli/plugins/src/commands/plugins/lifecycle/check.ts"], patterns);
    expect(matched).toEqual(["plugins/cli/plugins/src/commands/plugins/lifecycle/check.ts"]);
  });

  it("matches lifecycle policy/workflow split paths", () => {
    const matched = matchTemplateManagedFiles(
      [
        "plugins/agents/hq/skills/agent-plugin-management/SKILL.md",
        "plugins/agents/hq/workflows/lifecycle-skill.md",
      ],
      patterns,
    );
    expect(matched).toEqual([
      "plugins/agents/hq/skills/agent-plugin-management/SKILL.md",
      "plugins/agents/hq/workflows/lifecycle-skill.md",
    ]);
  });

  it("does not match non-lifecycle operational hq paths", () => {
    const matched = matchTemplateManagedFiles(["plugins/agents/hq/workflows/create-content.md"], patterns);
    expect(matched).toEqual([]);
  });
});
