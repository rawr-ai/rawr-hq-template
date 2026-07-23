import type { CanonicalJsonValue } from "./canonical";
import { issue, sortReleaseIssues, type ReleaseIssue } from "./issues";
import { collect, isExactRecord, parseBoundedArray } from "./parse";
import {
  MAX_OWNERSHIP_CLAIMS,
  OWNERSHIP_INDEX_SCHEMA_VERSION,
  compareCanonicalText,
  parseOwnershipIdentity,
  parsePluginId,
  type OwnershipIdentity,
  type OwnershipIndexSchemaVersion,
  type PluginId,
} from "./primitives";
import { asNonEmpty, failure, success, type ReleaseResult } from "./result";

declare const distributionOwnershipIndexBrand: unique symbol;

export type OwnershipClaimKind = "plugin" | "skill" | "alias" | "provider-identity" | "destination";
export type DeclaredOwnershipClaimKind = Exclude<OwnershipClaimKind, "plugin">;

export interface OwnershipClaim {
  readonly kind: OwnershipClaimKind;
  readonly identity: OwnershipIdentity;
  readonly ownerPluginId: PluginId;
}

export type DistributionOwnershipIndex = Readonly<{
  schemaVersion: OwnershipIndexSchemaVersion;
  claims: readonly OwnershipClaim[];
  [distributionOwnershipIndexBrand]: "DistributionOwnershipIndex";
}>;

export function createDistributionOwnershipIndex(
  memberIds: readonly PluginId[],
  declaredClaims: readonly OwnershipClaim[]
): ReleaseResult<DistributionOwnershipIndex, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const claims: OwnershipClaim[] = [];
  for (const memberId of memberIds) {
    const identity = collect(
      parseOwnershipIdentity(memberId, `ownership.members.${memberId}`),
      issues
    );
    if (identity !== undefined) {
      claims.push(Object.freeze({ kind: "plugin", identity, ownerPluginId: memberId }));
    }
  }
  claims.push(...declaredClaims);
  if (claims.length > MAX_OWNERSHIP_CLAIMS) {
    issues.push(
      issue(
        "COUNT_LIMIT_EXCEEDED",
        "ownership.claims",
        "Ownership claims exceed the protocol limit",
        {
          expected: MAX_OWNERSHIP_CLAIMS,
          actual: claims.length,
        }
      )
    );
  }
  validateClaims(claims.slice(0, MAX_OWNERSHIP_CLAIMS), memberIds, issues);
  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  return success(freezeIndex(claims));
}

export function parseDeclaredOwnershipClaims(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): readonly OwnershipClaim[] | undefined {
  return parseClaims(input, path, issues, false);
}

export function parseDistributionOwnershipIndex(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): DistributionOwnershipIndex | undefined {
  if (!isExactRecord(input, ["claims", "schemaVersion"], path, issues)) return undefined;
  if (input.schemaVersion !== OWNERSHIP_INDEX_SCHEMA_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        `${path}.schemaVersion`,
        "Unsupported ownership-index version",
        {
          expected: OWNERSHIP_INDEX_SCHEMA_VERSION,
          actual:
            typeof input.schemaVersion === "number"
              ? input.schemaVersion
              : String(input.schemaVersion),
        }
      )
    );
  }
  const claims = parseClaims(input.claims, `${path}.claims`, issues, true);
  if (claims === undefined) return undefined;
  const memberIds = claims
    .filter((claim) => claim.kind === "plugin")
    .map((claim) => claim.ownerPluginId);
  validateClaims(claims, memberIds, issues);
  return freezeIndex(claims);
}

export function ownershipIndexValue(index: DistributionOwnershipIndex): CanonicalJsonValue {
  return {
    schemaVersion: index.schemaVersion,
    claims: index.claims.map((claim) => ({
      kind: claim.kind,
      identity: claim.identity,
      ownerPluginId: claim.ownerPluginId,
    })),
  };
}

export function ownershipClaimsFor(
  index: DistributionOwnershipIndex,
  ownerPluginId: PluginId,
  kind?: OwnershipClaimKind
): readonly OwnershipClaim[] {
  return Object.freeze(
    index.claims.filter(
      (claim) =>
        claim.ownerPluginId === ownerPluginId && (kind === undefined || claim.kind === kind)
    )
  );
}

function parseClaims(
  input: unknown,
  path: string,
  issues: ReleaseIssue[],
  allowPlugin: boolean
): readonly OwnershipClaim[] | undefined {
  const values = parseBoundedArray(input, path, MAX_OWNERSHIP_CLAIMS, issues);
  if (values === undefined) return undefined;
  const claims: OwnershipClaim[] = [];
  values.forEach((candidate, index) => {
    const claimPath = `${path}[${index}]`;
    if (!isExactRecord(candidate, ["identity", "kind", "ownerPluginId"], claimPath, issues)) return;
    const kind = parseClaimKind(candidate.kind, `${claimPath}.kind`, allowPlugin, issues);
    const identity = collect(
      parseOwnershipIdentity(candidate.identity, `${claimPath}.identity`),
      issues
    );
    const ownerPluginId = collect(
      parsePluginId(candidate.ownerPluginId, `${claimPath}.ownerPluginId`),
      issues
    );
    if (kind !== undefined && identity !== undefined && ownerPluginId !== undefined) {
      claims.push(Object.freeze({ kind, identity, ownerPluginId }));
    }
  });
  claims.sort(compareClaims);
  return Object.freeze(claims);
}

