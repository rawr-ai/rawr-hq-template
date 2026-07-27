import { ReadonlyObject, type Static, Type } from "typebox";
import { Value } from "typebox/value";

import type { ReleaseIssue } from "../../model/dto/release-issue";
import { releaseIssue, sortReleaseIssues } from "../../model/policy/release-issue";

import type { CanonicalJsonValue } from "./canonical";
import { parseBoundedArray } from "./parse";
import {
  compareCanonicalText,
  MAX_OWNERSHIP_CLAIMS,
  OWNERSHIP_INDEX_SCHEMA_VERSION,
  OwnershipIdentitySchema,
  type PluginId,
  PluginIdSchema,
} from "./primitives";
import { asNonEmpty, failure, type ReleaseResult, success } from "./result";

declare const distributionOwnershipIndexBrand: unique symbol;

/** Enumerates every ownership namespace represented in a derived release index. */
export const OwnershipClaimKindSchema = Type.Union([
  Type.Literal("plugin"),
  Type.Literal("skill"),
  Type.Literal("alias"),
  Type.Literal("provider-identity"),
  Type.Literal("destination"),
]);

/** Admits only claim kinds a content repository may declare directly. */
export const DeclaredOwnershipClaimKindSchema = Type.Union([
  Type.Literal("skill"),
  Type.Literal("alias"),
  Type.Literal("provider-identity"),
  Type.Literal("destination"),
]);

/** Describes one structurally valid claim in a derived distribution index. */
export const OwnershipClaimSchema = ReadonlyObject(
  Type.Object({
    kind: OwnershipClaimKindSchema,
    identity: OwnershipIdentitySchema,
    ownerPluginId: PluginIdSchema,
  }),
  { additionalProperties: false }
);

/** Describes one content-declared claim; plugin claims remain service-derived. */
export const DeclaredOwnershipClaimSchema = ReadonlyObject(
  Type.Object({
    kind: DeclaredOwnershipClaimKindSchema,
    identity: OwnershipIdentitySchema,
    ownerPluginId: PluginIdSchema,
  }),
  { additionalProperties: false }
);

/** Bounds the full claim inventory before ownership semantics are evaluated. */
export const OwnershipClaimsSchema = ReadonlyObject(Type.Array(OwnershipClaimSchema), {
  maxItems: MAX_OWNERSHIP_CLAIMS,
});

/** Bounds content-declared claims without admitting derived plugin claims. */
export const DeclaredOwnershipClaimsSchema = ReadonlyObject(
  Type.Array(DeclaredOwnershipClaimSchema),
  { maxItems: MAX_OWNERSHIP_CLAIMS }
);

/** Owns the closed wire shape of a version-one distribution ownership index. */
export const DistributionOwnershipIndexRecordSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(OWNERSHIP_INDEX_SCHEMA_VERSION),
    claims: OwnershipClaimsSchema,
  }),
  { additionalProperties: false }
);

export type OwnershipClaimKind = Static<typeof OwnershipClaimKindSchema>;
export type DeclaredOwnershipClaimKind = Static<typeof DeclaredOwnershipClaimKindSchema>;
export type OwnershipClaim = Static<typeof OwnershipClaimSchema>;
export type DeclaredOwnershipClaim = Static<typeof DeclaredOwnershipClaimSchema>;
export type DistributionOwnershipIndexRecord = Static<
  typeof DistributionOwnershipIndexRecordSchema
>;

export type DistributionOwnershipIndex = DistributionOwnershipIndexRecord &
  Readonly<{
    [distributionOwnershipIndexBrand]: "DistributionOwnershipIndex";
  }>;

