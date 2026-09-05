import type {
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@habitat-ai/resource-content-workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  CURRENT_MAIN_V3_RECORD_PATH,
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
} from "../../../../src/service/model/dto/current-main-record";
import {
  type CanonicalChannelSelection,
  MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH,
} from "../../../../src/service/model/dto/current-main-selection";
import type { AgentPluginReleaseInput } from "../../../../src/service/model/dto/release-input";
import type { ReleaseResult } from "../../../../src/service/model/dto/release-result";
import { canonicalSerializeCurrentMainRecord } from "../../../../src/service/model/policy/current-main-record";
import { contentDigest } from "../../../../src/service/model/policy/release-digest";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseRepositoryIdentity,
} from "../../../../src/service/model/policy/release-identity";
import { createAgentPluginReleaseInput } from "../../../../src/service/model/policy/release-input";
import { canonicalSerializeAgentPluginReleaseInput } from "../../../../src/service/model/policy/release-input-codec";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../../support/service/client";

const encoder = new TextEncoder();
const REPOSITORY = repository("git:github.com/example/personal-rawr-hq");
const REPOSITORY_URL = "https://github.com/example/personal-rawr-hq.git";
const OTHER_REPOSITORY = repository("git:github.com/example/other");
const OTHER_REPOSITORY_URL = "https://github.com/example/other.git";
const CONTENT_AUTHORITY = contentAuthority("personal-rawr-hq");
const MAIN_REF = "refs/heads/main";
const CONTENT_REF = "refs/tags/agent-plugins/content-2026-07-22";
const HEAD_COMMIT = oid("a");
const HEAD_TREE = oid("b");
const CONTENT_COMMIT = oid("c");
const CONTENT_TREE = oid("d");
const RECORD_BLOB = oid("e");
const RELEASE_INPUT_BLOB = oid("f");
const WORKSPACE = "/tmp/personal-rawr-hq";

