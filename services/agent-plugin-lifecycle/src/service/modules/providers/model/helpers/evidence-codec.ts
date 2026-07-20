import { parseArtifactRef, type CompleteSetArtifactRef, type ReleaseArtifactRef } from "../../../../shared/release";

import { canonicalBytes, canonicalDigest, compareCanonical, equalBytes } from "./canonical";
import {
  CONTROLLER_PROTOCOL,
  PROVIDER_EVIDENCE_SCHEMA_PROTOCOL,
  evidenceBodyValue,
  type MechanicalEvidenceDigest,
  type MechanicalEvidenceSource,
  type MechanicalProviderEvidence,
  type MechanicalProviderEvidenceBody,
  type ProviderVerificationFact,
} from "../dto/mechanical-evidence";
import type { EvaluationProfile } from "../dto/mode";
import { boundedArray, canonicalString, exactRecord } from "./parse";
import type { AdapterProtocol, CapabilityProfileDigest, ProjectionDigest } from "../policy/projection";
import { failure, firstIssue, issue, success, type DeploymentResult, type ProviderDeploymentIssue, type ProviderDeploymentIssueCode } from "../errors/deployment-result";
import type { ProviderId, ProviderTargetDigest } from "../dto/provider-target";

const MAX_EVIDENCE_BYTES = 16 * 1024 * 1024;
const MAX_TARGETS = 64;
const MAX_MEMBERS = 1_024;
const ID_PATTERN = /^[a-z0-9][a-z0-9._:@/-]*$/u;
const PROTOCOL_PATTERN = /^[a-z0-9][a-z0-9._/-]*@v[1-9][0-9]*$/u;
const DIGEST_PATTERN = /^(?:me1_|pt1_|ap1_|cp1_|vf1_|ad1_)[0-9a-f]{64}$/u;
const FAILURE_CODES = new Set<ProviderDeploymentIssueCode>([
  "ADAPTER_PROTOCOL_MISMATCH", "ARTIFACT_KIND_MISMATCH", "ARTIFACT_READ_FAILED",
  "BLOCKED_COLLISION", "CAPABILITY_MISMATCH",
  "CHANNEL_NOT_ELIGIBLE", "DUPLICATE_MEMBER", "DUPLICATE_TARGET", "EVIDENCE_FAILED",
  "EXPECTED_ARRAY", "EXPECTED_INTEGER", "EXPECTED_OBJECT", "EXPECTED_STRING", "INVALID_ARTIFACT_REF",
  "INVALID_DIGEST", "INVALID_EVALUATION_PROFILE", "INVALID_HOME", "INVALID_LOCATOR", "INVALID_MODE",
  "INVALID_PLUGIN_ID", "INVALID_PROTOCOL", "INVALID_RECEIPT", "INVALID_TARGET", "MISSING_FIELD",
  "MUTATION_FAILED", "PROJECTION_MISMATCH", "RECEIPT_FAILED", "RECEIPT_TARGET_MISMATCH",
  "UNKNOWN_FIELD", "UNSUPPORTED_PROVIDER", "VISIBILITY_FAILED",
]);

export function decodeMechanicalProviderEvidence(
  bytes: unknown,
  expectedDigest?: MechanicalEvidenceDigest,
): DeploymentResult<MechanicalProviderEvidence> {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_EVIDENCE_BYTES) {
    return failure([issue("EVIDENCE_FAILED", "evidence", "Evidence must be bounded canonical bytes")]);
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return failure([issue("EVIDENCE_FAILED", "evidence", "Evidence is not valid UTF-8 JSON")]);
  }
  const body = parseBody(input);
  if (!body.ok) return body;
  const canonical = canonicalBytes(evidenceBodyValue(body.value));
  if (!equalBytes(bytes, canonical)) {
    return failure([issue("EVIDENCE_FAILED", "evidence", "Evidence bytes are not the unique canonical representation")]);
  }
  const evidenceDigest = canonicalDigest("me1_", evidenceBodyValue(body.value)) as MechanicalEvidenceDigest;
  if (expectedDigest !== undefined && evidenceDigest !== expectedDigest) {
    return failure([issue("INVALID_DIGEST", "evidence", "Evidence digest differs from the requested immutable handle", expectedDigest, evidenceDigest)]);
  }
  return success(Object.freeze({ schemaVersion: 1, evidenceDigest, body: body.value, bytes: new Uint8Array(bytes) }));
}

