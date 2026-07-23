import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AgentPluginPackageOutputAsyncPort,
  PackageOutputFailure,
  PackageOutputPublicationResult,
} from "@rawr/resource-agent-plugin-package-output";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";
import { makeNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { Value } from "typebox/value";
import { afterEach, describe, expect, it } from "vitest";

import {
  COWORK_PACKAGE_FORMAT,
  MAX_PACKAGING_FAILURE_MESSAGE_LENGTH,
  MAX_PACKAGING_FAILURE_PHASE_LENGTH,
  MAX_PACKAGING_OUTPUT_PATH_LENGTH,
} from "../../../src/service/modules/packaging/model/dto/packaging-lifecycle";
import { PackageAgentPluginResultSchema } from "../../../src/service/modules/packaging/schemas";
import { parsePluginId } from "../../../src/service/shared/release";
import { createLifecycleTestClient, testInvocation } from "../../support/client";
import {
  createGeneratedGitRepository,
  createGeneratedMultiMemberGitRepository,
  type GeneratedGitRepository,
  GIT_EXECUTABLE,
} from "../../support/git-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../support/owned-fixture-root";

const roots: OwnedFixtureRoot[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await disposeOwnedFixtureRoot(root);
  }
});

describe("package agent plugin application", () => {
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
      repository.pluginIds.map((pluginId) => ({
        path: `plugins/${pluginId}/skills/example/SKILL.md`,
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
      primaryFailure: { code: "ReleaseConstructionFailed" },
    });
    expect(refusedOutput.encodeCalls).toBe(0);
    expect(refusedOutput.publishCalls).toBe(0);
  });

  it("revalidates exact Git content before publishing and preserves an existing output", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root);
    const outputPath = join(root.path, "owned.zip");
    await writeFile(outputPath, "operator-owned output\n", { mode: 0o600 });
    const beforeBytes = await readFile(outputPath);
    const before = await fileIdentityAndMetadata(outputPath);
    const nodeOutput = makeNodePackageOutputAsyncPort();
    let publishCalls = 0;
    const output: AgentPluginPackageOutputAsyncPort = {
      async encodeCoworkV1(request) {
        const bytes = await nodeOutput.encodeCoworkV1(request);
        await writeFile(repository.payloadFile, "changed after derivation\n");
        return bytes;
      },
      async publish() {
        publishCalls += 1;
        return { kind: "ReadOnlyConverged" };
      },
    };
    const application = await createPackageAgentPluginApplication(output);

    const result = await application.package(
      packageRequest(repository, outputPath, {
        kind: "targeted",
        pluginId: repository.pluginId,
      })
    );

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "SourceIneligible", phase: "source-revalidate" },
    });
    expect(publishCalls).toBe(0);
    expect(await readFile(outputPath)).toEqual(beforeBytes);
    expect(await fileIdentityAndMetadata(outputPath)).toEqual(before);
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

  it("reports a closed unsettled result when the output port throws after derivation", async () => {
    const root = await fixtureRoot();
    const repository = await createGeneratedGitRepository(root);
    const nodeOutput = makeNodePackageOutputAsyncPort();
    const application = await createPackageAgentPluginApplication({
      encodeCoworkV1: nodeOutput.encodeCoworkV1,
      async publish() {
        throw new Error("unknown output boundary ".repeat(512));
      },
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
    expect(result.primaryFailure.message.endsWith("...[truncated]")).toBe(true);
    expect(Value.Check(PackageAgentPluginResultSchema, result)).toBe(true);
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
      encodeCoworkV1: async () =>
        Promise.reject(resourceFailure("ArchiveEncodingFailed", "archive-codec", "codec refused")),
      publish: async () => {
        publicationCalls += 1;
        return { kind: "ReadOnlyConverged" };
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
        message: expect.stringContaining("codec refused"),
      },
    });
    expect(publicationCalls).toBe(0);
  });
});

class CountingOutput implements AgentPluginPackageOutputAsyncPort {
  encodeCalls = 0;
  publishCalls = 0;
  readonly #node = makeNodePackageOutputAsyncPort();

  constructor(private readonly result: PackageOutputPublicationResult) {}

  encodeCoworkV1(
    request: Parameters<AgentPluginPackageOutputAsyncPort["encodeCoworkV1"]>[0]
  ): Promise<Uint8Array> {
    this.encodeCalls += 1;
    return this.#node.encodeCoworkV1(request);
  }

  async publish(): Promise<PackageOutputPublicationResult> {
    this.publishCalls += 1;
    return this.result;
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
  packageOutput: AgentPluginPackageOutputAsyncPort = makeNodePackageOutputAsyncPort()
) {
  return createPackageAgentPluginApplicationWithDefaults(packageOutput, {
    contentWorkspace: makeNodeContentWorkspacePort({
      gitExecutable: await realpath(GIT_EXECUTABLE),
    }),
  });
}

function createPackageAgentPluginApplicationWithDefaults(
  packageOutput: AgentPluginPackageOutputAsyncPort,
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
