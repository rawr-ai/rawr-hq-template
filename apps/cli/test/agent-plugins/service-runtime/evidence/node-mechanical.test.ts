import { describe, expect, it } from "vitest";

import {
  createCompleteSetArtifactRef,
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
  parseProviderTarget,
  renderCompleteProjection,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";

import { createNodeMechanicalEvidenceRuntimeFromStore } from "../../../../src/lib/agent-plugins/service-runtime/evidence/node-mechanical";
import { CODEX_ADAPTER_PROTOCOL } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { productFixture } from "../providers/product-fixture";

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
