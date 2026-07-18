import {
  bytesEqual,
  canonicalJsonLine,
  decodeCanonicalJson,
  sha256Digest,
  type CanonicalJsonValue,
} from "../helpers/canonical";
import {
  CURRENT_MAIN_CHANNEL,
  parseAcceptanceEvidenceDigest,
  parseAcceptanceRequestDigest,
  parseAuthority,
  parseCanonicalId,
  parseCurrentMainDigest,
  parseLifecyclePolicyDigest,
  parsePromotionAttestationDigest,
  parseReleaseInput,
  parseReleaseSet,
  sortCanonical,
  type AcceptanceEvidenceDigest,
  type AcceptanceRequestDigest,
  type CanonicalId,
  type ContentAuthority,
  type CurrentMainDigest,
  type LifecyclePolicyDigest,
  type PromotionAttestationDigest,
  type ReleaseInputDigest,
  type ReleaseSetDigest,
} from "./primitives";
import {
  parseProviderBindings,
  providerBindingKey,
  providerBindingValue,
  type ProviderAcceptanceBinding,
} from "./evidence";
import {
  gitPointerValue,
  parseExactGitBlobPointer,
  type ExactGitBlobPointer,
} from "./git";
import { failures, issue, success, type PromotionIssue, type PromotionResult } from "../errors/promotion-result";
import { collect, exactRecord } from "../helpers/schema";

export const PROMOTION_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const CURRENT_MAIN_SCHEMA_VERSION = 1 as const;

export interface ReleaseInputIdentity {
  readonly object: ExactGitBlobPointer;
  readonly releaseInputDigest: ReleaseInputDigest;
}

export interface PromotionAttestationBody {
  readonly schemaVersion: typeof PROMOTION_ATTESTATION_SCHEMA_VERSION;
  readonly policyIdentity: CanonicalId;
  readonly acceptanceRequestDigest: AcceptanceRequestDigest;
  readonly acceptanceEvidenceDigest: AcceptanceEvidenceDigest;
  readonly releaseSetDigest: ReleaseSetDigest;
  readonly acceptedInput: ReleaseInputIdentity;
  readonly landedInput: ReleaseInputIdentity;
  readonly projections: readonly ProviderAcceptanceBinding[];
  readonly equivalence: "equivalent";
}

export interface PromotionAttestation {
  readonly schemaVersion: typeof PROMOTION_ATTESTATION_SCHEMA_VERSION;
  readonly attestationDigest: PromotionAttestationDigest;
  readonly body: PromotionAttestationBody;
}

export interface CurrentMainBody {
  readonly schemaVersion: typeof CURRENT_MAIN_SCHEMA_VERSION;
  readonly channel: typeof CURRENT_MAIN_CHANNEL;
  readonly contentAuthority: ContentAuthority;
  readonly policyIdentity: CanonicalId;
  readonly policyDigest: LifecyclePolicyDigest;
  readonly releaseSetDigest: ReleaseSetDigest;
  readonly projections: readonly ProviderAcceptanceBinding[];
  readonly requestObject: ExactGitBlobPointer;
  readonly acceptanceObject: ExactGitBlobPointer;
  readonly promotionObject: ExactGitBlobPointer;
  readonly acceptanceRequestDigest: AcceptanceRequestDigest;
  readonly acceptanceEvidenceDigest: AcceptanceEvidenceDigest;
  readonly promotionAttestationDigest: PromotionAttestationDigest;
}

export interface CurrentMainRecord {
  readonly schemaVersion: typeof CURRENT_MAIN_SCHEMA_VERSION;
  readonly currentMainDigest: CurrentMainDigest;
  readonly body: CurrentMainBody;
}

export function createPromotionAttestation(input: unknown): PromotionResult<PromotionAttestation> {
  const body = parsePromotionAttestationBody(input, "promotionAttestation.body", true);
  if (!body.ok) return body;
  return success(freezePromotionAttestation(body.value));
}

