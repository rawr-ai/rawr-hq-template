import type { ContentWorkspaceFailure, GitRefObservation } from "@rawr/resource-content-workspace";
import { describe, expect, it } from "vitest";
import {
  createExactGitBlobPointer,
  type GitBlobSelection,
  type GitLocator,
} from "../../../src/service/model/dto/current-main-git";
import {
  createResourceExactGitReader,
  type ResourceExactGitReadPort,
} from "../../../src/service/model/repositories/current-main-content-workspace";

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
if (!pointerResult.ok)
  throw new Error(`Invalid exact Git fixture: ${JSON.stringify(pointerResult.issues)}`);
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

const refObservation: GitRefObservation = Object.freeze({
  root: workspacePath,
  refName: ref,
  commit,
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
      }),
    });

    await expect(reader.inspect(locator, pointer.ref)).resolves.toEqual({
      kind: "Ready",
      repositoryIdentity: pointer.repositoryIdentity,
      canonicalRef: pointer.ref,
      headCommit: pointer.commit,
      headTree: pointer.tree,
    });
    await expect(reader.readFileAtRevision(locator, selection)).resolves.toEqual({
      ok: true,
      observation: { pointer, bytes },
    });
    await expect(reader.isAncestor(locator, pointer.commit, pointer.commit)).resolves.toBe(true);
  });

  it("maps exact-ref inspection and missing-object failures semantically", async () => {
    const inspectionReader = createResourceExactGitReader({
      contentWorkspace: stubPort({
        inspectGitRef: async () => {
          throw failure("inspect-git-ref", "GitFailed", "selected ref is unavailable");
        },
      }),
    });
    const readReader = createResourceExactGitReader({
      contentWorkspace: stubPort({
        readGitBlobAtPath: async () => {
          throw failure("read-git-blob-at-path", "Missing", "selected blob is absent");
        },
      }),
    });

    await expect(inspectionReader.inspect(locator, pointer.ref)).resolves.toEqual({
      kind: "UnreachableRepository",
      reason: "selected ref is unavailable",
    });
    await expect(readReader.readFileAtRevision(locator, selection)).resolves.toEqual({
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

    await expect(reader.readFileAtRevision(locator, selection)).resolves.toEqual({
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
        inspectGitRef: async () => {
          calls += 1;
          return refObservation;
        },
      }),
    });

    await expect(
      reader.readFileAtRevision(
        {
          ...locator,
          expectedRepositoryIdentity: anotherPointerResult.value.repositoryIdentity,
        },
        selection
      )
    ).resolves.toEqual({
      ok: false,
      failure: {
        code: "WrongObject",
        message: "Git object selection does not belong to the explicit repository locator",
      },
    });
    expect(calls).toBe(0);
  });

  it("refuses bytes when the selected ref resolves to another commit", async () => {
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

    await expect(reader.readFileAtRevision(locator, selection)).resolves.toEqual({
      ok: false,
      failure: {
        code: "WrongObject",
        message: "Selected Git ref resolves to another commit",
      },
    });
  });

  it("refuses relative locators", async () => {
    const reader = createResourceExactGitReader({
      contentWorkspace: stubPort(),
    });
    const relative = { ...locator, workspacePath: "relative/repository" };

    await expect(reader.inspect(relative, pointer.ref)).resolves.toMatchObject({
      kind: "UnreachableRepository",
    });
  });
});

function stubPort(overrides: Partial<ResourceExactGitReadPort> = {}): ResourceExactGitReadPort {
  return Object.freeze({
    inspectGitRef: async () => refObservation,
    readGitBlobAtPath: async () => ({
      refCommit: commit,
      commit,
      tree,
      blob,
      bytes: new Uint8Array(),
    }),
    isLocalGitAncestor: async () => true,
    ...overrides,
  });
}

function failure(
  operation: ContentWorkspaceFailure["operation"],
  reason: ContentWorkspaceFailure["reason"],
  detail: string
): ContentWorkspaceFailure {
  return { _tag: "ContentWorkspaceFailure", operation, reason, detail };
}
