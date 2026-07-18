import type { CanonicalJsonValue } from "../helpers/canonical";
import { failures, success, type PromotionIssue, type PromotionResult } from "../errors/promotion-result";
import { boundedArray, collect, exactRecord, parseBoundedInteger, reportDuplicateOrOrder } from "../helpers/schema";
import {
  MAX_BINDINGS,
  MAX_MECHANICAL_EVIDENCE_BYTES,
  MECHANICAL_EVIDENCE_PROTOCOL,
  canonicalBindingKey,
  parseCanonicalId,
  parseCapabilityDigest,
  parseMechanicalEvidenceDigest,
  parseMechanicalTargetFactDigest,
  parseProjectionDigest,
  parseReleaseSet,
  parseTargetDigest,
  sortCanonical,
  type CanonicalId,
  type CapabilityProfileDigest,
  type MechanicalEvidenceDigest,
  type MechanicalTargetFactDigest,
  type ProviderProjectionDigest,
  type ReleaseSetDigest,
  type TargetIdentityDigest,
} from "./primitives";

declare const mechanicalEvidenceObservationBrand: unique symbol;

export type ProviderIdentity = "codex" | "claude";

export interface ProviderAcceptanceBinding {
  readonly provider: ProviderIdentity;
  readonly projectionDigest: ProviderProjectionDigest;
  readonly adapterProtocol: CanonicalId;
  readonly capabilityProfileDigest: CapabilityProfileDigest;
}

export interface MechanicalEvidenceHandle {
  readonly protocol: typeof MECHANICAL_EVIDENCE_PROTOCOL;
  readonly digest: MechanicalEvidenceDigest;
  readonly byteLength: number;
}

export type MechanicalEvaluationOutcome = "passed" | "failed";

export interface MechanicalTargetFact {
  readonly targetIdentity: TargetIdentityDigest;
  readonly provider: ProviderIdentity;
  readonly projectionDigest: ProviderProjectionDigest;
  readonly outcome: MechanicalEvaluationOutcome;
  readonly factDigest: MechanicalTargetFactDigest;
}

export type MechanicalEvidenceObservation = Readonly<{
  handle: MechanicalEvidenceHandle;
  releaseSetDigest: ReleaseSetDigest;
  projections: readonly ProviderAcceptanceBinding[];
  evaluationProfile: CanonicalId;
  targets: readonly MechanicalTargetFact[];
  [mechanicalEvidenceObservationBrand]: "MechanicalEvidenceObservation";
}>;

export function createProviderAcceptanceBinding(input: unknown): PromotionResult<ProviderAcceptanceBinding> {
  return parseProviderAcceptanceBinding(input, "projection");
}

export function createMechanicalEvidenceHandle(input: unknown): PromotionResult<MechanicalEvidenceHandle> {
  return parseMechanicalEvidenceHandle(input, "evidenceHandle");
}

export function createMechanicalEvidenceObservation(
  input: unknown,
): PromotionResult<MechanicalEvidenceObservation> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(
    input,
    ["evaluationProfile", "handle", "projections", "releaseSetDigest", "targets"],
    "evidenceObservation",
    issues,
  );
  if (record === undefined) return failures(issues);
  const handle = collect(parseMechanicalEvidenceHandle(record.handle, "evidenceObservation.handle"), issues);
  const releaseSetDigest = collect(parseReleaseSet(record.releaseSetDigest, "evidenceObservation.releaseSetDigest"), issues);
  const projections = parseProviderBindings(record.projections, "evidenceObservation.projections", issues, true);
  const evaluationProfile = collect(parseCanonicalId(record.evaluationProfile, "evidenceObservation.evaluationProfile"), issues);
  const targets = parseTargetFacts(record.targets, "evidenceObservation.targets", issues);
  if (
    issues.length > 0
    || handle === undefined
    || releaseSetDigest === undefined
    || projections === undefined
    || evaluationProfile === undefined
    || targets === undefined
  ) {
    return failures(issues);
  }
  return success(Object.freeze({
    handle,
    releaseSetDigest,
    projections,
    evaluationProfile,
    targets,
  }) as MechanicalEvidenceObservation);
}

export function parseProviderAcceptanceBinding(
  input: unknown,
  path: string,
): PromotionResult<ProviderAcceptanceBinding> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(
    input,
    ["adapterProtocol", "capabilityProfileDigest", "projectionDigest", "provider"],
    path,
    issues,
  );
  if (record === undefined) return failures(issues);
  const provider = parseProvider(record.provider, `${path}.provider`, issues);
  const projectionDigest = collect(parseProjectionDigest(record.projectionDigest, `${path}.projectionDigest`), issues);
  const adapterProtocol = collect(parseCanonicalId(record.adapterProtocol, `${path}.adapterProtocol`), issues);
  const capabilityProfileDigest = collect(parseCapabilityDigest(record.capabilityProfileDigest, `${path}.capabilityProfileDigest`), issues);
  if (
    issues.length > 0
    || provider === undefined
    || projectionDigest === undefined
    || adapterProtocol === undefined
    || capabilityProfileDigest === undefined
  ) {
    return failures(issues);
  }
  return success(Object.freeze({ provider, projectionDigest, adapterProtocol, capabilityProfileDigest }));
}

