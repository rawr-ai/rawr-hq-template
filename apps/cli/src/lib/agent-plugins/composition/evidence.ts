import type {
  MechanicalEvidenceHandleV1 as BuildEvidenceHandle,
  MechanicalEvidenceReader as BuildEvidenceReader,
  MechanicalEvidenceStore as BuildEvidenceStore,
} from "@rawr/agent-plugin-build";
import { parseMechanicalEvidenceHandle as parseBuildEvidenceHandle } from "@rawr/agent-plugin-build";
import {
  MECHANICAL_EVIDENCE_PROTOCOL,
  createMechanicalEvidenceObservation,
  createProviderAcceptanceBinding,
  type MechanicalEvidenceReadResult as PromotionEvidenceReadResult,
  type MechanicalEvidenceReader as PromotionEvidenceReader,
  type ProviderAcceptanceBinding,
} from "@rawr/agent-plugin-promotion";
import {
  decodeMechanicalProviderEvidence,
  mechanicalTargetFactDigest,
  parseMechanicalEvidenceDigest,
  type DeploymentResult,
  type MechanicalEvidenceDigest as ProviderEvidenceDigest,
  type MechanicalEvidenceHandle as ProviderEvidenceHandle,
  type MechanicalEvidencePublisher as ProviderEvidencePublisher,
  type MechanicalProviderEvidence,
  type ProviderDeploymentIssue,
  type ProviderVerificationFact,
} from "@rawr/agent-provider-deployment";

export function createProviderMechanicalEvidencePublisher(
  store: BuildEvidenceStore,
): ProviderEvidencePublisher {
  const adapter: ProviderEvidencePublisher = {
    async inspect(evidenceDigest) {
      const result = await store.read(buildHandle(evidenceDigest));
      if (result.kind === "Missing") return success({ kind: "missing" as const });
      if (result.kind === "Mismatch") {
        return providerFailure(result.issues.map((issue) => issue.detail).join("; "));
      }
      return success({
        kind: "present" as const,
        handle: providerHandle(evidenceDigest),
        bytes: result.bytes,
      });
    },
    async publish(evidence: MechanicalProviderEvidence) {
      const handle = buildHandle(evidence.evidenceDigest);
      const result = await store.publish(handle, evidence.bytes);
      if (result.kind === "Published" || result.kind === "ReadOnlyConverged") {
        return success(providerHandle(evidence.evidenceDigest));
      }
      return providerFailure(result.failure);
    },
  };
  return Object.freeze(adapter);
}

export function createPromotionMechanicalEvidenceReader(
  reader: BuildEvidenceReader,
): PromotionEvidenceReader {
  const adapter: PromotionEvidenceReader = {
    async read(handle): Promise<PromotionEvidenceReadResult> {
      const result = await reader.read(buildHandle(handle.digest));
      if (result.kind === "Missing") {
        return promotionFailure("MissingEvidence", "Immutable mechanical evidence is missing");
      }
      if (result.kind === "Mismatch") {
        return promotionFailure(
          "TamperedEvidence",
          result.issues.map((issue) => issue.detail).join("; "),
        );
      }
      if (result.bytes.byteLength !== handle.byteLength) {
        return promotionFailure("TamperedEvidence", "Evidence byte length differs from its governed handle");
      }
      const expectedDigest = parseMechanicalEvidenceDigest(handle.digest, "evidence.handle.digest");
      if (!expectedDigest.ok) {
        return promotionFailure("TamperedEvidence", "Evidence handle uses an invalid provider digest");
      }
      const decoded = decodeMechanicalProviderEvidence(result.bytes, expectedDigest.value);
      if (!decoded.ok) {
        return promotionFailure(
          "TamperedEvidence",
          decoded.issues.map((issue) => issue.message).join("; "),
        );
      }
      if (decoded.value.body.source.kind !== "complete-test") {
        return promotionFailure(
          "UnavailableEvidence",
          "Governed release-set acceptance requires complete-test evidence",
        );
      }
      const projections = promotionBindings(decoded.value.body.targets);
      if (typeof projections === "string") {
        return promotionFailure("TamperedEvidence", projections);
      }
      const observation = createMechanicalEvidenceObservation({
        handle: {
          protocol: MECHANICAL_EVIDENCE_PROTOCOL,
          digest: handle.digest,
          byteLength: handle.byteLength,
        },
        releaseSetDigest: decoded.value.body.source.releaseSet.releaseSetDigest,
        projections,
        evaluationProfile: decoded.value.body.evaluationProfile,
        targets: decoded.value.body.targets.map((fact) => ({
          targetIdentity: fact.targetDigest,
          provider: fact.provider,
          projectionDigest: fact.projectionDigest,
          outcome: fact.kind === "verified" ? "passed" : "failed",
          factDigest: mechanicalTargetFactDigest(fact),
        })),
      });
      return observation.ok
        ? { ok: true, observation: observation.value }
        : promotionFailure(
          "TamperedEvidence",
          observation.issues.map((issue) => issue.message).join("; "),
        );
    },
  };
  return Object.freeze(adapter);
}

function promotionBindings(
  facts: readonly ProviderVerificationFact[],
): readonly ProviderAcceptanceBinding[] | string {
  const byProvider = new Map<ProviderVerificationFact["provider"], ProviderAcceptanceBinding>();
  for (const fact of facts) {
    const parsed = createProviderAcceptanceBinding({
      provider: fact.provider,
      projectionDigest: fact.projectionDigest,
      adapterProtocol: fact.adapterProtocol,
      capabilityProfileDigest: fact.capabilityProfileDigest,
    });
    if (!parsed.ok) {
      return parsed.issues.map((issue) => issue.message).join("; ");
    }
    const next = parsed.value;
    const prior = byProvider.get(fact.provider);
    if (prior !== undefined && (
      prior.projectionDigest !== next.projectionDigest
      || prior.adapterProtocol !== next.adapterProtocol
      || prior.capabilityProfileDigest !== next.capabilityProfileDigest
    )) {
      return `Evidence contains inconsistent ${fact.provider} projection bindings`;
    }
    byProvider.set(fact.provider, next);
  }
  return Object.freeze([...byProvider.values()].sort((left, right) =>
    left.provider < right.provider ? -1 : left.provider > right.provider ? 1 : 0));
}

function buildHandle(digest: string): BuildEvidenceHandle {
  const parsed = parseBuildEvidenceHandle({ kind: "mechanical-evidence", protocolVersion: 1, digest });
  if (!parsed.ok) throw new Error(parsed.issue.detail);
  return parsed.value;
}

function providerHandle(digest: ProviderEvidenceDigest): ProviderEvidenceHandle {
  return Object.freeze({
    evidenceDigest: digest,
    artifactIdentity: `mechanical-evidence@v1:${digest}`,
  });
}

function success<T>(value: T): DeploymentResult<T> {
  return Object.freeze({ ok: true, value });
}

function providerFailure<T>(message: string): DeploymentResult<T> {
  const issue: ProviderDeploymentIssue = Object.freeze({
    code: "EVIDENCE_FAILED",
    path: "evidence",
    message,
    expected: "",
    actual: "",
  });
  const issues: readonly [ProviderDeploymentIssue] = Object.freeze([issue]);
  return Object.freeze({ ok: false, issues });
}

function promotionFailure(
  code: "MissingEvidence" | "TamperedEvidence" | "UnavailableEvidence",
  message: string,
): PromotionEvidenceReadResult {
  return Object.freeze({ ok: false, failure: Object.freeze({ code, message }) });
}
