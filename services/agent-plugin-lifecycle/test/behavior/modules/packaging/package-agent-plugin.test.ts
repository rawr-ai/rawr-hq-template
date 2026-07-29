import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AgentPluginPackageOutputResource,
  PackageOutputFailure,
  PackageOutputPublicationResult,
} from "@rawr/resource-agent-plugin-package-output";
import { makeNodeAgentPluginPackageOutputResource } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";
import type {
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@rawr/resource-content-workspace";
import { makeNodeContentWorkspaceResource } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { Effect } from "effect";
import { Value } from "typebox/value";
import { afterEach, describe, expect, it } from "vitest";
import {
  MAX_CLEAN_CONTENT_INDEX_BYTES,
  MAX_CLEAN_CONTENT_TREE_BYTES,
  MAX_CLEAN_CONTENT_TREE_ENTRIES,
  MAX_CLEAN_CONTENT_WORKTREE_BYTES,
  MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
  MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
  MAX_CLEAN_RELEASE_INPUT_BYTES,
} from "../../../../src/service/model/policy/clean-content-workspace";
import { parsePluginId } from "../../../../src/service/model/policy/release-identity";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../../src/service/model/policy/release-payload-accounting";
import {
  COWORK_PACKAGE_FORMAT,
  MAX_PACKAGING_FAILURE_MESSAGE_LENGTH,
  MAX_PACKAGING_FAILURE_PHASE_LENGTH,
  MAX_PACKAGING_OUTPUT_PATH_LENGTH,
  PackageAgentPluginResultSchema,
} from "../../../../src/service/modules/packaging/model/dto/packaging-lifecycle";
import { priorOutputObservationLimit } from "../../../../src/service/modules/packaging/model/policy/package-output";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../../support/service/client";
import {
  createGeneratedGitRepository,
  createGeneratedMultiMemberGitRepository,
  type GeneratedGitRepository,
  GIT_EXECUTABLE,
} from "../../../support/service/git-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../../support/service/owned-fixture-root";

const roots: OwnedFixtureRoot[] = [];
const PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES = 64 * 1024 * 1024;

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await disposeOwnedFixtureRoot(root);
  }
});

