import { Value } from "typebox/value";
import {
  parsePayloadDigest,
  parseReleaseInputDigest,
  type ReleaseInputDigest,
  releaseInputDigest,
} from "../../shared/release/primitives";
import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  PAYLOAD_PROTOCOL_VERSION,
} from "../dto/agent-plugin-payload";
import {
  type DeclaredOwnershipClaim,
  type DistributionOwnershipIndex,
  MAX_OWNERSHIP_CLAIMS,
} from "../dto/distribution-ownership";
import type {
  ContentAuthority,
  OwnershipIdentity,
  PluginId,
  ReleaseRelativePath,
} from "../dto/release-identity";
import {
  type AgentPluginReleaseInput,
  type DeclaredPayload,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  RELEASE_INPUT_SCHEMA_VERSION,
  type ReleaseInputBody,
  ReleaseInputBodySchema,
  type ReleaseInputEnvelope,
  ReleaseInputEnvelopeSchema,
  type ReleaseMemberDeclaration,
  type SkillInventoryEntry,
} from "../dto/release-input";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { equalBytes } from "../helpers/byte-equality";
import { decodeCanonicalJson } from "./canonical-json";
import { compareCanonicalText } from "./canonical-text-ordering";
import { createCompletenessWitness } from "./completeness-witness";
import {
  createDistributionOwnershipIndex,
  parseDeclaredOwnershipClaims,
} from "./distribution-ownership";
import { parsePayloadManifest } from "./payload-manifest";
import { parseProvenanceBindings } from "./provenance-binding";
import {
  parseContentAuthority,
  parseOwnershipIdentity,
  parsePluginId,
  parseReleaseRelativePath,
} from "./release-identity";
import {
  canonicalSerializeAgentPluginReleaseInput,
  canonicalSerializeReleaseInputBody,
} from "./release-input-codec";
import { releaseIssue, sortReleaseIssues } from "./release-issue";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "./release-payload-accounting";
import { asNonEmpty, collectReleaseResult, failure, success } from "./release-result";
import { admitClosedRecordForTraversal, parseBoundedArray } from "./release-value-admission";

/**
 * Admits one reviewed release-input body and derives its immutable identity.
 *
 * This is the construction boundary shared by release authoring, packaging,
 * providers, vendors, and governance. It keeps granular diagnostics and
 * release-wide ordering with the service model rather than a capability module.
 */
export function createAgentPluginReleaseInput(
  input: unknown
): ReleaseResult<AgentPluginReleaseInput, ReleaseIssue> {
  const parsed = parseReleaseInputBody(input, "releaseInput.body");
  if (!parsed.ok) return parsed;
  const digest = releaseInputDigest(canonicalSerializeReleaseInputBody(parsed.value.body));
  const frozen = freezeReleaseInput(parsed.value.body, digest, parsed.value.ownershipIndex);
  if (!frozen.ok) return frozen;
  const releaseInput = frozen.value;
  const byteLength = canonicalSerializeAgentPluginReleaseInput(releaseInput).byteLength;
  if (byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES) {
    return failure([
      releaseIssue(
        "ENVELOPE_TOO_LARGE",
        "releaseInput",
        "Release-input envelope exceeds its protocol bound",
        {
          expected: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
          actual: byteLength,
        }
      ),
    ]);
  }
  return success(releaseInput);
}

/**
 * Re-admits a release-input envelope and verifies its claimed canonical digest.
 *
 * Callers use this when an already-authored record crosses back into the
 * service. The returned brand therefore means both structure and identity were
 * checked against the same policy used for construction.
 */
