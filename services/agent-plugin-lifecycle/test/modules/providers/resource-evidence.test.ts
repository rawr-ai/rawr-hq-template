import { describe, expect, it } from "vitest";
import {
  AGENT_PLUGIN_LIFECYCLE_CONTROLLER_PROTOCOL,
  createMechanicalProviderEvidence,
} from "../../../src/service/modules/providers/model/dto/mechanical-evidence";
import { normalizeCompleteTestRequest } from "../../../src/service/modules/providers/model/dto/mode";
import { decodeMechanicalProviderEvidence } from "../../../src/service/modules/providers/model/helpers/evidence-codec";
import { renderCompleteProjection } from "../../../src/service/modules/providers/model/policy/projection";
import { CODEX_ADAPTER_PROTOCOL } from "../../../src/service/modules/providers/repository/codex";
import { createResourceMechanicalEvidencePublisher } from "../../../src/service/modules/providers/repository/resource-evidence";
import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  type MechanicalEvidenceHandleV1,
  type MechanicalEvidenceReadResult,
  type MechanicalEvidenceStore,
  mechanicalEvidenceDigest,
  payloadEntryBytes,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import { productFixture } from "../../shared/release/fixtures";

describe("provider mechanical evidence resource projection", () => {
  it("publishes one immutable evidence object idempotently", async () => {
    const store = new MemoryEvidenceStore();
    const publisher = createResourceMechanicalEvidencePublisher(store);
    const evidence = completeEvidence();

    expect((await publisher.publish(evidence)).ok).toBe(true);
    expect((await publisher.publish(evidence)).ok).toBe(true);
    expect(store.publicationWrites).toBe(1);

    const inspected = await publisher.inspect(evidence.evidenceDigest);
    expect(inspected.ok && inspected.value.kind).toBe("present");
  });

  it("binds evidence to the lifecycle controller protocol", () => {
    const evidence = completeEvidence();

    expect(evidence.body.controllerProtocol).toBe(AGENT_PLUGIN_LIFECYCLE_CONTROLLER_PROTOCOL);
    expect(new TextDecoder().decode(evidence.bytes)).toContain(
      '"controllerProtocol":"agent-plugin-lifecycle-controller@v1"'
    );
  });

  it("rejects canonical evidence from the retired controller protocol", () => {
    const evidence = completeEvidence();
    const legacyBytes = new TextEncoder().encode(
      new TextDecoder()
        .decode(evidence.bytes)
        .replace(AGENT_PLUGIN_LIFECYCLE_CONTROLLER_PROTOCOL, "rawr-controller-capsule@v1")
    );

    const decoded = decodeMechanicalProviderEvidence(legacyBytes);

    expect(decoded.ok).toBe(false);
    expect(!decoded.ok && decoded.issues[0]?.code).toBe("INVALID_PROTOCOL");
  });

  it("maps stored-byte mismatch to EVIDENCE_FAILED", async () => {
    const store = new MemoryEvidenceStore();
    const publisher = createResourceMechanicalEvidencePublisher(store);
    const evidence = completeEvidence();
    await publisher.publish(evidence);
    store.replace(evidence.evidenceDigest, new TextEncoder().encode("changed\n"));

    const result = await publisher.inspect(evidence.evidenceDigest);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues[0]?.code).toBe("EVIDENCE_FAILED");
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
    if (this.#bytes.has(handle.digest)) {
      return { kind: "ReadOnlyConverged" as const, handle };
    }
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
  const members: VerifiedReleaseArtifactV1[] = [fixture.alphaRelease, fixture.betaRelease].map(
    (release) => ({
      kind: "release",
      ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
      release,
      files: release.artifactBody.payloadEntries.map((entry) => ({
        path: entry.path,
        mode: entry.mode,
        contentDigest: entry.contentDigest,
        bytes: payloadEntryBytes(entry),
      })),
    })
  );
  const releaseSet = createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest);
  const projection = renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, {
    kind: "complete-set",
    ref: releaseSet,
    releaseSet: fixture.releaseSet,
    members,
  });
  if (!projection.ok) throw new Error(projection.issues[0].message);
  const request = normalizeCompleteTestRequest({
    kind: "complete-test",
    releaseSet,
    evaluationProfile: "complete-default",
    targets: [{ provider: "codex", home: "/tmp/codex-home" }],
  });
  if (!request.ok) throw new Error(request.issues[0].message);
  const target = request.value.targets[0];
  if (target === undefined) throw new Error("complete-test fixture lost its target");
  return createMechanicalProviderEvidence(
    { kind: "complete-test", releaseSet },
    request.value.evaluationProfile,
    [
      {
        kind: "verified",
        targetDigest: target.targetDigest,
        provider: "codex",
        projectionDigest: projection.value.projectionDigest,
        adapterProtocol: projection.value.adapterProtocol,
        capabilityProfileDigest: projection.value.capabilityProfile.capabilityProfileDigest,
        visibleFingerprint: `vf1_${"1".repeat(64)}`,
        payloadDigests: projection.value.members.map((member) => member.releaseRef.artifactDigest),
      },
    ]
  );
}
