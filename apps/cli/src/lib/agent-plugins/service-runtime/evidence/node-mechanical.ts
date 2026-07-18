import {
  createMechanicalEvidenceHandle as createStoreHandle,
  type MechanicalEvidenceStore,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
import {
  createMechanicalEvidenceObservation,
  createProviderAcceptanceBinding,
  type MechanicalEvidenceReader as GovernanceEvidenceReader,
  type ProviderAcceptanceBinding,
} from "@rawr/agent-plugin-lifecycle/bindings/governance";
import {
  decodeMechanicalProviderEvidence,
  failure,
  issue,
  mechanicalTargetFactDigest,
  success,
  type MechanicalEvidenceDigest,
  type MechanicalEvidencePublisher,
  type MechanicalProviderEvidence,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";

import { createMechanicalEvidenceStore } from "../../bindings/output";
import type { ArtifactStoreRoot } from "../../layout";

export type NodeMechanicalEvidenceRuntime = Readonly<{
  provider: MechanicalEvidencePublisher;
  governance: GovernanceEvidenceReader;
}>;

export function createNodeMechanicalEvidenceRuntime(
  artifactStoreRoot: ArtifactStoreRoot,
): NodeMechanicalEvidenceRuntime {
  return createNodeMechanicalEvidenceRuntimeFromStore(
    createMechanicalEvidenceStore(artifactStoreRoot),
  );
}

export function createNodeMechanicalEvidenceRuntimeFromStore(
  store: MechanicalEvidenceStore,
): NodeMechanicalEvidenceRuntime {
  const provider: MechanicalEvidencePublisher = Object.freeze({
    async inspect(evidenceDigest: MechanicalEvidenceDigest) {
      const read = await store.read(storeHandle(evidenceDigest));
      if (read.kind === "Missing") return success(Object.freeze({ kind: "missing" }));
      if (read.kind === "Mismatch") {
        return failure([issue(
          "EVIDENCE_FAILED",
          "evidence.inspect",
          read.issues.map((entry) => entry.detail).join("; "),
        )]);
      }
      const decoded = decodeMechanicalProviderEvidence(read.bytes, evidenceDigest);
      if (!decoded.ok) return decoded;
      return success(Object.freeze({
        kind: "present",
        handle: providerHandle(evidenceDigest),
        bytes: new Uint8Array(read.bytes),
      }));
    },
    async publish(evidence: MechanicalProviderEvidence) {
      const verified = decodeMechanicalProviderEvidence(evidence.bytes, evidence.evidenceDigest);
      if (!verified.ok) return verified;
      const publication = await store.publish(createStoreHandle(evidence.bytes), evidence.bytes);
      if (publication.kind === "Published" || publication.kind === "ReadOnlyConverged") {
        return success(providerHandle(evidence.evidenceDigest));
      }
      return failure([issue(
        "EVIDENCE_FAILED",
        "evidence.publish",
        `${publication.failure}${publication.cleanupFailure === undefined ? "" : `; ${publication.cleanupFailure}`}`,
      )]);
    },
  });

  const governance: GovernanceEvidenceReader = Object.freeze({
    async read(handle: Parameters<GovernanceEvidenceReader["read"]>[0]) {
      const read = await store.read(storeHandle(handle.digest));
      if (read.kind === "Missing") {
        return Object.freeze({
          ok: false,
          failure: Object.freeze({ code: "MissingEvidence" as const, message: "Mechanical evidence is missing" }),
        });
      }
      if (read.kind === "Mismatch") {
        return Object.freeze({
          ok: false,
          failure: Object.freeze({
            code: "TamperedEvidence" as const,
            message: read.issues.map((entry) => entry.detail).join("; "),
          }),
        });
      }
      if (read.bytes.byteLength !== handle.byteLength) {
        return tampered("Mechanical evidence byte length differs from its governed handle");
      }
      const decoded = decodeMechanicalProviderEvidence(
        read.bytes,
        handle.digest as unknown as MechanicalEvidenceDigest,
      );
      if (!decoded.ok) return tampered(decoded.issues.map((entry) => entry.message).join("; "));
      return governanceObservation(handle, decoded.value);
    },
  });

  return Object.freeze({ provider, governance });
}

function governanceObservation(
  handle: Parameters<GovernanceEvidenceReader["read"]>[0],
  evidence: MechanicalProviderEvidence,
): Awaited<ReturnType<GovernanceEvidenceReader["read"]>> {
  if (evidence.body.source.kind !== "complete-test") {
    return tampered("Governed acceptance requires complete-set mechanical evidence");
  }
  const projections = uniqueProviderBindings(evidence);
  if (projections === null) {
    return tampered("Mechanical evidence binds several projections for one provider");
  }
  const created = createMechanicalEvidenceObservation({
    handle,
    releaseSetDigest: evidence.body.source.releaseSet.releaseSetDigest,
    projections,
    evaluationProfile: evidence.body.evaluationProfile,
    targets: evidence.body.targets.map((fact) => ({
      targetIdentity: fact.targetDigest,
      provider: fact.provider,
      projectionDigest: fact.projectionDigest,
      outcome: fact.kind === "verified" ? "passed" : "failed",
      factDigest: mechanicalTargetFactDigest(fact),
    })),
  });
  return created.ok
    ? Object.freeze({ ok: true, observation: created.value })
    : tampered(created.issues.map((entry) => entry.message).join("; "));
}

function uniqueProviderBindings(
  evidence: MechanicalProviderEvidence,
): readonly ProviderAcceptanceBinding[] | null {
  const byProvider = new Map<string, ProviderAcceptanceBinding>();
  for (const fact of evidence.body.targets) {
    const parsed = createProviderAcceptanceBinding({
      provider: fact.provider,
      projectionDigest: fact.projectionDigest,
      adapterProtocol: fact.adapterProtocol,
      capabilityProfileDigest: fact.capabilityProfileDigest,
    });
    if (!parsed.ok) return null;
    const candidate = parsed.value;
    const prior = byProvider.get(fact.provider);
    if (prior !== undefined && (
      prior.projectionDigest !== candidate.projectionDigest
      || prior.adapterProtocol !== candidate.adapterProtocol
      || prior.capabilityProfileDigest !== candidate.capabilityProfileDigest
    )) return null;
    byProvider.set(fact.provider, candidate);
  }
  return Object.freeze([...byProvider.values()].sort((left, right) =>
    left.provider < right.provider ? -1 : left.provider > right.provider ? 1 : 0));
}

function storeHandle(evidenceDigest: string): ReturnType<typeof createStoreHandle> {
  return Object.freeze({
    kind: "mechanical-evidence",
    protocolVersion: 1,
    digest: evidenceDigest,
  }) as ReturnType<typeof createStoreHandle>;
}

function providerHandle(evidenceDigest: MechanicalEvidenceDigest) {
  return Object.freeze({
    evidenceDigest,
    artifactIdentity: `mechanical-evidence:${evidenceDigest}`,
  });
}

function tampered(message: string): Awaited<ReturnType<GovernanceEvidenceReader["read"]>> {
  return Object.freeze({
    ok: false,
    failure: Object.freeze({ code: "TamperedEvidence" as const, message }),
  });
}
