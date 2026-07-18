import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createReleaseArtifactRef,
  parseArtifactDigest,
  type ArtifactRef,
  type MechanicalEvidenceReader,
  type ReleaseArtifactRef,
  type VerifiedArtifactSnapshotV1,
} from "@rawr/agent-plugin-lifecycle/release";
import type {
  ArtifactReader,
  ArtifactStore,
  ReleaseLifecycleRuntime,
} from "@rawr/agent-plugin-lifecycle/ports/releases";

import {
  createLifecycleTestClient,
  testInvocation,
} from "../../../../../../services/agent-plugin-lifecycle/test/support/client";
import {
  createArtifactRepositoryReader,
  createArtifactRepositoryStore,
} from "../../../../src/lib/agent-plugins/bindings/output/artifact-repository";
import type { ArtifactStoreRoot } from "../../../../src/lib/agent-plugins/layout";
import {
  createGitContentWorkspaceSnapshotReader,
  createMechanicalEvidenceHandle,
} from "../../../../src/lib/agent-plugins/service-runtime/releases";
import {
  GIT_EXECUTABLE,
  createGeneratedGitRepository,
} from "./fixtures/git-repository";
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
        artifacts: built.reader,
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
        artifacts: built.reader,
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
        artifacts: built.reader,
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
        artifacts: built.reader,
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
      const secondDigest = must(parseArtifactDigest(mutateDigest(built.memberRef.artifactDigest)));
      const secondRef = createReleaseArtifactRef(built.memberRef.releaseDigest, secondDigest);
      const acceptingReader: ArtifactReader = {
        async read(ref) {
          return { kind: "Verified", snapshot: snapshotFor(ref, verified.snapshot) };
        },
      };
      const client = retentionClient({
        pins: async () => ({ schemaVersion: 1, refs: [] }),
        inventory: async () => [
          { ref: built.memberRef, storedBytes: 0 },
          { ref: secondRef, storedBytes: Number.MAX_SAFE_INTEGER },
          { ref: built.setRef, storedBytes: 1 },
        ],
        artifacts: acceptingReader,
      });

      await expect(client.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
        kind: "RetentionPlan",
        retained: [{ ref: built.memberRef, storedBytes: 0 }],
        blockedEntries: [{ detail: expect.stringContaining("overflows") }],
      });
    },
  );

  it("pins governed mechanical evidence only through its opaque reader", async () => {
    const bytes = new TextEncoder().encode("governed evidence bytes\n");
    const handle = createMechanicalEvidenceHandle(bytes);
    const artifacts: ArtifactReader = {
      async read() {
        throw new Error("release artifact reader must not receive an evidence handle");
      },
    };
    const evidence: MechanicalEvidenceReader = {
      async read(requested) {
        return { kind: "Verified", handle: requested, bytes };
      },
    };
    const client = retentionClient({
      pins: async () => ({ schemaVersion: 1, refs: [handle] }),
      inventory: async () => [{ ref: handle, storedBytes: bytes.byteLength }],
      artifacts,
      evidence,
    });

    await expect(client.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
      kind: "RetentionPlan",
      pinned: [handle],
      retained: [],
      collectible: [],
    });

    const unavailable = retentionClient({
      pins: async () => ({ schemaVersion: 1, refs: [handle] }),
      inventory: async () => [],
      artifacts,
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
      const verified = await built.reader.read(built.memberRef);
      expect(verified.kind).toBe("Verified");
      if (verified.kind !== "Verified") return;
      const largest = fixedReleaseRef(built.memberRef, "3");
      const tieFirst = fixedReleaseRef(built.memberRef, "1");
      const tieSecond = fixedReleaseRef(built.memberRef, "2");
      const smallest = fixedReleaseRef(built.memberRef, "4");
      const acceptingReader: ArtifactReader = {
        async read(ref) {
          return { kind: "Verified", snapshot: snapshotFor(ref, verified.snapshot) };
        },
      };
      const client = retentionClient({
        pins: async () => ({ schemaVersion: 1, refs: [] }),
        inventory: async () => [
          { ref: smallest, storedBytes: 10 },
          { ref: tieSecond, storedBytes: 30 },
          { ref: largest, storedBytes: 50 },
          { ref: tieFirst, storedBytes: 30 },
        ],
        artifacts: acceptingReader,
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
    let artifactReads = 0;
    const artifacts: ArtifactReader = {
      async read() {
        artifactReads += 1;
        throw new Error("artifact reader must remain unused");
      },
    };
    const absent = createLifecycleTestClient({
      releases: {
        source: unavailableSource(),
        artifacts: readOnlyArtifactStore(artifacts),
      },
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
      artifacts,
    });
    await expect(throwing.releases.planRetention(zeroBudget, testInvocation)).resolves.toMatchObject({
      kind: "BlockedPinnedGraph",
      issues: [{ detail: expect.stringContaining("pin reader exploded") }],
    });
    expect(artifactReads).toBe(0);
  });

  it("rejects injected retention authority before any runtime reader call", async () => {
    let reads = 0;
    const client = retentionClient({
      pins: async () => {
        reads += 1;
        return { schemaVersion: 1, refs: [] };
      },
      inventory: async () => {
        reads += 1;
        return [];
      },
      artifacts: {
        async read() {
          reads += 1;
          throw new Error("artifact reader must remain unused");
        },
      },
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
    const source = await createGitContentWorkspaceSnapshotReader({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
    const client = createLifecycleTestClient({ releases: {
      source,
      artifacts: createArtifactRepositoryStore(root),
    } });
    const result = await client.releases.build({
      contentWorkspace: repository.policy,
      mode: { kind: "complete-set" },
    }, testInvocation);
    expect(result.kind, JSON.stringify(result)).toBe("Published");
    if (result.kind !== "Published" || result.ref.kind !== "complete-set") {
      throw new Error("complete generated fixture did not publish");
    }
    const reader = createArtifactRepositoryReader(root);
    const set = await reader.read(result.ref);
    if (set.kind !== "Verified" || set.snapshot.kind !== "complete-set") {
      throw new Error("complete generated fixture did not verify");
    }
    return {
      reader,
      setRef: result.ref,
      memberRef: set.snapshot.members[0]!.ref,
    };
  }
});

function retentionClient(options: {
  readonly pins: () => Promise<unknown>;
  readonly inventory: () => Promise<unknown>;
  readonly artifacts: ArtifactReader;
  readonly evidence?: MechanicalEvidenceReader;
}) {
  return createLifecycleTestClient({
    releases: retentionRuntime(options),
  });
}

function retentionRuntime(options: {
  readonly pins: () => Promise<unknown>;
  readonly inventory: () => Promise<unknown>;
  readonly artifacts: ArtifactReader;
  readonly evidence?: MechanicalEvidenceReader;
}): ReleaseLifecycleRuntime {
  return {
    source: unavailableSource(),
    artifacts: readOnlyArtifactStore(options.artifacts),
    ...(options.evidence === undefined ? {} : { evidence: options.evidence }),
    retention: {
      pins: { read: options.pins },
      inventory: { read: options.inventory },
    },
  };
}

function unavailableSource(): ReleaseLifecycleRuntime["source"] {
  return {
    inspect: async () => unavailableAsync("retention source inspection"),
    revalidate: async () => unavailableAsync("retention source revalidation"),
  };
}

function readOnlyArtifactStore(reader: ArtifactReader): ArtifactStore {
  return {
    read: async (ref) => await reader.read(ref),
    publishRelease: async () => unavailableAsync("retention release publication"),
    publishReleaseSet: async () => unavailableAsync("retention release-set publication"),
  };
}

function fixedReleaseRef(source: ReleaseArtifactRef, fill: string): ReleaseArtifactRef {
  const digest = must(parseArtifactDigest(`ad1_${fill.repeat(64)}`));
  return createReleaseArtifactRef(source.releaseDigest, digest);
}

function mutateDigest(digest: string): string {
  const final = digest.at(-1) === "0" ? "1" : "0";
  return `${digest.slice(0, -1)}${final}`;
}

function snapshotFor(ref: ArtifactRef, source: VerifiedArtifactSnapshotV1): VerifiedArtifactSnapshotV1 {
  if (ref.kind === "release" && source.kind === "release") return { ...source, ref };
  return source;
}

function must<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly E[] }): T {
  if (!result.ok) throw new Error(`retention fixture parse failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}

async function unavailableAsync(label: string): Promise<never> {
  throw new Error(`Unexpected ${label} access`);
}