export function verifyAgentPluginReleaseInput(
  input: unknown
): ReleaseResult<AgentPluginReleaseInput, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (
    !admitClosedRecordForTraversal(
      input,
      ["body", "releaseInputDigest", "schemaVersion"],
      "releaseInput",
      issues
    )
  ) {
    return failure([
      issues[0] ??
        releaseIssue("EXPECTED_OBJECT", "releaseInput", "Release input must be an object"),
    ]);
  }
  if (input.schemaVersion !== RELEASE_INPUT_SCHEMA_VERSION) {
    issues.push(
      releaseIssue(
        "INVALID_SCHEMA_VERSION",
        "releaseInput.schemaVersion",
        "Unsupported release-input envelope version",
        {
          expected: RELEASE_INPUT_SCHEMA_VERSION,
          actual:
            typeof input.schemaVersion === "number"
              ? input.schemaVersion
              : String(input.schemaVersion),
        }
      )
    );
  }
  const claimedDigest = collectReleaseResult(
    parseReleaseInputDigest(input.releaseInputDigest, "releaseInput.releaseInputDigest"),
    issues
  );
  const parsedBody = parseReleaseInputBody(input.body, "releaseInput.body", false);
  if (!parsedBody.ok) issues.push(...parsedBody.issues);
  if (claimedDigest !== undefined && parsedBody.ok) {
    const computed = releaseInputDigest(canonicalSerializeReleaseInputBody(parsedBody.value.body));
    if (computed !== claimedDigest) {
      issues.push(
        releaseIssue(
          "RELEASE_INPUT_DIGEST_MISMATCH",
          "releaseInput.releaseInputDigest",
          "Claimed digest differs from the release-input body",
          {
            expected: computed,
            actual: claimedDigest,
          }
        )
      );
    }
  }
  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (claimedDigest === undefined || !parsedBody.ok) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        "releaseInput",
        "Release-input validation did not produce a complete value"
      ),
    ]);
  }
  const envelope: ReleaseInputEnvelope = Object.freeze({
    schemaVersion: RELEASE_INPUT_SCHEMA_VERSION,
    releaseInputDigest: claimedDigest,
    body: parsedBody.value.body,
  });
  if (!Value.Check(ReleaseInputEnvelopeSchema, envelope)) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        "releaseInput",
        "Release-input validation did not produce a TypeBox-valid envelope"
      ),
    ]);
  }
  const frozen = freezeReleaseInput(
    parsedBody.value.body,
    claimedDigest,
    parsedBody.value.ownershipIndex
  );
  if (!frozen.ok) return frozen;
  const releaseInput = frozen.value;
  const byteLength = canonicalSerializeAgentPluginReleaseInput(releaseInput).byteLength;
  if (byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES) {
    return failure([
      releaseIssue(
        "ENVELOPE_TOO_LARGE",
        "releaseInput",
        "Release-input envelope exceeds its protocol bound",
        {
          expected: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
          actual: byteLength,
        }
      ),
    ]);
  }
  return success(releaseInput);
}

/**
 * Decodes the unique canonical wire form of a release-input envelope.
 *
 * Byte equality is checked after semantic verification so alternate JSON
 * representations cannot acquire the same admitted release-input identity.
 */
export function decodeAgentPluginReleaseInput(
  bytes: unknown
): ReleaseResult<AgentPluginReleaseInput, ReleaseIssue> {
  const decoded = decodeCanonicalJson(bytes, "releaseInput", MAX_RELEASE_INPUT_ENVELOPE_BYTES);
  if (!decoded.ok) return decoded;
  const verified = verifyAgentPluginReleaseInput(decoded.value);
  if (!verified.ok) return verified;
  if (
    !(bytes instanceof Uint8Array) ||
    !equalBytes(bytes, canonicalSerializeAgentPluginReleaseInput(verified.value))
  ) {
    return failure([
      releaseIssue(
        "NON_CANONICAL_ENVELOPE",
        "releaseInput",
        "Release-input bytes are not the unique canonical representation"
      ),
    ]);
  }
  return verified;
}

function parseReleaseInputBody(
  input: unknown,
  path: string,
  validateSchema = true
): ReleaseResult<
  { readonly body: ReleaseInputBody; readonly ownershipIndex: DistributionOwnershipIndex },
  ReleaseIssue
