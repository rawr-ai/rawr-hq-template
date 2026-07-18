import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCompleteSetArtifactRef,
  createMechanicalEvidenceHandle as createReleaseMechanicalEvidenceHandle,
  createReleaseArtifactRef,
  mechanicalEvidenceDigest,
  payloadEntryBytes,
  type MechanicalEvidenceHandleV1,
  type MechanicalEvidenceReadResult,
  type MechanicalEvidenceStore,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  createMechanicalProviderEvidence,
  mechanicalTargetFactDigest,
  parseProviderTarget,
  renderCompleteProjection,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import {
  createMechanicalEvidenceObservation,
  createProviderAcceptanceBinding,
} from "@rawr/agent-plugin-lifecycle/bindings/governance";

import {
  createNodeMechanicalEvidenceRuntime,
  createNodeMechanicalEvidenceRuntimeFromStore,
} from "../../../../src/lib/agent-plugins/service-runtime/evidence/node-mechanical";
import { createMechanicalEvidenceReader } from "../../../../src/lib/agent-plugins/bindings/output";
import { deriveAgentPluginControllerLayout } from "../../../../src/lib/agent-plugins/layout";
import { CODEX_ADAPTER_PROTOCOL } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { productFixture } from "../providers/product-fixture";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
} from "../releases/owned-fixture-root";

describe("node mechanical evidence runtime", () => {
  it("shares one immutable evidence object across provider publication and governance reads", async () => {
    const store = new MemoryEvidenceStore();
    const runtime = createNodeMechanicalEvidenceRuntimeFromStore(store);
    const evidence = completeEvidence();

    expect((await runtime.provider.publish(evidence)).ok).toBe(true);
    expect((await runtime.provider.publish(evidence)).ok).toBe(true);
    expect(store.publicationWrites).toBe(1);

    const inspected = await runtime.provider.inspect(evidence.evidenceDigest);
    expect(inspected.ok && inspected.value.kind).toBe("present");
    const governed = await runtime.governance.read({
      protocol: "agent-plugin-mechanical-evidence/v1",
      digest: evidence.evidenceDigest as never,
      byteLength: evidence.bytes.byteLength,
    });
    expect(governed.ok && governed.observation.targets).toHaveLength(1);
  });

  it("reports changed bytes as tampered rather than translating them into acceptance", async () => {
    const store = new MemoryEvidenceStore();
    const runtime = createNodeMechanicalEvidenceRuntimeFromStore(store);
    const evidence = completeEvidence();
    await runtime.provider.publish(evidence);
    store.replace(evidence.evidenceDigest, new TextEncoder().encode("changed\n"));

    const result = await runtime.governance.read({
      protocol: "agent-plugin-mechanical-evidence/v1",
      digest: evidence.evidenceDigest as never,
      byteLength: evidence.bytes.byteLength,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.failure.code).toBe("TamperedEvidence");
  });

  it("converges through the selected filesystem provider without changing repository state", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const layout = deriveAgentPluginControllerLayout({ dataRoot: fixture.path });
      const runtime = createNodeMechanicalEvidenceRuntime(layout.artifactStoreRoot);
      const reader = createMechanicalEvidenceReader(layout.artifactStoreRoot);
      const evidence = completeEvidence();

      const published = await runtime.provider.publish(evidence);
      if (!published.ok) throw new Error(published.issues.map((entry) => entry.message).join("; "));
      expect(published).toMatchObject({ ok: true });
      const releaseHandle = createReleaseMechanicalEvidenceHandle(evidence.bytes);
      const evidenceDirectory = join(
        layout.artifactStoreRoot,
        "mechanical-evidence",
        "sha256",
        releaseHandle.digest,
      );
      const evidencePath = join(evidenceDirectory, "evidence.json");
      const before = await lstat(evidencePath, { bigint: true });
      const beforeBytes = await readFile(evidencePath);
      const beforeInventory = await readdir(join(evidenceDirectory, ".."));

      const standalone = await reader.read(releaseHandle);
      expect(standalone.kind).toBe("Verified");
      if (standalone.kind !== "Verified") throw new Error("published evidence did not verify");
      expect(standalone.bytes).toEqual(evidence.bytes);

      if (evidence.body.source.kind !== "complete-test") {
        throw new Error("fixture must describe complete-set evidence");
      }
      const target = evidence.body.targets[0];
      if (target === undefined) throw new Error("fixture must describe one provider target");
      const binding = createProviderAcceptanceBinding({
        provider: target.provider,
        projectionDigest: target.projectionDigest,
        adapterProtocol: target.adapterProtocol,
        capabilityProfileDigest: target.capabilityProfileDigest,
      });
      if (!binding.ok) throw new Error(binding.issues.map((entry) => entry.message).join("; "));
      const observation = createMechanicalEvidenceObservation({
        handle: {
          protocol: "agent-plugin-mechanical-evidence/v1",
          digest: evidence.evidenceDigest,
          byteLength: evidence.bytes.byteLength,
        },
        releaseSetDigest: evidence.body.source.releaseSet.releaseSetDigest,
        projections: [binding.value],
        evaluationProfile: evidence.body.evaluationProfile,
        targets: [{
          targetIdentity: target.targetDigest,
          provider: target.provider,
          projectionDigest: target.projectionDigest,
          outcome: target.kind === "verified" ? "passed" : "failed",
          factDigest: mechanicalTargetFactDigest(target),
        }],
      });
      if (!observation.ok) throw new Error(observation.issues.map((entry) => entry.message).join("; "));
      expect(observation).toMatchObject({ ok: true });
      const governed = await runtime.governance.read(observation.value.handle);
      expect(governed.ok).toBe(true);
      if (!governed.ok) throw new Error(governed.failure.message);
      expect(governed.observation.targets).toHaveLength(1);

      expect((await runtime.provider.publish(evidence)).ok).toBe(true);
      const after = await lstat(evidencePath, { bigint: true });
      expect(await readFile(evidencePath)).toEqual(beforeBytes);
      expect(await readdir(join(evidenceDirectory, ".."))).toEqual(beforeInventory);
      expect({ ino: after.ino, mode: after.mode, mtimeNs: after.mtimeNs }).toEqual({
        ino: before.ino,
        mode: before.mode,
        mtimeNs: before.mtimeNs,
      });
    } finally {
      await removeOwnedFixtureRoot(fixture);
    }
  });
});