describe("package agent plugin application", () => {
  it.each([
    [PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES - 1, PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES],
    [PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES, PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES],
    [PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES + 1, PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES + 1],
  ])("observes prior output up to the rendered package or the module floor (%i -> %i)", (renderedByteLength, expectedLimit) => {
    expect(priorOutputObservationLimit(renderedByteLength)).toBe(expectedLimit);
  });

  it("packages exact selected Git content and repeats without rewriting output", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root, "fixture-alpha");
    const application = await createPackageAgentPluginApplication();
    const outputPath = join(root.path, "alpha.zip");
    const request = packageRequest(repository, outputPath, {
      kind: "targeted",
      pluginId: repository.pluginId,
    });

    const first = await application.package(request);
    expect(first).toMatchObject({
      kind: "OutputReplacedVerified",
      priorOutput: "Absent",
      repositoryIdentity: repository.policy.repositoryIdentity,
      sourceCommit: repository.policy.sourceCommit,
      sourceTree: repository.policy.sourceTree,
      release: { kind: "release", pluginId: repository.pluginId },
      format: COWORK_PACKAGE_FORMAT,
      outputPath,
    });
    expect("artifactRef" in first).toBe(false);
    expect((await readFile(outputPath)).subarray(0, 4)).toEqual(
      Buffer.from([0x50, 0x4b, 0x03, 0x04])
    );
    const before = await fileIdentityAndMetadata(outputPath);

    const repeated = await application.package(request);
    expect(repeated).toMatchObject({
      kind: "ReadOnlyConverged",
      packageDigest: first.kind === "OutputReplacedVerified" ? first.packageDigest : "",
      release: first.kind === "OutputReplacedVerified" ? first.release : {},
    });
    expect(await fileIdentityAndMetadata(outputPath)).toEqual(before);
    expect(Value.Check(PackageAgentPluginResultSchema, repeated)).toBe(true);
  });

  it("authors the complete bounded source sequence around encoding before publication", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root, "ordered-source");
    const delegate = makeNodeContentWorkspaceResource({
      gitExecutable: await realpath(GIT_EXECUTABLE),
    });
    const outputDelegate = makeNodeAgentPluginPackageOutputResource();
    const calls: string[] = [];
    const treeBounds: Array<Readonly<{ maxEntries: number; maxBytes: number }>> = [];
    const releaseInputBounds: number[] = [];
    const payloadBounds: Array<
      Readonly<{ maxBlobs: number; maxBlobBytes: number; maxTotalBytes: number }>
    > = [];
    const evidenceBounds: Array<
      Readonly<{
        maxPaths: number;
        maxWorktreeFileBytes: number;
        maxWorktreeBytes: number;
        maxBytes: number;
      }>
    > = [];
    const contentWorkspace: ContentWorkspaceResource<never> = {
      ...delegate,
      inspectGitWorkspace: (input) => {
        calls.push("inspect-git-workspace");
        return delegate.inspectGitWorkspace(input);
      },
      readGitTree: (input) => {
        calls.push("read-git-tree");
        treeBounds.push({ maxEntries: input.maxEntries, maxBytes: input.maxBytes });
        return delegate.readGitTree(input);
      },
      readGitBlob: (input) => {
        calls.push("read-git-blob");
        releaseInputBounds.push(input.maxBytes);
        return delegate.readGitBlob(input);
      },
      readGitBlobs: (input) => {
        calls.push("read-git-blobs");
        payloadBounds.push({
          maxBlobs: input.maxBlobs,
          maxBlobBytes: input.maxBlobBytes,
          maxTotalBytes: input.maxTotalBytes,
        });
        return delegate.readGitBlobs(input);
      },
      captureGitWorkspaceEvidence: (input) => {
        calls.push("capture-git-evidence");
        evidenceBounds.push({
          maxPaths: input.maxPaths,
          maxWorktreeFileBytes: input.maxWorktreeFileBytes,
          maxWorktreeBytes: input.maxWorktreeBytes,
          maxBytes: input.maxBytes,
        });
        return delegate.captureGitWorkspaceEvidence(input);
      },
    };
    const packageOutput: AgentPluginPackageOutputResource<never> = {
      encodeCoworkV1: (input) => {
        calls.push("encode-cowork-v1");
        return outputDelegate.encodeCoworkV1(input);
      },
      publish: (input) => {
        calls.push("publish-output");
        return outputDelegate.publish(input);
      },
    };
    const application = createPackageAgentPluginApplicationWithDefaults(packageOutput, {
      contentWorkspace,
    });

    await expect(
      application.package(
        packageRequest(repository, join(root.path, "ordered.zip"), {
          kind: "targeted",
          pluginId: repository.pluginId,
        })
      )
    ).resolves.toMatchObject({ kind: "OutputReplacedVerified" });

    const inspectionCalls = [
      "inspect-git-workspace",
      "read-git-tree",
      "read-git-blob",
      "read-git-blobs",
      "capture-git-evidence",
      "capture-git-evidence",
    ];
    expect(calls).toEqual([
      ...inspectionCalls,
      "encode-cowork-v1",
      ...inspectionCalls,
      "publish-output",
    ]);
    expect(treeBounds).toEqual([
      { maxEntries: MAX_CLEAN_CONTENT_TREE_ENTRIES, maxBytes: MAX_CLEAN_CONTENT_TREE_BYTES },
      { maxEntries: MAX_CLEAN_CONTENT_TREE_ENTRIES, maxBytes: MAX_CLEAN_CONTENT_TREE_BYTES },
    ]);
    expect(releaseInputBounds).toEqual([
      MAX_CLEAN_RELEASE_INPUT_BYTES,
      MAX_CLEAN_RELEASE_INPUT_BYTES,
    ]);
    expect(payloadBounds).toEqual([
      {
        maxBlobs: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxBlobBytes: MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
        maxTotalBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
      },
      {
        maxBlobs: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxBlobBytes: MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
        maxTotalBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
      },
    ]);
    expect(evidenceBounds).toEqual(
      Array.from({ length: 4 }, () => ({
        maxPaths: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxWorktreeFileBytes: MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
        maxWorktreeBytes: MAX_CLEAN_CONTENT_WORKTREE_BYTES,
        maxBytes: MAX_CLEAN_CONTENT_INDEX_BYTES,
      }))
    );
  });

  it("packages the selected member or every complete-set member from exact Git content", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedMultiMemberGitRepository(root);
    const application = await createPackageAgentPluginApplication();
    const targetedOutput = join(root.path, "targeted.zip");
    const firstOutput = join(root.path, "first.zip");
    const secondOutput = join(root.path, "second.zip");

    const targeted = await application.package(
      packageRequest(repository, targetedOutput, {
        kind: "targeted",
        pluginId: repository.pluginIds[0]!,
      })
    );
    const first = await application.package(
      packageRequest(repository, firstOutput, { kind: "complete-set" })
    );
    const second = await application.package(
      packageRequest(repository, secondOutput, { kind: "complete-set" })
    );

    expect(targeted).toMatchObject({
      kind: "OutputReplacedVerified",
      release: { kind: "release", pluginId: repository.pluginIds[0] },
    });
    expect(readStoredZipEntries(await readFile(targetedOutput))).toEqual([
      {
        path: "skills/example/SKILL.md",
        text: `# Generated ${repository.pluginIds[0]}\n`,
      },
    ]);
    expect(first).toMatchObject({
      kind: "OutputReplacedVerified",
      release: { kind: "complete-set" },
    });
    expect(second).toMatchObject({
      kind: "OutputReplacedVerified",
      release: first.kind === "OutputReplacedVerified" ? first.release : {},
      packageDigest: first.kind === "OutputReplacedVerified" ? first.packageDigest : "",
    });
    expect(await readFile(secondOutput)).toEqual(await readFile(firstOutput));
    expect(readStoredZipEntries(await readFile(firstOutput))).toEqual(
      repository.pluginIds.map((pluginId, index) => ({
        path: `plugins/${pluginId}/skills/${
          index === 0 ? "example" : `${pluginId}-example`
        }/SKILL.md`,
        text: `# Generated ${pluginId}\n`,
      }))
    );

    const refusedOutput = new CountingOutput({ kind: "ReadOnlyConverged" });
    const refusedApplication = await createPackageAgentPluginApplication(refusedOutput);
    await expect(
      refusedApplication.package(
        packageRequest(repository, join(root.path, "missing.zip"), {
          kind: "targeted",
          pluginId: parsedPluginId("fixture-missing"),
        })
      )
    ).resolves.toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        code: "ReleaseConstructionFailed",
        phase: "release-construct",
        message: "ReleaseConstruction",
      },
    });
    expect(refusedOutput.encodeCalls).toBe(0);
    expect(refusedOutput.publishCalls).toBe(0);
  });

  it("closes clean-source inspection failure before rendering or publishing", async () => {
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const contentWorkspace = {
      ...unavailableContentWorkspace(),
      inspectGitWorkspace: () =>
        Effect.fail({
          _tag: "ContentWorkspaceFailure",
          operation: "inspect-git-workspace",
          reason: "GitFailed",
          detail: "clean source unavailable",
        } satisfies ContentWorkspaceFailure),
    };
    const application = createPackageAgentPluginApplicationWithDefaults(output, {
      contentWorkspace,
    });

    const result = await application.package({
      contentWorkspace: {
        locator: "/tmp/content-workspace",
        repositoryIdentity: "git:personal/rawr-hq",
        contentAuthority: "personal-rawr-hq",
        remoteName: "origin",
        remoteUrl: "https://github.com/rawr-ai/rawr-hq.git",
        refName: "refs/heads/main",
        sourceCommit: "a".repeat(40),
        sourceTree: "b".repeat(40),
        releaseInputPath: ".rawr/release-input.json",
        pluginRoot: "plugins/agents",
      },
      mode: { kind: "complete-set" },
      format: COWORK_PACKAGE_FORMAT,
      outputPath: "/tmp/content-workspace.zip",
    });

    expect(result).toEqual({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        code: "SourceIneligible",
        phase: "source-inspect",
        message: "GitFailure:clean source unavailable",
      },
    });
    expect(output.encodeCalls).toBe(0);
    expect(output.publishCalls).toBe(0);
  });

  it("preserves source defects and interruption finalizers outside public refusal results", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root, "source-lifecycle");
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const request = packageRequest(repository, join(root.path, "source-lifecycle.zip"), {
      kind: "complete-set",
    });
    const defect = new Error("content workspace defect");
    const defective = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        inspectGitWorkspace: () => Effect.die(defect),
      },
      packageOutput: output,
    });

    await expect(defective.packaging.package(request, testInvocation)).rejects.toBe(defect);

    let acquired = false;
    let finalized = false;
    const interrupted = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        inspectGitWorkspace: () =>
          Effect.scoped(
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
      },
      packageOutput: output,
    });
    const controller = new AbortController();
    const pending = interrupted.packaging.package(request, {
      ...testInvocation,
      signal: controller.signal,
    });
    while (!acquired) await new Promise((resolve) => setTimeout(resolve, 1));

    controller.abort(new Error("content workspace cancelled"));

    await expect(pending).rejects.toBeDefined();
    expect(finalized).toBe(true);
    expect(output.encodeCalls).toBe(0);
    expect(output.publishCalls).toBe(0);
  });

  it("revalidates exact Git content before publishing and preserves an existing output", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root);
    const outputPath = join(root.path, "owned.zip");
    await writeFile(outputPath, "operator-owned output\n", { mode: 0o600 });
    const beforeBytes = await readFile(outputPath);
    const before = await fileIdentityAndMetadata(outputPath);
    const nodeOutput = makeNodeAgentPluginPackageOutputResource();
    let publishCalls = 0;
    const output: AgentPluginPackageOutputResource<never> = {
      encodeCoworkV1: (request) =>
        Effect.gen(function* () {
          const bytes = yield* nodeOutput.encodeCoworkV1(request);
          yield* Effect.promise(() =>
            writeFile(repository.payloadFile, "changed after derivation\n")
          );
          return bytes;
        }),
      publish: () => {
        publishCalls += 1;
        return Effect.succeed({ kind: "ReadOnlyConverged" });
      },
    };
    const application = await createPackageAgentPluginApplication(output);

    const result = await application.package(
      packageRequest(repository, outputPath, {
        kind: "targeted",
        pluginId: repository.pluginId,
      })
    );

    expect(result).toEqual({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        code: "SourceIneligible",
        phase: "source-revalidate",
        message: "DirtyTrackedWorktree:tracked worktree differs from index",
      },
    });
    expect(publishCalls).toBe(0);
    expect(await readFile(outputPath)).toEqual(beforeBytes);
    expect(await fileIdentityAndMetadata(outputPath)).toEqual(before);
  });

  it("reports source change only when two eligible observations have different bindings", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root, "binding-shift");
    const delegate = makeNodeContentWorkspaceResource({
      gitExecutable: await realpath(GIT_EXECUTABLE),
    });
    let evidenceCalls = 0;
    const contentWorkspace: ContentWorkspaceResource<never> = {
      ...delegate,
      captureGitWorkspaceEvidence: (input) =>
        delegate.captureGitWorkspaceEvidence(input).pipe(
          Effect.map((evidence) => {
            evidenceCalls += 1;
            return evidenceCalls <= 2
              ? evidence
              : Object.freeze({
                  ...evidence,
                  indexEntries: new TextEncoder().encode("second eligible binding"),
                });
          })
        ),
    };
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const application = createPackageAgentPluginApplicationWithDefaults(output, {
      contentWorkspace,
    });

    await expect(
      application.package(
        packageRequest(repository, join(root.path, "binding-shift.zip"), {
          kind: "targeted",
          pluginId: repository.pluginId,
        })
      )
    ).resolves.toEqual({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        code: "SourceIneligible",
        phase: "source-revalidate",
        message: "SourceChanged:repository, ref, index, worktree, or object bindings changed",
      },
    });
    expect(evidenceCalls).toBe(4);
    expect(output.encodeCalls).toBe(1);
    expect(output.publishCalls).toBe(0);
  });

  it("rejects foreign request fields and oversized paths before source or output access", async () => {
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const application = createPackageAgentPluginApplicationWithDefaults(output);

    await expect(
      application.package({
        contentWorkspace: {},
        mode: { kind: "complete-set" },
        format: COWORK_PACKAGE_FORMAT,
        outputPath: "/tmp/invalid.zip",
        artifactRef: { kind: "release" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      application.package({
        contentWorkspace: {},
        mode: { kind: "complete-set" },
        format: COWORK_PACKAGE_FORMAT,
        outputPath: `/${"p".repeat(MAX_PACKAGING_OUTPUT_PATH_LENGTH)}`,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    for (const outputPath of ["relative.zip", "/", "/tmp/../escape.zip"]) {
      await expect(
        application.package({
          contentWorkspace: {},
          mode: { kind: "complete-set" },
          format: COWORK_PACKAGE_FORMAT,
          outputPath,
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(output.encodeCalls).toBe(0);
    expect(output.publishCalls).toBe(0);
  });

  it("reports a closed unsettled result when the output resource fails after derivation", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root);
    const nodeOutput = makeNodeAgentPluginPackageOutputResource();
    const application = await createPackageAgentPluginApplication({
      encodeCoworkV1: nodeOutput.encodeCoworkV1,
      publish: () =>
        Effect.fail(
          resourceFailure(
            "OutputVerifyFailed",
            "output-resource",
            "unknown output boundary ".repeat(512)
          )
        ),
    });

    const result = await application.package(
      packageRequest(repository, join(root.path, "unknown.zip"), {
        kind: "targeted",
        pluginId: repository.pluginId,
      })
    );

    expect(result).toMatchObject({
      kind: "OutputUnsettled",
      primaryFailure: { code: "OutputVerifyFailed", phase: "output-port" },
      repositoryIdentity: repository.policy.repositoryIdentity,
      release: { kind: "release", pluginId: repository.pluginId },
    });
    if (result.kind !== "OutputUnsettled") throw new Error("Expected unsettled output");
    expect(result.primaryFailure.message).toHaveLength(MAX_PACKAGING_FAILURE_MESSAGE_LENGTH);
    expect(
      result.primaryFailure.message.startsWith(
        "Atomic output port failed without a closed result: output-resource: unknown output boundary"
      )
    ).toBe(true);
    expect(result.primaryFailure.message.endsWith("...[truncated]")).toBe(true);
    expect(Value.Check(PackageAgentPluginResultSchema, result)).toBe(true);
  });

  it("settles uninterruptible publication before observing request cancellation", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root);
    const outputPath = join(root.path, "cancelled.zip");
    const publicationAdmitted = Promise.withResolvers<void>();
    const releasePublication = Promise.withResolvers<void>();
    const order: string[] = [];
    let publicationSettled = false;
    const nodeOutput = makeNodeAgentPluginPackageOutputResource();
    const client = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspaceResource({
        gitExecutable: await realpath(GIT_EXECUTABLE),
      }),
      packageOutput: {
        encodeCoworkV1: nodeOutput.encodeCoworkV1,
        publish: () =>
          Effect.promise(async () => {
            publicationAdmitted.resolve();
            await releasePublication.promise;
            publicationSettled = true;
            order.push("publication");
            return { kind: "OutputReplacedVerified", priorOutput: "Absent" };
          }),
      },
    });
    const controller = new AbortController();
    const publication = client.packaging.package(
      packageRequest(repository, outputPath, {
        kind: "targeted",
        pluginId: repository.pluginId,
      }),
      { ...testInvocation, signal: controller.signal }
    );
    const observed = publication
      .then(
        (value) => ({ kind: "success" as const, value }),
        (error: unknown) => ({ kind: "failure" as const, error })
      )
      .then((result) => {
        order.push("caller");
        return result;
      });

    await publicationAdmitted.promise;
    const cancellation = new Error("Packaging request cancelled");
    controller.abort(cancellation);
    const stateBeforeSettlement = await Promise.race([
      observed.then(() => "settled" as const),
      new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 20)),
    ]);

    try {
      expect(stateBeforeSettlement).toBe("pending");
      expect(publicationSettled).toBe(false);
      expect(order).toEqual([]);
    } finally {
      releasePublication.resolve();
    }

    const terminal = await observed;
    expect(publicationSettled).toBe(true);
    expect(order).toEqual(["publication", "caller"]);
    expect(terminal).toEqual({
      kind: "failure",
      error: cancellation,
    });
  });

  it("maps an output-port pre-mutation refusal without publishing result identity", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root);
    const output = new CountingOutput({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: resourceFailure("OutputUnsafe", "output-admission", "destination refused"),
      cleanupFailure: {
        ...resourceFailure("TemporaryFailed", "cleanup-temporary", "temporary cleanup failed"),
        operation: "cleanup",
      },
    });
    const application = await createPackageAgentPluginApplication(output);

    const result = await application.package(
      packageRequest(repository, join(root.path, "refused.zip"), {
        kind: "targeted",
        pluginId: repository.pluginId,
      })
    );

    expect(result).toEqual({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        code: "OutputUnsafe",
        phase: "output-admission",
        message: "destination refused",
      },
      cleanupFailure: {
        code: "TemporaryCleanupFailed",
        phase: "cleanup-temporary",
        message: "temporary cleanup failed",
      },
    });
    expect(output.encodeCalls).toBe(1);
    expect(output.publishCalls).toBe(1);
    expect(output.priorOutputObservationLimits).toEqual([PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES]);
    expect("repositoryIdentity" in result).toBe(false);
    expect("release" in result).toBe(false);
  });

  it("bounds resource diagnostics and maps cleanup truth without leaking source state", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root);
    const oversizedPhase = "resource-phase-".repeat(64);
    const oversizedDetail = "private resource detail ".repeat(512);
    const application = await createPackageAgentPluginApplication(
      new CountingOutput({
        kind: "OutputUnsettled",
        primaryFailure: resourceFailure("OutputVerifyFailed", oversizedPhase, oversizedDetail),
        cleanupFailure: resourceFailure("FilesystemFailed", oversizedPhase, oversizedDetail),
      })
    );

    const result = await application.package(
      packageRequest(repository, join(root.path, "bounded.zip"), {
        kind: "targeted",
        pluginId: repository.pluginId,
      })
    );

    expect(result.kind).toBe("OutputUnsettled");
    if (result.kind !== "OutputUnsettled") throw new Error("Expected unsettled output");
    for (const diagnostic of [result.primaryFailure, result.cleanupFailure]) {
      if (diagnostic === undefined) throw new Error("Expected both resource diagnostics");
      expect(diagnostic.phase).toHaveLength(MAX_PACKAGING_FAILURE_PHASE_LENGTH);
      expect(diagnostic.message).toHaveLength(MAX_PACKAGING_FAILURE_MESSAGE_LENGTH);
      expect(diagnostic.phase.endsWith("...[truncated]")).toBe(true);
      expect(diagnostic.message.endsWith("...[truncated]")).toBe(true);
    }
    expect("artifactRef" in result).toBe(false);
  });

  it("maps encoder rejection before output publication", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root);
    let publicationCalls = 0;
    const application = await createPackageAgentPluginApplication({
      encodeCoworkV1: () =>
        Effect.fail(resourceFailure("ArchiveEncodingFailed", "archive-codec", "codec refused")),
      publish: () => {
        publicationCalls += 1;
        return Effect.succeed({ kind: "ReadOnlyConverged" });
      },
    });

    await expect(
      application.package(
        packageRequest(repository, join(root.path, "unencoded.zip"), {
          kind: "targeted",
          pluginId: repository.pluginId,
        })
      )
    ).resolves.toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        code: "PackageRenderFailed",
        phase: "package-render",
        message: "Cowork v1 rendering failed: archive-codec: codec refused",
      },
    });
    expect(publicationCalls).toBe(0);
  });
});