> {
  const issues: ReleaseIssue[] = [];
  if (
    !admitClosedRecordForTraversal(
      input,
      [
        "contentAuthority",
        "locks",
        "members",
        "ownershipClaims",
        "qualityPolicies",
        "schemaVersion",
      ],
      path,
      issues
    )
  ) {
    return failure([
      issues[0] ?? releaseIssue("EXPECTED_OBJECT", path, "Release-input body must be an object"),
    ]);
  }
  if (input.schemaVersion !== RELEASE_INPUT_SCHEMA_VERSION) {
    issues.push(
      releaseIssue(
        "INVALID_SCHEMA_VERSION",
        `${path}.schemaVersion`,
        "Unsupported release-input body version",
        {
          expected: RELEASE_INPUT_SCHEMA_VERSION,
          actual:
            typeof input.schemaVersion === "number"
              ? input.schemaVersion
              : String(input.schemaVersion),
        }
      )
    );
  }
  const contentAuthority = collectReleaseResult(
    parseContentAuthority(input.contentAuthority, `${path}.contentAuthority`),
    issues
  );
  const members = parseMembers(input.members, `${path}.members`, issues);
  const parsedOwnershipClaims = parseDeclaredOwnershipClaims(
    input.ownershipClaims,
    `${path}.ownershipClaims`,
    issues
  );
  const ownershipClaims = parsedOwnershipClaims;
  const locks = parseProvenanceBindings(input.locks, `${path}.locks`, issues);
  const qualityPolicies = parseProvenanceBindings(
    input.qualityPolicies,
    `${path}.qualityPolicies`,
    issues
  );
  let ownershipIndex: DistributionOwnershipIndex | undefined;
  if (members !== undefined && ownershipClaims !== undefined) {
    const inventoryOverflow = issues.some(
      (entry) =>
        entry.code === "COUNT_LIMIT_EXCEEDED" && entry.path === `${path}.members.skillInventory`
    );
    if (!inventoryOverflow) {
      validateSkillOwnershipClosure(members, ownershipClaims, path, issues);
    }
    const index = createDistributionOwnershipIndex(
      members.map((member) => member.pluginId),
      ownershipClaims
    );
    if (index.ok) ownershipIndex = index.value;
    else issues.push(...index.issues);
  }
  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (
    contentAuthority === undefined ||
    members === undefined ||
    ownershipClaims === undefined ||
    locks === undefined ||
    qualityPolicies === undefined ||
    ownershipIndex === undefined
  ) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        path,
        "Release-input body validation did not produce a complete value"
      ),
    ]);
  }
  const body: ReleaseInputBody = Object.freeze({
    schemaVersion: RELEASE_INPUT_SCHEMA_VERSION,
    contentAuthority,
    members,
    ownershipClaims,
    locks,
    qualityPolicies,
  });
  if (validateSchema && !Value.Check(ReleaseInputBodySchema, body)) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        path,
        "Release-input body validation did not produce a TypeBox-valid value"
      ),
    ]);
  }
  return success({
    body,
    ownershipIndex,
  });
}

