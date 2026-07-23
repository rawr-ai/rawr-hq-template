import {
  canonicalSerializeAgentPluginReleaseInput,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  RELEASE_INPUT_SCHEMA_VERSION,
  type ContentAuthority,
  type PayloadEntryInput,
  type PluginId,
  type ReleaseIssue,
} from "../../../../shared/release";
import {
  sourceEligibilityIssue,
  type SourceEligibilityIssueCode,
} from "../../../../model/dto/releases/content-workspace";
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
  const members: unknown[] = [];
  const skillClaims: unknown[] = [];

  for (const member of input.members) {
    const payloadResult = createAgentPluginPayload(member.payloadEntries);
    if (!payloadResult.ok) {
      return Object.freeze({
        kind: "ReleaseInputRejected" as const,
        issues: payloadResult.issues,
      });
    }
    const skillInventory = payloadResult.value.manifest.flatMap((entry) => {
      const match = /^skills\/([^/]+)\/SKILL\.md$/u.exec(entry.path);
      if (match?.[1] === undefined) return [];
      const inventory = Object.freeze({ identity: match[1], manifestPath: entry.path });
      skillClaims.push(
        Object.freeze({
          kind: "skill",
          identity: match[1],
          ownerPluginId: member.pluginId,
        })
      );
      return [inventory];
    });
    const prior = existingMembers.get(member.pluginId);
    members.push(
      Object.freeze({
        kind: "agent-plugin",
        pluginId: member.pluginId,
        skillInventory: Object.freeze(skillInventory),
        payload: Object.freeze({
          protocolVersion: payloadResult.value.protocolVersion,
          manifest: payloadResult.value.manifest,
          payloadDigest: payloadResult.value.payloadDigest,
        }),
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
        limitIssue(
          "COUNT_LIMIT_EXCEEDED",
          path,
          "Payload entry count exceeds its protocol limit",
          MAX_PAYLOAD_ENTRIES_PER_MEMBER,
          member.payloadEntries.length
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
        limitIssue(
          "PAYLOAD_BYTES_LIMIT_EXCEEDED",
          path,
          "Payload exceeds its decoded-byte limit",
          MAX_PAYLOAD_BYTES_PER_MEMBER,
          memberBytes
        )
      );
    }
  });

  if (aggregateBytes > MAX_RELEASE_SET_PAYLOAD_BYTES) {
    issues.push(
      limitIssue(
        "PAYLOAD_BYTES_LIMIT_EXCEEDED",
        "releaseInputRefresh.members",
        "Complete release-input payloads exceed their decoded-byte limit",
        MAX_RELEASE_SET_PAYLOAD_BYTES,
        aggregateBytes
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

function limitIssue(
  code: "COUNT_LIMIT_EXCEEDED" | "PAYLOAD_BYTES_LIMIT_EXCEEDED",
  path: string,
  message: string,
  expected: number,
  actual: number
): ReleaseIssue {
  return Object.freeze({ code, path, message, expected, actual });
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    const leftByte = left[index];
    const rightByte = right[index];
    if (leftByte === undefined || rightByte === undefined) return false;
    difference |= leftByte ^ rightByte;
  }
  return difference === 0;
}
