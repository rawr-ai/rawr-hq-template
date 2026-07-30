import { Value } from "typebox/value";
import type { PayloadManifestEntry } from "../dto/agent-plugin-payload";
import type { CanonicalJsonValue } from "../dto/canonical-json";
import {
  type DeclaredOwnershipClaim,
  DeclaredOwnershipClaimsSchema,
  type DistributionOwnershipIndex,
  DistributionOwnershipIndexRecordSchema,
  MAX_OWNERSHIP_CLAIMS,
  OWNERSHIP_INDEX_SCHEMA_VERSION,
  type OwnershipClaim,
  type OwnershipClaimKind,
} from "../dto/distribution-ownership";
import {
  type OwnershipIdentity,
  OwnershipIdentitySchema,
  type PluginId,
} from "../dto/release-identity";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { compareCanonicalText } from "./canonical-text-ordering";
import { parseOwnershipIdentity } from "./release-identity";
import { releaseIssue, sortReleaseIssues } from "./release-issue";
import { asNonEmpty, failure, success } from "./release-result";
import { admitTypeBoxRecordForTraversal, parseBoundedArray } from "./release-value-admission";

const SKILL_MANIFEST_PATH = /^skills\/([^/]+)\/SKILL\.md$/u;

/** Byte-derived distribution units discovered in one exact member payload manifest. */
export interface AgentPluginPayloadInventory {
  readonly skillIdentities: readonly OwnershipIdentity[];
}

/** Synthesizes plugin claims and admits one complete, conflict-free ownership index. */
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
    claims.push(
      Object.freeze({
        kind: "plugin",
        identity: memberId,
        ownerPluginId: memberId,
      })
    );
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

/** Admits, bounds, canonically orders, and freezes content-declared claims. */
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

/** Admits one closed ownership-index record and revalidates its claim semantics. */
export function parseDistributionOwnershipIndex(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): DistributionOwnershipIndex | undefined {
  const initialIssueCount = issues.length;
  const admissionIssues: ReleaseIssue[] = [];
  if (
    !admitTypeBoxRecordForTraversal(
      DistributionOwnershipIndexRecordSchema,
      input,
      path,
      admissionIssues
    )
  ) {
    issues.push(
      releaseIssue("EXPECTED_OBJECT", path, "Ownership index must match the closed TypeBox schema")
    );
    return undefined;
  }
  const claims = parseBoundedArray(input.claims, `${path}.claims`, MAX_OWNERSHIP_CLAIMS, issues);
  if (claims === undefined) return undefined;
  const boundedRecord = { ...input, claims };
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

/** Projects an admitted ownership index into its canonical JSON representation. */
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

/** Returns a frozen owner-local view, optionally narrowed to one claim namespace. */
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

/** Derives the admitted distribution-unit inventory from one exact payload manifest. */
export function deriveAgentPluginPayloadInventory(
  manifest: readonly PayloadManifestEntry[],
  path = "release.payload.manifest"
): ReleaseResult<AgentPluginPayloadInventory, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const skillIdentities: OwnershipIdentity[] = [];
  manifest.forEach((entry, index) => {
    const entryPath = `${path}[${index}].path`;
    if (entry.path === "agent-pack" || entry.path.startsWith("agent-pack/")) {
      issues.push(
        releaseIssue(
          "FORBIDDEN_UNIT_KIND",
          entryPath,
          "Top-level toolkit agent-pack content cannot become an agent-plugin release member",
          { actual: entry.path }
        )
      );
    }
    if (entry.path === "plugin.yaml") {
      issues.push(
        releaseIssue(
          "FORBIDDEN_UNIT_KIND",
          entryPath,
          "The legacy root plugin.yaml toolkit-composition marker cannot become an agent-plugin release member",
          { actual: entry.path }
        )
      );
    }
    const match = SKILL_MANIFEST_PATH.exec(entry.path);
    const identity = match?.[1];
    if (identity !== undefined) {
      const parsed = parseOwnershipIdentity(identity, entryPath);
      if (parsed.ok) skillIdentities.push(parsed.value);
      else issues.push(...parsed.issues);
    }
  });
  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  return success(
    Object.freeze({
      skillIdentities: Object.freeze(skillIdentities.sort(compareCanonicalText)),
    })
  );
}

/**
 * Validates byte-derived plugin content against its explicit skill ownership claims.
 *
 * Every canonical `skills/<id>/SKILL.md` path must have exactly one matching
 * same-member claim, and every same-member skill claim must resolve to exactly
 * one discovered manifest.
 */
export function validateAgentPluginPayloadOwnership(
  ownershipIndex: DistributionOwnershipIndex,
  pluginId: PluginId,
  manifest: readonly PayloadManifestEntry[],
  path = "release.payload.manifest"
): readonly ReleaseIssue[] {
  const inventory = deriveAgentPluginPayloadInventory(manifest, path);
  if (!inventory.ok) return inventory.issues;

  const issues: ReleaseIssue[] = [];
  const discovered = new Set(inventory.value.skillIdentities);
  const claims = ownershipClaimsFor(ownershipIndex, pluginId, "skill");
  const claimed = new Set(claims.map((claim) => claim.identity));
  for (const identity of discovered) {
    if (!claimed.has(identity)) {
      issues.push(
        releaseIssue(
          "SKILL_OWNERSHIP_MISMATCH",
          `${path}.skills.${pluginId}.${identity}`,
          "A discovered skill manifest must have exactly one same-member ownership claim",
          {
            expected: 1,
            actual: 0,
            claimKind: "skill",
            claim: identity,
            claimants: [],
          }
        )
      );
    }
  }
  for (const claim of claims) {
    if (!discovered.has(claim.identity)) {
      issues.push(
        releaseIssue(
          "SKILL_OWNERSHIP_MISMATCH",
          `${path}.skillClaims.${pluginId}.${claim.identity}`,
          "A skill ownership claim must name exactly one discovered skills/<id>/SKILL.md manifest",
          {
            expected: 1,
            actual: 0,
            claimKind: "skill",
            claim: claim.identity,
            claimants: [pluginId],
          }
        )
      );
    }
  }
  return Object.freeze(sortReleaseIssues(issues));
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