function parseMembers(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): readonly ReleaseMemberDeclaration[] | undefined {
  const values = parseBoundedArray(input, path, MAX_RELEASE_MEMBERS, issues);
  if (values === undefined) return undefined;
  const aggregateSkillInventory = values.reduce<number>((total, candidate) => {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate))
      return total;
    const inventory = (candidate as Record<string, unknown>).skillInventory;
    return total + (Array.isArray(inventory) ? inventory.length : 0);
  }, 0);
  if (aggregateSkillInventory > MAX_OWNERSHIP_CLAIMS) {
    issues.push(
      releaseIssue(
        "COUNT_LIMIT_EXCEEDED",
        `${path}.skillInventory`,
        "Complete release-set skill inventory exceeds the ownership protocol limit",
        { expected: MAX_OWNERSHIP_CLAIMS, actual: aggregateSkillInventory }
      )
    );
  }
  const skillBudget = { remaining: MAX_OWNERSHIP_CLAIMS };
  const members: ReleaseMemberDeclaration[] = [];
  values.forEach((candidate, index) => {
    const memberPath = `${path}[${index}]`;
    if (
      !admitClosedRecordForTraversal(
        candidate,
        ["curation", "kind", "payload", "pluginId", "skillInventory", "vendor"],
        memberPath,
        issues
      )
    )
      return;
    const kind = parseUnitKind(candidate.kind, `${memberPath}.kind`, issues);
    const pluginId = collectReleaseResult(
      parsePluginId(candidate.pluginId, `${memberPath}.pluginId`),
      issues
    );
    const skillInventory = parseSkillInventory(
      candidate.skillInventory,
      `${memberPath}.skillInventory`,
      skillBudget,
      issues
    );
    const payload = parseDeclaredPayload(candidate.payload, `${memberPath}.payload`, issues);
    if (payload !== undefined) {
      reportForbiddenDistributionSources(payload, `${memberPath}.payload.manifest`, issues);
    }
    const vendor = parseProvenanceBindings(candidate.vendor, `${memberPath}.vendor`, issues);
    const curation = parseProvenanceBindings(candidate.curation, `${memberPath}.curation`, issues);
    if (
      kind === "agent-plugin" &&
      pluginId !== undefined &&
      skillInventory !== undefined &&
      payload !== undefined &&
      vendor !== undefined &&
      curation !== undefined
    ) {
      members.push(Object.freeze({ kind, pluginId, skillInventory, payload, vendor, curation }));
    }
  });
  members.sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId));
  reportDuplicateMembers(
    members.map((member) => member.pluginId),
    path,
    issues
  );
  const aggregatePayloadBytes = members.reduce(
    (memberTotal, member) =>
      memberTotal +
      member.payload.manifest.reduce((entryTotal, entry) => entryTotal + entry.byteLength, 0),
    0
  );
  if (aggregatePayloadBytes > MAX_RELEASE_SET_PAYLOAD_BYTES) {
    issues.push(
      releaseIssue(
        "PAYLOAD_BYTES_LIMIT_EXCEEDED",
        path,
        "Complete release-set payload exceeds its aggregate byte limit",
        {
          expected: MAX_RELEASE_SET_PAYLOAD_BYTES,
          actual: aggregatePayloadBytes,
        }
      )
    );
  }
  if (members.length === 0) {
    issues.push(
      releaseIssue(
        "COUNT_LIMIT_EXCEEDED",
        path,
        "A curated release input must declare at least one member",
        {
          expected: "1..1024",
          actual: 0,
        }
      )
    );
  }
  return Object.freeze(members);
}

function parseSkillInventory(
  input: unknown,
  path: string,
  budget: { remaining: number },
  issues: ReleaseIssue[]
): readonly SkillInventoryEntry[] | undefined {
  const values = parseBoundedArray(input, path, MAX_PAYLOAD_ENTRIES_PER_MEMBER, issues);
  if (values === undefined) return undefined;
  const inventory: SkillInventoryEntry[] = [];
  const admitted = values.slice(0, budget.remaining);
  budget.remaining -= admitted.length;
  admitted.forEach((candidate, index) => {
    const entryPath = `${path}[${index}]`;
    if (!admitClosedRecordForTraversal(candidate, ["identity", "manifestPath"], entryPath, issues))
      return;
    const identity = collectReleaseResult(
      parseOwnershipIdentity(candidate.identity, `${entryPath}.identity`),
      issues
    );
    const manifestPath = collectReleaseResult(
      parseReleaseRelativePath(candidate.manifestPath, `${entryPath}.manifestPath`),
      issues
    );
    if (identity !== undefined && manifestPath !== undefined) {
      inventory.push(Object.freeze({ identity, manifestPath }));
    }
  });
  inventory.sort(compareSkillInventoryEntries);
  return Object.freeze(inventory);
}