export function parseMechanicalEvidenceHandle(
  input: unknown,
  path: string,
): PromotionResult<MechanicalEvidenceHandle> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(input, ["byteLength", "digest", "protocol"], path, issues);
  if (record === undefined) return failures(issues);
  if (record.protocol !== MECHANICAL_EVIDENCE_PROTOCOL) {
    issues.push({
      code: "INVALID_SCHEMA",
      path: `${path}.protocol`,
      message: `Expected ${MECHANICAL_EVIDENCE_PROTOCOL}`,
    });
  }
  const digest = collect(parseMechanicalEvidenceDigest(record.digest, `${path}.digest`), issues);
  const byteLength = parseBoundedInteger(
    record.byteLength,
    `${path}.byteLength`,
    1,
    MAX_MECHANICAL_EVIDENCE_BYTES,
    issues,
  );
  if (issues.length > 0 || digest === undefined || byteLength === undefined) return failures(issues);
  return success(Object.freeze({ protocol: MECHANICAL_EVIDENCE_PROTOCOL, digest, byteLength }));
}

export function parseProviderBindings(
  input: unknown,
  path: string,
  issues: PromotionIssue[],
  canonicalize: boolean,
): readonly ProviderAcceptanceBinding[] | undefined {
  const raw = boundedArray(input, path, MAX_BINDINGS, issues);
  if (raw === undefined) return undefined;
  const parsed: ProviderAcceptanceBinding[] = [];
  raw.forEach((candidate, index) => {
    const result = parseProviderAcceptanceBinding(candidate, `${path}[${index}]`);
    const binding = collect(result, issues);
    if (binding !== undefined) parsed.push(binding);
  });
  const values = canonicalize ? sortCanonical(parsed, providerBindingKey) : Object.freeze(parsed);
  reportDuplicateOrOrder(values, providerBindingKey, path, issues);
  return values;
}

export function providerBindingKey(binding: ProviderAcceptanceBinding): string {
  return binding.provider;
}

function providerBindingValueKey(binding: ProviderAcceptanceBinding): string {
  return canonicalBindingKey([
    binding.provider,
    binding.projectionDigest,
    binding.adapterProtocol,
    binding.capabilityProfileDigest,
  ]);
}

export function providerBindingValue(binding: ProviderAcceptanceBinding): CanonicalJsonValue {
  return {
    provider: binding.provider,
    projectionDigest: binding.projectionDigest,
    adapterProtocol: binding.adapterProtocol,
    capabilityProfileDigest: binding.capabilityProfileDigest,
  };
}

export function evidenceHandleValue(handle: MechanicalEvidenceHandle): CanonicalJsonValue {
  return {
    protocol: handle.protocol,
    digest: handle.digest,
    byteLength: handle.byteLength,
  };
}

export function targetFactValue(fact: MechanicalTargetFact): CanonicalJsonValue {
  return {
    targetIdentity: fact.targetIdentity,
    provider: fact.provider,
    projectionDigest: fact.projectionDigest,
    outcome: fact.outcome,
    factDigest: fact.factDigest,
  };
}

export function sameProviderBinding(
  left: ProviderAcceptanceBinding,
  right: ProviderAcceptanceBinding,
): boolean {
  return providerBindingValueKey(left) === providerBindingValueKey(right);
}

export function sameEvidenceHandle(
  left: MechanicalEvidenceHandle,
  right: MechanicalEvidenceHandle,
): boolean {
  return left.protocol === right.protocol
    && left.digest === right.digest
    && left.byteLength === right.byteLength;
}

function parseProvider(
  value: unknown,
  path: string,
  issues: PromotionIssue[],
): ProviderIdentity | undefined {
  if (value === "codex" || value === "claude") return value;
  issues.push({ code: "INVALID_CANONICAL_VALUE", path, message: "Provider must be codex or claude" });
  return undefined;
}

function parseOutcome(
  value: unknown,
  path: string,
  issues: PromotionIssue[],
): MechanicalEvaluationOutcome | undefined {
  if (value === "passed" || value === "failed") return value;
  issues.push({ code: "INVALID_CANONICAL_VALUE", path, message: "Mechanical outcome must be passed or failed" });
  return undefined;
}

function parseTargetFacts(
  input: unknown,
  path: string,
  issues: PromotionIssue[],
): readonly MechanicalTargetFact[] | undefined {
  const raw = boundedArray(input, path, MAX_BINDINGS, issues);
  if (raw === undefined) return undefined;
  const parsed: MechanicalTargetFact[] = [];
  raw.forEach((candidate, index) => {
    const factPath = `${path}[${index}]`;
    const record = exactRecord(candidate, ["factDigest", "outcome", "projectionDigest", "provider", "targetIdentity"], factPath, issues);
    if (record === undefined) return;
    const targetIdentity = collect(parseTargetDigest(record.targetIdentity, `${factPath}.targetIdentity`), issues);
    const provider = parseProvider(record.provider, `${factPath}.provider`, issues);
    const projectionDigest = collect(parseProjectionDigest(record.projectionDigest, `${factPath}.projectionDigest`), issues);
    const outcome = parseOutcome(record.outcome, `${factPath}.outcome`, issues);
    const factDigest = collect(parseMechanicalTargetFactDigest(record.factDigest, `${factPath}.factDigest`), issues);
    if (targetIdentity !== undefined && provider !== undefined && projectionDigest !== undefined && outcome !== undefined && factDigest !== undefined) {
      parsed.push(Object.freeze({ targetIdentity, provider, projectionDigest, outcome, factDigest }));
    }
  });
  const values = Object.freeze(parsed);
  reportDuplicateOrOrder(values, (fact) => fact.targetIdentity, path, issues);
  return values;
}
