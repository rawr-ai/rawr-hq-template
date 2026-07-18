import {
  contentDigest,
  parseReleaseRelativePath,
  type CompleteSetArtifactRef,
  type ContentAuthority,
  type ContentDigest,
  type GitCommitId,
  type NormalizedFileMode,
  type PluginId,
  type ReleaseArtifactRef,
  type ReleaseRelativePath,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "../../../../shared/release";

import { canonicalBytes, canonicalDigest, compareCanonical, type CanonicalValue } from "../helpers/canonical";
import { canonicalString } from "../helpers/parse";
import { failure, firstIssue, issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../errors/deployment-result";
import type { ProviderId } from "../dto/provider-target";
import { releaseRefValue, setRefValue } from "../dto/mode";

declare const adapterProtocolBrand: unique symbol;
declare const rendererProtocolBrand: unique symbol;
declare const projectionDigestBrand: unique symbol;
declare const capabilityProfileDigestBrand: unique symbol;
declare const memberFingerprintBrand: unique symbol;
declare const providerSourceDigestBrand: unique symbol;

export type AdapterProtocol = string & { readonly [adapterProtocolBrand]: "AdapterProtocol" };
export type RendererProtocol = string & { readonly [rendererProtocolBrand]: "RendererProtocol" };
export type ProjectionDigest = string & { readonly [projectionDigestBrand]: "ProjectionDigest" };
export type CapabilityProfileDigest = string & { readonly [capabilityProfileDigestBrand]: "CapabilityProfileDigest" };
export type ProviderMemberFingerprint = string & { readonly [memberFingerprintBrand]: "ProviderMemberFingerprint" };
export type ProviderSourceDigest = string & { readonly [providerSourceDigestBrand]: "ProviderSourceDigest" };
export type ProviderSourceIdentity = ContentAuthority;

export const CODEX_RENDERER_PROTOCOL = "rawr-provider-renderer/codex@v1" as RendererProtocol;
export const CLAUDE_RENDERER_PROTOCOL = "rawr-provider-renderer/claude@v1" as RendererProtocol;
export const PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL = "agent-plugin-artifact-authority@v1" as const;
export const PROVIDER_PROJECTION_SCHEMA_VERSION = 1 as const;

export interface ProviderArtifactAuthority {
  readonly protocol: typeof PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL;
  readonly contentAuthority: ContentAuthority;
  readonly sourceCommit: GitCommitId;
}

export type ProviderCapability =
  | "managed-retire"
  | "native-plugin-enable"
  | "native-plugin-install"
  | "visible-hook-inventory"
  | "visible-plugin-inventory"
  | "visible-skill-inventory";

export interface CapabilityProfile {
  readonly schemaVersion: typeof PROVIDER_PROJECTION_SCHEMA_VERSION;
  readonly provider: ProviderId;
  readonly adapterProtocol: AdapterProtocol;
  readonly required: readonly ProviderCapability[];
  readonly capabilityProfileDigest: CapabilityProfileDigest;
}

export interface CapabilityObservation {
  readonly provider: ProviderId;
  readonly adapterProtocol: AdapterProtocol;
  readonly available: readonly ProviderCapability[];
}

export interface CapabilityEvaluation {
  readonly compatible: boolean;
  readonly missing: readonly ProviderCapability[];
}

export interface ProviderVisibleClaimSet {
  readonly pluginIdentity: string;
  readonly skills: readonly string[];
  readonly hooks: readonly string[];
}

export interface ProviderPackageFile {
  readonly path: ReleaseRelativePath;
  readonly mode: NormalizedFileMode;
  readonly contentDigest: ContentDigest;
  readonly bytes: Uint8Array;
}

export interface ProviderProjectionMember {
  readonly pluginId: PluginId;
  readonly releaseRef: ReleaseArtifactRef;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly nativeIdentity: string;
  readonly files: readonly ProviderPackageFile[];
  readonly visible: ProviderVisibleClaimSet;
  readonly memberFingerprint: ProviderMemberFingerprint;
}

export interface ProviderMarketplaceProjection {
  readonly identity: ProviderSourceIdentity;
  readonly sourceDigest: ProviderSourceDigest;
  readonly files: readonly ProviderPackageFile[];
}

export type ProjectionSource =
  | Readonly<{ kind: "targeted"; releases: readonly ReleaseArtifactRef[] }>
  | Readonly<{ kind: "complete-set"; releaseSet: CompleteSetArtifactRef }>;

export interface AgentProviderProjection {
  readonly schemaVersion: typeof PROVIDER_PROJECTION_SCHEMA_VERSION;
  readonly provider: ProviderId;
  readonly rendererProtocol: RendererProtocol;
  readonly adapterProtocol: AdapterProtocol;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly source: ProjectionSource;
  readonly marketplace: ProviderMarketplaceProjection;
  readonly capabilityProfile: CapabilityProfile;
  readonly members: readonly ProviderProjectionMember[];
  readonly projectionDigest: ProjectionDigest;
}

const PROTOCOL_PATTERN = /^[a-z0-9][a-z0-9._/-]*@v[1-9][0-9]*$/u;
const PROJECTION_DIGEST_PATTERN = /^ap1_[0-9a-f]{64}$/u;
const CAPABILITY_PROFILE_DIGEST_PATTERN = /^cp1_[0-9a-f]{64}$/u;

export function parseAdapterProtocol(input: unknown, path = "adapterProtocol"): DeploymentResult<AdapterProtocol> {
  const issues: ProviderDeploymentIssue[] = [];
  const parsed = canonicalString(input, path, issues, {
    maxBytes: 256,
    pattern: PROTOCOL_PATTERN,
    code: "INVALID_PROTOCOL",
  });
  return parsed === undefined
    ? failure(firstIssue(issues, issue("INVALID_PROTOCOL", path, "Adapter protocol is invalid")))
    : success(parsed as AdapterProtocol);
}

export function parseProjectionDigest(
  input: unknown,
  path = "projectionDigest",
): DeploymentResult<ProjectionDigest> {
  return parseBrandedDigest(
    input,
    path,
    PROJECTION_DIGEST_PATTERN,
    "projection",
    (value) => value as ProjectionDigest,
  );
}

export function parseCapabilityProfileDigest(
  input: unknown,
  path = "capabilityProfileDigest",
): DeploymentResult<CapabilityProfileDigest> {
  return parseBrandedDigest(
    input,
    path,
    CAPABILITY_PROFILE_DIGEST_PATTERN,
    "capability profile",
    (value) => value as CapabilityProfileDigest,
  );
}

export function renderTargetedProjection(
  provider: ProviderId,
  adapterProtocol: AdapterProtocol,
  snapshots: readonly VerifiedArtifactSnapshotV1[],
): DeploymentResult<AgentProviderProjection> {
  const releases: VerifiedReleaseArtifactV1[] = [];
  const issues: ProviderDeploymentIssue[] = [];
  for (const [index, snapshot] of snapshots.entries()) {
    if (snapshot.kind !== "release") {
      issues.push(issue("ARTIFACT_KIND_MISMATCH", `snapshots[${index}]`, "Targeted projection requires only release snapshots", "release", snapshot.kind));
    } else {
      releases.push(snapshot);
    }
  }
  releases.sort((left, right) => compareCanonical(left.release.artifactBody.releaseBody.pluginId, right.release.artifactBody.releaseBody.pluginId));
  return renderProjection(provider, adapterProtocol, Object.freeze({
    kind: "targeted",
    releases: Object.freeze(releases.map((snapshot) => snapshot.ref)),
  }), releases, null, issues);
}

export function renderCompleteProjection(
  provider: ProviderId,
  adapterProtocol: AdapterProtocol,
  snapshot: VerifiedArtifactSnapshotV1,
): DeploymentResult<AgentProviderProjection> {
  if (snapshot.kind !== "complete-set") {
    return failure([issue("ARTIFACT_KIND_MISMATCH", "snapshot", "Complete projection requires a complete-set snapshot", "complete-set", snapshot.kind)]);
  }
  const members = [...snapshot.members].sort((left, right) => compareCanonical(
    left.release.artifactBody.releaseBody.pluginId,
    right.release.artifactBody.releaseBody.pluginId,
  ));
  return renderProjection(
    provider,
    adapterProtocol,
    Object.freeze({ kind: "complete-set", releaseSet: snapshot.ref }),
    members,
    artifactAuthority(snapshot.releaseSet.body.contentAuthority, snapshot.releaseSet.body.sourceCommit),
    [],
  );
}

export function evaluateCapabilities(
  profile: CapabilityProfile,
  observation: CapabilityObservation,
): CapabilityEvaluation {
  if (profile.provider !== observation.provider || profile.adapterProtocol !== observation.adapterProtocol) {
    return Object.freeze({ compatible: false, missing: profile.required });
  }
  const available = new Set(observation.available);
  const missing = profile.required.filter((entry) => !available.has(entry));
  return Object.freeze({ compatible: missing.length === 0, missing: Object.freeze(missing) });
}

export function projectionValue(projection: Omit<AgentProviderProjection, "projectionDigest">): CanonicalValue {
  return {
    schemaVersion: projection.schemaVersion,
    provider: projection.provider,
    rendererProtocol: projection.rendererProtocol,
    adapterProtocol: projection.adapterProtocol,
    artifactAuthority: artifactAuthorityValue(projection.artifactAuthority),
    source: projectionSourceValue(projection.source),
    marketplace: marketplaceValue(projection.marketplace),
    capabilityProfile: capabilityProfileValue(projection.capabilityProfile),
    members: projection.members.map(memberValue),
  };
}

export function marketplaceValue(marketplace: ProviderMarketplaceProjection): CanonicalValue {
  return {
    identity: marketplace.identity,
    sourceDigest: marketplace.sourceDigest,
    files: marketplace.files.map((file) => ({
      path: file.path,
      mode: file.mode,
      contentDigest: file.contentDigest,
    })),
  };
}

export function memberValue(member: ProviderProjectionMember): CanonicalValue {
  return {
    pluginId: member.pluginId,
    releaseRef: releaseRefValue(member.releaseRef),
    artifactAuthority: artifactAuthorityValue(member.artifactAuthority),
    providerSourceIdentity: member.providerSourceIdentity,
    nativeIdentity: member.nativeIdentity,
    files: member.files.map((file) => ({
      path: file.path,
      mode: file.mode,
      contentDigest: file.contentDigest,
    })),
    visible: {
      pluginIdentity: member.visible.pluginIdentity,
      skills: member.visible.skills,
      hooks: member.visible.hooks,
    },
    memberFingerprint: member.memberFingerprint,
  };
}

export function artifactAuthorityValue(authority: ProviderArtifactAuthority): CanonicalValue {
  return {
    protocol: authority.protocol,
    contentAuthority: authority.contentAuthority,
    sourceCommit: authority.sourceCommit,
  };
}

export function providerSourceIdentity(authority: ProviderArtifactAuthority): ProviderSourceIdentity {
  return authority.contentAuthority;
}

export function capabilityProfileValue(profile: CapabilityProfile): CanonicalValue {
  return {
    schemaVersion: profile.schemaVersion,
    provider: profile.provider,
    adapterProtocol: profile.adapterProtocol,
    required: profile.required,
  };
}

function renderProjection(
  provider: ProviderId,
  adapterProtocol: AdapterProtocol,
  source: ProjectionSource,
  snapshots: readonly VerifiedReleaseArtifactV1[],
  expectedArtifactAuthority: ProviderArtifactAuthority | null,
  initialIssues: readonly ProviderDeploymentIssue[],
): DeploymentResult<AgentProviderProjection> {
  const issues = [...initialIssues];
  const members: ProviderProjectionMember[] = [];
  const seen = new Set<string>();
  const firstSnapshot = snapshots[0];
  const authority = expectedArtifactAuthority ?? (firstSnapshot === undefined ? null : authorityFromSnapshot(firstSnapshot));
  for (const [index, snapshot] of snapshots.entries()) {
    const pluginId = snapshot.release.artifactBody.releaseBody.pluginId;
    if (seen.has(pluginId)) {
      issues.push(issue("DUPLICATE_MEMBER", `snapshots[${index}]`, "Projection members must be unique by curated plugin ID", "unique plugin ID", pluginId));
      continue;
    }
    seen.add(pluginId);
    const observedAuthority = authorityFromSnapshot(snapshot);
    if (authority !== null && !sameArtifactAuthority(authority, observedAuthority)) {
      issues.push(issue(
        "PROJECTION_MISMATCH",
        `snapshots[${index}].release.artifactBody.releaseBody`,
        "Every selected release must have the same content authority and source commit",
        `${authority.contentAuthority}@${authority.sourceCommit}`,
        `${observedAuthority.contentAuthority}@${observedAuthority.sourceCommit}`,
      ));
      continue;
    }
    const rendered = renderMember(provider, snapshot, observedAuthority);
    if (rendered.ok) members.push(rendered.value);
    else issues.push(...rendered.issues);
  }
  detectDuplicateClaims(members, issues);
  if (members.length === 0 && issues.length === 0) {
    issues.push(issue("DUPLICATE_MEMBER", "snapshots", "Projection must contain at least one member"));
  }
  if (authority === null && issues.length === 0) {
    issues.push(issue("PROJECTION_MISMATCH", "snapshots", "Projection requires an artifact authority"));
  }
  if (issues.length > 0) return failure(firstIssue(issues, issue("PROJECTION_MISMATCH", "projection", "Projection could not be rendered")));
  if (authority === null) return failure([issue("PROJECTION_MISMATCH", "projection", "Projection requires an artifact authority")]);
  const renderedMarketplace = renderMarketplace(provider, authority, members);
  if (!renderedMarketplace.ok) return renderedMarketplace;
  const marketplace = Object.freeze({
    ...renderedMarketplace.value,
    sourceDigest: canonicalDigest(
      "ps1_",
      providerSourceTreeValue(renderedMarketplace.value.files, members),
    ) as ProviderSourceDigest,
  });

  const required = new Set<ProviderCapability>([
    "managed-retire",
    "native-plugin-enable",
    "native-plugin-install",
    "visible-plugin-inventory",
  ]);
  if (members.some((member) => member.visible.skills.length > 0)) required.add("visible-skill-inventory");
  if (members.some((member) => member.visible.hooks.length > 0)) required.add("visible-hook-inventory");
  const requiredList = [...required].sort(compareCanonical);
  const profileBody = {
    schemaVersion: PROVIDER_PROJECTION_SCHEMA_VERSION,
    provider,
    adapterProtocol,
    required: Object.freeze(requiredList),
  } as const;
  const capabilityProfile = Object.freeze({
    ...profileBody,
    capabilityProfileDigest: canonicalDigest("cp1_", capabilityProfileValue(profileBody as CapabilityProfile)) as CapabilityProfileDigest,
  });
  const body = {
    schemaVersion: PROVIDER_PROJECTION_SCHEMA_VERSION,
    provider,
    rendererProtocol: rendererProtocol(provider),
    adapterProtocol,
    artifactAuthority: authority,
    source,
    marketplace,
    capabilityProfile,
    members: Object.freeze(members),
  } as const;
  return success(Object.freeze({
    ...body,
    projectionDigest: canonicalDigest("ap1_", projectionValue(body)) as ProjectionDigest,
  }));
}

function renderMember(
  provider: ProviderId,
  snapshot: VerifiedReleaseArtifactV1,
  authority: ProviderArtifactAuthority,
): DeploymentResult<ProviderProjectionMember> {
  const pluginId = snapshot.release.artifactBody.releaseBody.pluginId;
  const nativeIdentity = `rawr:${pluginId}`;
  const sourceIdentity = providerSourceIdentity(authority);
  const manifestPath = parseGeneratedPath(provider === "codex" ? ".codex-plugin/plugin.json" : ".claude-plugin/plugin.json");
  const version = `0.0.0-rawr.${authority.sourceCommit.slice(0, 12)}`;
  const manifestBytes = canonicalBytes({
    name: pluginId,
    version,
    description: `RAWR curated agent plugin ${pluginId}`,
    rawr: {
      artifactDigest: snapshot.ref.artifactDigest,
      releaseDigest: snapshot.ref.releaseDigest,
      artifactAuthority: artifactAuthorityValue(authority),
      providerSourceIdentity: sourceIdentity,
      nativeIdentity,
    },
    skills: "./skills/",
  });
  const files: ProviderPackageFile[] = [
    {
      path: manifestPath,
      mode: 0o644,
      contentDigest: contentDigest(manifestBytes),
      bytes: manifestBytes,
    },
  ];
  const seenPaths = new Set<string>([manifestPath]);
  for (const file of snapshot.files) {
    if (seenPaths.has(file.path)) {
      return failure([issue("PROJECTION_MISMATCH", "snapshot.files", "Release payload collides with provider-owned manifest path", "non-reserved path", file.path)]);
    }
    seenPaths.add(file.path);
    files.push(Object.freeze({
      path: file.path,
      mode: file.mode,
      contentDigest: file.contentDigest,
      bytes: new Uint8Array(file.bytes),
    }));
  }
  files.sort((left, right) => compareCanonical(left.path, right.path));
  const skills = visibleNames(files, /^skills\/([^/]+)\/SKILL\.md$/u);
  const hooks = visibleNames(files, /^(?:hooks|\.claude-plugin\/hooks|\.codex-plugin\/hooks)\/([^/]+)/u);
  const visible = Object.freeze({ pluginIdentity: nativeIdentity, skills, hooks });
  const body = {
    pluginId,
    releaseRef: snapshot.ref,
    artifactAuthority: authority,
    providerSourceIdentity: sourceIdentity,
    nativeIdentity,
    files: Object.freeze(files),
    visible,
  } as const;
  const fingerprint = canonicalDigest("pm1_", {
    pluginId,
    releaseRef: releaseRefValue(snapshot.ref),
    artifactAuthority: artifactAuthorityValue(authority),
    providerSourceIdentity: sourceIdentity,
    nativeIdentity,
    files: files.map((file) => ({ path: file.path, mode: file.mode, contentDigest: file.contentDigest })),
    visible: { pluginIdentity: nativeIdentity, skills, hooks },
  }) as ProviderMemberFingerprint;
  return success(Object.freeze({ ...body, memberFingerprint: fingerprint }));
}

function renderMarketplace(
  provider: ProviderId,
  authority: ProviderArtifactAuthority,
  members: readonly ProviderProjectionMember[],
): DeploymentResult<Omit<ProviderMarketplaceProjection, "sourceDigest">> {
  const identity = providerSourceIdentity(authority);
  if (!/^[a-z0-9][a-z0-9_-]*$/u.test(identity)) {
    return failure([issue(
      "PROJECTION_MISMATCH",
      "projection.artifactAuthority.contentAuthority",
      "Content authority must be a native provider marketplace identity",
      "lowercase letters, digits, underscore, or hyphen",
      identity,
    )]);
  }
  return success(Object.freeze({
    identity,
    files: Object.freeze([renderProviderMarketplaceManifestFile(provider, identity, members)]),
  }));
}

/** One canonical owner for provider-native marketplace manifest bytes. */
export function renderProviderMarketplaceManifestFile(
  provider: ProviderId,
  identity: ProviderSourceIdentity,
  members: readonly Pick<ProviderProjectionMember, "pluginId">[],
): ProviderPackageFile {
  const manifestPath = parseGeneratedPath(provider === "codex"
    ? ".agents/plugins/marketplace.json"
    : ".claude-plugin/marketplace.json");
  const manifestValue: CanonicalValue = provider === "codex"
    ? {
        name: identity,
        plugins: members.map((member) => ({
        name: member.pluginId,
        source: { source: "local", path: `./plugins/${member.pluginId}` },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "agent",
        })),
      }
    : {
        name: identity,
        version: "1.0.0",
        description: `RAWR curated agent plugin authority ${identity}`,
        owner: { name: "RAWR" },
        plugins: members.map((member) => ({
          name: member.pluginId,
          description: `RAWR curated agent plugin ${member.pluginId}`,
          source: `./plugins/${member.pluginId}`,
          category: "development",
        })),
      };
  const bytes = canonicalBytes(manifestValue);
  return Object.freeze({
    path: manifestPath,
    mode: 0o644,
    contentDigest: contentDigest(bytes),
    bytes,
  });
}

export function providerSourceTreeValue(
  marketplaceFiles: readonly ProviderPackageFile[],
  members: readonly ProviderProjectionMember[],
): CanonicalValue {
  const files = [
    ...marketplaceFiles.map((file) => ({
      path: file.path,
      mode: file.mode,
      contentDigest: file.contentDigest,
    })),
    ...members.flatMap((member) => member.files.map((file) => ({
      path: `plugins/${member.pluginId}/${file.path}`,
      mode: file.mode,
      contentDigest: file.contentDigest,
    }))),
  ].sort((left, right) => compareCanonical(left.path, right.path));
  return { files };
}

function artifactAuthority(contentAuthority: ContentAuthority, sourceCommit: GitCommitId): ProviderArtifactAuthority {
  return Object.freeze({
    protocol: PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
    contentAuthority,
    sourceCommit,
  });
}

function authorityFromSnapshot(snapshot: VerifiedReleaseArtifactV1): ProviderArtifactAuthority {
  const body = snapshot.release.artifactBody.releaseBody;
  return artifactAuthority(body.contentAuthority, body.sourceCommit);
}

function sameArtifactAuthority(left: ProviderArtifactAuthority, right: ProviderArtifactAuthority): boolean {
  return left.protocol === right.protocol
    && left.contentAuthority === right.contentAuthority
    && left.sourceCommit === right.sourceCommit;
}

function detectDuplicateClaims(
  members: readonly ProviderProjectionMember[],
  issues: ProviderDeploymentIssue[],
): void {
  const nativeIdentities = new Map<string, PluginId>();
  const pluginIdentities = new Map<string, PluginId>();
  const skills = new Map<string, PluginId>();
  const hooks = new Map<string, PluginId>();
  for (const [index, member] of members.entries()) {
    detectDuplicateClaim(nativeIdentities, member.nativeIdentity, member.pluginId, `members[${index}].nativeIdentity`, "native plugin identity", issues);
    detectDuplicateClaim(pluginIdentities, member.visible.pluginIdentity, member.pluginId, `members[${index}].visible.pluginIdentity`, "visible plugin identity", issues);
    for (const [skillIndex, skill] of member.visible.skills.entries()) {
      detectDuplicateClaim(skills, skill, member.pluginId, `members[${index}].visible.skills[${skillIndex}]`, "visible skill", issues);
    }
    for (const [hookIndex, hook] of member.visible.hooks.entries()) {
      detectDuplicateClaim(hooks, hook, member.pluginId, `members[${index}].visible.hooks[${hookIndex}]`, "visible hook", issues);
    }
  }
}

function detectDuplicateClaim(
  claims: Map<string, PluginId>,
  claim: string,
  pluginId: PluginId,
  path: string,
  label: string,
  issues: ProviderDeploymentIssue[],
): void {
  const existing = claims.get(claim);
  if (existing === undefined) {
    claims.set(claim, pluginId);
    return;
  }
  issues.push(issue(
    "DUPLICATE_MEMBER",
    path,
    `Projection members must not claim the same ${label}`,
    `unique across curated members (first claimed by ${existing})`,
    claim,
  ));
}

function visibleNames(files: readonly ProviderPackageFile[], pattern: RegExp): readonly string[] {
  const names = new Set<string>();
  for (const file of files) {
    const match = pattern.exec(file.path);
    if (match?.[1] !== undefined) names.add(match[1]);
  }
  return Object.freeze([...names].sort(compareCanonical));
}

function parseGeneratedPath(value: string): ReleaseRelativePath {
  const parsed = parseReleaseRelativePath(value, "generated.path");
  if (!parsed.ok) throw new Error(`Provider-owned path is not canonical: ${value}`);
  return parsed.value;
}

function parseBrandedDigest<T extends string>(
  input: unknown,
  path: string,
  pattern: RegExp,
  label: string,
  brand: (value: string) => T,
): DeploymentResult<T> {
  if (typeof input !== "string" || !pattern.test(input)) {
    return failure([issue("INVALID_DIGEST", path, `${label} digest is invalid`)]);
  }
  return success(brand(input));
}

function rendererProtocol(provider: ProviderId): RendererProtocol {
  return provider === "codex" ? CODEX_RENDERER_PROTOCOL : CLAUDE_RENDERER_PROTOCOL;
}

function projectionSourceValue(source: ProjectionSource): CanonicalValue {
  return source.kind === "targeted"
    ? { kind: source.kind, releases: source.releases.map(releaseRefValue) }
    : { kind: source.kind, releaseSet: setRefValue(source.releaseSet) };
}
