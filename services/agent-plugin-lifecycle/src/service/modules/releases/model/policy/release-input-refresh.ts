import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  type PayloadEntryInput,
} from "../../../../model/dto/agent-plugin-payload";
import {
  type SourceEligibilityIssueCode,
  sourceEligibilityIssue,
} from "../../../../model/dto/content-workspace";
import type { DeclaredOwnershipClaim } from "../../../../model/dto/distribution-ownership";
import type { ContentAuthority, PluginId } from "../../../../model/dto/release-identity";
import {
  RELEASE_INPUT_SCHEMA_VERSION,
  type ReleaseMemberDeclaration,
} from "../../../../model/dto/release-input";
import type { ReleaseIssue } from "../../../../model/dto/release-issue";
import { createAgentPluginPayload } from "../../../../model/policy/agent-plugin-payload";
import { equalBytes } from "../../../../model/policy/byte-equality";
import { deriveAgentPluginPayloadInventory } from "../../../../model/policy/distribution-ownership";
import {
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
} from "../../../../model/policy/release-input";
import { canonicalSerializeAgentPluginReleaseInput } from "../../../../model/policy/release-input-codec";
import { releaseIssue } from "../../../../model/policy/release-issue";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../../model/policy/release-payload-accounting";
import type { ReleaseInputRefreshResult } from "../dto/release-lifecycle";

export interface ReleaseInputRefreshMemberSource {
  readonly pluginId: PluginId;
  readonly payloadEntries: readonly PayloadEntryInput[];
}

export interface ReleaseInputRefreshAuthoringInput {
  readonly contentAuthority: ContentAuthority;
  readonly existingBytes?: Uint8Array;
  readonly members: readonly ReleaseInputRefreshMemberSource[];
}

export function authorReleaseInputRefresh(
  input: ReleaseInputRefreshAuthoringInput
): ReleaseInputRefreshResult {
  const boundsFailure = preflightReleaseInputPayloadBounds(input.members);
  if (boundsFailure !== undefined) return boundsFailure;

  const existingResult =
    input.existingBytes === undefined
      ? undefined
      : decodeAgentPluginReleaseInput(input.existingBytes);
  if (existingResult !== undefined && !existingResult.ok) {
    return releaseInputRefreshIneligible(
      "ReleaseInputMismatch",
      existingResult.issues.map((issue) => issue.code).join(",")
    );
  }
  const existing = existingResult?.ok === true ? existingResult.value : undefined;
  if (existing !== undefined && existing.body.contentAuthority !== input.contentAuthority) {
    return releaseInputRefreshIneligible(
      "ReleaseInputMismatch",
      "release input declares a different content authority"
    );
  }

  const existingMembers = new Map(
    existing?.body.members.map((member) => [member.pluginId, member] as const) ?? []
  );
  const selectedMembers = new Set(input.members.map((member) => member.pluginId));
  const members: ReleaseMemberDeclaration[] = [];
  const skillClaims: DeclaredOwnershipClaim[] = [];

  for (const member of input.members) {
    const payloadResult = createAgentPluginPayload(member.payloadEntries);
    if (!payloadResult.ok) {
      return Object.freeze({
        kind: "ReleaseInputRejected" as const,
        issues: payloadResult.issues,
      });
    }
    const inventory = deriveAgentPluginPayloadInventory(
      payloadResult.value.manifest,
      `releaseInputRefresh.members.${member.pluginId}.payloadManifest`
    );
    if (!inventory.ok) {
      return Object.freeze({
        kind: "ReleaseInputRejected" as const,
        issues: inventory.issues,
      });
    }
    for (const identity of inventory.value.skillIdentities) {
      skillClaims.push(
        Object.freeze({
          kind: "skill",
          identity,
          ownerPluginId: member.pluginId,
        })
      );
    }
    const prior = existingMembers.get(member.pluginId);
    members.push(
      Object.freeze({
        kind: "agent-plugin",
        pluginId: member.pluginId,
        vendor: prior?.vendor ?? Object.freeze([]),
        curation: prior?.curation ?? Object.freeze([]),
      })
    );
  }

  const ancillaryClaims =
    existing?.body.ownershipClaims.filter(
      (claim) =>
        (claim.kind === "alias" ||
          claim.kind === "provider-identity" ||
          claim.kind === "destination") &&
        selectedMembers.has(claim.ownerPluginId)
    ) ?? Object.freeze([]);
  const created = createAgentPluginReleaseInput({
    schemaVersion: RELEASE_INPUT_SCHEMA_VERSION,
    contentAuthority: input.contentAuthority,
    members,
    ownershipClaims: [...ancillaryClaims, ...skillClaims],
    locks: existing?.body.locks ?? [],
    qualityPolicies: existing?.body.qualityPolicies ?? [],
  });
  if (!created.ok) {
    return Object.freeze({
      kind: "ReleaseInputRejected" as const,
      issues: created.issues,
    });
  }
  const bytes = canonicalSerializeAgentPluginReleaseInput(created.value);
  return Object.freeze({
    kind:
      input.existingBytes !== undefined && equalBytes(input.existingBytes, bytes)
        ? ("ReleaseInputReadOnlyConverged" as const)
        : ("ReleaseInputCandidateReady" as const),
    releaseInputDigest: created.value.releaseInputDigest,
    byteLength: bytes.byteLength,
    bytes,
  });
}