function parseBody(input: unknown): DeploymentResult<MechanicalProviderEvidenceBody> {
  const issues: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["controllerProtocol", "evaluationProfile", "procedures", "schemaProtocol", "schemaVersion", "source", "targets"], "evidence", issues)) {
    return failure(firstIssue(issues, issue("EVIDENCE_FAILED", "evidence", "Evidence body is invalid")));
  }
  if (input.schemaVersion !== 1) issues.push(issue("EVIDENCE_FAILED", "evidence.schemaVersion", "Unsupported evidence schema", "1", String(input.schemaVersion)));
  if (input.schemaProtocol !== PROVIDER_EVIDENCE_SCHEMA_PROTOCOL) issues.push(issue("INVALID_PROTOCOL", "evidence.schemaProtocol", "Unsupported evidence protocol", PROVIDER_EVIDENCE_SCHEMA_PROTOCOL, String(input.schemaProtocol)));
  if (input.controllerProtocol !== CONTROLLER_PROTOCOL) issues.push(issue("INVALID_PROTOCOL", "evidence.controllerProtocol", "Unsupported controller protocol", CONTROLLER_PROTOCOL, String(input.controllerProtocol)));
  const evaluationProfile = canonicalString(input.evaluationProfile, "evidence.evaluationProfile", issues, { maxBytes: 256, pattern: ID_PATTERN, code: "INVALID_EVALUATION_PROFILE" }) as EvaluationProfile | undefined;
  const source = parseSource(input.source, issues);
  const procedures = parseProcedures(input.procedures, issues);
  const targets = parseFacts(input.targets, issues);
  if (issues.length > 0 || evaluationProfile === undefined || source === undefined || procedures === undefined || targets === undefined) {
    return failure(firstIssue(issues, issue("EVIDENCE_FAILED", "evidence", "Evidence body is invalid")));
  }
  return success(Object.freeze({
    schemaVersion: 1,
    schemaProtocol: PROVIDER_EVIDENCE_SCHEMA_PROTOCOL,
    controllerProtocol: CONTROLLER_PROTOCOL,
    source,
    evaluationProfile,
    procedures,
    targets,
  }));
}

function parseSource(input: unknown, issues: ProviderDeploymentIssue[]): MechanicalEvidenceSource | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input) || !Object.hasOwn(input, "kind")) {
    issues.push(issue("EVIDENCE_FAILED", "evidence.source", "Evidence source must be a closed object"));
    return undefined;
  }
  const kind = (input as { readonly kind?: unknown }).kind;
  if (kind === "targeted-test") {
    if (!exactRecord(input, ["kind", "releases"], "evidence.source", issues)) return undefined;
    const raw = boundedArray(input.releases, "evidence.source.releases", MAX_MEMBERS, issues);
    const refs: ReleaseArtifactRef[] = [];
    for (const candidate of raw ?? []) {
      const parsed = parseArtifactRef(candidate);
      if (!parsed.ok || parsed.value.kind !== "release") issues.push(issue("INVALID_ARTIFACT_REF", "evidence.source.releases", "Targeted evidence requires release refs"));
      else refs.push(parsed.value);
    }
    refs.sort((left, right) => compareCanonical(left.releaseDigest, right.releaseDigest));
    return raw === undefined ? undefined : Object.freeze({ kind, releases: Object.freeze(refs) });
  }
  if (kind === "complete-test") {
    if (!exactRecord(input, ["kind", "releaseSet"], "evidence.source", issues)) return undefined;
    const parsed = parseArtifactRef(input.releaseSet);
    if (!parsed.ok || parsed.value.kind !== "complete-set") {
      issues.push(issue("INVALID_ARTIFACT_REF", "evidence.source.releaseSet", "Complete evidence requires one complete-set ref"));
      return undefined;
    }
    return Object.freeze({ kind, releaseSet: parsed.value as CompleteSetArtifactRef });
  }
  issues.push(issue("EVIDENCE_FAILED", "evidence.source.kind", "Evidence source kind is unsupported", "targeted-test|complete-test", String(kind)));
  return undefined;
}

function parseProcedures(input: unknown, issues: ProviderDeploymentIssue[]): readonly string[] | undefined {
  const expected = [
    "inspect-provider-capabilities",
    "inventory-native-visible-state",
    "verify-projection-members-skills-hooks-enablement",
    "verify-target-receipt-final-state",
  ];
  if (!Array.isArray(input) || input.length !== expected.length || input.some((entry, index) => entry !== expected[index])) {
    issues.push(issue("EVIDENCE_FAILED", "evidence.procedures", "Evidence procedures must be the exact supported verification sequence"));
    return undefined;
  }
  return Object.freeze(expected);
}

function parseFacts(input: unknown, issues: ProviderDeploymentIssue[]): readonly ProviderVerificationFact[] | undefined {
  const raw = boundedArray(input, "evidence.targets", MAX_TARGETS, issues);
  if (raw === undefined) return undefined;
  const facts: ProviderVerificationFact[] = [];
  for (const [index, candidate] of raw.entries()) {
    const parsed = parseFact(candidate, `evidence.targets[${index}]`, issues);
    if (parsed !== undefined) facts.push(parsed);
  }
  facts.sort((left, right) => compareCanonical(left.targetDigest, right.targetDigest));
  for (let index = 1; index < facts.length; index += 1) {
    if (facts[index - 1]?.targetDigest === facts[index]?.targetDigest) issues.push(issue("DUPLICATE_TARGET", "evidence.targets", "Evidence targets must be distinct"));
  }
  return Object.freeze(facts);
}

