import {
  parseArtifactRef,
  parseContentAuthority,
  parseGitCommitId,
  parsePluginId,
  type CompleteSetArtifactRef,
  type PluginId,
  type ReleaseArtifactRef,
} from "../../../../shared/release";

import { canonicalBytes, canonicalDigest, compareCanonical, equalBytes, type CanonicalValue } from "../helpers/canonical";
import type { EvaluationProfile, ProviderRequestDigest } from "../dto/mode";
import { releaseRefValue, setRefValue } from "../dto/mode";
import {
  createProviderMarketplaceRegistration,
  marketplaceStateValue,
  sameMarketplaceState,
  type MarketplaceProjectionDigest,
  type ProviderMarketplaceState,
} from "./marketplace";
import { boundedArray, canonicalString, exactRecord, safeInteger } from "../helpers/parse";
import {
  PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
  type AdapterProtocol,
  type CapabilityProfileDigest,
  type ProjectionDigest,
  type ProviderArtifactAuthority,
  type ProviderMemberFingerprint,
  type ProviderSourceDigest,
  type ProviderSourceIdentity,
} from "./projection";
import { failure, firstIssue, issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../errors/deployment-result";
import type { ProviderId, ProviderTargetDigest } from "../dto/provider-target";

declare const receiptDigestBrand: unique symbol;
declare const visibleFingerprintBrand: unique symbol;
declare const lifecycleRecordDigestBrand: unique symbol;

export type TargetReceiptDigest = string & { readonly [receiptDigestBrand]: "TargetReceiptDigest" };
export type VisibleFingerprint = string & { readonly [visibleFingerprintBrand]: "VisibleFingerprint" };
export type LifecycleRecordDigest = string & { readonly [lifecycleRecordDigestBrand]: "LifecycleRecordDigest" };

export interface VerifiedMemberIdentity {
  readonly pluginId: PluginId;
  readonly nativeIdentity: string;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly memberFingerprint: ProviderMemberFingerprint;
}

export interface ManagedMemberClaim extends VerifiedMemberIdentity {
  readonly sourceProjectionDigest: ProjectionDigest;
}

interface ReceiptScopeCommon {
  readonly requestDigest: ProviderRequestDigest;
  readonly projectionDigest: ProjectionDigest;
  readonly adapterProtocol: AdapterProtocol;
  readonly capabilityProfileDigest: CapabilityProfileDigest;
  readonly visibleFingerprint: VisibleFingerprint;
  readonly verifiedMembers: readonly VerifiedMemberIdentity[];
}

export interface TargetedTestScope extends ReceiptScopeCommon {
  readonly kind: "targeted-test";
  readonly releases: readonly ReleaseArtifactRef[];
  readonly evaluationProfile: EvaluationProfile;
}

export interface CompleteTestScope extends ReceiptScopeCommon {
  readonly kind: "complete-test";
  readonly releaseSet: CompleteSetArtifactRef;
  readonly evaluationProfile: EvaluationProfile;
}

export interface CanonicalAcceptedScope extends ReceiptScopeCommon {
  readonly kind: "canonical-accepted";
  readonly releaseSet: CompleteSetArtifactRef;
  readonly acceptanceDigest: LifecycleRecordDigest;
  readonly promotionDigest: LifecycleRecordDigest;
  readonly channel: "current-main";
}

export type TargetReceiptScope = TargetedTestScope | CompleteTestScope | CanonicalAcceptedScope;

export type ReceiptLineage =
  | Readonly<{ kind: "initial" }>
  | Readonly<{ kind: "successor"; priorReceiptDigest: TargetReceiptDigest }>;

export interface TargetReceiptBody {
  readonly schemaVersion: 1;
  readonly provider: ProviderId;
  readonly targetDigest: ProviderTargetDigest;
  readonly generation: number;
  readonly lineage: ReceiptLineage;
  readonly marketplace: ProviderMarketplaceState;
  readonly scope: TargetReceiptScope;
  readonly managedMembers: readonly ManagedMemberClaim[];
}

export interface TargetReceipt {
  readonly schemaVersion: 1;
  readonly receiptDigest: TargetReceiptDigest;
  readonly body: TargetReceiptBody;
}

const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
const MAX_MEMBERS = 1_024;
const DIGEST_PATTERN = /^(?:tr1_|vf1_|prq1_|ap1_|cp1_|pm1_|[a-z][a-z0-9]*1_)[0-9a-f]{64}$/u;
const RECORD_DIGEST_PATTERN = /^[a-z][a-z0-9._-]{0,31}_[0-9a-f]{64}$/u;
const IDENTITY_PATTERN = /^[a-z0-9][a-z0-9@._:/-]*$/u;
const PROTOCOL_PATTERN = /^[a-z0-9][a-z0-9._/-]*@v[1-9][0-9]*$/u;
const EVALUATION_PATTERN = /^[a-z0-9][a-z0-9._:@/-]*$/u;

export function createTargetReceipt(body: TargetReceiptBody): TargetReceipt {
  const normalizedBody = freezeBody(body);
  return Object.freeze({
    schemaVersion: 1,
    receiptDigest: canonicalDigest("tr1_", receiptBodyValue(normalizedBody)) as TargetReceiptDigest,
    body: normalizedBody,
  });
}

export function verifyTargetReceipt(input: unknown): DeploymentResult<TargetReceipt> {
  const issues: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["body", "receiptDigest", "schemaVersion"], "receipt", issues)) {
    return failure(firstIssue(issues, issue("INVALID_RECEIPT", "receipt", "Receipt envelope is invalid")));
  }
  if (input.schemaVersion !== 1) issues.push(issue("INVALID_RECEIPT", "receipt.schemaVersion", "Unsupported receipt schema", "1", String(input.schemaVersion)));
  const digest = parseDigest(input.receiptDigest, "receipt.receiptDigest", "tr1_", issues) as TargetReceiptDigest | undefined;
  const body = parseBody(input.body, issues);
  if (body !== undefined && digest !== undefined) {
    const expected = canonicalDigest("tr1_", receiptBodyValue(body));
    if (digest !== expected) issues.push(issue("INVALID_RECEIPT", "receipt.receiptDigest", "Receipt digest does not match its canonical body", expected, digest));
  }
  return issues.length > 0 || body === undefined || digest === undefined
    ? failure(firstIssue(issues, issue("INVALID_RECEIPT", "receipt", "Receipt is invalid")))
    : success(Object.freeze({ schemaVersion: 1, receiptDigest: digest, body }));
}

