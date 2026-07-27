import type {
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@rawr/resource-content-workspace";
import { makeNodeContentWorkspaceResource } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  MAX_CLEAN_CONTENT_INDEX_BYTES,
  MAX_CLEAN_CONTENT_TREE_BYTES,
  MAX_CLEAN_CONTENT_TREE_ENTRIES,
  MAX_CLEAN_CONTENT_WORKTREE_BYTES,
  MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
  MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
  MAX_CLEAN_RELEASE_INPUT_BYTES,
} from "../../../src/service/model/policy/clean-content-workspace";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../src/service/model/policy/release-payload-accounting";
import { parsePluginId } from "../../../src/service/shared/release";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../support/client";
import {
  createGeneratedMultiMemberGitRepository,
  GIT_EXECUTABLE,
} from "../../support/git-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../support/owned-fixture-root";

describe("release check", () => {
  let root: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (root !== undefined) await disposeOwnedFixtureRoot(root);
    root = undefined;
  });

  it("derives deterministic targeted and complete-set facts without durable lifecycle state", async () => {
    root = await createOwnedFixtureRoot();
    const repository = await createGeneratedMultiMemberGitRepository(root);
    const client = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE }),
    });

    const targetedRequest = {
      contentWorkspace: repository.policy,
      mode: { kind: "targeted" as const, pluginId: repository.pluginIds[0]! },
    };
    const firstTargeted = await client.releases.check(targetedRequest, testInvocation);
    const repeatedTargeted = await client.releases.check(targetedRequest, testInvocation);
    const complete = await client.releases.check(
      {
        contentWorkspace: repository.policy,
        mode: { kind: "complete-set" },
      },
      testInvocation
    );

    expect(repeatedTargeted).toEqual(firstTargeted);
    expect(firstTargeted).toMatchObject({
      kind: "EligibleReport",
      derivation: {
        kind: "release",
        pluginId: repository.pluginIds[0],
        releaseDigest: expect.stringMatching(/^rd1_[0-9a-f]{64}$/u),
      },
      eligibilityBinding: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    expect(complete).toMatchObject({
      kind: "EligibleReport",
      derivation: {
        kind: "complete-set",
        releaseSetDigest: expect.stringMatching(/^rs1_[0-9a-f]{64}$/u),
        members: repository.pluginIds.map((pluginId) => ({ pluginId })),
      },
      eligibilityBinding: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    if (firstTargeted.kind === "EligibleReport" && firstTargeted.derivation.kind === "release") {
      expect(Object.keys(firstTargeted.derivation).sort()).toEqual([
        "kind",
        "pluginId",
        "releaseDigest",
      ]);
    }
    if (complete.kind === "EligibleReport" && complete.derivation.kind === "complete-set") {
      expect(
        complete.derivation.members.map((memberValue) => Object.keys(memberValue).sort())
      ).toEqual(complete.derivation.members.map(() => ["pluginId", "releaseDigest"]));
    }
  });

  it("maps an undeclared targeted selection into the releases module failure vocabulary", async () => {
    root = await createOwnedFixtureRoot();
    const repository = await createGeneratedMultiMemberGitRepository(root);
    const client = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE }),
    });
    const pluginId = parsePluginId("fixture-missing");
    if (!pluginId.ok) throw new Error("Test plugin ID must be valid");
    const mode = { kind: "targeted" as const, pluginId: pluginId.value };

    await expect(
      client.releases.check(
        {
          contentWorkspace: repository.policy,
          mode,
        },
        testInvocation
      )
    ).resolves.toEqual({
      kind: "IneligibleReport",
      mode,
      issues: [
        {
          kind: "ReleaseConstruction",
          detail: "selected plugin is not declared by the release input",
        },
      ],
    });
  });

  it("authors the exact bounded clean-content resource sequence in the public operation", async () => {
    root = await createOwnedFixtureRoot();
    const repository = await createGeneratedMultiMemberGitRepository(root);
    const delegate = makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE });
    const operations: string[] = [];
    const treeLimits: Array<Readonly<{ maxEntries: number; maxBytes: number }>> = [];
    const blobLimits: number[] = [];
    const payloadLimits: Array<
      Readonly<{ maxBlobs: number; maxBlobBytes: number; maxTotalBytes: number }>
    > = [];
    const evidenceLimits: Array<
      Readonly<{
        maxPaths: number;
        maxWorktreeFileBytes: number;
        maxWorktreeBytes: number;
        maxBytes: number;
      }>
    > = [];
    const contentWorkspace: ContentWorkspaceResource<never> = Object.freeze({
      ...delegate,
      inspectGitWorkspace: (
        input: Parameters<ContentWorkspaceResource<never>["inspectGitWorkspace"]>[0]
      ) =>
        Effect.tap(delegate.inspectGitWorkspace(input), () =>
          Effect.sync(() => {
            operations.push("inspectGitWorkspace");
          })
        ),
      readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
        Effect.tap(delegate.readGitTree(input), () =>
          Effect.sync(() => {
            operations.push("readGitTree");
            treeLimits.push({ maxEntries: input.maxEntries, maxBytes: input.maxBytes });
          })
        ),
      readGitBlob: (input: Parameters<ContentWorkspaceResource<never>["readGitBlob"]>[0]) =>
        Effect.tap(delegate.readGitBlob(input), () =>
          Effect.sync(() => {
            operations.push("readGitBlob");
            blobLimits.push(input.maxBytes);
          })
        ),
      readGitBlobs: (input: Parameters<ContentWorkspaceResource<never>["readGitBlobs"]>[0]) =>
        Effect.tap(delegate.readGitBlobs(input), () =>
          Effect.sync(() => {
            operations.push("readGitBlobs");
            payloadLimits.push({
              maxBlobs: input.maxBlobs,
              maxBlobBytes: input.maxBlobBytes,
              maxTotalBytes: input.maxTotalBytes,
            });
          })
        ),
      captureGitWorkspaceEvidence: (
        input: Parameters<ContentWorkspaceResource<never>["captureGitWorkspaceEvidence"]>[0]
      ) =>
        Effect.tap(delegate.captureGitWorkspaceEvidence(input), () =>
          Effect.sync(() => {
            operations.push("captureGitWorkspaceEvidence");
            evidenceLimits.push({
              maxPaths: input.maxPaths,
              maxWorktreeFileBytes: input.maxWorktreeFileBytes,
              maxWorktreeBytes: input.maxWorktreeBytes,
              maxBytes: input.maxBytes,
            });
          })
        ),
    });
    const client = createLifecycleTestClient({ contentWorkspace });

    await expect(
      client.releases.check(
        {
          contentWorkspace: repository.policy,
          mode: { kind: "targeted", pluginId: repository.pluginIds[0]! },
        },
        testInvocation
      )
    ).resolves.toMatchObject({ kind: "EligibleReport" });
    expect(operations).toEqual([
      "inspectGitWorkspace",
      "readGitTree",
      "readGitBlob",
      "readGitBlobs",
      "captureGitWorkspaceEvidence",
      "captureGitWorkspaceEvidence",
    ]);
    expect(treeLimits).toEqual([
      {
        maxEntries: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxBytes: MAX_CLEAN_CONTENT_TREE_BYTES,
      },
    ]);
    expect(blobLimits).toEqual([MAX_CLEAN_RELEASE_INPUT_BYTES]);
    expect(payloadLimits).toEqual([
      {
        maxBlobs: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxBlobBytes: MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
        maxTotalBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
      },
    ]);
    expect(evidenceLimits).toEqual([
      {
        maxPaths: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxWorktreeFileBytes: MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
        maxWorktreeBytes: MAX_CLEAN_CONTENT_WORKTREE_BYTES,
        maxBytes: MAX_CLEAN_CONTENT_INDEX_BYTES,
      },
      {
        maxPaths: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxWorktreeFileBytes: MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
        maxWorktreeBytes: MAX_CLEAN_CONTENT_WORKTREE_BYTES,
        maxBytes: MAX_CLEAN_CONTENT_INDEX_BYTES,
      },
    ]);
  });

  it("maps typed resource failure but preserves defects, interruption, and finalization", async () => {
    root = await createOwnedFixtureRoot();
    const repository = await createGeneratedMultiMemberGitRepository(root);
    const calls: string[] = [];
    const failure: ContentWorkspaceFailure = Object.freeze({
      _tag: "ContentWorkspaceFailure",
      operation: "inspect-git-workspace",
      reason: "GitFailed",
      detail: "clean inspection failed",
    });
    const failedClient = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        inspectGitWorkspace: () =>
          Effect.sync(() => {
            calls.push("inspectGitWorkspace");
          }).pipe(Effect.andThen(Effect.fail(failure))),
      },
    });
    const request = {
      contentWorkspace: repository.policy,
      mode: { kind: "complete-set" as const },
    };

    await expect(failedClient.releases.check(request, testInvocation)).resolves.toEqual({
      kind: "IneligibleReport",
      mode: request.mode,
      issues: [
        {
          kind: "SourceEligibility",
          issue: { code: "GitFailure", detail: "clean inspection failed" },
        },
      ],
    });
    expect(calls).toEqual(["inspectGitWorkspace"]);

    const defect = new Error("clean inspection defect");
    const defectiveClient = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        inspectGitWorkspace: () => Effect.die(defect),
      },
    });
    await expect(defectiveClient.releases.check(request, testInvocation)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      cause: defect,
    });

    const classifierDefect = new Error("clean policy classifier defect");
    const delegate = makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE });
    const classifierDefectClient = createLifecycleTestClient({
      contentWorkspace: {
        ...delegate,
        readGitTree: (input) =>
          delegate.readGitTree(input).pipe(
            Effect.map((entries) => {
              const first = entries[0];
              if (first === undefined) throw new Error("Expected a generated Git tree entry");
              const poisoned = Object.freeze({
                mode: first.mode,
                blob: first.blob,
                get path(): string {
                  throw classifierDefect;
                },
              });
              return Object.freeze([poisoned, ...entries.slice(1)]);
            })
          ),
      },
    });
    await expect(
      classifierDefectClient.releases.check(request, testInvocation)
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      cause: classifierDefect,
    });

    let finalized = 0;
    const interruptedClient = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        inspectGitWorkspace: () =>
          Effect.never.pipe(
            Effect.ensuring(
              Effect.sync(() => {
                finalized += 1;
              })
            )
          ),
      },
    });
    const controller = new AbortController();
    const interrupted = interruptedClient.releases.check(request, {
      ...testInvocation,
      signal: controller.signal,
    });
    controller.abort(new Error("clean inspection cancelled"));
    await expect(interrupted).rejects.toBeDefined();
    expect(finalized).toBe(1);
  });
});
