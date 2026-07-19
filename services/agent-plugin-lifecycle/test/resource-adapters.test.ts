import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type {
  ArtifactEvidenceObservation,
  ArtifactObjectAddress,
  ArtifactPublicationResult,
  ArtifactRepositoryAsyncPort,
  ArtifactTreeObservation,
  ArtifactTreeEntry,
  ArtifactTreeSnapshot,
} from "@rawr/resource-agent-plugin-artifact-repository";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";

import type { PackagingLifecycleRuntime } from "../src/service/modules/packaging/ports";
import {
  coworkV1PackageDigest,
  createResourcePackageOutputRuntime,
  type ResourcePackageOutputOptions,
} from "../src/bindings/packaging";
import {
  createMechanicalEvidenceHandle,
  createResourceArtifactReader,
  createResourceArtifactStore,
  createResourceMechanicalEvidenceReader,
  createResourceMechanicalEvidenceStore,
  parseMechanicalEvidenceHandle,
} from "../src/bindings/releases";
import { packagingArtifactFixture } from "./modules/packaging/artifact-fixture";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./support/owned-fixture-root";
import { createLifecycleTestClient, testInvocation } from "./support/client";

describe("agent-plugin lifecycle resource adapters", () => {
  let fixtureRoot: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixtureRoot !== undefined) await disposeOwnedFixtureRoot(fixtureRoot);
    fixtureRoot = undefined;
  });

  it.runIf("Bun" in globalThis)(
    "publishes and verifies exact release and complete-set trees through the generic repository",
    async () => {
      const setup = await outputSetup();
      const first = await setup.store.publishRelease(setup.fixture.alphaRelease);
      expect(first).toMatchObject({ kind: "Published", ref: setup.fixture.alphaSnapshot.ref });
      const repeated = await setup.store.publishRelease(setup.fixture.alphaRelease);
      expect(repeated).toMatchObject({ kind: "ReadOnlyConverged", ref: setup.fixture.alphaSnapshot.ref });
      await setup.store.publishRelease(setup.fixture.betaRelease);
      await expect(setup.store.publishReleaseSet(setup.fixture.releaseSet)).resolves.toMatchObject({
        kind: "Published",
        ref: setup.fixture.setSnapshot.ref,
      });

      const verified = await setup.reader.read(setup.fixture.setSnapshot.ref);
      expect(verified).toMatchObject({
        kind: "Verified",
        snapshot: { kind: "complete-set", members: [{}, {}] },
      });
      if (verified.kind !== "Verified" || verified.snapshot.kind !== "complete-set") return;
      verified.snapshot.members[0]?.files[0]?.bytes.fill(0);
      await expect(setup.reader.read(setup.fixture.setSnapshot.ref)).resolves.toMatchObject({
        kind: "Verified",
        snapshot: { kind: "complete-set" },
      });
    },
  );

  it.runIf("Bun" in globalThis)(
    "rejects an unexpected empty artifact directory instead of accepting byte-only convergence",
    async () => {
      const setup = await outputSetup();
      await setup.store.publishRelease(setup.fixture.alphaRelease);
      setup.repository.addDirectory(
        setup.fixture.alphaRelease.artifactDigest,
        "unexpected-empty",
      );

      await expect(setup.reader.read(setup.fixture.alphaSnapshot.ref)).resolves.toMatchObject({
        kind: "Mismatch",
        issues: [{ code: "UnexpectedEntry", detail: expect.stringContaining("unexpected-empty") }],
      });
      await expect(setup.store.publishRelease(setup.fixture.alphaRelease)).resolves.toMatchObject({
        kind: "Rejected",
        failure: expect.stringContaining("present"),
      });
    },
  );

  it.runIf("Bun" in globalThis)(
    "classifies a post-publication artifact failure as visible but unsettled",
    async () => {
      const setup = await outputSetup();
      const result = await setup.store.publishRelease(setup.fixture.alphaRelease, {
        failpoint(event) {
          if (event.kind === "AfterNoReplacePublication") throw new Error("post-commit fixture failure");
        },
      });

      expect(result).toMatchObject({
        kind: "Unsettled",
        observation: "Verified",
        failure: expect.stringContaining("post-commit fixture failure"),
      });
      await expect(setup.reader.read(setup.fixture.alphaSnapshot.ref)).resolves.toMatchObject({ kind: "Verified" });
    },
  );

  it.runIf("Bun" in globalThis)(
    "does not call a merely present post-publication artifact verified",
    async () => {
      const setup = await outputSetup();
      const result = await setup.store.publishRelease(setup.fixture.alphaRelease, {
        async failpoint(event) {
          if (event.kind !== "AfterNoReplacePublication") return;
          setup.repository.replaceEntry(
            setup.fixture.alphaRelease.artifactDigest,
            "release.json",
            new TextEncoder().encode("{}\n"),
          );
          throw new Error("post-commit artifact changed");
        },
      });

      expect(result).toMatchObject({
        kind: "Unsettled",
        observation: "Mismatch",
        failure: expect.stringContaining("post-commit artifact changed"),
      });
    },
  );

  it("publishes evidence through the generic repository and converges by service handle", async () => {
    const setup = await evidenceSetup();
    const bytes = new TextEncoder().encode('{"schemaVersion":1,"verified":true}\n');
    const handle = createMechanicalEvidenceHandle(bytes);

    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({ kind: "Published", handle });
    const read = await setup.reader.read(handle);
    expect(read).toEqual({ kind: "Verified", handle, bytes });
    if (read.kind === "Verified") read.bytes.fill(0);
    await expect(setup.reader.read(handle)).resolves.toEqual({ kind: "Verified", handle, bytes });
    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({
      kind: "ReadOnlyConverged",
      handle,
    });
    expect(setup.repository.publishedEvidenceCalls).toBe(1);
    expect(setup.repository.lastEvidenceAddress).toEqual({
      repositoryRoot: setup.root,
      namespace: ["mechanical-evidence", "sha256"],
      objectId: handle.digest,
    });
  });

  it("rejects digest violations before resource publication", async () => {
    const setup = await evidenceSetup();
    const expected = new TextEncoder().encode("expected\n");
    const handle = createMechanicalEvidenceHandle(expected);

    await expect(setup.store.publish(
      handle,
      new TextEncoder().encode("different\n"),
    )).resolves.toMatchObject({
      kind: "Rejected",
      failure: expect.stringContaining("do not match"),
    });
    expect(setup.repository.publishedEvidenceCalls).toBe(0);
  });

  it("rejects closed evidence handles before resource access", async () => {
    const setup = await evidenceSetup();
    const bytes = new TextEncoder().encode("closed handle\n");
    const handle = createMechanicalEvidenceHandle(bytes);
    const closedHandle = { ...handle, extra: true };

    expect(parseMechanicalEvidenceHandle(closedHandle)).toMatchObject({
      ok: false,
      issue: { code: "InvalidHandle" },
    });
    await expect(setup.reader.read(closedHandle)).resolves.toMatchObject({
      kind: "Mismatch",
      issues: [{ code: "InvalidHandle" }],
    });
    await expect(setup.store.publish(closedHandle, bytes)).resolves.toMatchObject({
      kind: "Rejected",
      failure: expect.stringContaining("closed object"),
    });
    expect(setup.repository.readEvidenceCalls).toBe(0);
    expect(setup.repository.publishedEvidenceCalls).toBe(0);
  });

  it("refuses to repair tampered evidence at an occupied digest address", async () => {
    const setup = await evidenceSetup();
    const canonicalBytes = new TextEncoder().encode("canonical evidence\n");
    const handle = createMechanicalEvidenceHandle(canonicalBytes);
    await expect(setup.store.publish(handle, canonicalBytes)).resolves.toEqual({
      kind: "Published",
      handle,
    });

    setup.repository.replaceEntry(
      handle.digest,
      "evidence.json",
      new TextEncoder().encode("tampered evidence\n"),
    );

    await expect(setup.reader.read(handle)).resolves.toMatchObject({ kind: "Mismatch", handle });
    await expect(setup.store.publish(handle, canonicalBytes)).resolves.toMatchObject({
      kind: "Rejected",
      handle,
    });
    expect(setup.repository.publishedEvidenceCalls).toBe(1);
    await expect(setup.reader.read(handle)).resolves.toMatchObject({ kind: "Mismatch", handle });
  });

  it("retries the exact evidence handle after pre-publication rejection", async () => {
    const setup = await evidenceSetup();
    const bytes = new TextEncoder().encode("retryable evidence\n");
    const handle = createMechanicalEvidenceHandle(bytes);
    setup.repository.rejectNextEvidencePublication("injected publication outage");

    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({
      kind: "Rejected",
      handle,
      failure: "injected publication outage",
    });
    await expect(setup.reader.read(handle)).resolves.toEqual({ kind: "Missing", handle });
    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({ kind: "Published", handle });
    await expect(setup.store.publish(handle, bytes)).resolves.toEqual({
      kind: "ReadOnlyConverged",
      handle,
    });
    expect(setup.repository.publishedEvidenceCalls).toBe(2);
  });

  it("preserves a post-publication failure as verified but unsettled evidence", async () => {
    const setup = await evidenceSetup();
    const bytes = new TextEncoder().encode("stable mechanical evidence\n");
    const handle = createMechanicalEvidenceHandle(bytes);

    const result = await setup.store.publish(handle, bytes, {
      failpoint(event) {
        if (event.kind === "AfterNoReplacePublication") {
          throw new Error("post-publication evidence fixture failure");
        }
      },
    });

    expect(result).toMatchObject({
      kind: "Unsettled",
      observation: "Verified",
      failure: expect.stringContaining("post-publication evidence fixture failure"),
    });
    await expect(setup.reader.read(handle)).resolves.toMatchObject({ kind: "Verified", handle });
  });

  it.runIf("Bun" in globalThis)(
    "packages verified artifact bytes and converges without rewriting the canonical output",
    async () => {
      const setup = await outputSetup();
      await setup.store.publishRelease(setup.fixture.alphaRelease);
      const runtime = createPackageOutputLifecycleRuntime({ artifactReader: setup.reader });
      const application = createPackageAgentPluginApplication(runtime);
      const outputPath = join(setup.root, "alpha.cowork.zip");
      const request = {
        artifactRef: setup.fixture.alphaSnapshot.ref,
        format: "cowork-v1",
        outputPath,
      };

      const first = await application.package(request);
      expect(first).toMatchObject({ kind: "OutputReplacedVerified", priorOutput: "Absent" });
      if (first.kind !== "OutputReplacedVerified") return;
      expect(first.packageDigest).toBe(coworkV1PackageDigest(await readFile(outputPath)));
      expect((await lstat(outputPath)).mode & 0o777).toBe(0o644);
      const before = await lstat(outputPath, { bigint: true });

      await expect(application.package(request)).resolves.toMatchObject({
        kind: "ReadOnlyConverged",
        packageDigest: first.packageDigest,
      });
      const after = await lstat(outputPath, { bigint: true });
      expect({ ino: after.ino, mtimeNs: after.mtimeNs }).toEqual({ ino: before.ino, mtimeNs: before.mtimeNs });
    },
  );

  it.runIf("Bun" in globalThis)(
    "maps a service failpoint to a closed pre-mutation package refusal",
    async () => {
      const setup = await outputSetup();
      await setup.store.publishRelease(setup.fixture.alphaRelease);
      const runtime = createPackageOutputLifecycleRuntime({
        artifactReader: setup.reader,
        failpoints: {
          async hit(point) {
            if (point === "BeforeCommit") throw new Error("package commit refused");
          },
        },
      });
      const result = await createPackageAgentPluginApplication(runtime).package({
        artifactRef: setup.fixture.alphaSnapshot.ref,
        format: "cowork-v1",
        outputPath: join(setup.root, "refused.cowork.zip"),
      });

      expect(result).toMatchObject({
        kind: "RejectedBeforeOutputMutation",
        primaryFailure: {
          code: "FailpointFailed",
          message: expect.stringContaining("package commit refused"),
        },
      });
    },
  );

  it.runIf("Bun" in globalThis)(
    "relays each real package-output transition exactly once",
    async () => {
      const setup = await outputSetup();
      await setup.store.publishRelease(setup.fixture.alphaRelease);
      const points: string[] = [];
      const runtime = createPackageOutputLifecycleRuntime({
        artifactReader: setup.reader,
        failpoints: {
          async hit(point) {
            points.push(point);
          },
        },
      });

      await expect(createPackageAgentPluginApplication(runtime).package({
        artifactRef: setup.fixture.alphaSnapshot.ref,
        format: "cowork-v1",
        outputPath: join(setup.root, "four-transitions.cowork.zip"),
      })).resolves.toMatchObject({ kind: "OutputReplacedVerified" });
      expect(points).toEqual([
        "AfterOutputObserved",
        "BeforeCommit",
        "AfterCommit",
        "BeforeFinalVerification",
      ]);
    },
  );

  async function outputSetup() {
    fixtureRoot = await createOwnedFixtureRoot();
    const artifactRoot = join(fixtureRoot.path, "artifacts-v1");
    const repository = new MemoryArtifactRepository();
    const binding = { repositoryRoot: artifactRoot, repository };
    return Object.freeze({
      fixture: packagingArtifactFixture(),
      root: fixtureRoot.path,
      repository,
      store: createResourceArtifactStore(binding),
      reader: createResourceArtifactReader(binding),
    });
  }

  async function evidenceSetup() {
    fixtureRoot = await createOwnedFixtureRoot();
    const root = join(fixtureRoot.path, "artifacts-v1");
    const repository = new MemoryArtifactRepository();
    const binding = { repositoryRoot: root, repository };
    return Object.freeze({
      root,
      repository,
      store: createResourceMechanicalEvidenceStore(binding),
      reader: createResourceMechanicalEvidenceReader(binding),
    });
  }
});