function validateSkillOwnershipClosure(
  members: readonly ReleaseMemberDeclaration[],
  ownershipClaims: readonly DeclaredOwnershipClaim[],
  path: string,
  issues: ReleaseIssue[]
): void {
  const skillClaims = ownershipClaims.filter((claim) => claim.kind === "skill");
  const inventoryByMemberPath = new Map<string, number>();
  const inventoryByMemberIdentity = new Map<string, number>();
  const claimsByMemberIdentity = new Map<string, number>();
  const claimOwnersByIdentity = new Map<OwnershipIdentity, Set<PluginId>>();
  for (const member of members) {
    for (const entry of member.skillInventory) {
      incrementCount(inventoryByMemberPath, memberSkillKey(member.pluginId, entry.manifestPath));
      incrementCount(inventoryByMemberIdentity, memberSkillKey(member.pluginId, entry.identity));
    }
  }
  for (const claim of skillClaims) {
    incrementCount(claimsByMemberIdentity, memberSkillKey(claim.ownerPluginId, claim.identity));
    const owners = claimOwnersByIdentity.get(claim.identity) ?? new Set<PluginId>();
    owners.add(claim.ownerPluginId);
    claimOwnersByIdentity.set(claim.identity, owners);
  }

  for (const member of members) {
    const skillManifestPaths = member.payload.manifest
      .map((entry) => entry.path)
      .filter(isCanonicalSkillManifestPath);
    const manifestPathSet = new Set(skillManifestPaths);
    for (const manifestPath of skillManifestPaths) {
      const rowCount =
        inventoryByMemberPath.get(memberSkillKey(member.pluginId, manifestPath)) ?? 0;
      if (rowCount !== 1) {
        issues.push(
          releaseIssue(
            "SKILL_INVENTORY_MISMATCH",
            `${path}.skills.${member.pluginId}.${manifestPath}`,
            "A canonical skill manifest must have exactly one inventory row",
            { expected: 1, actual: rowCount }
          )
        );
      }
    }
    for (const entry of member.skillInventory) {
      const entryPath = `${path}.skills.${member.pluginId}.${entry.manifestPath}`;
      if (
        !isCanonicalSkillManifestPath(entry.manifestPath) ||
        !manifestPathSet.has(entry.manifestPath)
      ) {
        issues.push(
          releaseIssue(
            "SKILL_INVENTORY_MISMATCH",
            entryPath,
            "Skill inventory path must name a present skills/<one-unit>/SKILL.md payload entry",
            { expected: "skills/<one-unit>/SKILL.md", actual: entry.manifestPath }
          )
        );
      }
      const claimCount =
        claimsByMemberIdentity.get(memberSkillKey(member.pluginId, entry.identity)) ?? 0;
      if (claimCount !== 1) {
        issues.push(
          releaseIssue(
            "SKILL_OWNERSHIP_MISMATCH",
            `${entryPath}.${entry.identity}`,
            "A skill inventory row must have exactly one same-member skill ownership claim",
            {
              expected: 1,
              actual: claimCount,
              claimKind: "skill",
              claim: entry.identity,
              claimants: Object.freeze(
                [...(claimOwnersByIdentity.get(entry.identity) ?? [])].sort(compareCanonicalText)
              ),
            }
          )
        );
      }
    }
  }
  for (const claim of skillClaims) {
    const rowCount =
      inventoryByMemberIdentity.get(memberSkillKey(claim.ownerPluginId, claim.identity)) ?? 0;
    if (rowCount !== 1) {
      issues.push(
        releaseIssue(
          "SKILL_OWNERSHIP_MISMATCH",
          `${path}.skillClaims.${claim.ownerPluginId}.${claim.identity}`,
          "A skill ownership claim must name exactly one inventory row owned by its member",
          {
            expected: 1,
            actual: rowCount,
            claimKind: "skill",
            claim: claim.identity,
            claimants: [claim.ownerPluginId],
          }
        )
      );
    }
  }
}

function isCanonicalSkillManifestPath(path: ReleaseRelativePath): boolean {
  return /^skills\/[^/]+\/SKILL\.md$/u.test(path);
}

function reportForbiddenDistributionSources(
  payload: DeclaredPayload,
  path: string,
  issues: ReleaseIssue[]
): void {
  payload.manifest.forEach((entry, index) => {
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
  });
}

function memberSkillKey(pluginId: PluginId, identityOrPath: string): string {
  return `${pluginId}\u0000${identityOrPath}`;
}

