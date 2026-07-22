import type { CompleteSetArtifactRef, ReleaseArtifactRef } from "../../../../shared/release";

import {
  canonicalBytes,
  canonicalDigest,
  compareCanonical,
  type CanonicalValue,
} from "../helpers/canonical";
import type { EvaluationProfile } from "./mode";
import { releaseRefValue, setRefValue } from "./mode";
import type {
  AdapterProtocol,
  CapabilityProfileDigest,
  ProjectionDigest,
} from "../policy/projection";
import type { ProviderDeploymentIssueCode } from "../errors/deployment-result";
import { failure, issue, success, type DeploymentResult } from "../errors/deployment-result";
import type { ProviderId, ProviderTargetDigest } from "./provider-target";

declare const evidenceDigestBrand: unique symbol;
declare const targetFactDigestBrand: unique symbol;

export type MechanicalEvidenceDigest = string & {
  readonly [evidenceDigestBrand]: "MechanicalEvidenceDigest";
};
export type MechanicalTargetFactDigest = string & {
  readonly [targetFactDigestBrand]: "MechanicalTargetFactDigest";
};

export const PROVIDER_EVIDENCE_SCHEMA_PROTOCOL = "agent-provider-evidence@v1" as const;
export const AGENT_PLUGIN_LIFECYCLE_CONTROLLER_PROTOCOL =
  "agent-plugin-lifecycle-controller@v1" as const;

export function parseMechanicalEvidenceDigest(
  input: unknown,
  path = "evidenceDigest"
): DeploymentResult<MechanicalEvidenceDigest> {
  return typeof input === "string" && /^me1_[0-9a-f]{64}$/u.test(input)
    ? success(input as MechanicalEvidenceDigest)
    : failure([issue("INVALID_DIGEST", path, "Mechanical evidence digest is invalid")]);
}

export type MechanicalEvidenceSource =
  | Readonly<{ kind: "targeted-test"; releases: readonly ReleaseArtifactRef[] }>
  | Readonly<{ kind: "complete-test"; releaseSet: CompleteSetArtifactRef }>;

export type ProviderVerificationFact =
  | Readonly<{
      kind: "verified";
      targetDigest: ProviderTargetDigest;
      provider: ProviderId;
      projectionDigest: ProjectionDigest;
      adapterProtocol: AdapterProtocol;
      capabilityProfileDigest: CapabilityProfileDigest;
      visibleFingerprint: string;
      payloadDigests: readonly string[];
    }>
  | Readonly<{
      kind: "failed";
      targetDigest: ProviderTargetDigest;
      provider: ProviderId;
      projectionDigest: ProjectionDigest;
      adapterProtocol: AdapterProtocol;
      capabilityProfileDigest: CapabilityProfileDigest;
      failureCodes: readonly ProviderDeploymentIssueCode[];
      payloadDigests: readonly string[];
    }>;

export interface MechanicalProviderEvidenceBody {
  readonly schemaVersion: 1;
  readonly schemaProtocol: typeof PROVIDER_EVIDENCE_SCHEMA_PROTOCOL;
  readonly controllerProtocol: typeof AGENT_PLUGIN_LIFECYCLE_CONTROLLER_PROTOCOL;
  readonly source: MechanicalEvidenceSource;
  readonly evaluationProfile: EvaluationProfile;
  readonly procedures: readonly string[];
  readonly targets: readonly ProviderVerificationFact[];
}

export interface MechanicalProviderEvidence {
  readonly schemaVersion: 1;
  readonly evidenceDigest: MechanicalEvidenceDigest;
  readonly body: MechanicalProviderEvidenceBody;
  readonly bytes: Uint8Array;
}

export function createMechanicalProviderEvidence(
  source: MechanicalEvidenceSource,
  evaluationProfile: EvaluationProfile,
  facts: readonly ProviderVerificationFact[]
): MechanicalProviderEvidence {
  const targets = [...facts]
    .map(freezeFact)
    .sort((left, right) => compareCanonical(left.targetDigest, right.targetDigest));
  const body = Object.freeze({
    schemaVersion: 1,
    schemaProtocol: PROVIDER_EVIDENCE_SCHEMA_PROTOCOL,
    controllerProtocol: AGENT_PLUGIN_LIFECYCLE_CONTROLLER_PROTOCOL,
    source,
    evaluationProfile,
    procedures: Object.freeze([
      "inspect-provider-capabilities",
      "inventory-native-visible-state",
      "verify-projection-members-skills-hooks-enablement",
      "verify-target-receipt-final-state",
    ]),
    targets: Object.freeze(targets),
  });
  const bodyValue = evidenceBodyValue(body);
  const bytes = canonicalBytes(bodyValue);
  const evidenceDigest = canonicalDigest("me1_", bodyValue) as MechanicalEvidenceDigest;
  return Object.freeze({ schemaVersion: 1, evidenceDigest, body, bytes });
}

export function evidenceBodyValue(body: MechanicalProviderEvidenceBody): CanonicalValue {
  return {
    schemaVersion: body.schemaVersion,
    schemaProtocol: body.schemaProtocol,
    controllerProtocol: body.controllerProtocol,
    source:
      body.source.kind === "targeted-test"
        ? { kind: body.source.kind, releases: body.source.releases.map(releaseRefValue) }
        : { kind: body.source.kind, releaseSet: setRefValue(body.source.releaseSet) },
    evaluationProfile: body.evaluationProfile,
    procedures: body.procedures,
    targets: body.targets.map(factValue),
  };
}

export function mechanicalTargetFactDigest(
  fact: ProviderVerificationFact
): MechanicalTargetFactDigest {
  return canonicalDigest("mtf1_", factValue(fact)) as MechanicalTargetFactDigest;
}

function factValue(fact: ProviderVerificationFact): CanonicalValue {
  const common = {
    targetDigest: fact.targetDigest,
    provider: fact.provider,
    projectionDigest: fact.projectionDigest,
    adapterProtocol: fact.adapterProtocol,
    capabilityProfileDigest: fact.capabilityProfileDigest,
    payloadDigests: fact.payloadDigests,
  };
  return fact.kind === "verified"
    ? { kind: fact.kind, ...common, visibleFingerprint: fact.visibleFingerprint }
    : { kind: fact.kind, ...common, failureCodes: fact.failureCodes };
}

function freezeFact(fact: ProviderVerificationFact): ProviderVerificationFact {
  return fact.kind === "verified"
    ? Object.freeze({
        ...fact,
        payloadDigests: Object.freeze([...fact.payloadDigests].sort(compareCanonical)),
      })
    : Object.freeze({
        ...fact,
        failureCodes: Object.freeze([...new Set(fact.failureCodes)].sort(compareCanonical)),
        payloadDigests: Object.freeze([...fact.payloadDigests].sort(compareCanonical)),
      });
}