function parseFact(input: unknown, path: string, issues: ProviderDeploymentIssue[]): ProviderVerificationFact | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input) || !Object.hasOwn(input, "kind")) {
    issues.push(issue("EVIDENCE_FAILED", path, "Evidence target fact must be a closed object"));
    return undefined;
  }
  const kind = (input as { readonly kind?: unknown }).kind;
  const finalKey = kind === "verified" ? "visibleFingerprint" : kind === "failed" ? "failureCodes" : null;
  if (finalKey === null || !exactRecord(input, ["adapterProtocol", "capabilityProfileDigest", finalKey, "kind", "payloadDigests", "projectionDigest", "provider", "targetDigest"].sort(compareCanonical), path, issues)) {
    if (finalKey === null) issues.push(issue("EVIDENCE_FAILED", `${path}.kind`, "Evidence fact kind is unsupported", "verified|failed", String(kind)));
    return undefined;
  }
  const provider = input.provider === "codex" || input.provider === "claude" ? input.provider : undefined;
  if (provider === undefined) issues.push(issue("UNSUPPORTED_PROVIDER", `${path}.provider`, "Evidence provider is unsupported"));
  const targetDigest = parseDigest(input.targetDigest, `${path}.targetDigest`, "pt1_", issues) as ProviderTargetDigest | undefined;
  const projectionDigest = parseDigest(input.projectionDigest, `${path}.projectionDigest`, "ap1_", issues) as ProjectionDigest | undefined;
  const adapterProtocol = canonicalString(input.adapterProtocol, `${path}.adapterProtocol`, issues, { maxBytes: 256, pattern: PROTOCOL_PATTERN, code: "INVALID_PROTOCOL" }) as AdapterProtocol | undefined;
  const capability = parseDigest(input.capabilityProfileDigest, `${path}.capabilityProfileDigest`, "cp1_", issues) as CapabilityProfileDigest | undefined;
  const payloadDigests = parsePayloadDigests(input.payloadDigests, path, issues);
  if (provider === undefined || targetDigest === undefined || projectionDigest === undefined || adapterProtocol === undefined || capability === undefined || payloadDigests === undefined) return undefined;
  const common = { targetDigest, provider: provider as ProviderId, projectionDigest, adapterProtocol, capabilityProfileDigest: capability, payloadDigests };
  if (kind === "verified") {
    const fingerprint = parseDigest(input.visibleFingerprint, `${path}.visibleFingerprint`, "vf1_", issues);
    return fingerprint === undefined ? undefined : Object.freeze({ kind, ...common, visibleFingerprint: fingerprint });
  }
  const codes = boundedArray(input.failureCodes, `${path}.failureCodes`, FAILURE_CODES.size, issues);
  const failureCodes: ProviderDeploymentIssueCode[] = [];
  for (const code of codes ?? []) {
    if (typeof code !== "string" || !FAILURE_CODES.has(code as ProviderDeploymentIssueCode)) issues.push(issue("EVIDENCE_FAILED", `${path}.failureCodes`, "Unknown provider failure code"));
    else failureCodes.push(code as ProviderDeploymentIssueCode);
  }
  return codes === undefined ? undefined : Object.freeze({ kind: "failed", ...common, failureCodes: Object.freeze(failureCodes.sort(compareCanonical)) });
}

function parsePayloadDigests(input: unknown, path: string, issues: ProviderDeploymentIssue[]): readonly string[] | undefined {
  const raw = boundedArray(input, `${path}.payloadDigests`, MAX_MEMBERS, issues);
  if (raw === undefined) return undefined;
  const digests = raw.flatMap((candidate) => {
    const digest = parseDigest(candidate, `${path}.payloadDigests`, "ad1_", issues);
    return digest === undefined ? [] : [digest];
  });
  return Object.freeze(digests.sort(compareCanonical));
}

function parseDigest(input: unknown, path: string, prefix: string, issues: ProviderDeploymentIssue[]): string | undefined {
  const parsed = canonicalString(input, path, issues, { maxBytes: 128, pattern: DIGEST_PATTERN, code: "INVALID_DIGEST" });
  if (parsed !== undefined && !parsed.startsWith(prefix)) {
    issues.push(issue("INVALID_DIGEST", path, `Digest must use ${prefix}`, prefix, parsed));
    return undefined;
  }
  return parsed;
}