class CountingOutput implements AgentPluginPackageOutputResource<never> {
  encodeCalls = 0;
  publishCalls = 0;
  readonly priorOutputObservationLimits: number[] = [];
  readonly #node = makeNodeAgentPluginPackageOutputResource();

  constructor(private readonly result: PackageOutputPublicationResult) {}

  encodeCoworkV1(
    request: Parameters<AgentPluginPackageOutputResource["encodeCoworkV1"]>[0]
  ): Effect.Effect<Uint8Array, PackageOutputFailure> {
    this.encodeCalls += 1;
    return this.#node.encodeCoworkV1(request);
  }

  publish(
    request: Parameters<AgentPluginPackageOutputResource["publish"]>[0]
  ): Effect.Effect<PackageOutputPublicationResult, PackageOutputFailure> {
    this.publishCalls += 1;
    this.priorOutputObservationLimits.push(request.maxPriorOutputBytes);
    return Effect.succeed(this.result);
  }
}

function packageRequest(
  repository: GeneratedGitRepository,
  outputPath: string,
  mode: Readonly<
    { kind: "complete-set" } | { kind: "targeted"; pluginId: GeneratedGitRepository["pluginId"] }
  >
) {
  return Object.freeze({
    contentWorkspace: repository.policy,
    mode,
    format: COWORK_PACKAGE_FORMAT,
    outputPath,
  });
}

