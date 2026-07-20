import { realpath } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createMechanicalEvidenceHandle,
  createReleaseArtifactRef,
  parseArtifactDigest,
} from "@rawr/agent-plugin-lifecycle/release";
import type { Deps } from "@rawr/agent-plugin-lifecycle/client";
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import { makeNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";

import {
  createLifecycleTestClient,
  testInvocation,
} from "../../../../../../services/agent-plugin-lifecycle/test/support/client";
import {
  createResourceArtifactReader,
} from "../../../../../../services/agent-plugin-lifecycle/src/service/repository/artifact-repository";
import type { ArtifactStoreRoot } from "../../../../src/lib/agent-plugins/layout";
import {
  GIT_EXECUTABLE,
  createGeneratedGitRepository,
} from "../../../../../../services/agent-plugin-lifecycle/test/support/git-repository";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./owned-fixture-root";

const zeroBudget = Object.freeze({
  kind: "space-v1",
  maximumUnpinnedBytes: 0,
} as const);

describe("closed read-only retention planning", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it.runIf("Bun" in globalThis)(
    "expands a verified complete-set pin to every release member",
    async () => {
      const built = await buildCompleteSet();
      const client = retentionClient({
        pins: async () => ({ schemaVersion: 1, refs: [built.setRef] }),
        inventory: async () => [{ ref: built.memberRef, storedBytes: 20 }],
        artifactRepository: built.artifactRepository,
        artifactRepositoryRoot: built.artifactRepositoryRoot,
      });

      await expect(client.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
        kind: "RetentionPlan",
        pinned: expect.arrayContaining([built.setRef, built.memberRef]),
        retained: [],
        collectible: [],
      });
    },
  );

  it.runIf("Bun" in globalThis)(
    "blocks bare, over-count, and unverifiable pin graphs through the native procedure",
    async () => {
      const built = await buildCompleteSet();
      const bare = retentionClient({
        pins: async () => ({ schemaVersion: 1, refs: [built.memberRef.artifactDigest] }),
        inventory: async () => [],
        artifactRepository: built.artifactRepository,
        artifactRepositoryRoot: built.artifactRepositoryRoot,
      });
      await expect(bare.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
        kind: "BlockedPinnedGraph",
        issues: [{ detail: expect.stringContaining("not a closed artifact or evidence ref") }],
      });

      const overCount = retentionClient({
        pins: async () => ({
          schemaVersion: 1,
          refs: Array.from({ length: 16_385 }, () => built.memberRef),
        }),
        inventory: async () => [],
        artifactRepository: built.artifactRepository,
        artifactRepositoryRoot: built.artifactRepositoryRoot,
      });
      await expect(overCount.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
        kind: "BlockedPinnedGraph",
        issues: [{ detail: expect.stringContaining("exceed") }],
      });

      const missingDigest = must(parseArtifactDigest(mutateDigest(built.memberRef.artifactDigest)));
      const missingRef = createReleaseArtifactRef(built.memberRef.releaseDigest, missingDigest);
      const missing = retentionClient({
        pins: async () => ({ schemaVersion: 1, refs: [missingRef] }),
        inventory: async () => [],
        artifactRepository: built.artifactRepository,
        artifactRepositoryRoot: built.artifactRepositoryRoot,
      });
      await expect(missing.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
        kind: "BlockedPinnedGraph",
        issues: [{ ref: missingRef }],
      });
    },
  );

  it.runIf("Bun" in globalThis)(
    "retains zero-byte entries and reports aggregate overflow",
    async () => {
      const built = await buildCompleteSet();
      const verified = await built.reader.read(built.memberRef);
      expect(verified.kind).toBe("Verified");
      if (verified.kind !== "Verified") return;
      const overflowHandle = await seedEvidence(
        built.artifactRepository,
        built.artifactRepositoryRoot,
        new TextEncoder().encode("overflow fixture\n"),
      );
      const client = retentionClient({
        pins: async () => ({ schemaVersion: 1, refs: [] }),
        inventory: async () => [
          { ref: built.memberRef, storedBytes: 0 },
          { ref: overflowHandle, storedBytes: Number.MAX_SAFE_INTEGER },
          { ref: built.setRef, storedBytes: 1 },
        ],
        artifactRepository: built.artifactRepository,
        artifactRepositoryRoot: built.artifactRepositoryRoot,
      });

      await expect(client.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
        kind: "RetentionPlan",
        retained: [{ ref: built.memberRef, storedBytes: 0 }],
        blockedEntries: [{ detail: expect.stringContaining("overflows") }],
      });
    },
  );

  it("pins governed mechanical evidence only through its opaque reader", async () => {
    fixture = await createOwnedFixtureRoot();
    const artifactRepositoryRoot = join(fixture.path, "artifacts-v1") as ArtifactStoreRoot;
    const rawRepository = makeNodeArtifactRepositoryAsyncPort();
    const bytes = new TextEncoder().encode("governed evidence bytes\n");
    const handle = await seedEvidence(rawRepository, artifactRepositoryRoot, bytes);
    let artifactReads = 0;
    let evidenceReads = 0;
    const observedRepository: ArtifactRepositoryAsyncPort = {
      ...rawRepository,
      async readTree(input) {
        artifactReads += 1;
        return await rawRepository.readTree(input);
      },
      async readEvidence(input) {
        evidenceReads += 1;
        return await rawRepository.readEvidence(input);
      },
    };
    const client = retentionClient({
      pins: async () => ({ schemaVersion: 1, refs: [handle] }),
      inventory: async () => [{ ref: handle, storedBytes: bytes.byteLength }],
      artifactRepository: observedRepository,
      artifactRepositoryRoot,
    });

    await expect(client.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
      kind: "RetentionPlan",
      pinned: [handle],
      retained: [],
      collectible: [],
    });
    expect(artifactReads).toBe(0);
    expect(evidenceReads).toBeGreaterThan(0);

    const unavailable = retentionClient({
      pins: async () => ({ schemaVersion: 1, refs: [handle] }),
      inventory: async () => [],
      artifactRepository: observedRepository,
      artifactRepositoryRoot: join(fixture.path, "missing-artifacts-v1"),
    });
    await expect(unavailable.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
      kind: "BlockedPinnedGraph",
      issues: [{ ref: handle, detail: expect.stringContaining("missing") }],
    });
  });

  it.runIf("Bun" in globalThis)(
    "selects an ordinary multi-ref budget deterministically with canonical equal-size ties",
    async () => {
      const built = await buildCompleteSet();
      const [largest, firstTieCandidate, secondTieCandidate, smallest] = await Promise.all([
        seedEvidence(built.artifactRepository, built.artifactRepositoryRoot, new TextEncoder().encode("largest\n")),
        seedEvidence(built.artifactRepository, built.artifactRepositoryRoot, new TextEncoder().encode("tie-first\n")),
        seedEvidence(built.artifactRepository, built.artifactRepositoryRoot, new TextEncoder().encode("tie-second\n")),
        seedEvidence(built.artifactRepository, built.artifactRepositoryRoot, new TextEncoder().encode("smallest\n")),
      ]);
      const [tieFirst, tieSecond] = [firstTieCandidate, secondTieCandidate]
        .sort((left, right) => left.digest.localeCompare(right.digest));
      const client = retentionClient({
        pins: async () => ({ schemaVersion: 1, refs: [] }),
        inventory: async () => [
          { ref: smallest, storedBytes: 10 },
          { ref: tieSecond, storedBytes: 30 },
          { ref: largest, storedBytes: 50 },
          { ref: tieFirst, storedBytes: 30 },
        ],
        artifactRepository: built.artifactRepository,
        artifactRepositoryRoot: built.artifactRepositoryRoot,
      });
      const policy = { kind: "space-v1", maximumUnpinnedBytes: 50 } as const;

      const first = await client.releases.planRetention(policy, testInvocation);
      const second = await client.releases.planRetention(policy, testInvocation);
      expect(second).toEqual(first);
      expect(first).toEqual({
        kind: "RetentionPlan",
        pinned: [],
        collectible: [
          { ref: largest, storedBytes: 50 },
          { ref: tieFirst, storedBytes: 30 },
        ],
        retained: [
          { ref: tieSecond, storedBytes: 30 },
          { ref: smallest, storedBytes: 10 },
        ],
        blockedEntries: [],
      });
    },
  );

  it("fails closed when retention capability is absent or a reader throws", async () => {
    fixture = await createOwnedFixtureRoot();
    let artifactReads = 0;
    const rawRepository = makeNodeArtifactRepositoryAsyncPort();
    const observedRepository: ArtifactRepositoryAsyncPort = {
      ...rawRepository,
      async readTree(input) {
        artifactReads += 1;
        return await rawRepository.readTree(input);
      },
    };
    const absent = createLifecycleTestClient({
      artifactRepository: observedRepository,
      artifactRepositoryRoot: join(fixture.path, "artifacts-v1"),
    });
    await expect(absent.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
      kind: "BlockedPinnedGraph",
      issues: [{ detail: expect.stringContaining("unavailable") }],
    });
    expect(artifactReads).toBe(0);

    const throwing = retentionClient({
      pins: async () => {
        throw new Error("pin reader exploded");
      },
      inventory: async () => [],
      artifactRepository: observedRepository,
      artifactRepositoryRoot: join(fixture.path, "artifacts-v1"),
    });
    await expect(throwing.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
      kind: "BlockedPinnedGraph",
      issues: [{ detail: expect.stringContaining("pin reader exploded") }],
    });
    expect(artifactReads).toBe(0);
  });

  it("rejects injected retention authority before any runtime reader call", async () => {
    fixture = await createOwnedFixtureRoot();
    let reads = 0;
    const rawRepository = makeNodeArtifactRepositoryAsyncPort();
    const observedRepository: ArtifactRepositoryAsyncPort = {
      ...rawRepository,
      async readTree(input) {
        reads += 1;
        return await rawRepository.readTree(input);
      },
      async readEvidence(input) {
        reads += 1;
        return await rawRepository.readEvidence(input);
      },
    };
    const client = retentionClient({
      pins: async () => {
        reads += 1;
        return { schemaVersion: 1, refs: [] };
      },
      inventory: async () => {
        reads += 1;
        return [];
      },
      artifactRepository: observedRepository,
      artifactRepositoryRoot: join(fixture.path, "artifacts-v1"),
    });

    for (const field of ["pins", "inventory", "artifacts", "evidence", "delete"] as const) {
      const injected = { ...zeroBudget, [field]: true };
      await expect(client.releases.planRetention(injected as never, testInvocation)).rejects.toThrow();
    }
    expect(reads).toBe(0);
  });

  async function buildCompleteSet() {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const root = join(fixture.path, "artifacts-v1") as ArtifactStoreRoot;
    const contentWorkspace = makeNodeContentWorkspacePort({
      gitExecutable: await realpath(GIT_EXECUTABLE),
    });
    const artifactRepository = makeNodeArtifactRepositoryAsyncPort();
    const client = createLifecycleTestClient({
      contentWorkspace,
      artifactRepository,
      artifactRepositoryRoot: root,
    });
    const result = await client.releases.build({
      contentWorkspace: repository.policy,
      mode: { kind: "complete-set" },
    }, testInvocation);
    expect(result.kind, JSON.stringify(result)).toBe("Published");
    if (result.kind !== "Published" || result.ref.kind !== "complete-set") {
      throw new Error("complete generated fixture did not publish");
    }
    const reader = createResourceArtifactReader({
      repository: artifactRepository,
      repositoryRoot: root,
    });
    const set = await reader.read(result.ref);
    if (set.kind !== "Verified" || set.snapshot.kind !== "complete-set") {
      throw new Error("complete generated fixture did not verify");
    }
    return {
      reader,
      artifactRepository,
      artifactRepositoryRoot: root,
      setRef: result.ref,
      memberRef: set.snapshot.members[0]!.ref,
    };
  }
});