export function decodeTargetReceipt(bytes: unknown): DeploymentResult<TargetReceipt> {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_RECEIPT_BYTES) {
    return failure([issue("INVALID_RECEIPT", "receipt", "Receipt bytes must be bounded canonical JSON")]);
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return failure([issue("INVALID_RECEIPT", "receipt", "Receipt bytes are not valid UTF-8 JSON")]);
  }
  const parsed = verifyTargetReceipt(input);
  if (!parsed.ok) return parsed;
  const canonical = canonicalSerializeTargetReceipt(parsed.value);
  return equalBytes(bytes, canonical)
    ? parsed
    : failure([issue("INVALID_RECEIPT", "receipt", "Receipt bytes are not the unique canonical representation")]);
}

export function canonicalSerializeTargetReceipt(receipt: TargetReceipt): Uint8Array {
  return canonicalBytes({
    schemaVersion: receipt.schemaVersion,
    receiptDigest: receipt.receiptDigest,
    body: receiptBodyValue(receipt.body),
  });
}

export function visibleFingerprint(members: readonly VerifiedMemberIdentity[]): VisibleFingerprint {
  return canonicalDigest("vf1_", [...members].sort(compareMembers).map(memberValue)) as VisibleFingerprint;
}

export function parseLifecycleRecordDigest(
  input: unknown,
  path = "lifecycleRecordDigest",
): DeploymentResult<LifecycleRecordDigest> {
  const issues: ProviderDeploymentIssue[] = [];
  const digest = parseRecordDigest(input, path, issues);
  return digest === undefined
    ? failure(firstIssue(issues, issue("INVALID_DIGEST", path, "Lifecycle record digest is invalid")))
    : success(digest);
}

