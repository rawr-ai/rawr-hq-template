import { describe, expect, it } from "vitest";

import { parseCanonicalStatusRequest } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { createGovernanceCurrentMainSelectionReader } from "../../../../src/lib/agent-plugins/service-runtime/providers/current-main-selection";

describe("governance-backed current-main selection", () => {
  it("adapts one canonical provider locator into the governance Git selector", async () => {
    const inspections: unknown[] = [];
    const reader = createGovernanceCurrentMainSelectionReader({
      governance: {
        git: {
          inspect: async (locator, ref) => {
            inspections.push({ locator, ref });
            return { kind: "DirtyRepository" as const };
          },
          readBlob: async () => unexpected("blob read"),
          isAncestor: async () => unexpected("ancestry read"),
        },
      },
    });

    const result = await reader.resolve(currentMainLocator());

    expect(result).toEqual({
      kind: "DIRTY_REPOSITORY",
      reason: "Canonical content workspace is dirty",
    });
    expect(inspections).toEqual([{
      locator: {
        workspacePath: "/tmp/content",
        expectedRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
      },
      ref: "refs/heads/main",
    }]);
  });
});

function currentMainLocator() {
  const parsed = parseCanonicalStatusRequest({
    kind: "canonical-status",
    channel: "current-main",
    locator: {
      repositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
      workspaceRoot: "/tmp/content",
    },
    targets: [{ provider: "codex", home: "/tmp/codex-home" }],
  });
  if (!parsed.ok) throw new Error("Expected a valid canonical-status locator fixture");
  return parsed.value.locator;
}

function unexpected(label: string): never {
  throw new Error(`Unexpected ${label}`);
}