function retentionClient(options: {
  readonly pins: () => Promise<unknown>;
  readonly inventory: () => Promise<unknown>;
  readonly artifactRepository: ArtifactRepositoryAsyncPort;
  readonly artifactRepositoryRoot: string;
}) {
  return createLifecycleTestClient(retentionDeps(options));
}

function retentionDeps(options: {
  readonly pins: () => Promise<unknown>;
  readonly inventory: () => Promise<unknown>;
  readonly artifactRepository: ArtifactRepositoryAsyncPort;
  readonly artifactRepositoryRoot: string;
}): Pick<
  Deps,
  | "artifactRepository"
  | "artifactRepositoryRoot"
  | "releaseRetention"
> {
  return {
    artifactRepository: options.artifactRepository,
    artifactRepositoryRoot: options.artifactRepositoryRoot,
    releaseRetention: {
      pins: { read: options.pins },
      inventory: { read: options.inventory },
    },
  };
}

function mutateDigest(digest: string): string {
  const final = digest.at(-1) === "0" ? "1" : "0";
  return `${digest.slice(0, -1)}${final}`;
}

function must<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly E[] }): T {
  if (!result.ok) throw new Error(`retention fixture parse failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}

async function seedEvidence(
  artifactRepository: ArtifactRepositoryAsyncPort,
  artifactRepositoryRoot: string,
  bytes: Uint8Array,
) {
  const handle = createMechanicalEvidenceHandle(bytes);
  const result = await artifactRepository.publishEvidence({
    address: {
      repositoryRoot: artifactRepositoryRoot,
      namespace: ["mechanical-evidence", "sha256"],
      objectId: handle.digest,
    },
    bytes,
    maxBytes: Math.max(bytes.byteLength, 1),
  });
  if (result.kind !== "Published" && result.kind !== "ReadOnlyConverged") {
    throw new Error(`Failed to seed retention evidence: ${result.kind}`);
  }
  return handle;
}