function createPackageOutputLifecycleRuntime(
  options: Omit<ResourcePackageOutputOptions, "packageOutput">,
) {
  return createResourcePackageOutputRuntime({
    ...options,
    packageOutput: makeNodePackageOutputAsyncPort(),
  });
}

function createPackageAgentPluginApplication(runtime: PackagingLifecycleRuntime) {
  const client = createLifecycleTestClient({ packaging: runtime });
  return Object.freeze({
    package: (request: unknown) => (
      client.packaging.package(request as never, testInvocation)
    ),
  });
}

class MemoryArtifactRepository implements ArtifactRepositoryAsyncPort {
  private readonly trees = new Map<string, ArtifactTreeSnapshot>();
  private nextEvidencePublicationFailure: string | undefined;
  readEvidenceCalls = 0;
  publishedEvidenceCalls = 0;
  lastEvidenceAddress: ArtifactObjectAddress | undefined;

  async readTree(
    input: Parameters<ArtifactRepositoryAsyncPort["readTree"]>[0],
  ): Promise<ArtifactTreeObservation> {
    const snapshot = this.trees.get(addressKey(input.address));
    return snapshot === undefined
      ? Object.freeze({ kind: "Missing", address: input.address })
      : Object.freeze({ kind: "Present", snapshot: copyTree(snapshot) });
  }