export function receiptBodyValue(body: TargetReceiptBody): CanonicalValue {
  return {
    schemaVersion: body.schemaVersion,
    provider: body.provider,
    targetDigest: body.targetDigest,
    generation: body.generation,
    lineage: body.lineage.kind === "initial"
      ? { kind: "initial" }
      : { kind: "successor", priorReceiptDigest: body.lineage.priorReceiptDigest },
    marketplace: marketplaceStateValue(body.marketplace),
    scope: receiptScopeValue(body.scope),
    managedMembers: body.managedMembers.map(managedMemberValue),
  };
}

export function memberValue(member: VerifiedMemberIdentity): CanonicalValue {
  return {
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: {
      protocol: member.artifactAuthority.protocol,
      contentAuthority: member.artifactAuthority.contentAuthority,
      sourceCommit: member.artifactAuthority.sourceCommit,
    },
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
  };
}

export function managedMemberValue(member: ManagedMemberClaim): CanonicalValue {
  return {
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: {
      protocol: member.artifactAuthority.protocol,
      contentAuthority: member.artifactAuthority.contentAuthority,
      sourceCommit: member.artifactAuthority.sourceCommit,
    },
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    sourceProjectionDigest: member.sourceProjectionDigest,
  };
}

export function receiptScopeValue(scope: TargetReceiptScope): CanonicalValue {
  const common = {
    requestDigest: scope.requestDigest,
    projectionDigest: scope.projectionDigest,
    adapterProtocol: scope.adapterProtocol,
    capabilityProfileDigest: scope.capabilityProfileDigest,
    visibleFingerprint: scope.visibleFingerprint,
    verifiedMembers: scope.verifiedMembers.map(memberValue),
  };
  switch (scope.kind) {
    case "targeted-test":
      return { kind: scope.kind, ...common, releases: scope.releases.map(releaseRefValue), evaluationProfile: scope.evaluationProfile };
    case "complete-test":
      return { kind: scope.kind, ...common, releaseSet: setRefValue(scope.releaseSet), evaluationProfile: scope.evaluationProfile };
    case "canonical-accepted":
      return {
        kind: scope.kind,
        ...common,
        releaseSet: setRefValue(scope.releaseSet),
        acceptanceDigest: scope.acceptanceDigest,
        promotionDigest: scope.promotionDigest,
        channel: scope.channel,
      };
  }
}

function parseBody(input: unknown, issues: ProviderDeploymentIssue[]): TargetReceiptBody | undefined {
  const nested: ProviderDeploymentIssue[] = [];
  if (!exactRecord(input, ["generation", "lineage", "managedMembers", "marketplace", "provider", "schemaVersion", "scope", "targetDigest"], "receipt.body", nested)) {
    issues.push(...nested);
    return undefined;
  }
  if (input.schemaVersion !== 1) nested.push(issue("INVALID_RECEIPT", "receipt.body.schemaVersion", "Unsupported receipt body schema", "1", String(input.schemaVersion)));
  const provider = input.provider === "codex" || input.provider === "claude" ? input.provider : undefined;
  if (provider === undefined) nested.push(issue("INVALID_RECEIPT", "receipt.body.provider", "Receipt provider is unsupported", "codex|claude", String(input.provider)));
  const targetDigest = parseDigest(input.targetDigest, "receipt.body.targetDigest", "pt1_", nested) as ProviderTargetDigest | undefined;
  const generation = safeInteger(input.generation, "receipt.body.generation", nested, 1);
  const lineage = parseLineage(input.lineage, nested);
  const marketplace = parseMarketplaceState(input.marketplace, nested);
  const scope = parseScope(input.scope, nested);
  const managedMembers = parseManagedMembers(input.managedMembers, "receipt.body.managedMembers", nested);
  if (provider !== undefined && marketplace !== undefined && scope !== undefined && managedMembers !== undefined) {
    try {
      const expected = createProviderMarketplaceRegistration({
        provider,
        adapterProtocol: scope.adapterProtocol,
        marketplaceIdentity: marketplace.marketplaceIdentity,
        members: managedMembers.map((member) => ({
          pluginId: member.pluginId,
          nativeIdentity: member.nativeIdentity,
          providerSourceIdentity: member.providerSourceIdentity,
          sourceProjectionDigest: member.sourceProjectionDigest,
          memberFingerprint: member.memberFingerprint,
        })),
      });
      if (!sameMarketplaceState(marketplace, expected)) {
        nested.push(issue(
          "INVALID_RECEIPT",
          "receipt.body.marketplace",
          "Receipt marketplace state does not bind its exact managed-member set",
          expected.projectionDigest,
          marketplace.projectionDigest,
        ));
      }
    } catch (error) {
      nested.push(issue(
        "INVALID_RECEIPT",
        "receipt.body.marketplace",
        error instanceof Error ? error.message : String(error),
      ));
    }
  }
  issues.push(...nested);
  return nested.length === 0 && provider !== undefined && targetDigest !== undefined && generation !== undefined && lineage !== undefined && marketplace !== undefined && scope !== undefined && managedMembers !== undefined
    ? freezeBody({ schemaVersion: 1, provider, targetDigest, generation, lineage, marketplace, scope, managedMembers })
    : undefined;
}