function incrementCount(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function parseUnitKind(
  value: unknown,
  path: string,
  issues: ReleaseIssue[]
): "agent-plugin" | undefined {
  if (value === "agent-plugin") return value;
  if (value === "toolkit" || value === "agent-pack" || value === "composition") {
    issues.push(
      releaseIssue(
        "FORBIDDEN_UNIT_KIND",
        path,
        `${value} cannot become an agent-plugin release member`
      )
    );
    return undefined;
  }
  issues.push(releaseIssue("INVALID_STRING", path, "Unit kind must be agent-plugin"));
  return undefined;
}

function parseDeclaredPayload(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): DeclaredPayload | undefined {
  if (
    !admitClosedRecordForTraversal(
      input,
      ["manifest", "payloadDigest", "protocolVersion"],
      path,
      issues
    )
  )
    return undefined;
  if (input.protocolVersion !== PAYLOAD_PROTOCOL_VERSION) {
    issues.push(
      releaseIssue(
        "INVALID_SCHEMA_VERSION",
        `${path}.protocolVersion`,
        "Unsupported payload protocol version",
        {
          expected: PAYLOAD_PROTOCOL_VERSION,
          actual:
            typeof input.protocolVersion === "number"
              ? input.protocolVersion
              : String(input.protocolVersion),
        }
      )
    );
  }
  const manifest = parsePayloadManifest(input.manifest, `${path}.manifest`, issues);
  const digest = collectReleaseResult(
    parsePayloadDigest(input.payloadDigest, `${path}.payloadDigest`),
    issues
  );
  const totalBytes = manifest?.reduce((total, entry) => total + entry.byteLength, 0) ?? 0;
  if (totalBytes > MAX_PAYLOAD_BYTES_PER_MEMBER) {
    issues.push(
      releaseIssue(
        "PAYLOAD_BYTES_LIMIT_EXCEEDED",
        `${path}.manifest`,
        "Declared payload exceeds its byte limit",
        {
          expected: MAX_PAYLOAD_BYTES_PER_MEMBER,
          actual: totalBytes,
        }
      )
    );
  }
  if (
    manifest === undefined ||
    digest === undefined ||
    input.protocolVersion !== PAYLOAD_PROTOCOL_VERSION
  )
    return undefined;
  return Object.freeze({
    protocolVersion: PAYLOAD_PROTOCOL_VERSION,
    manifest,
    payloadDigest: digest,
  });
}

function freezeReleaseInput(
  body: ReleaseInputBody,
  digest: ReleaseInputDigest,
  ownershipIndex: DistributionOwnershipIndex
): ReleaseResult<AgentPluginReleaseInput, ReleaseIssue> {
  const expectedMembers = Object.freeze(
    body.members.map((member) =>
      Object.freeze({
        pluginId: member.pluginId,
        payloadDigest: member.payload.payloadDigest,
      })
    )
  );
  const witness = createCompletenessWitness({
    releaseInputDigest: digest,
    expectedMembers,
    ownershipIndex,
  });
  if (!witness.ok) return witness;
  return success(
    Object.freeze({
      schemaVersion: RELEASE_INPUT_SCHEMA_VERSION,
      releaseInputDigest: digest,
      body,
      ownershipIndex,
      completenessWitness: witness.value,
    }) as AgentPluginReleaseInput
  );
}

function compareSkillInventoryEntries(
  left: SkillInventoryEntry,
  right: SkillInventoryEntry
): number {
  return (
    compareCanonicalText(left.manifestPath, right.manifestPath) ||
    compareCanonicalText(left.identity, right.identity)
  );
}

function reportDuplicateMembers(
  memberIds: readonly PluginId[],
  path: string,
  issues: ReleaseIssue[]
): void {
  for (let index = 1; index < memberIds.length; index += 1) {
    if (memberIds[index - 1] === memberIds[index]) {
      issues.push(
        releaseIssue("DUPLICATE_PLUGIN_ID", path, `Duplicate plugin identity: ${memberIds[index]}`)
      );
    }
  }
}