class MemoryEvidenceStore implements MechanicalEvidenceStore {
  readonly #bytes = new Map<string, Uint8Array>();
  publicationWrites = 0;

  async read(handle: MechanicalEvidenceHandleV1): Promise<MechanicalEvidenceReadResult> {
    const bytes = this.#bytes.get(handle.digest);
    if (bytes === undefined) return { kind: "Missing", handle };
    if (mechanicalEvidenceDigest(bytes) !== handle.digest) {
      return {
        kind: "Mismatch",
        handle,
        issues: [{ code: "DigestMismatch", detail: "stored bytes changed" }],
      };
    }
    return { kind: "Verified", handle, bytes: new Uint8Array(bytes) };
  }

  async publish(handle: MechanicalEvidenceHandleV1, bytes: Uint8Array) {
    const prior = this.#bytes.get(handle.digest);
    if (prior !== undefined) return { kind: "ReadOnlyConverged" as const, handle };
    this.#bytes.set(handle.digest, new Uint8Array(bytes));
    this.publicationWrites += 1;
    return { kind: "Published" as const, handle };
  }

  replace(digest: string, bytes: Uint8Array): void {
    this.#bytes.set(digest, new Uint8Array(bytes));
  }
}

function completeEvidence() {
  const fixture = productFixture();
  const members: VerifiedReleaseArtifactV1[] = [fixture.alphaRelease, fixture.betaRelease].map((release) => ({
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  }));
  const projection = renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members,
  });
  if (!projection.ok) throw new Error(projection.issues[0].message);
  const target = parseProviderTarget({ provider: "codex", home: "/tmp/codex-home" });
  if (!target.ok) throw new Error(target.issues[0].message);
  return createMechanicalProviderEvidence(
    { kind: "complete-test", releaseSet: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest) },
    "complete-default" as never,
    [{
      kind: "verified",
      targetDigest: target.value.targetDigest,
      provider: "codex",
      projectionDigest: projection.value.projectionDigest,
      adapterProtocol: projection.value.adapterProtocol,
      capabilityProfileDigest: projection.value.capabilityProfile.capabilityProfileDigest,
      visibleFingerprint: "vf1_" + "1".repeat(64),
      payloadDigests: projection.value.members.map((member) => member.releaseRef.artifactDigest),
    }],
  );
}