function resourceFailure(
  reason: PackageOutputFailure["reason"],
  phase: string,
  detail = `${reason} fixture`
): PackageOutputFailure {
  return Object.freeze({
    _tag: "PackageOutputFailure",
    operation: phase === "archive-codec" ? "encode-archive" : "publish-output",
    reason,
    phase,
    detail,
  });
}

function parsedPluginId(value: string): GeneratedGitRepository["pluginId"] {
  const parsed = parsePluginId(value);
  if (!parsed.ok) throw new Error(parsed.issues[0]?.message ?? "Invalid fixture plugin ID");
  return parsed.value;
}

function readStoredZipEntries(
  bytes: Uint8Array
): readonly Readonly<{ path: string; text: string }>[] {
  const archive = Buffer.from(bytes);
  const entries: Array<Readonly<{ path: string; text: string }>> = [];
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const compression = archive.readUInt16LE(offset + 8);
    const compressedSize = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    if (compression !== 0) throw new Error("Cowork fixture expected stored ZIP entries");
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    entries.push(
      Object.freeze({
        path: archive.subarray(nameStart, nameStart + nameLength).toString("utf8"),
        text: archive.subarray(dataStart, dataStart + compressedSize).toString("utf8"),
      })
    );
    offset = dataStart + compressedSize;
  }
  return Object.freeze(entries);
}

async function fixtureRoot(): Promise<OwnedFixtureRoot> {
  const root = await createOwnedFixtureRoot();
  roots.push(root);
  return root;
}

async function createPackageAgentPluginApplication(
  packageOutput: AgentPluginPackageOutputResource<never> = makeNodeAgentPluginPackageOutputResource()
) {
  return createPackageAgentPluginApplicationWithDefaults(packageOutput, {
    contentWorkspace: makeNodeContentWorkspaceResource({
      gitExecutable: await realpath(GIT_EXECUTABLE),
    }),
  });
}

function createPackageAgentPluginApplicationWithDefaults(
  packageOutput: AgentPluginPackageOutputResource<never>,
  overrides: Parameters<typeof createLifecycleTestClient>[0] = {}
) {
  const client = createLifecycleTestClient({ packageOutput, ...overrides });
  return Object.freeze({
    package: (request: unknown) => client.packaging.package(request as never, testInvocation),
  });
}

async function fileIdentityAndMetadata(path: string): Promise<readonly bigint[]> {
  const status = await lstat(path, { bigint: true });
  return Object.freeze([
    status.dev,
    status.ino,
    status.mode,
    status.nlink,
    status.size,
    status.mtimeNs,
    status.ctimeNs,
  ]);
}