function parseMarketplaceState(
  input: unknown,
  issues: ProviderDeploymentIssue[],
): ProviderMarketplaceState | undefined {
  if (!exactRecord(input, ["adapterProtocol", "marketplaceIdentity", "projectionDigest", "provider", "sourceDigest"], "receipt.body.marketplace", issues)) {
    return undefined;
  }
  const provider = input.provider === "codex" || input.provider === "claude" ? input.provider : undefined;
  if (provider === undefined) {
    issues.push(issue("INVALID_RECEIPT", "receipt.body.marketplace.provider", "Marketplace provider is unsupported", "codex|claude", String(input.provider)));
  }
  const adapterProtocol = parseProtocol(input.adapterProtocol, issues, "receipt.body.marketplace.adapterProtocol");
  const identity = parseContentAuthority(input.marketplaceIdentity, "receipt.body.marketplace.marketplaceIdentity");
  if (!identity.ok) issues.push(...identity.issues.map((entry) => issue("INVALID_RECEIPT", entry.path, entry.message)));
  const projectionDigest = parseDigest(
    input.projectionDigest,
    "receipt.body.marketplace.projectionDigest",
    "mp1_",
    issues,
  ) as MarketplaceProjectionDigest | undefined;
  const sourceDigest = parseDigest(
    input.sourceDigest,
    "receipt.body.marketplace.sourceDigest",
    "ps1_",
    issues,
  ) as ProviderSourceDigest | undefined;
  return provider !== undefined && adapterProtocol !== undefined && identity.ok && projectionDigest !== undefined && sourceDigest !== undefined
    ? Object.freeze({ provider, adapterProtocol, marketplaceIdentity: identity.value, projectionDigest, sourceDigest })
    : undefined;
}

function parseLineage(input: unknown, issues: ProviderDeploymentIssue[]): ReceiptLineage | undefined {
  if (input !== null && typeof input === "object" && !Array.isArray(input) && Object.hasOwn(input, "kind")) {
    const kind = (input as { readonly kind?: unknown }).kind;
    if (kind === "initial") {
      return exactRecord(input, ["kind"], "receipt.body.lineage", issues) ? Object.freeze({ kind }) : undefined;
    }
    if (kind === "successor") {
      if (!exactRecord(input, ["kind", "priorReceiptDigest"], "receipt.body.lineage", issues)) return undefined;
      const digest = parseDigest(input.priorReceiptDigest, "receipt.body.lineage.priorReceiptDigest", "tr1_", issues) as TargetReceiptDigest | undefined;
      return digest === undefined ? undefined : Object.freeze({ kind, priorReceiptDigest: digest });
    }
  }
  issues.push(issue("INVALID_RECEIPT", "receipt.body.lineage", "Receipt lineage must be initial or successor"));
  return undefined;
}