describe("observed-Git current-main v3 selection", () => {
  it("reads only the fixed Habitat selector path and never falls back to a legacy record", async () => {
    const fixture = selectionFixture();
    const paths: string[] = [];
    const resource: ContentWorkspaceResource<never> = {
      ...fixture.resource,
      readGitBlobAtPath: (input) => {
        paths.push(input.path);
        if (input.path === ".habitat/agent-plugin-lifecycle/channels/current-main.json") {
          return Effect.fail(failure("read-git-blob-at-path", "Missing", "No Habitat selector"));
        }
        // A readable old selector is not an alias for the current data interface.
        return fixture.resource.readGitBlobAtPath({ ...input, path: CURRENT_MAIN_V3_RECORD_PATH });
      },
    };
    await expect(select(resource)).resolves.toEqual({
      kind: "STALE_RECORD",
      reason: "No Habitat selector",
    });
    expect(paths).toEqual([".habitat/agent-plugin-lifecycle/channels/current-main.json"]);
    expect(CURRENT_MAIN_V3_RELEASE_INPUT_PATH).toBe(".habitat/release-input.json");
  });

  it("sequences the seven exact resource calls and returns the reviewed record", async () => {
    const fixture = selectionFixture();

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "CURRENT_ELIGIBLE",
      selection: fixture.record,
    });
    expect(fixture.calls).toEqual([
      `inspect:${MAIN_REF}`,
      `inspect:${MAIN_REF}`,
      `read:${CURRENT_MAIN_V3_RECORD_PATH}`,
      "ancestry",
      `inspect:${CONTENT_REF}`,
      `read:${CURRENT_MAIN_V3_RELEASE_INPUT_PATH}`,
      `inspect:${MAIN_REF}`,
    ]);
  });

  it("selects a canonical source tag with Git-valid punctuation", async () => {
    const sourceRef = "refs/tags/release+candidate";
    const fixture = selectionFixture({ sourceRef });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "CURRENT_ELIGIBLE",
      selection: fixture.record,
    });
    expect(fixture.calls).toContain(`inspect:${sourceRef}`);
  });

  it("rejects v2 record bytes before ancestry or selected-content reads", async () => {
    const fixture = selectionFixture({
      recordBytes: encoder.encode(
        `${JSON.stringify({
          schemaVersion: 2,
          channel: "current-main",
          contentAuthority: CONTENT_AUTHORITY,
          sourceRepositoryIdentity: REPOSITORY,
          sourceCommit: CONTENT_COMMIT,
          sourceTree: CONTENT_TREE,
          releaseInputDigest: "ri1_invalid",
        })}\n`
      ),
    });

    await expect(select(fixture.resource)).resolves.toMatchObject({
      kind: "FORGED_RECORD",
      reason: expect.stringContaining("v3 is invalid"),
    });
    expect(fixture.calls).toEqual([
      `inspect:${MAIN_REF}`,
      `inspect:${MAIN_REF}`,
      `read:${CURRENT_MAIN_V3_RECORD_PATH}`,
    ]);
  });

  it("refuses a moved source tag with the existing public classification", async () => {
    const fixture = selectionFixture({ movedSourceRef: true });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Selected Git ref resolves to another commit",
    });
  });

  it("rejects a record that selects its containing main commit", async () => {
    const fixture = selectionFixture({ contentCommit: HEAD_COMMIT });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Current-main cannot select its containing record commit",
    });
    expect(fixture.calls).toHaveLength(3);
  });

  it("rejects selected content that is not reachable from canonical main", async () => {
    const fixture = selectionFixture({ ancestor: false });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "STALE_RECORD",
      reason: "Selected content commit is not reachable from canonical main",
    });
  });

  it("rejects release-input bytes whose digest differs from current-main", async () => {
    const fixture = selectionFixture({
      releaseInputBytes: canonicalSerializeAgentPluginReleaseInput(
        releaseInputFixture("different\n")
      ),
    });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Selected release-input digest differs from current-main",
    });
  });

  it("rejects release-input authority that differs from current-main", async () => {
    const fixture = selectionFixture({
      recordContentAuthority: contentAuthority("another-authority"),
    });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Selected release input declares another content authority",
    });
  });

  it("fails closed when canonical main changes before selection returns", async () => {
    const fixture = selectionFixture({ changeClosingMain: true });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "UNREACHABLE_REPOSITORY",
      reason: "Canonical main changed during current-main selection",
    });
  });

  it.each([
    ["Missing", "STALE_RECORD"],
    ["IdentityChanged", "FORGED_RECORD"],
    ["LimitExceeded", "FORGED_RECORD"],
  ] as const)("maps a %s exact-read failure to %s", async (reason, expectedKind) => {
    const fixture = selectionFixture({
      recordReadFailure: failure("read-git-blob-at-path", reason, `${reason} fixture`),
    });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: expectedKind,
      reason: `${reason} fixture`,
    });
  });

  it.each([
    ["commit", { recordBlobCommit: oid("9") }],
    ["tree", { recordBlobTree: oid("9") }],
  ] as const)("rejects a record blob with a mismatched %s", async (_kind, options) => {
    const fixture = selectionFixture(options);

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Git provider returned bytes for another commit or tree",
    });
  });

  it("rejects a malformed observed record blob before ancestry", async () => {
    const fixture = selectionFixture({ recordBlob: "not-a-git-object" });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "FORGED_RECORD",
      reason: "Git provider returned a noncanonical blob identity",
    });
    expect(fixture.calls).toEqual([
      `inspect:${MAIN_REF}`,
      `inspect:${MAIN_REF}`,
      `read:${CURRENT_MAIN_V3_RECORD_PATH}`,
    ]);
  });

  it("reports a wrong observed repository before object reads", async () => {
    const fixture = selectionFixture({
      remoteUrls: ["https://github.com/example/other.git"],
    });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "WRONG_REPOSITORY",
      reason:
        "Expected git:github.com/example/personal-rawr-hq, observed git:github.com/example/other",
    });
    expect(fixture.calls).toEqual([`inspect:${MAIN_REF}`]);
  });

  it("refuses a valid record selecting another repository before ancestry or selected-content reads", async () => {
    const fixture = selectionFixture({
      recordRepositoryIdentity: OTHER_REPOSITORY,
      recordRepositoryUrl: OTHER_REPOSITORY_URL,
    });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "WRONG_REPOSITORY",
      reason: "Current-main selects a repository other than the explicit locator",
    });
    expect(fixture.calls).toEqual([
      `inspect:${MAIN_REF}`,
      `inspect:${MAIN_REF}`,
      `read:${CURRENT_MAIN_V3_RECORD_PATH}`,
    ]);
  });

  it("retains and deterministically bounds a typed resource diagnostic", async () => {
    const suffix = "...[truncated]";
    const detail = `content-workspace unavailable: ${"x".repeat(
      MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH
    )}`;
    const fixture = selectionFixture({
      openingFailure: failure("inspect-git-ref", "GitFailed", detail),
    });

    await expect(select(fixture.resource)).resolves.toEqual({
      kind: "UNREACHABLE_REPOSITORY",
      reason: `${detail.slice(
        0,
        MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH - suffix.length
      )}${suffix}`,
    });
  });

  it("does not convert a resource defect and runs its finalizer", async () => {
    let finalized = 0;
    const defect = new Error("resource defect");
    const fixture = selectionFixture({
      openingEffect: Effect.scoped(
        Effect.acquireRelease(Effect.void, () =>
          Effect.sync(() => {
            finalized += 1;
          })
        ).pipe(Effect.flatMap(() => Effect.die(defect)))
      ),
    });

    await expect(select(fixture.resource)).rejects.toBe(defect);
    expect(finalized).toBe(1);
  });

  it("propagates interruption and releases the active resource observation", async () => {
    let acquired = false;
    let finalized = false;
    const fixture = selectionFixture({
      openingEffect: Effect.scoped(
        Effect.acquireRelease(
          Effect.sync(() => {
            acquired = true;
          }),
          () =>
            Effect.sync(() => {
              finalized = true;
            })
        ).pipe(Effect.flatMap(() => Effect.never))
      ),
    });
    const controller = new AbortController();
    const pending = select(fixture.resource, controller.signal);
    while (!acquired) await new Promise((resolve) => setTimeout(resolve, 1));

    controller.abort();

    await expect(pending).rejects.toBeDefined();
    expect(finalized).toBe(true);
  });
});

