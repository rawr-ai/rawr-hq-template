import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rmdir,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { COWORK_PACKAGE_FORMAT } from "../../../src/service/modules/packaging/model/dto/packaging-lifecycle";
import { createResourceArtifactStore } from "../../../src/service/repository/artifact-repository";
import type {
  AgentPluginRelease,
  AgentPluginReleaseSet,
} from "../../../src/service/shared/release";
import type {
  ArtifactRepositoryAsyncPort,
  ArtifactRepositoryIssue,
  ArtifactTreeObservation,
} from "@rawr/resource-agent-plugin-artifact-repository";
import type {
  AgentPluginPackageOutputAsyncPort,
  PackageOutputFailure,
  PackageOutputPublicationResult,
} from "@rawr/resource-agent-plugin-package-output";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";

import { packagingArtifactFixture } from "./artifact-fixture";
import { MemoryArtifactRepository } from "../../support/artifact-repository";
import { createOwnedFixtureRoot, disposeOwnedFixtureRoot, type OwnedFixtureRoot } from "../../support/owned-fixture-root";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableArtifactRepository,
} from "../../support/client";

const roots: OwnedFixtureRoot[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await disposeOwnedFixtureRoot(root);
  }
});

describe("package agent plugin application", () => {
  it("reads one immutable ref and reports only deterministic package provenance", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const artifacts = await publishedRepository(root.path, [fixture.alphaRelease]);
    const application = createPackageAgentPluginApplication(artifacts);
    const outputPath = join(root.path, "alpha.zip");

    const first = await application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath,
    });

    expect(first).toMatchObject({
      kind: "OutputReplacedVerified",
      priorOutput: "Absent",
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath,
    });
    expect(Object.keys(first).sort()).toEqual([
      "artifactRef",
      "format",
      "kind",
      "outputPath",
      "packageDigest",
      "priorOutput",
    ]);
    expect((await readFile(outputPath)).subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(artifacts.artifactRepository.readTreeCalls).toBe(1);

    const beforeNames = await readdir(root.path);
    const second = await application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath,
    });
    expect(second).toMatchObject({ kind: "ReadOnlyConverged", packageDigest: first.kind === "OutputReplacedVerified" ? first.packageDigest : "" });
    expect(await readdir(root.path)).toEqual(beforeNames);
    expect(artifacts.artifactRepository.readTreeCalls).toBe(2);
  });

  it("packages identical artifact bytes after source removal across source and prior-output variation", async () => {
    const root = await fixtureRoot();
    const sourceLocator = join(root.path, "generated-source-checkout");
    const sourceMarker = join(sourceLocator, "source-marker.txt");
    await mkdir(sourceLocator, { mode: 0o700 });
    await writeFile(sourceMarker, "generated source only\n", { mode: 0o600 });
    await unlink(sourceMarker);
    await utimes(sourceLocator, new Date("2001-01-01T00:00:00Z"), new Date("2001-01-01T00:00:00Z"));
    const firstSourceMtime = (await lstat(sourceLocator, { bigint: true })).mtimeNs;
    await utimes(sourceLocator, new Date("2031-01-01T00:00:00Z"), new Date("2031-01-01T00:00:00Z"));
    const secondSourceMtime = (await lstat(sourceLocator, { bigint: true })).mtimeNs;
    expect(secondSourceMtime).not.toBe(firstSourceMtime);
    await rmdir(sourceLocator);
    await expect(lstat(sourceLocator)).rejects.toMatchObject({ code: "ENOENT" });

    const firstOutput = join(root.path, "first.cowork.zip");
    const secondOutput = join(root.path, "second.cowork.zip");
    const adjacent = join(root.path, "adjacent-authority.txt");
    await writeFile(firstOutput, "stale first output\n", { mode: 0o600 });
    await writeFile(secondOutput, "different stale second output\n", { mode: 0o644 });
    await writeFile(adjacent, "must remain unchanged\n", { mode: 0o600 });
    await utimes(firstOutput, new Date("2002-02-02T00:00:00Z"), new Date("2002-02-02T00:00:00Z"));
    await utimes(secondOutput, new Date("2032-02-02T00:00:00Z"), new Date("2032-02-02T00:00:00Z"));
    const firstPrior = await lstat(firstOutput, { bigint: true });
    const secondPrior = await lstat(secondOutput, { bigint: true });
    expect(firstPrior.mtimeNs).not.toBe(secondPrior.mtimeNs);
    expect(firstPrior.mode & 0o777n).not.toBe(secondPrior.mode & 0o777n);
    expect(await readFile(firstOutput)).not.toEqual(await readFile(secondOutput));
    const adjacentBefore = await fileIdentityAndMetadata(adjacent);

    const fixture = packagingArtifactFixture();
    const artifacts = await publishedRepository(
      root.path,
      [fixture.alphaRelease, fixture.betaRelease],
      fixture.releaseSet,
    );
    const application = createPackageAgentPluginApplication(artifacts);
    const packageAt = (outputPath: string) => application.package({
      artifactRef: fixture.setSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath,
    });

    const first = await packageAt(firstOutput);
    const second = await packageAt(secondOutput);
    expect(first).toMatchObject({ kind: "OutputReplacedVerified", priorOutput: "Replaced" });
    expect(second).toMatchObject({ kind: "OutputReplacedVerified", priorOutput: "Replaced" });
    if (first.kind !== "OutputReplacedVerified" || second.kind !== "OutputReplacedVerified") {
      throw new Error("expected both varied prior outputs to be replaced and verified");
    }
    expect(second.packageDigest).toBe(first.packageDigest);
    expect(await readFile(secondOutput)).toEqual(await readFile(firstOutput));
    expect((await readdir(root.path)).sort()).toEqual([
      "adjacent-authority.txt",
      "first.cowork.zip",
      "second.cowork.zip",
    ]);
    expect(await readFile(adjacent, "utf8")).toBe("must remain unchanged\n");
    expect(await fileIdentityAndMetadata(adjacent)).toEqual(adjacentBefore);

    const beforeRepeat = await Promise.all([
      root.path,
      firstOutput,
      secondOutput,
      adjacent,
    ].map(fileIdentityAndMetadata));
    const firstBytes = await readFile(firstOutput);
    const secondBytes = await readFile(secondOutput);
    const namesBeforeRepeat = (await readdir(root.path)).sort();

    expect(await packageAt(firstOutput)).toMatchObject({
      kind: "ReadOnlyConverged",
      packageDigest: first.packageDigest,
    });
    expect(await packageAt(secondOutput)).toMatchObject({
      kind: "ReadOnlyConverged",
      packageDigest: first.packageDigest,
    });
    expect(artifacts.artifactRepository.readTreeCalls).toBe(12);
    expect(await Promise.all([
      root.path,
      firstOutput,
      secondOutput,
      adjacent,
    ].map(fileIdentityAndMetadata))).toEqual(beforeRepeat);
    expect(await readFile(firstOutput)).toEqual(firstBytes);
    expect(await readFile(secondOutput)).toEqual(secondBytes);
    expect((await readdir(root.path)).sort()).toEqual(namesBeforeRepeat);
    await expect(lstat(sourceLocator)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects unknown request fields before reading artifacts or touching output", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const artifacts = await publishedRepository(root.path, [fixture.alphaRelease]);
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const application = createPackageAgentPluginApplication({
      ...artifacts,
      packageOutput: output,
    });

    await expect(application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath: join(root.path, "invalid.zip"),
      sourceWorkspace: root.path,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(artifacts.artifactRepository.readTreeCalls).toBe(0);
    expect(output.calls).toBe(0);
    expect(await readdir(root.path)).toEqual([]);
  });

  it("maps missing and mismatched artifacts to closed pre-output failures", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const artifactRepositoryRoot = join(root.path, "artifacts-v1");
    const missingRepository = new MemoryArtifactRepository();
    const missing = createPackageAgentPluginApplication({
      artifactRepository: missingRepository,
      artifactRepositoryRoot,
      packageOutput: output,
    });
    const mismatchIssues: readonly [ArtifactRepositoryIssue] = Object.freeze([Object.freeze({
      code: "ReadFailure",
      detail: "tampered artifact fixture",
    })]);
    const mismatchRepository: ArtifactRepositoryAsyncPort = Object.freeze({
      ...unavailableArtifactRepository(),
      readTree: async (
        input: Parameters<ArtifactRepositoryAsyncPort["readTree"]>[0],
      ): Promise<ArtifactTreeObservation> => Object.freeze({
        kind: "Mismatch",
        address: input.address,
        issues: mismatchIssues,
      }),
    });
    const mismatch = createPackageAgentPluginApplication({
      artifactRepository: mismatchRepository,
      artifactRepositoryRoot,
      packageOutput: output,
    });
    const request = {
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath: join(root.path, "blocked.zip"),
    };

    expect(await missing.package(request)).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "ArtifactMissing" },
    });
    expect(await mismatch.package(request)).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "ArtifactMismatch" },
    });
    expect(output.calls).toBe(0);
    expect(missingRepository.readTreeCalls).toBe(1);
    expect(await readdir(root.path)).toEqual([]);
  });

  it("reports an unclosed output-port exception as unsettled rather than claiming success", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const nodeOutput = makeNodePackageOutputAsyncPort();
    const artifacts = await publishedRepository(root.path, [fixture.alphaRelease]);
    const application = createPackageAgentPluginApplication({
      ...artifacts,
      packageOutput: {
        encodeCoworkV1: nodeOutput.encodeCoworkV1,
        async publish() {
          throw new Error("unknown output boundary");
        },
      },
    });

    const result = await application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath: join(root.path, "unknown.zip"),
    });

    expect(result).toMatchObject({
      kind: "OutputUnsettled",
      primaryFailure: { code: "OutputVerifyFailed", phase: "output-port" },
      artifactRef: fixture.alphaSnapshot.ref,
    });
  });

  it.each([
    {
      label: "pre-mutation rejection",
      resourceResult: {
        kind: "RejectedBeforeOutputMutation",
        primaryFailure: resourceFailure("OutputParentUnsafe", "output-parent"),
        cleanupFailure: resourceFailure("TemporaryFailed", "cleanup"),
      } satisfies PackageOutputPublicationResult,
      expectedKind: "RejectedBeforeOutputMutation",
      expectedPrimaryCode: "OutputParentUnsafe",
      includesIdentity: false,
    },
    {
      label: "post-commit unsettled output",
      resourceResult: {
        kind: "OutputUnsettled",
        primaryFailure: resourceFailure("OutputVerifyFailed", "final-verification"),
        cleanupFailure: resourceFailure("FilesystemFailed", "cleanup"),
      } satisfies PackageOutputPublicationResult,
      expectedKind: "OutputUnsettled",
      expectedPrimaryCode: "OutputVerifyFailed",
      includesIdentity: true,
    },
  ] as const)("maps $label and cleanup truth into the domain result", async ({
    resourceResult,
    expectedKind,
    expectedPrimaryCode,
    includesIdentity,
  }) => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const artifacts = await publishedRepository(root.path, [fixture.alphaRelease]);
    const application = createPackageAgentPluginApplication({
      ...artifacts,
      packageOutput: new CountingOutput(resourceResult),
    });

    const result = await application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath: join(root.path, "mapped.zip"),
    });

    expect(result).toMatchObject({
      kind: expectedKind,
      primaryFailure: { code: expectedPrimaryCode },
      cleanupFailure: { code: "TemporaryCleanupFailed", phase: "cleanup" },
    });
    expect("artifactRef" in result).toBe(includesIdentity);
  });

  it("maps encoder rejection before publication and preserves the resource detail", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    let publicationCalls = 0;
    const artifacts = await publishedRepository(root.path, [fixture.alphaRelease]);
    const application = createPackageAgentPluginApplication({
      ...artifacts,
      packageOutput: {
        encodeCoworkV1: async () => Promise.reject(
          resourceFailure("ArchiveEncodingFailed", "archive-codec", "codec refused"),
        ),
        publish: async () => {
          publicationCalls += 1;
          return { kind: "ReadOnlyConverged" };
        },
      },
    });

    await expect(application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath: join(root.path, "unencoded.zip"),
    })).resolves.toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        code: "PackageRenderFailed",
        phase: "package-render",
        message: expect.stringContaining("codec refused"),
      },
    });
    expect(publicationCalls).toBe(0);
    expect(await readdir(root.path)).toEqual([]);
  });
});