export function decodePromotionAttestation(bytes: unknown): PromotionResult<PromotionAttestation> {
  const decoded = decodeCanonicalJson(bytes, "promotionAttestation");
  if (!decoded.ok) return decoded;
  const issues: PromotionIssue[] = [];
  const envelope = exactRecord(decoded.value, ["attestationDigest", "body", "schemaVersion"], "promotionAttestation", issues);
  if (envelope === undefined) return failures(issues);
  if (envelope.schemaVersion !== PROMOTION_ATTESTATION_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", "promotionAttestation.schemaVersion", "Unsupported promotion attestation schema"));
  }
  const digest = collect(parsePromotionAttestationDigest(envelope.attestationDigest, "promotionAttestation.attestationDigest"), issues);
  const body = collect(parsePromotionAttestationBody(envelope.body, "promotionAttestation.body", false), issues);
  if (issues.length > 0 || digest === undefined || body === undefined) return failures(issues);
  const result = freezePromotionAttestation(body);
  if (result.attestationDigest !== digest) {
    return { ok: false, issues: [issue("DIGEST_MISMATCH", "promotionAttestation.attestationDigest", "Promotion attestation digest does not match its body")] };
  }
  if (!(bytes instanceof Uint8Array) || !bytesEqual(bytes, canonicalSerializePromotionAttestation(result))) {
    return { ok: false, issues: [issue("NON_CANONICAL_ENVELOPE", "promotionAttestation", "Promotion attestation bytes are not canonical")] };
  }
  return success(result);
}

export function canonicalSerializePromotionAttestation(attestation: PromotionAttestation): Uint8Array {
  return canonicalJsonLine({
    schemaVersion: attestation.schemaVersion,
    attestationDigest: attestation.attestationDigest,
    body: promotionAttestationBodyValue(attestation.body),
  });
}

export function createCurrentMainRecord(input: unknown): PromotionResult<CurrentMainRecord> {
  const body = parseCurrentMainBody(input, "currentMain.body", true);
  if (!body.ok) return body;
  return success(freezeCurrentMainRecord(body.value));
}

export function decodeCurrentMainRecord(bytes: unknown): PromotionResult<CurrentMainRecord> {
  const decoded = decodeCanonicalJson(bytes, "currentMain");
  if (!decoded.ok) return decoded;
  const issues: PromotionIssue[] = [];
  const envelope = exactRecord(decoded.value, ["body", "currentMainDigest", "schemaVersion"], "currentMain", issues);
  if (envelope === undefined) return failures(issues);
  if (envelope.schemaVersion !== CURRENT_MAIN_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", "currentMain.schemaVersion", "Unsupported current-main schema"));
  }
  const digest = collect(parseCurrentMainDigest(envelope.currentMainDigest, "currentMain.currentMainDigest"), issues);
  const body = collect(parseCurrentMainBody(envelope.body, "currentMain.body", false), issues);
  if (issues.length > 0 || digest === undefined || body === undefined) return failures(issues);
  const result = freezeCurrentMainRecord(body);
  if (result.currentMainDigest !== digest) {
    return { ok: false, issues: [issue("DIGEST_MISMATCH", "currentMain.currentMainDigest", "Current-main digest does not match its body")] };
  }
  if (!(bytes instanceof Uint8Array) || !bytesEqual(bytes, canonicalSerializeCurrentMainRecord(result))) {
    return { ok: false, issues: [issue("NON_CANONICAL_ENVELOPE", "currentMain", "Current-main bytes are not canonical")] };
  }
  return success(result);
}

export function canonicalSerializeCurrentMainRecord(record: CurrentMainRecord): Uint8Array {
  return canonicalJsonLine({
    schemaVersion: record.schemaVersion,
    currentMainDigest: record.currentMainDigest,
    body: currentMainBodyValue(record.body),
  });
}

export function promotionAttestationBodyValue(body: PromotionAttestationBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    policyIdentity: body.policyIdentity,
    acceptanceRequestDigest: body.acceptanceRequestDigest,
    acceptanceEvidenceDigest: body.acceptanceEvidenceDigest,
    releaseSetDigest: body.releaseSetDigest,
    acceptedInput: releaseInputIdentityValue(body.acceptedInput),
    landedInput: releaseInputIdentityValue(body.landedInput),
    projections: body.projections.map(providerBindingValue),
    equivalence: body.equivalence,
  };
}