interface SelectionFixtureOptions {
  readonly recordBytes?: Uint8Array;
  readonly contentCommit?: string;
  readonly sourceRef?: string;
  readonly recordContentAuthority?: CanonicalChannelSelection["contentAuthority"];
  readonly recordRepositoryIdentity?: CanonicalChannelSelection["sourceRepositoryIdentity"];
  readonly recordRepositoryUrl?: string;
  readonly releaseInputBytes?: Uint8Array;
  readonly ancestor?: boolean;
  readonly changeClosingMain?: boolean;
  readonly recordReadFailure?: ContentWorkspaceFailure;
  readonly recordBlob?: string;
  readonly recordBlobCommit?: string;
  readonly recordBlobTree?: string;
  readonly movedSourceRef?: boolean;
  readonly remoteUrls?: readonly string[];
  readonly openingFailure?: ContentWorkspaceFailure;
  readonly openingEffect?: Effect.Effect<never>;
}

function selectionFixture(options: SelectionFixtureOptions = {}) {
  const releaseInput = releaseInputFixture();
  const sourceRef = options.sourceRef ?? CONTENT_REF;
  const record: CanonicalChannelSelection = {
    schemaVersion: 3,
    channel: "current-main",
    contentAuthority: options.recordContentAuthority ?? CONTENT_AUTHORITY,
    sourceRepositoryIdentity: options.recordRepositoryIdentity ?? REPOSITORY,
    sourceRepositoryUrl: options.recordRepositoryUrl ?? REPOSITORY_URL,
    sourceRef,
    contentCommit: commit(options.contentCommit ?? CONTENT_COMMIT),
    contentTree: tree(CONTENT_TREE),
    releaseInputDigest: releaseInput.releaseInputDigest,
  };
  const recordBytes = options.recordBytes ?? canonicalSerializeCurrentMainRecord(record);
  const releaseInputBytes =
    options.releaseInputBytes ?? canonicalSerializeAgentPluginReleaseInput(releaseInput);
  const calls: string[] = [];
  let inspectionCount = 0;
  const resource: ContentWorkspaceResource<never> = Object.freeze({
    ...unavailableContentWorkspace(),
    inspectGitRef: ({
      refName,
    }: Parameters<ContentWorkspaceResource<never>["inspectGitRef"]>[0]) => {
      calls.push(`inspect:${refName}`);
      inspectionCount += 1;
      if (inspectionCount === 1 && options.openingEffect !== undefined) {
        return options.openingEffect;
      }
      if (inspectionCount === 1 && options.openingFailure !== undefined) {
        return Effect.fail(options.openingFailure);
      }
      const isContent = refName === sourceRef;
      const closingMain = options.changeClosingMain === true && inspectionCount === 4;
      return Effect.succeed({
        root: WORKSPACE,
        refName,
        commit: isContent
          ? (options.contentCommit ?? CONTENT_COMMIT)
          : closingMain
            ? oid("9")
            : HEAD_COMMIT,
        tree: isContent ? CONTENT_TREE : closingMain ? oid("8") : HEAD_TREE,
        objectFormat: "sha1" as const,
        remoteUrls: Object.freeze([...(options.remoteUrls ?? [REPOSITORY_URL])]),
      });
    },
    readGitBlobAtPath: ({
      path,
      commit: selectedCommit,
      tree: selectedTree,
    }: Parameters<ContentWorkspaceResource<never>["readGitBlobAtPath"]>[0]) => {
      calls.push(`read:${path}`);
      const recordRead = path === CURRENT_MAIN_V3_RECORD_PATH;
      if (recordRead && options.recordReadFailure !== undefined) {
        return Effect.fail(options.recordReadFailure);
      }
      return Effect.succeed({
        refCommit: !recordRead && options.movedSourceRef ? HEAD_COMMIT : selectedCommit,
        commit: recordRead ? (options.recordBlobCommit ?? selectedCommit) : selectedCommit,
        tree: recordRead ? (options.recordBlobTree ?? selectedTree) : selectedTree,
        blob: recordRead ? (options.recordBlob ?? RECORD_BLOB) : RELEASE_INPUT_BLOB,
        bytes: recordRead ? recordBytes : releaseInputBytes,
      });
    },
    isLocalGitAncestor: () => {
      calls.push("ancestry");
      return Effect.succeed(options.ancestor ?? true);
    },
  });
  return { record, calls, resource };
}