class CountingOutput implements AgentPluginPackageOutputAsyncPort {
  calls = 0;
  readonly #node = makeNodePackageOutputAsyncPort();

  constructor(private readonly result: PackageOutputPublicationResult) {}

  encodeCoworkV1(
    request: Parameters<AgentPluginPackageOutputAsyncPort["encodeCoworkV1"]>[0],
  ): Promise<Uint8Array> {
    return this.#node.encodeCoworkV1(request);
  }

  async publish(): Promise<PackageOutputPublicationResult> {
    this.calls += 1;
    return this.result;
  }
}

function resourceFailure(
  reason: PackageOutputFailure["reason"],
  phase: string,
  detail = `${reason} fixture`,
): PackageOutputFailure {
  return Object.freeze({
    _tag: "PackageOutputFailure",
    operation: phase === "archive-codec" ? "encode-archive" : "publish-output",
    reason,
    phase,
    detail,
  });
}

async function fixtureRoot(): Promise<OwnedFixtureRoot> {
  const root = await createOwnedFixtureRoot();
  roots.push(root);
  return root;
}

function createPackageAgentPluginApplication(options: Readonly<{
  artifactRepository: ArtifactRepositoryAsyncPort;
  artifactRepositoryRoot: string;
  packageOutput?: AgentPluginPackageOutputAsyncPort;
}>) {
  const client = createLifecycleTestClient({
    artifactRepository: options.artifactRepository,
    artifactRepositoryRoot: options.artifactRepositoryRoot,
    packageOutput: options.packageOutput ?? makeNodePackageOutputAsyncPort(),
  });
  return Object.freeze({
    package: (request: unknown) => (
      client.packaging.package(request as never, testInvocation)
    ),
  });
}

async function publishedRepository(
  fixtureRoot: string,
  releases: readonly AgentPluginRelease[],
  releaseSet?: AgentPluginReleaseSet,
): Promise<Readonly<{
  artifactRepository: MemoryArtifactRepository;
  artifactRepositoryRoot: string;
}>> {
  const artifactRepository = new MemoryArtifactRepository();
  const artifactRepositoryRoot = join(fixtureRoot, "artifacts-v1");
  const store = createResourceArtifactStore({
    repository: artifactRepository,
    repositoryRoot: artifactRepositoryRoot,
  });
  for (const release of releases) {
    const result = await store.publishRelease(release);
    if (result.kind !== "Published" && result.kind !== "ReadOnlyConverged") {
      throw new Error(`Could not seed packaging artifact: ${result.kind}`);
    }
  }
  if (releaseSet !== undefined) {
    const result = await store.publishReleaseSet(releaseSet);
    if (result.kind !== "Published" && result.kind !== "ReadOnlyConverged") {
      throw new Error(`Could not seed packaging release set: ${result.kind}`);
    }
  }
  artifactRepository.resetObservations();
  return Object.freeze({
    artifactRepository,
    artifactRepositoryRoot,
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