export function currentMainBodyValue(body: CurrentMainBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    channel: body.channel,
    contentAuthority: body.contentAuthority,
    policyIdentity: body.policyIdentity,
    policyDigest: body.policyDigest,
    releaseSetDigest: body.releaseSetDigest,
    projections: body.projections.map(providerBindingValue),
    requestObject: gitPointerValue(body.requestObject),
    acceptanceObject: gitPointerValue(body.acceptanceObject),
    promotionObject: gitPointerValue(body.promotionObject),
    acceptanceRequestDigest: body.acceptanceRequestDigest,
    acceptanceEvidenceDigest: body.acceptanceEvidenceDigest,
    promotionAttestationDigest: body.promotionAttestationDigest,
  };
}

function parsePromotionAttestationBody(
  input: unknown,
  path: string,
  canonicalize: boolean,
): PromotionResult<PromotionAttestationBody> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(input, [
    "acceptanceEvidenceDigest",
    "acceptanceRequestDigest",
    "acceptedInput",
    "equivalence",
    "landedInput",
    "policyIdentity",
    "projections",
    "releaseSetDigest",
    "schemaVersion",
  ], path, issues);
  if (record === undefined) return failures(issues);
  if (record.schemaVersion !== PROMOTION_ATTESTATION_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", `${path}.schemaVersion`, "Unsupported promotion attestation schema"));
  }
  const policyIdentity = collect(parseCanonicalId(record.policyIdentity, `${path}.policyIdentity`), issues);
  const acceptanceRequestDigest = collect(parseAcceptanceRequestDigest(record.acceptanceRequestDigest, `${path}.acceptanceRequestDigest`), issues);
  const acceptanceEvidenceDigest = collect(parseAcceptanceEvidenceDigest(record.acceptanceEvidenceDigest, `${path}.acceptanceEvidenceDigest`), issues);
  const releaseSetDigest = collect(parseReleaseSet(record.releaseSetDigest, `${path}.releaseSetDigest`), issues);
  const acceptedInput = parseReleaseInputIdentity(record.acceptedInput, `${path}.acceptedInput`, issues);
  const landedInput = parseReleaseInputIdentity(record.landedInput, `${path}.landedInput`, issues);
  const projections = parseProviderBindings(record.projections, `${path}.projections`, issues, canonicalize);
  if (record.equivalence !== "equivalent") {
    issues.push(issue("INVALID_SCHEMA", `${path}.equivalence`, "Promotion attestation can record only proven equivalence"));
  }
  if (
    acceptedInput !== undefined
    && landedInput !== undefined
    && acceptedInput.releaseInputDigest !== landedInput.releaseInputDigest
  ) {
    issues.push(issue("RECORD_MISMATCH", `${path}.landedInput.releaseInputDigest`, "Attested release-input digests are not equivalent"));
  }
  if (
    issues.length > 0
    || policyIdentity === undefined
    || acceptanceRequestDigest === undefined
    || acceptanceEvidenceDigest === undefined
    || releaseSetDigest === undefined
    || acceptedInput === undefined
    || landedInput === undefined
    || projections === undefined
  ) {
    return failures(issues);
  }
  return success(Object.freeze({
    schemaVersion: PROMOTION_ATTESTATION_SCHEMA_VERSION,
    policyIdentity,
    acceptanceRequestDigest,
    acceptanceEvidenceDigest,
    releaseSetDigest,
    acceptedInput,
    landedInput,
    projections,
    equivalence: "equivalent",
  }));
}