  async publishTree(
    input: Parameters<ArtifactRepositoryAsyncPort["publishTree"]>[0],
  ): Promise<ArtifactPublicationResult> {
    const key = addressKey(input.address);
    const candidate = snapshotFor(input.address, input.entries);
    const prior = this.trees.get(key);
    if (prior !== undefined) {
      return sameTree(prior, candidate)
        ? Object.freeze({ kind: "ReadOnlyConverged", address: input.address })
        : Object.freeze({ kind: "Occupied", address: input.address, observation: "Present" });
    }

    await input.control?.onEvent?.({ kind: "AfterStagingWrite", address: input.address });
    await input.control?.onEvent?.({ kind: "AfterStagingVerification", address: input.address });
    const decision = await input.control?.beforeCommit?.();
    if (decision?.kind === "Reject") {
      return Object.freeze({ kind: "Rejected", address: input.address, failure: decision.failure });
    }
    await input.control?.onEvent?.({ kind: "BeforeNoReplacePublication", address: input.address });
    this.trees.set(key, candidate);
    await input.control?.onEvent?.({ kind: "AfterNoReplacePublication", address: input.address });
    return Object.freeze({ kind: "Published", address: input.address });
  }

  async readEvidence(
    input: Parameters<ArtifactRepositoryAsyncPort["readEvidence"]>[0],
  ): Promise<ArtifactEvidenceObservation> {
    this.readEvidenceCalls += 1;
    this.lastEvidenceAddress = input.address;
    const snapshot = this.trees.get(addressKey(input.address));
    if (snapshot === undefined) return Object.freeze({ kind: "Missing", address: input.address });
    const entry = snapshot.entries[0];
    if (
      snapshot.directories.length !== 0
      || snapshot.entries.length !== 1
      || entry?.path !== "evidence.json"
      || entry.mode !== 0o444
    ) {
      const issues: [Readonly<{ code: "UnexpectedEntry"; detail: string }>] = [Object.freeze({
        code: "UnexpectedEntry",
        detail: "Mechanical evidence fixture has an unexpected tree shape",
      })];
      return Object.freeze({
        kind: "Mismatch",
        address: input.address,
        issues: Object.freeze(issues),
      });
    }
    return Object.freeze({
      kind: "Present",
      address: input.address,
      bytes: new Uint8Array(entry.bytes),
    });
  }

