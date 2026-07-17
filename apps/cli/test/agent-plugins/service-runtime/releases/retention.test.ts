import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createReleaseArtifactRef,
  parseArtifactDigest,
  type ArtifactRef,
  type VerifiedArtifactSnapshotV1,
} from "@rawr/agent-plugin-lifecycle/release";
import type { ArtifactReader } from "@rawr/agent-plugin-lifecycle/ports/releases";

import { createReleaseLifecycleApplications } from "../../../../../../services/agent-plugin-lifecycle/src/service/modules/releases/internal/application";
import {
  createFilesystemArtifactReader,
  type ArtifactStoreRoot,
} from "../../../../src/lib/agent-plugins/service-runtime/releases/artifact-store/artifact-reader";
import { createFilesystemArtifactStore } from "../../../../src/lib/agent-plugins/service-runtime/releases/artifact-store/filesystem-store";
import {
  createGitContentWorkspaceSnapshotReader,
  createMechanicalEvidenceHandle,
} from "../../../../src/lib/agent-plugins/service-runtime/releases";
import {
  createRetentionPlanner,
  parseRetentionPinsV1,
} from "../../../../../../services/agent-plugin-lifecycle/src/service/modules/releases/internal/retention";
import {
  GIT_EXECUTABLE,
  createGeneratedGitRepository,
} from "./fixtures/git-repository";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./owned-fixture-root";

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
      const planner = createRetentionPlanner({
        pins: { async read() { return { schemaVersion: 1, refs: [built.setRef] }; } },
        inventory: { async read() { return [{ ref: built.memberRef, storedBytes: 20 }]; } },
        artifacts: built.reader,
      });
      const result = await planner.plan({ kind: "space-v1", maximumUnpinnedBytes: 0 });
      expect(result).toMatchObject({
        kind: "RetentionPlan",
        pinned: expect.arrayContaining([built.setRef, built.memberRef]),
        retained: [],
        collectible: [],
      });
      expect("delete" in planner).toBe(false);
    },
  );

  it.runIf("Bun" in globalThis)(
    "blocks bare, missing, and over-count pin graphs",
    async () => {
      const built = await buildCompleteSet();
      expect(parseRetentionPinsV1({ schemaVersion: 1, refs: [built.memberRef.artifactDigest] })).toMatchObject({ ok: false });
      expect(parseRetentionPinsV1({
        schemaVersion: 1,
        refs: Array.from({ length: 16_385 }, () => built.memberRef),
      })).toMatchObject({ ok: false });

      const missingDigest = must(parseArtifactDigest(mutateDigest(built.memberRef.artifactDigest)));
      const missingRef = createReleaseArtifactRef(built.memberRef.releaseDigest, missingDigest);
      const planner = createRetentionPlanner({
        pins: { async read() { return { schemaVersion: 1, refs: [missingRef] }; } },
        inventory: { async read() { return []; } },
        artifacts: built.reader,
      });
      await expect(planner.plan({ kind: "space-v1", maximumUnpinnedBytes: 0 })).resolves.toMatchObject({
        kind: "BlockedPinnedGraph",
        issues: [{ ref: missingRef }],
      });
    },
  );

  it.runIf("Bun" in globalThis)(
    "retains zero-byte entries and reports aggregate overflow without exposing deletion",
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
      const planner = createRetentionPlanner({
        pins: { async read() { return { schemaVersion: 1, refs: [] }; } },
        inventory: {
          async read() {
            return [
              { ref: built.memberRef, storedBytes: 0 },
              { ref: secondRef, storedBytes: Number.MAX_SAFE_INTEGER },
              { ref: built.setRef, storedBytes: 1 },
            ];
          },
        },
        artifacts: acceptingReader,
      });
      const result = await planner.plan({ kind: "space-v1", maximumUnpinnedBytes: 0 });
      expect(result).toMatchObject({
        kind: "RetentionPlan",
        retained: [{ ref: built.memberRef, storedBytes: 0 }],
        blockedEntries: [{ detail: expect.stringContaining("overflows") }],
      });
      expect("delete" in planner).toBe(false);
    },
  );

  it("pins governed mechanical evidence through the artifact owner's opaque reader", async () => {
    const bytes = new TextEncoder().encode("governed evidence bytes\n");
    const handle = createMechanicalEvidenceHandle(bytes);
    const artifacts: ArtifactReader = {
      async read() {
        throw new Error("release artifact reader must not receive an evidence handle");
      },
    };
    const planner = createRetentionPlanner({
      pins: { async read() { return { schemaVersion: 1, refs: [handle] }; } },
      inventory: { async read() { return [{ ref: handle, storedBytes: bytes.byteLength }]; } },
      artifacts,
      evidence: {
        async read(requested) {
          return { kind: "Verified", handle: requested, bytes };
        },
      },
    });

    await expect(planner.plan({ kind: "space-v1", maximumUnpinnedBytes: 0 })).resolves.toMatchObject({
      kind: "RetentionPlan",
      pinned: [handle],
      retained: [],
      collectible: [],
    });
    const unavailable = createRetentionPlanner({
      pins: { async read() { return { schemaVersion: 1, refs: [handle] }; } },
      inventory: { async read() { return []; } },
      artifacts,
    });
    await expect(unavailable.plan({ kind: "space-v1", maximumUnpinnedBytes: 0 })).resolves.toMatchObject({
      kind: "BlockedPinnedGraph",
      issues: [{ ref: handle, detail: expect.stringContaining("missing") }],
    });
  });

  async function buildCompleteSet() {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const root = join(fixture.path, "artifacts-v1") as ArtifactStoreRoot;
    const source = await createGitContentWorkspaceSnapshotReader({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
    const applications = createReleaseLifecycleApplications({
      source,
      artifacts: createFilesystemArtifactStore({ artifactStoreRoot: root }),
    });
    const result = await applications.build({
      contentWorkspace: repository.policy,
      mode: { kind: "complete-set" },
    });
    expect(result.kind, JSON.stringify(result)).toBe("Published");
    if (result.kind !== "Published" || result.ref.kind !== "complete-set") {
      throw new Error("complete generated fixture did not publish");
    }
    const reader = createFilesystemArtifactReader(root);
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