function parseCurrentMainBody(
  input: unknown,
  path: string,
  canonicalize: boolean,
): PromotionResult<CurrentMainBody> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(input, [
    "acceptanceEvidenceDigest",
    "acceptanceObject",
    "acceptanceRequestDigest",
    "channel",
    "contentAuthority",
    "policyDigest",
    "policyIdentity",
    "projections",
    "promotionAttestationDigest",
    "promotionObject",
    "releaseSetDigest",
    "requestObject",
    "schemaVersion",
  ], path, issues);
  if (record === undefined) return failures(issues);
  if (record.schemaVersion !== CURRENT_MAIN_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", `${path}.schemaVersion`, "Unsupported current-main schema"));
  }
  if (record.channel !== CURRENT_MAIN_CHANNEL) {
    issues.push(issue("INVALID_SCHEMA", `${path}.channel`, `Channel must be ${CURRENT_MAIN_CHANNEL}`));
  }
  const contentAuthority = collect(parseAuthority(record.contentAuthority, `${path}.contentAuthority`), issues);
  const policyIdentity = collect(parseCanonicalId(record.policyIdentity, `${path}.policyIdentity`), issues);
  const policyDigest = collect(parseLifecyclePolicyDigest(record.policyDigest, `${path}.policyDigest`), issues);
  const releaseSetDigest = collect(parseReleaseSet(record.releaseSetDigest, `${path}.releaseSetDigest`), issues);
  const projections = parseProviderBindings(record.projections, `${path}.projections`, issues, canonicalize);
  const requestObject = collect(parseExactGitBlobPointer(record.requestObject, `${path}.requestObject`), issues);
  const acceptanceObject = collect(parseExactGitBlobPointer(record.acceptanceObject, `${path}.acceptanceObject`), issues);
  const promotionObject = collect(parseExactGitBlobPointer(record.promotionObject, `${path}.promotionObject`), issues);
  const acceptanceRequestDigest = collect(parseAcceptanceRequestDigest(record.acceptanceRequestDigest, `${path}.acceptanceRequestDigest`), issues);
  const acceptanceEvidenceDigest = collect(parseAcceptanceEvidenceDigest(record.acceptanceEvidenceDigest, `${path}.acceptanceEvidenceDigest`), issues);
  const promotionAttestationDigest = collect(parsePromotionAttestationDigest(record.promotionAttestationDigest, `${path}.promotionAttestationDigest`), issues);
  if (
    issues.length > 0
    || contentAuthority === undefined
    || policyIdentity === undefined
    || policyDigest === undefined
    || releaseSetDigest === undefined
    || projections === undefined
    || requestObject === undefined
    || acceptanceObject === undefined
    || promotionObject === undefined
    || acceptanceRequestDigest === undefined
    || acceptanceEvidenceDigest === undefined
    || promotionAttestationDigest === undefined
  ) {
    return failures(issues);
  }
  return success(Object.freeze({
    schemaVersion: CURRENT_MAIN_SCHEMA_VERSION,
    channel: CURRENT_MAIN_CHANNEL,
    contentAuthority,
    policyIdentity,
    policyDigest,
    releaseSetDigest,
    projections,
    requestObject,
    acceptanceObject,
    promotionObject,
    acceptanceRequestDigest,
    acceptanceEvidenceDigest,
    promotionAttestationDigest,
  }));
}

function parseReleaseInputIdentity(
  input: unknown,
  path: string,
  issues: PromotionIssue[],
): ReleaseInputIdentity | undefined {
  const record = exactRecord(input, ["object", "releaseInputDigest"], path, issues);
  if (record === undefined) return undefined;
  const object = collect(parseExactGitBlobPointer(record.object, `${path}.object`), issues);
  const releaseInputDigest = collect(parseReleaseInput(record.releaseInputDigest, `${path}.releaseInputDigest`), issues);
  return object === undefined || releaseInputDigest === undefined
    ? undefined
    : Object.freeze({ object, releaseInputDigest });
}

function releaseInputIdentityValue(identity: ReleaseInputIdentity): CanonicalJsonValue {
  return {
    object: gitPointerValue(identity.object),
    releaseInputDigest: identity.releaseInputDigest,
  };
}

function freezePromotionAttestation(body: PromotionAttestationBody): PromotionAttestation {
  const digest = sha256Digest("pat1_", canonicalJsonLine(promotionAttestationBodyValue(body))) as PromotionAttestationDigest;
  return Object.freeze({ schemaVersion: PROMOTION_ATTESTATION_SCHEMA_VERSION, attestationDigest: digest, body });
}

function freezeCurrentMainRecord(body: CurrentMainBody): CurrentMainRecord {
  const digest = sha256Digest("cm1_", canonicalJsonLine(currentMainBodyValue(body))) as CurrentMainDigest;
  return Object.freeze({ schemaVersion: CURRENT_MAIN_SCHEMA_VERSION, currentMainDigest: digest, body });
}