function select(resource: ContentWorkspaceResource<never>, signal?: AbortSignal) {
  return createLifecycleTestClient({ contentWorkspace: resource }).governance.currentMainSelection(
    {
      locator: {
        workspacePath: WORKSPACE,
        expectedRepositoryIdentity: REPOSITORY,
      },
    },
    signal === undefined ? testInvocation : { ...testInvocation, signal }
  );
}

function releaseInputFixture(declarativeText = "selected\n"): AgentPluginReleaseInput {
  return mustRelease(
    createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority: CONTENT_AUTHORITY,
      members: [
        {
          kind: "agent-plugin",
          pluginId: "alpha",
          vendor: [
            {
              id: "vendor-alpha",
              protocol: "vendor-v1",
              contentDigest: contentDigest(encoder.encode(declarativeText)),
            },
          ],
          curation: [],
        },
      ],
      ownershipClaims: [{ kind: "skill", identity: "alpha", ownerPluginId: "alpha" }],
      locks: [],
      qualityPolicies: [],
    })
  );
}

function mustRelease<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok) throw new Error(`Invalid release fixture: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function repository(value: string) {
  const parsed = parseRepositoryIdentity(value);
  if (!parsed.ok) throw new Error("Invalid repository fixture");
  return parsed.value;
}

function contentAuthority(value: string) {
  const parsed = parseContentAuthority(value);
  if (!parsed.ok) throw new Error("Invalid content authority fixture");
  return parsed.value;
}

function commit(value: string) {
  const parsed = parseGitCommitId(value);
  if (!parsed.ok) throw new Error("Invalid commit fixture");
  return parsed.value;
}

function tree(value: string) {
  const parsed = parseGitTreeId(value);
  if (!parsed.ok) throw new Error("Invalid tree fixture");
  return parsed.value;
}

function failure(
  operation: ContentWorkspaceFailure["operation"],
  reason: ContentWorkspaceFailure["reason"],
  detail: string
): ContentWorkspaceFailure {
  return { _tag: "ContentWorkspaceFailure", operation, reason, detail };
}

function oid(character: string): string {
  return character.repeat(40);
}