export function createDistributionOwnershipIndex(
  memberIds: readonly PluginId[],
  declaredClaims: readonly DeclaredOwnershipClaim[]
): ReleaseResult<DistributionOwnershipIndex, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const claims: OwnershipClaim[] = [];
  for (const memberId of memberIds) {
    if (!Value.Check(OwnershipIdentitySchema, memberId)) {
      issues.push(
        releaseIssue(
          "INVALID_OWNERSHIP_IDENTITY",
          `ownership.members.${memberId}`,
          "Plugin identity cannot enter the ownership namespace"
        )
      );
      continue;
    }
    claims.push(Object.freeze({ kind: "plugin", identity: memberId, ownerPluginId: memberId }));
  }
  claims.push(...declaredClaims);
  if (claims.length > MAX_OWNERSHIP_CLAIMS) {
    issues.push(
      releaseIssue(
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
): readonly DeclaredOwnershipClaim[] | undefined {
  const values = parseBoundedArray(input, path, MAX_OWNERSHIP_CLAIMS, issues);
  if (values === undefined) return undefined;
  if (!Value.Check(DeclaredOwnershipClaimsSchema, values)) {
    issues.push(
      releaseIssue(
        "EXPECTED_OBJECT",
        path,
        "Declared ownership claims must match the closed TypeBox schema"
      )
    );
    return undefined;
  }
  return freezeDeclaredClaims(values);
}

export function parseDistributionOwnershipIndex(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): DistributionOwnershipIndex | undefined {
  const initialIssueCount = issues.length;
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    issues.push(releaseIssue("EXPECTED_OBJECT", path, "Ownership index must be an object"));
    return undefined;
  }
  const record = input as Record<string, unknown>;
  const claims = parseBoundedArray(record.claims, `${path}.claims`, MAX_OWNERSHIP_CLAIMS, issues);
  if (claims === undefined) return undefined;
  const boundedRecord = { ...record, claims };
  if (!Value.Check(DistributionOwnershipIndexRecordSchema, boundedRecord)) {
    issues.push(
      releaseIssue("EXPECTED_OBJECT", path, "Ownership index must match the closed TypeBox schema")
    );
    return undefined;
  }
  const memberIds = boundedRecord.claims
    .filter((claim) => claim.kind === "plugin")
    .map((claim) => claim.ownerPluginId);
  validateClaims(boundedRecord.claims, memberIds, issues);
  if (issues.length !== initialIssueCount) return undefined;
  return freezeIndex(boundedRecord.claims);
}

export function ownershipIndexValue(index: DistributionOwnershipIndex): CanonicalJsonValue {
  return {
    schemaVersion: index.schemaVersion,
    claims: index.claims.map(ownershipClaimValue),
  };
}

/** Projects one validated claim into its canonical JSON representation. */
export function ownershipClaimValue(claim: OwnershipClaim): CanonicalJsonValue {
  return {
    kind: claim.kind,
    identity: claim.identity,
    ownerPluginId: claim.ownerPluginId,
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
        releaseIssue(
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
      if (compareCanonicalText(claim.identity, claim.ownerPluginId) !== 0) {
        issues.push(
          releaseIssue(
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
          releaseIssue(
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
        releaseIssue(
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
        releaseIssue(
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
    releaseIssue(
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

function freezeClaims(claims: readonly OwnershipClaim[]): readonly OwnershipClaim[] {
  return Object.freeze(
    claims
      .map((claim) =>
        Object.freeze({
          kind: claim.kind,
          identity: claim.identity,
          ownerPluginId: claim.ownerPluginId,
        })
      )
      .sort(compareClaims)
  );
}

function freezeDeclaredClaims(
  claims: readonly DeclaredOwnershipClaim[]
): readonly DeclaredOwnershipClaim[] {
  return Object.freeze(
    claims
      .map((claim) =>
        Object.freeze({
          kind: claim.kind,
          identity: claim.identity,
          ownerPluginId: claim.ownerPluginId,
        })
      )
      .sort(compareClaims)
  );
}

function freezeIndex(claims: readonly OwnershipClaim[]): DistributionOwnershipIndex {
  return Object.freeze({
    schemaVersion: OWNERSHIP_INDEX_SCHEMA_VERSION,
    claims: freezeClaims(claims),
  }) as DistributionOwnershipIndex;
}