function parseScope(input: unknown, issues: ProviderDeploymentIssue[]): TargetReceiptScope | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input) || !Object.hasOwn(input, "kind")) {
    issues.push(issue("INVALID_RECEIPT", "receipt.body.scope", "Receipt scope must be a closed object"));
    return undefined;
  }
  const kind = (input as { readonly kind?: unknown }).kind;
  const commonKeys = ["adapterProtocol", "capabilityProfileDigest", "kind", "projectionDigest", "requestDigest", "verifiedMembers", "visibleFingerprint"];
  const modeKeys = kind === "targeted-test"
    ? ["evaluationProfile", "releases"]
    : kind === "complete-test"
      ? ["evaluationProfile", "releaseSet"]
      : kind === "canonical-accepted"
        ? ["acceptanceDigest", "channel", "promotionDigest", "releaseSet"]
        : [];
  if (modeKeys.length === 0 || !exactRecord(input, [...commonKeys, ...modeKeys].sort(compareCanonical), "receipt.body.scope", issues)) {
    if (modeKeys.length === 0) issues.push(issue("INVALID_RECEIPT", "receipt.body.scope.kind", "Receipt scope kind is unsupported", "targeted-test|complete-test|canonical-accepted", String(kind)));
    return undefined;
  }
  const common = parseScopeCommon(input, issues);
  if (common === undefined) return undefined;
  if (kind === "targeted-test") {
    const refs = parseReleaseRefs(input.releases, "receipt.body.scope.releases", issues);
    const profile = parseEvaluation(input.evaluationProfile, issues);
    return refs === undefined || profile === undefined ? undefined : Object.freeze({ kind, ...common, releases: refs, evaluationProfile: profile });
  }
  const ref = parseSetRef(input.releaseSet, issues);
  if (ref === undefined) return undefined;
  if (kind === "complete-test") {
    const profile = parseEvaluation(input.evaluationProfile, issues);
    return profile === undefined ? undefined : Object.freeze({ kind, ...common, releaseSet: ref, evaluationProfile: profile });
  }
  if (input.channel !== "current-main") issues.push(issue("INVALID_RECEIPT", "receipt.body.scope.channel", "Canonical receipt channel must be current-main", "current-main", String(input.channel)));
  const acceptance = parseRecordDigest(input.acceptanceDigest, "receipt.body.scope.acceptanceDigest", issues);
  const promotion = parseRecordDigest(input.promotionDigest, "receipt.body.scope.promotionDigest", issues);
  return input.channel === "current-main" && acceptance !== undefined && promotion !== undefined
    ? Object.freeze({ kind: "canonical-accepted", ...common, releaseSet: ref, acceptanceDigest: acceptance, promotionDigest: promotion, channel: input.channel })
    : undefined;
}

function parseScopeCommon(input: Record<string, unknown>, issues: ProviderDeploymentIssue[]): ReceiptScopeCommon | undefined {
  const requestDigest = parseDigest(input.requestDigest, "receipt.body.scope.requestDigest", "prq1_", issues) as ProviderRequestDigest | undefined;
  const projectionDigest = parseDigest(input.projectionDigest, "receipt.body.scope.projectionDigest", "ap1_", issues) as ProjectionDigest | undefined;
  const adapterProtocol = parseProtocol(input.adapterProtocol, issues);
  const capability = parseDigest(input.capabilityProfileDigest, "receipt.body.scope.capabilityProfileDigest", "cp1_", issues) as CapabilityProfileDigest | undefined;
  const fingerprint = parseDigest(input.visibleFingerprint, "receipt.body.scope.visibleFingerprint", "vf1_", issues) as VisibleFingerprint | undefined;
  const members = parseMembers(input.verifiedMembers, "receipt.body.scope.verifiedMembers", issues);
  return requestDigest !== undefined && projectionDigest !== undefined && adapterProtocol !== undefined && capability !== undefined && fingerprint !== undefined && members !== undefined
    ? { requestDigest, projectionDigest, adapterProtocol, capabilityProfileDigest: capability, visibleFingerprint: fingerprint, verifiedMembers: members }
    : undefined;
}

function parseMembers(input: unknown, path: string, issues: ProviderDeploymentIssue[]): readonly VerifiedMemberIdentity[] | undefined {
  return parseMemberList(input, path, issues, false) as readonly VerifiedMemberIdentity[] | undefined;
}

function parseManagedMembers(input: unknown, path: string, issues: ProviderDeploymentIssue[]): readonly ManagedMemberClaim[] | undefined {
  return parseMemberList(input, path, issues, true) as readonly ManagedMemberClaim[] | undefined;
}

