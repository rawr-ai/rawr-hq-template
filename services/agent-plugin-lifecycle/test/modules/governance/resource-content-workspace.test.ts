import { describe, expect, it } from "vitest";

import type {
  ContentWorkspaceFailure,
  GitWorkspaceAnchor,
  GitWorkspaceEvidence,
} from "@rawr/resource-content-workspace";
import {
  createExactGitBlobPointer,
  type GitBlobSelection,
  type GitLocator,
} from "../../../src/service/modules/governance/model";
import {
  createResourceExactGitReader,
  type ResourceExactGitReadPort,
} from "../../../src/service/modules/governance/repository/content-workspace";

const encoder = new TextEncoder();
const repositoryIdentity = "git:github.com/example/personal-rawr-hq";
const remoteUrl = "https://github.com/example/personal-rawr-hq.git";
const ref = "refs/heads/main";
const commit = "a".repeat(40);
const tree = "b".repeat(40);
const blob = "c".repeat(40);
const workspacePath = "/tmp/personal-rawr-hq";

const pointerResult = createExactGitBlobPointer({
  repositoryIdentity,
  ref,
  commit,
  tree,
  path: "plugins/agents/release-input.json",
  blob,
});
if (!pointerResult.ok) throw new Error(`Invalid exact Git fixture: ${JSON.stringify(pointerResult.issues)}`);
const pointer = pointerResult.value;
const selection: GitBlobSelection = {
  repositoryIdentity: pointer.repositoryIdentity,
  ref: pointer.ref,
  commit: pointer.commit,
  tree: pointer.tree,
  path: pointer.path,
};
const locator: GitLocator = {
  workspacePath,
  expectedRepositoryIdentity: pointer.repositoryIdentity,
};

const anchor: GitWorkspaceAnchor = Object.freeze({
  root: workspacePath,
  rootDevice: "16777234",
  rootInode: "101",
  refName: ref,
  commit,
  refCommit: commit,
  tree,
  objectFormat: "sha1",
  remoteUrls: Object.freeze([remoteUrl]),
});

describe("resource-backed exact Git governance reader", () => {
  it("projects clean exact inspection, object, and ancestry observations", async () => {
    const bytes = encoder.encode("release input\n");
    const reader = createResourceExactGitReader({
      contentWorkspace: stubPort({
        readGitBlobAtPath: async () => ({
          refCommit: commit,
          commit,
          tree,
          blob,
          bytes,
        }),
        isLocalGitAncestor: async () => true,
      }),
    });

    await expect(reader.inspect(locator, pointer.ref)).resolves.toEqual({
      kind: "Ready",
      repositoryIdentity: pointer.repositoryIdentity,
      canonicalRef: pointer.ref,
      headCommit: pointer.commit,
      headTree: pointer.tree,
    });
    await expect(reader.readBlob(locator, selection)).resolves.toEqual({
      ok: true,
      observation: { pointer, bytes },
    });
    await expect(reader.isAncestor(locator, pointer.commit, pointer.commit)).resolves.toEqual({
      ok: true,
      value: true,
    });
  });

  it("refuses an inspection race and maps a missing resource object semantically", async () => {
    const reader = createResourceExactGitReader({
      contentWorkspace: stubPort({
        captureGitWorkspaceEvidence: async () => evidence({
          ...anchor,
          rootInode: "102",
        }),
        readGitBlobAtPath: async () => {
          throw failure("read-git-blob-at-path", "Missing", "selected blob is absent");
        },
      }),
    });

    await expect(reader.inspect(locator, pointer.ref)).resolves.toEqual({
      kind: "UnreachableRepository",
      reason: "Repository changed during inspection",
    });
    await expect(reader.readBlob(locator, selection)).resolves.toEqual({
      ok: false,
      failure: { code: "MissingObject", message: "selected blob is absent" },
    });
  });

  it.each([
    ["commit", { commit: "d".repeat(40) }],
    ["tree", { tree: "e".repeat(40) }],
  ] as const)("refuses bytes returned for another %s under the same ref observation", async (_identity, drift) => {
    const reader = createResourceExactGitReader({
      contentWorkspace: stubPort({
        readGitBlobAtPath: async () => ({
          refCommit: commit,
          commit,
          tree,
          blob,
          bytes: encoder.encode("wrong identity\n"),
          ...drift,
        }),
      }),
    });

    await expect(reader.readBlob(locator, selection)).resolves.toEqual({
      ok: false,
      failure: {
        code: "WrongObject",
        message: "Git provider returned bytes for another commit or tree",
      },
    });
  });

  it("refuses a selection for another locator identity before consulting the resource", async () => {
    let calls = 0;
    const anotherPointerResult = createExactGitBlobPointer({
      ...selection,
      repositoryIdentity: "git:github.com/example/another-repository",
      blob,
    });
    if (!anotherPointerResult.ok) throw new Error("Invalid alternate repository fixture");
    const reader = createResourceExactGitReader({
      contentWorkspace: stubPort({
        inspectGitWorkspace: async () => {
          calls += 1;
          return anchor;
        },
      }),
    });

    await expect(reader.readBlob({
      ...locator,
      expectedRepositoryIdentity: anotherPointerResult.value.repositoryIdentity,
    }, selection)).resolves.toEqual({
      ok: false,
      failure: {
        code: "WrongObject",
        message: "Git object selection does not belong to the explicit repository locator",
      },
    });
    expect(calls).toBe(0);
  });

  it("refuses bytes when the selected ref changes during object observation", async () => {
    const reader = createResourceExactGitReader({
      contentWorkspace: stubPort({
        readGitBlobAtPath: async () => ({
          refCommit: "f".repeat(40),
          commit,
          tree,
          blob,
          bytes: encoder.encode("raced ref\n"),
        }),
      }),
    });

    await expect(reader.readBlob(locator, selection)).resolves.toEqual({
      ok: false,
      failure: {
        code: "UnreachableObject",
        message: "Selected Git ref changed during object observation",
      },
    });
  });

  it("refuses relative locators", async () => {
    const reader = createResourceExactGitReader({ contentWorkspace: stubPort() });
    const relative = { ...locator, workspacePath: "relative/repository" };

    await expect(reader.inspect(relative, pointer.ref)).resolves.toMatchObject({
      kind: "UnreachableRepository",
    });
  });
});

function stubPort(
  overrides: Partial<ResourceExactGitReadPort> = {},
): ResourceExactGitReadPort {
  return Object.freeze({
    inspectGitWorkspace: async () => anchor,
    captureGitWorkspaceEvidence: async () => evidence(anchor),
    readGitBlobAtPath: async () => ({
      refCommit: commit,
      commit,
      tree,
      blob,
      bytes: new Uint8Array(),
    }),
    isLocalGitAncestor: async () => false,
    ...overrides,
  });
}

function evidence(closingAnchor: GitWorkspaceAnchor): GitWorkspaceEvidence {
  return Object.freeze({
    openingAnchor: anchor,
    openingStatus: new Uint8Array(),
    openingTrackedFlags: new Uint8Array(),
    worktreeObjectIds: Object.freeze([]),
    indexEntries: new Uint8Array(),
    closingAnchor,
    closingStatus: new Uint8Array(),
    closingTrackedFlags: new Uint8Array(),
  });
}

function failure(
  operation: ContentWorkspaceFailure["operation"],
  reason: ContentWorkspaceFailure["reason"],
  detail: string,
): ContentWorkspaceFailure {
  return { _tag: "ContentWorkspaceFailure", operation, reason, detail };
}