function parseClaimKind(
  value: unknown,
  path: string,
  allowPlugin: boolean,
  issues: ReleaseIssue[]
): OwnershipClaimKind | undefined {
  const allowed: readonly OwnershipClaimKind[] = allowPlugin
    ? ["alias", "destination", "plugin", "provider-identity", "skill"]
    : ["alias", "destination", "provider-identity", "skill"];
  if (typeof value !== "string" || !allowed.includes(value as OwnershipClaimKind)) {
    issues.push(issue("INVALID_STRING", path, `Ownership kind must be ${allowed.join(", ")}`));
    return undefined;
  }
  return value as OwnershipClaimKind;
}

function validateClaims(
  claims: readonly OwnershipClaim[],
  memberIds: readonly PluginId[],
  issues: ReleaseIssue[]
): void {
  const memberSet = new Set(memberIds);
  const pluginOwners = new Set<PluginId>();
  for (const claim of claims) {
    if (!memberSet.has(claim.ownerPluginId)) {
      issues.push(
        issue(
          "MISSING_OWNER",
          `ownership.claims.${claim.kind}.${claim.identity}`,
          "Claim owner is not a declared release member",
          {
            claimKind: claim.kind,
            claim: claim.identity,
            claimants: [claim.ownerPluginId],
          }
        )
      );
    }
    if (claim.kind === "plugin") {
      const pluginIdentity = claim.identity as string;
      const ownerPluginId = claim.ownerPluginId as string;
      if (pluginIdentity !== ownerPluginId) {
        issues.push(
          issue(
            "OWNERSHIP_INDEX_MISMATCH",
            `ownership.claims.plugin.${claim.identity}`,
            "Plugin ownership identity must equal its curated member identity",
            {
              expected: claim.ownerPluginId,
              actual: claim.identity,
            }
          )
        );
      }
      if (pluginOwners.has(claim.ownerPluginId)) {
        issues.push(
          issue(
            "OWNERSHIP_INDEX_MISMATCH",
            `ownership.claims.plugin.${claim.ownerPluginId}`,
            "A curated member must have exactly one plugin ownership claim",
            { actual: claim.ownerPluginId }
          )
        );
      }
      pluginOwners.add(claim.ownerPluginId);
    }
  }
  for (const memberId of memberSet) {
    if (!pluginOwners.has(memberId)) {
      issues.push(
        issue(
          "OWNERSHIP_INDEX_MISMATCH",
          `ownership.claims.plugin.${memberId}`,
          "A curated member is missing its plugin ownership claim",
          { actual: memberId }
        )
      );
    }
  }

  const groups = new Map<string, OwnershipClaim[]>();
  for (const claim of claims) {
    const key = `${claim.kind}\u0000${claim.identity}`;
    const group = groups.get(key) ?? [];
    group.push(claim);
    groups.set(key, group);
  }
  for (const group of groups.values()) reportClaimGroup(group, issues);

  const routing = new Map<string, OwnershipClaim[]>();
  for (const claim of claims.filter((entry) => entry.kind === "plugin" || entry.kind === "alias")) {
    const group = routing.get(claim.identity) ?? [];
    group.push(claim);
    routing.set(claim.identity, group);
  }
  for (const [identity, group] of routing) {
    const owners = uniqueOwners(group);
    if (owners.length > 1 || new Set(group.map((entry) => entry.kind)).size > 1) {
      issues.push(
        issue(
          "OWNERSHIP_CONFLICT",
          `ownership.routing.${identity}`,
          "Plugin identity and alias namespace is ambiguous",
          {
            claimKind: "plugin-routing",
            claim: identity,
            claimants: owners,
          }
        )
      );
    }
  }
}

function reportClaimGroup(group: readonly OwnershipClaim[], issues: ReleaseIssue[]): void {
  if (group.length < 2) return;
  const first = group[0]!;
  const owners = uniqueOwners(group);
  issues.push(
    issue(
      owners.length === 1 ? "DUPLICATE_OWNERSHIP_CLAIM" : "OWNERSHIP_CONFLICT",
      `ownership.claims.${first.kind}.${first.identity}`,
      owners.length === 1 ? "Ownership claim is duplicated" : "Ownership claim has multiple owners",
      {
        claimKind: first.kind,
        claim: first.identity,
        claimants: owners,
      }
    )
  );
}

function uniqueOwners(group: readonly OwnershipClaim[]): string[] {
  return [...new Set(group.map((entry) => entry.ownerPluginId))].sort(compareCanonicalText);
}

function compareClaims(left: OwnershipClaim, right: OwnershipClaim): number {
  return (
    compareCanonicalText(left.kind, right.kind) ||
    compareCanonicalText(left.identity, right.identity) ||
    compareCanonicalText(left.ownerPluginId, right.ownerPluginId)
  );
}

function freezeIndex(claims: readonly OwnershipClaim[]): DistributionOwnershipIndex {
  return Object.freeze({
    schemaVersion: OWNERSHIP_INDEX_SCHEMA_VERSION,
    claims: Object.freeze([...claims].sort(compareClaims)),
  }) as DistributionOwnershipIndex;
}
