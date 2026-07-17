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

import type { ArtifactReader, ArtifactReadResult } from "../../../src/service/modules/packaging/internal/artifact-reader";
import type { AtomicPackageOutput } from "../../../src/service/modules/packaging/internal/atomic-output";
import { COWORK_PACKAGE_FORMAT } from "../../../src/service/modules/packaging/internal/contract";
import { COWORK_V1_MAX_PAYLOAD_BYTES } from "../../../src/service/modules/packaging/internal/cowork-v1";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";

import { createPackageAgentPluginApplication } from "../../../src/service/modules/packaging/internal/package-agent-plugin";
import {
  createResourcePackageOutputRuntime,
  type ResourcePackageOutputOptions,
} from "../../../src/service/modules/packaging/ports";
import { packagingArtifactFixture } from "./artifact-fixture";
import { createOwnedFixtureRoot, disposeOwnedFixtureRoot, type OwnedFixtureRoot } from "./owned-fixture-root";

const roots: OwnedFixtureRoot[] = [];
const coworkV1Runtime = createPackageOutputLifecycleRuntime({
  artifactReader: {
    async read() {
      throw new Error("Cowork rendering does not read artifacts");
    },
  },
}).coworkV1;

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
    const reader = new ResultReader({ kind: "Verified", snapshot: fixture.alphaSnapshot });
    const application = createPackageAgentPluginApplication(
      createPackageOutputLifecycleRuntime({ artifactReader: reader }),
    );
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
    expect(reader.calls).toBe(1);

    const beforeNames = await readdir(root.path);
    const second = await application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath,
    });
    expect(second).toMatchObject({ kind: "ReadOnlyConverged", packageDigest: first.kind === "OutputReplacedVerified" ? first.packageDigest : "" });
    expect(await readdir(root.path)).toEqual(beforeNames);
    expect(reader.calls).toBe(2);
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
    const reader = new DetachedSourceReader(sourceLocator, {
      kind: "Verified",
      snapshot: fixture.setSnapshot,
    });
    const application = createPackageAgentPluginApplication(
      createPackageOutputLifecycleRuntime({ artifactReader: reader }),
    );
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
    expect(reader.calls).toBe(4);
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
    const reader = new ResultReader({ kind: "Verified", snapshot: fixture.alphaSnapshot });
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const application = createPackageAgentPluginApplication({
      artifactReader: reader,
      coworkV1: coworkV1Runtime,
      output,
    });

    const result = await application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath: join(root.path, "invalid.zip"),
      sourceWorkspace: root.path,
    });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "InvalidRequest" },
    });
    expect(reader.calls).toBe(0);
    expect(output.calls).toBe(0);
    expect(await readdir(root.path)).toEqual([]);
  });

  it("maps missing and mismatched artifacts to closed pre-output failures", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const missing = createPackageAgentPluginApplication({
      artifactReader: new ResultReader({ kind: "Missing", ref: fixture.alphaSnapshot.ref }),
      coworkV1: coworkV1Runtime,
      output,
    });
    const mismatch = createPackageAgentPluginApplication({
      artifactReader: new ResultReader({
        kind: "Mismatch",
        ref: fixture.alphaSnapshot.ref,
        issues: [{ code: "DigestMismatch", detail: "tampered" }],
      }),
      coworkV1: coworkV1Runtime,
      output,
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
    expect(await readdir(root.path)).toEqual([]);
  });

  it("rejects a verified snapshot that does not bind the requested ref", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const application = createPackageAgentPluginApplication({
      artifactReader: new ResultReader({ kind: "Verified", snapshot: fixture.betaSnapshot }),
      coworkV1: coworkV1Runtime,
      output,
    });

    const result = await application.package({
      artifactRef: fixture.alphaSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath: join(root.path, "wrong.zip"),
    });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "ArtifactSnapshotMismatch" },
    });
    expect(output.calls).toBe(0);
  });

  it("reports an unclosed output-port exception as unsettled rather than claiming success", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const application = createPackageAgentPluginApplication({
      artifactReader: new ResultReader({ kind: "Verified", snapshot: fixture.alphaSnapshot }),
      coworkV1: coworkV1Runtime,
      output: {
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

  it("maps a verified overbound Cowork snapshot to PackageRenderFailed before output", async () => {
    const root = await fixtureRoot();
    const fixture = packagingArtifactFixture();
    const originalFile = fixture.alphaSnapshot.files[0];
    if (originalFile === undefined) throw new Error("fixture file missing");
    const reportedByteLength = COWORK_V1_MAX_PAYLOAD_BYTES + 1;
    const oversizedBytes = new ReportedLengthBytes(originalFile.bytes, reportedByteLength);
    const oversizedSnapshot = {
      ...fixture.alphaSnapshot,
      release: {
        ...fixture.alphaSnapshot.release,
        artifactBody: {
          ...fixture.alphaSnapshot.release.artifactBody,
          storageManifest: fixture.alphaSnapshot.release.artifactBody.storageManifest.map((entry) =>
            entry.path === originalFile.path ? { ...entry, byteLength: reportedByteLength } : entry
          ),
        },
      },
      files: fixture.alphaSnapshot.files.map((file) =>
        file.path === originalFile.path ? { ...file, bytes: oversizedBytes } : file
      ),
    };
    const output = new CountingOutput({ kind: "ReadOnlyConverged" });
    const application = createPackageAgentPluginApplication({
      artifactReader: new ResultReader({ kind: "Verified", snapshot: oversizedSnapshot }),
      coworkV1: coworkV1Runtime,
      output,
    });

    const result = await application.package({
      artifactRef: oversizedSnapshot.ref,
      format: COWORK_PACKAGE_FORMAT,
      outputPath: join(root.path, "overbound.zip"),
    });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "PackageRenderFailed", phase: "package-render" },
    });
    expect(output.calls).toBe(0);
    expect(await readdir(root.path)).toEqual([]);
  });
});

class ReportedLengthBytes extends Uint8Array {
  constructor(source: Uint8Array, private readonly reportedByteLength: number) {
    super(source);
  }

  override get byteLength(): number {
    return this.reportedByteLength;
  }
}

class ResultReader implements ArtifactReader {
  calls = 0;

  constructor(private readonly result: ArtifactReadResult) {}

  async read(): Promise<ArtifactReadResult> {
    this.calls += 1;
    return this.result;
  }
}

class DetachedSourceReader implements ArtifactReader {
  calls = 0;

  constructor(
    private readonly sourceLocator: string,
    private readonly result: ArtifactReadResult,
  ) {}

  async read(): Promise<ArtifactReadResult> {
    this.calls += 1;
    await assertMissing(this.sourceLocator);
    return this.result;
  }
}

class CountingOutput implements AtomicPackageOutput {
  calls = 0;

  constructor(private readonly result: Awaited<ReturnType<AtomicPackageOutput["publish"]>>) {}

  async publish(): Promise<Awaited<ReturnType<AtomicPackageOutput["publish"]>>> {
    this.calls += 1;
    return this.result;
  }
}

async function fixtureRoot(): Promise<OwnedFixtureRoot> {
  const root = await createOwnedFixtureRoot();
  roots.push(root);
  return root;
}

function createPackageOutputLifecycleRuntime(
  options: Omit<ResourcePackageOutputOptions, "packageOutput">,
) {
  return createResourcePackageOutputRuntime({
    ...options,
    packageOutput: makeNodePackageOutputAsyncPort(),
  });
}

async function assertMissing(path: string): Promise<void> {
  try {
    await lstat(path);
    throw new Error(`expected removed source locator to remain absent: ${path}`);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
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