export function releaseInputRefreshIneligible(
  code: SourceEligibilityIssueCode,
  detail: string
): Extract<ReleaseInputRefreshResult, { kind: "RepositoryIneligible" }> {
  return Object.freeze({
    kind: "RepositoryIneligible",
    mode: "staged",
    issues: Object.freeze([sourceEligibilityIssue(code, detail)] as const),
  });
}

function preflightReleaseInputPayloadBounds(
  members: readonly ReleaseInputRefreshMemberSource[]
): Extract<ReleaseInputRefreshResult, { kind: "ReleaseInputRejected" }> | undefined {
  const issues: ReleaseIssue[] = [];
  let aggregateBytes = 0;

  members.forEach((member, memberIndex) => {
    const path = `releaseInputRefresh.members[${memberIndex}].payloadEntries`;
    if (member.payloadEntries.length > MAX_PAYLOAD_ENTRIES_PER_MEMBER) {
      issues.push(
        releaseIssue(
          "COUNT_LIMIT_EXCEEDED",
          path,
          "Payload entry count exceeds its protocol limit",
          {
            expected: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
            actual: member.payloadEntries.length,
          }
        )
      );
    }
    let memberBytes = 0;
    for (const entry of member.payloadEntries) {
      if (!(entry.bytes instanceof Uint8Array)) continue;
      memberBytes = addLogicalBytes(memberBytes, entry.bytes.byteLength);
      aggregateBytes = addLogicalBytes(aggregateBytes, entry.bytes.byteLength);
    }
    if (memberBytes > MAX_PAYLOAD_BYTES_PER_MEMBER) {
      issues.push(
        releaseIssue(
          "PAYLOAD_BYTES_LIMIT_EXCEEDED",
          path,
          "Payload exceeds its decoded-byte limit",
          {
            expected: MAX_PAYLOAD_BYTES_PER_MEMBER,
            actual: memberBytes,
          }
        )
      );
    }
  });

  if (aggregateBytes > MAX_RELEASE_SET_PAYLOAD_BYTES) {
    issues.push(
      releaseIssue(
        "PAYLOAD_BYTES_LIMIT_EXCEEDED",
        "releaseInputRefresh.members",
        "Complete release-input payloads exceed their decoded-byte limit",
        {
          expected: MAX_RELEASE_SET_PAYLOAD_BYTES,
          actual: aggregateBytes,
        }
      )
    );
  }
  const [first, ...rest] = issues;
  return first === undefined
    ? undefined
    : Object.freeze({
        kind: "ReleaseInputRejected",
        issues: Object.freeze([first, ...rest] as const),
      });
}

function addLogicalBytes(total: number, next: number): number {
  return total > Number.MAX_SAFE_INTEGER - next ? Number.MAX_SAFE_INTEGER : total + next;
}
