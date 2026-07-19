import { describe, expect, it } from "vitest";

import { createGovernanceCurrentMainSelectionReader } from "@rawr/agent-plugin-lifecycle/bindings/governance";
import { parseCanonicalStatusRequest } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import type {
  ContentWorkspaceGitReadAsyncPort,
  GitWorkspaceAnchor,
} from "@rawr/resource-content-workspace";

describe("governance-backed current-main selection", () => {
  it("adapts one canonical provider locator into the governance Git selector", async () => {
    const inspections: unknown[] = [];
    const anchor = governanceAnchor();
    const dirtyStatus = new TextEncoder().encode("? fixture-dirty\0");
    const contentWorkspace: ContentWorkspaceGitReadAsyncPort = Object.freeze({
      inspectGitWorkspace: async (
        input: Parameters<ContentWorkspaceGitReadAsyncPort["inspectGitWorkspace"]>[0],
      ) => {
        inspections.push(input);
        return anchor;
      },
      captureGitWorkspaceEvidence: async () => ({
        openingAnchor: anchor,
        openingStatus: dirtyStatus,
        openingTrackedFlags: new Uint8Array(),
        worktreeObjectIds: [],
        indexEntries: new Uint8Array(),
        closingAnchor: anchor,
        closingStatus: dirtyStatus,
        closingTrackedFlags: new Uint8Array(),
      }),
      readGitTree: async () => unexpected("tree read"),
      readGitBlob: async () => unexpected("blob read"),
      observeGitStagedIndex: async () => unexpected("staged-index observation"),
      readGitBlobAtPath: async () => unexpected("path read"),
      isLocalGitAncestor: async () => unexpected("ancestry read"),
      listGitChangedPaths: async () => unexpected("changed-path read"),
    });
    const reader = createGovernanceCurrentMainSelectionReader(contentWorkspace);

    const result = await reader.resolve(currentMainLocator());

    expect(result).toEqual({
      kind: "DIRTY_REPOSITORY",
      reason: "Canonical content workspace is dirty",
    });
    expect(inspections).toEqual([{
      locator: "/tmp/content",
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
    }]);
  });
});

function governanceAnchor(): GitWorkspaceAnchor {
  return Object.freeze({
    root: "/tmp/content",
    rootDevice: "16777234",
    rootInode: "101",
    refName: "refs/heads/main",
    commit: "a".repeat(40),
    refCommit: "a".repeat(40),
    tree: "b".repeat(40),
    objectFormat: "sha1",
    remoteUrls: Object.freeze(["https://github.com/rawr-ai/rawr-hq.git"]),
  });
}

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