  async publishEvidence(
    input: Parameters<ArtifactRepositoryAsyncPort["publishEvidence"]>[0],
  ): Promise<ArtifactPublicationResult> {
    this.publishedEvidenceCalls += 1;
    this.lastEvidenceAddress = input.address;
    if (this.nextEvidencePublicationFailure !== undefined) {
      const failure = this.nextEvidencePublicationFailure;
      this.nextEvidencePublicationFailure = undefined;
      return Object.freeze({ kind: "Rejected", address: input.address, failure });
    }
    return this.publishTree({
      address: input.address,
      entries: Object.freeze([Object.freeze({
        path: "evidence.json",
        mode: 0o444,
        bytes: new Uint8Array(input.bytes),
      })]),
      limits: Object.freeze({ maxEntries: 1, maxBytes: input.maxBytes }),
      ...(input.control === undefined ? {} : { control: input.control }),
    });
  }

  rejectNextEvidencePublication(failure: string): void {
    this.nextEvidencePublicationFailure = failure;
  }

  addDirectory(objectId: string, path: string): void {
    const [key, snapshot] = this.findByObjectId(objectId);
    this.trees.set(key, Object.freeze({
      ...snapshot,
      directories: Object.freeze([
        ...snapshot.directories,
        Object.freeze({ path, mode: 0o700 }),
      ].sort((left, right) => left.path.localeCompare(right.path))),
    }));
  }