function parseMemberList(
  input: unknown,
  path: string,
  issues: ProviderDeploymentIssue[],
  managed: boolean,
): readonly (VerifiedMemberIdentity | ManagedMemberClaim)[] | undefined {
  const raw = boundedArray(input, path, MAX_MEMBERS, issues);
  if (raw === undefined) return undefined;
  const members: Array<VerifiedMemberIdentity | ManagedMemberClaim> = [];
  for (const [index, candidate] of raw.entries()) {
    const keys = managed
      ? ["artifactAuthority", "memberFingerprint", "nativeIdentity", "pluginId", "providerSourceIdentity", "sourceProjectionDigest"]
      : ["artifactAuthority", "memberFingerprint", "nativeIdentity", "pluginId", "providerSourceIdentity"];
    if (!exactRecord(candidate, keys, `${path}[${index}]`, issues)) continue;
    const plugin = parsePluginId(candidate.pluginId, `${path}[${index}].pluginId`);
    if (!plugin.ok) issues.push(...plugin.issues.map((entry) => issue("INVALID_PLUGIN_ID", entry.path, entry.message)));
    const identity = canonicalString(candidate.nativeIdentity, `${path}[${index}].nativeIdentity`, issues, { maxBytes: 512, pattern: IDENTITY_PATTERN });
    const authority = parseArtifactAuthority(candidate.artifactAuthority, `${path}[${index}].artifactAuthority`, issues);
    const source = parseContentAuthority(candidate.providerSourceIdentity, `${path}[${index}].providerSourceIdentity`);
    if (!source.ok) issues.push(...source.issues.map((entry) => issue("INVALID_RECEIPT", entry.path, entry.message)));
    if (authority !== undefined && source.ok && source.value !== authority.contentAuthority) {
      issues.push(issue(
        "INVALID_RECEIPT",
        `${path}[${index}].providerSourceIdentity`,
        "Provider source identity must equal the verified content authority",
        authority.contentAuthority,
        source.value,
      ));
    }
    const fingerprint = parseDigest(candidate.memberFingerprint, `${path}[${index}].memberFingerprint`, "pm1_", issues) as ProviderMemberFingerprint | undefined;
    const sourceProjectionDigest = managed
      ? parseDigest(candidate.sourceProjectionDigest, `${path}[${index}].sourceProjectionDigest`, "ap1_", issues) as ProjectionDigest | undefined
      : undefined;
    if (
      plugin.ok
      && identity !== undefined
      && authority !== undefined
      && source.ok
      && fingerprint !== undefined
      && (!managed || sourceProjectionDigest !== undefined)
    ) {
      members.push(Object.freeze({
        pluginId: plugin.value,
        nativeIdentity: identity,
        artifactAuthority: authority,
        providerSourceIdentity: source.value,
        memberFingerprint: fingerprint,
        ...(sourceProjectionDigest === undefined ? {} : { sourceProjectionDigest }),
      }));
    }
  }
  members.sort(compareMembers);
  for (let index = 1; index < members.length; index += 1) {
    if (members[index - 1]?.pluginId === members[index]?.pluginId || members[index - 1]?.nativeIdentity === members[index]?.nativeIdentity) {
      issues.push(issue("INVALID_RECEIPT", path, "Receipt members must have unique plugin and native identities"));
    }
  }
  return Object.freeze(members);
}

function parseArtifactAuthority(
  input: unknown,
  path: string,
  issues: ProviderDeploymentIssue[],
): ProviderArtifactAuthority | undefined {
  if (!exactRecord(input, ["contentAuthority", "protocol", "sourceCommit"], path, issues)) return undefined;
  if (input.protocol !== PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL) {
    issues.push(issue(
      "INVALID_RECEIPT",
      `${path}.protocol`,
      "Provider artifact authority protocol is invalid",
      PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
      String(input.protocol),
    ));
  }
  const authority = parseContentAuthority(input.contentAuthority, `${path}.contentAuthority`);
  if (!authority.ok) issues.push(...authority.issues.map((entry) => issue("INVALID_RECEIPT", entry.path, entry.message)));
  const commit = parseGitCommitId(input.sourceCommit, `${path}.sourceCommit`);
  if (!commit.ok) issues.push(...commit.issues.map((entry) => issue("INVALID_RECEIPT", entry.path, entry.message)));
  return input.protocol === PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL && authority.ok && commit.ok
    ? Object.freeze({ protocol: input.protocol, contentAuthority: authority.value, sourceCommit: commit.value })
    : undefined;
}