  replaceEntry(objectId: string, path: string, bytes: Uint8Array): void {
    const [key, snapshot] = this.findByObjectId(objectId);
    this.trees.set(key, Object.freeze({
      ...snapshot,
      entries: Object.freeze(snapshot.entries.map((entry) =>
        entry.path === path ? Object.freeze({ ...entry, bytes: new Uint8Array(bytes) }) : entry
      )),
    }));
  }

  private findByObjectId(objectId: string): readonly [string, ArtifactTreeSnapshot] {
    const found = [...this.trees.entries()].find(([, snapshot]) =>
      snapshot.address.objectId === objectId
    );
    if (found === undefined) throw new Error(`Missing fixture artifact ${objectId}`);
    return found;
  }
}

function snapshotFor(
  address: ArtifactObjectAddress,
  entries: readonly ArtifactTreeEntry[],
): ArtifactTreeSnapshot {
  const directoryPaths = new Set<string>();
  for (const entry of entries) {
    const segments = entry.path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directoryPaths.add(segments.slice(0, index).join("/"));
    }
  }
  return Object.freeze({
    address,
    directories: Object.freeze([...directoryPaths]
      .sort()
      .map((path) => Object.freeze({ path, mode: 0o700 }))),
    entries: Object.freeze([...entries]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((entry) => Object.freeze({ ...entry, bytes: new Uint8Array(entry.bytes) }))),
  });
}

function copyTree(snapshot: ArtifactTreeSnapshot): ArtifactTreeSnapshot {
  return Object.freeze({
    ...snapshot,
    directories: Object.freeze(snapshot.directories.map((directory) => Object.freeze({ ...directory }))),
    entries: Object.freeze(snapshot.entries.map((entry) => Object.freeze({
      ...entry,
      bytes: new Uint8Array(entry.bytes),
    }))),
  });
}

function sameTree(left: ArtifactTreeSnapshot, right: ArtifactTreeSnapshot): boolean {
  return JSON.stringify(left.directories) === JSON.stringify(right.directories)
    && left.entries.length === right.entries.length
    && left.entries.every((entry, index) => {
      const candidate = right.entries[index];
      return candidate !== undefined
        && entry.path === candidate.path
        && entry.mode === candidate.mode
        && entry.bytes.byteLength === candidate.bytes.byteLength
        && entry.bytes.every((byte, byteIndex) => byte === candidate.bytes[byteIndex]);
    });
}

function addressKey(address: ArtifactObjectAddress): string {
  return `${address.repositoryRoot}/${address.namespace.join("/")}/${address.objectId}`;
}