function parseReleaseRefs(input: unknown, path: string, issues: ProviderDeploymentIssue[]): readonly ReleaseArtifactRef[] | undefined {
  const raw = boundedArray(input, path, MAX_MEMBERS, issues);
  if (raw === undefined) return undefined;
  const refs: ReleaseArtifactRef[] = [];
  for (const candidate of raw) {
    const parsed = parseArtifactRef(candidate);
    if (!parsed.ok || parsed.value.kind !== "release") issues.push(issue("INVALID_RECEIPT", path, "Targeted scope requires release refs"));
    else refs.push(parsed.value);
  }
  refs.sort((left, right) => compareCanonical(left.releaseDigest, right.releaseDigest));
  return Object.freeze(refs);
}

function parseSetRef(input: unknown, issues: ProviderDeploymentIssue[]): CompleteSetArtifactRef | undefined {
  const parsed = parseArtifactRef(input);
  if (!parsed.ok || parsed.value.kind !== "complete-set") {
    issues.push(issue("INVALID_RECEIPT", "receipt.body.scope.releaseSet", "Scope requires a complete-set ref"));
    return undefined;
  }
  return parsed.value;
}

function parseEvaluation(input: unknown, issues: ProviderDeploymentIssue[]): EvaluationProfile | undefined {
  return canonicalString(input, "receipt.body.scope.evaluationProfile", issues, { maxBytes: 256, pattern: EVALUATION_PATTERN, code: "INVALID_EVALUATION_PROFILE" }) as EvaluationProfile | undefined;
}

function parseProtocol(
  input: unknown,
  issues: ProviderDeploymentIssue[],
  path = "receipt.body.scope.adapterProtocol",
): AdapterProtocol | undefined {
  return canonicalString(input, path, issues, { maxBytes: 256, pattern: PROTOCOL_PATTERN, code: "INVALID_PROTOCOL" }) as AdapterProtocol | undefined;
}

function parseRecordDigest(input: unknown, path: string, issues: ProviderDeploymentIssue[]): LifecycleRecordDigest | undefined {
  return canonicalString(input, path, issues, { maxBytes: 128, pattern: RECORD_DIGEST_PATTERN, code: "INVALID_DIGEST" }) as LifecycleRecordDigest | undefined;
}

function parseDigest(input: unknown, path: string, prefix: string, issues: ProviderDeploymentIssue[]): string | undefined {
  const parsed = canonicalString(input, path, issues, { maxBytes: 128, pattern: DIGEST_PATTERN, code: "INVALID_DIGEST" });
  if (parsed !== undefined && !parsed.startsWith(prefix)) {
    issues.push(issue("INVALID_DIGEST", path, `Digest must use ${prefix}`, prefix, parsed));
    return undefined;
  }
  return parsed;
}

function freezeBody(body: TargetReceiptBody): TargetReceiptBody {
  return Object.freeze({
    ...body,
    lineage: Object.freeze({ ...body.lineage }),
    marketplace: Object.freeze({ ...body.marketplace }),
    scope: Object.freeze({ ...body.scope, verifiedMembers: freezeMembers(body.scope.verifiedMembers) }),
    managedMembers: freezeMembers([...body.managedMembers].sort(compareMembers)),
  });
}

function freezeMembers<T extends VerifiedMemberIdentity>(members: readonly T[]): readonly T[] {
  return Object.freeze(members.map((member) => Object.freeze({
    ...member,
    artifactAuthority: Object.freeze({ ...member.artifactAuthority }),
  }))) as readonly T[];
}

function compareMembers(left: VerifiedMemberIdentity, right: VerifiedMemberIdentity): number {
  return compareCanonical(left.pluginId, right.pluginId) || compareCanonical(left.nativeIdentity, right.nativeIdentity);
}
