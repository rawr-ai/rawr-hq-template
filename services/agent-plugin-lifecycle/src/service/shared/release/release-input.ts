import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import { Value } from "typebox/value";

import {
  type CanonicalJsonValue,
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
} from "./canonical";
import { issue, type ReleaseIssue, sortReleaseIssues } from "./issues";
import {
  createDistributionOwnershipIndex,
  type DistributionOwnershipIndex,
  type OwnershipClaim,
  ownershipIndexValue,
  parseDeclaredOwnershipClaims,
  parseDistributionOwnershipIndex,
} from "./ownership";
import { collect, isExactRecord, parseBoundedArray, parseCanonicalString } from "./parse";
import { PayloadManifestEntrySchema, parsePayloadManifest, payloadManifestValue } from "./payload";
import {
  BUILDER_PROTOCOL_VERSION,
  type BuilderProtocolVersion,
  type ContentAuthority,
  ContentAuthoritySchema,
  ContentDigestSchema,
  compareCanonicalText,
  MAX_CANONICAL_ID_BYTES,
  MAX_OWNERSHIP_CLAIMS,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  MAX_PROVENANCE_BINDINGS,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  type OwnershipIdentity,
  OwnershipIdentitySchema,
  PAYLOAD_PROTOCOL_VERSION,
  type PayloadDigest,
  PayloadDigestSchema,
  type PluginId,
  PluginIdSchema,
  parseContentAuthority,
  parseContentDigest,
  parseOwnershipIdentity,
  parsePayloadDigest,
  parsePluginId,
  parseReleaseInputDigest,
  parseReleaseRelativePath,
  RELEASE_INPUT_SCHEMA_VERSION,
  type ReleaseInputDigest,
  ReleaseInputDigestSchema,
  type ReleaseRelativePath,
  ReleaseRelativePathSchema,
  releaseInputDigest,
} from "./primitives";
import { asNonEmpty, failure, type ReleaseResult, success } from "./result";

declare const agentPluginReleaseInputBrand: unique symbol;
declare const completenessWitnessBrand: unique symbol;

const ProvenanceProtocolSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: MAX_CANONICAL_ID_BYTES,
    pattern: "^[a-z0-9][a-z0-9._:@/-]*$",
  }),
  isCanonicalProvenanceProtocol,
  () => "Expected a canonical provenance protocol"
);

export const ProvenanceBindingSchema = ReadonlyObject(
  Type.Object({
    id: OwnershipIdentitySchema,
    protocol: ProvenanceProtocolSchema,
    contentDigest: ContentDigestSchema,
  }),
  { additionalProperties: false }
);

export const DeclaredPayloadSchema = ReadonlyObject(
  Type.Object({
    protocolVersion: Type.Literal(PAYLOAD_PROTOCOL_VERSION),
    manifest: ReadonlyObject(Type.Array(PayloadManifestEntrySchema), {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
    payloadDigest: PayloadDigestSchema,
  }),
  { additionalProperties: false }
);

export const SkillInventoryEntrySchema = ReadonlyObject(
  Type.Object({
    identity: OwnershipIdentitySchema,
    manifestPath: ReleaseRelativePathSchema,
  }),
  { additionalProperties: false }
);

const DeclaredOwnershipClaimSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Union([
      Type.Literal("skill"),
      Type.Literal("alias"),
      Type.Literal("provider-identity"),
      Type.Literal("destination"),
    ]),
    identity: OwnershipIdentitySchema,
    ownerPluginId: PluginIdSchema,
  }),
  { additionalProperties: false }
);

export const ReleaseMemberDeclarationSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("agent-plugin"),
    pluginId: PluginIdSchema,
    skillInventory: ReadonlyObject(Type.Array(SkillInventoryEntrySchema), {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
    payload: DeclaredPayloadSchema,
    vendor: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
    }),
    curation: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
    }),
  }),
  { additionalProperties: false }
);

export const ReleaseInputBodySchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(RELEASE_INPUT_SCHEMA_VERSION),
    contentAuthority: ContentAuthoritySchema,
    members: ReadonlyObject(Type.Array(ReleaseMemberDeclarationSchema), {
      minItems: 1,
      maxItems: MAX_RELEASE_MEMBERS,
    }),
    ownershipClaims: ReadonlyObject(Type.Array(DeclaredOwnershipClaimSchema), {
      maxItems: MAX_OWNERSHIP_CLAIMS,
    }),
    locks: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
    }),
    qualityPolicies: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
    }),
  }),
  { additionalProperties: false }
);

export const ReleaseInputEnvelopeSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(RELEASE_INPUT_SCHEMA_VERSION),
    releaseInputDigest: ReleaseInputDigestSchema,
    body: ReleaseInputBodySchema,
  }),
  { additionalProperties: false }
);

export type ProvenanceBinding = Static<typeof ProvenanceBindingSchema>;
export type DeclaredPayload = Static<typeof DeclaredPayloadSchema>;
export type SkillInventoryEntry = Static<typeof SkillInventoryEntrySchema>;
export type ReleaseMemberDeclaration = Static<typeof ReleaseMemberDeclarationSchema>;
export type ReleaseInputBody = Static<typeof ReleaseInputBodySchema>;
export type ReleaseInputEnvelope = Static<typeof ReleaseInputEnvelopeSchema>;

export interface ExpectedReleaseMember {
  readonly pluginId: PluginId;
  readonly payloadDigest: PayloadDigest;
}

export type CompletenessWitness = Readonly<{
  releaseInputDigest: ReleaseInputDigest;
  expectedMembers: readonly ExpectedReleaseMember[];
  ownershipIndex: DistributionOwnershipIndex;
  [completenessWitnessBrand]: "CompletenessWitness";
}>;

export type AgentPluginReleaseInput = Readonly<
  ReleaseInputEnvelope & {
    ownershipIndex: DistributionOwnershipIndex;
    completenessWitness: CompletenessWitness;
    [agentPluginReleaseInputBrand]: "AgentPluginReleaseInput";
  }
>;

export function createAgentPluginReleaseInput(
  input: unknown
): ReleaseResult<AgentPluginReleaseInput, ReleaseIssue> {
  const parsed = parseReleaseInputBody(input, "releaseInput.body");
  if (!parsed.ok) return parsed;
  const digest = releaseInputDigest(canonicalSerializeReleaseInputBody(parsed.value.body));
  const releaseInput = freezeReleaseInput(parsed.value.body, digest, parsed.value.ownershipIndex);
  const byteLength = canonicalSerializeAgentPluginReleaseInput(releaseInput).byteLength;
  if (byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES) {
    return failure([
      issue(
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

export function verifyAgentPluginReleaseInput(
  input: unknown
): ReleaseResult<AgentPluginReleaseInput, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (
    !isExactRecord(input, ["body", "releaseInputDigest", "schemaVersion"], "releaseInput", issues)
  ) {
    return failure([
      issues[0] ?? issue("EXPECTED_OBJECT", "releaseInput", "Release input must be an object"),
    ]);
  }
  if (input.schemaVersion !== RELEASE_INPUT_SCHEMA_VERSION) {
    issues.push(
      issue(
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
  const claimedDigest = collect(
    parseReleaseInputDigest(input.releaseInputDigest, "releaseInput.releaseInputDigest"),
    issues
  );
  const parsedBody = parseReleaseInputBody(input.body, "releaseInput.body", false);
  if (!parsedBody.ok) issues.push(...parsedBody.issues);
  if (claimedDigest !== undefined && parsedBody.ok) {
    const computed = releaseInputDigest(canonicalSerializeReleaseInputBody(parsedBody.value.body));
    if (computed !== claimedDigest) {
      issues.push(
        issue(
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
      issue(
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
      issue(
        "EXPECTED_OBJECT",
        "releaseInput",
        "Release-input validation did not produce a TypeBox-valid envelope"
      ),
    ]);
  }
  const releaseInput = freezeReleaseInput(
    parsedBody.value.body,
    claimedDigest,
    parsedBody.value.ownershipIndex
  );
  const byteLength = canonicalSerializeAgentPluginReleaseInput(releaseInput).byteLength;
  if (byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES) {
    return failure([
      issue(
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
      issue(
        "NON_CANONICAL_ENVELOPE",
        "releaseInput",
        "Release-input bytes are not the unique canonical representation"
      ),
    ]);
  }
  return verified;
}

export function canonicalSerializeReleaseInputBody(body: ReleaseInputBody): Uint8Array {
  return canonicalJsonLine(releaseInputBodyValue(body));
}

export function canonicalSerializeAgentPluginReleaseInput(
  input: AgentPluginReleaseInput
): Uint8Array {
  return canonicalJsonLine(releaseInputEnvelopeValue(input));
}

export function releaseInputBodyValue(body: ReleaseInputBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    contentAuthority: body.contentAuthority,
    members: body.members.map(releaseMemberValue),
    ownershipClaims: body.ownershipClaims.map(ownershipClaimValue),
    locks: body.locks.map(provenanceBindingValue),
    qualityPolicies: body.qualityPolicies.map(provenanceBindingValue),
  };
}

export function completenessWitnessValue(witness: CompletenessWitness): CanonicalJsonValue {
  return {
    releaseInputDigest: witness.releaseInputDigest,
    expectedMembers: witness.expectedMembers.map((member) => ({
      pluginId: member.pluginId,
      payloadDigest: member.payloadDigest,
    })),
    ownershipIndex: ownershipIndexValue(witness.ownershipIndex),
  };
}

export function parseCompletenessWitness(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): CompletenessWitness | undefined {
  if (
    !isExactRecord(input, ["expectedMembers", "ownershipIndex", "releaseInputDigest"], path, issues)
  )
    return undefined;
  const digest = collect(
    parseReleaseInputDigest(input.releaseInputDigest, `${path}.releaseInputDigest`),
    issues
  );
  const ownershipIndex = parseDistributionOwnershipIndex(
    input.ownershipIndex,
    `${path}.ownershipIndex`,
    issues
  );
  const rawMembers = parseBoundedArray(
    input.expectedMembers,
    `${path}.expectedMembers`,
    MAX_RELEASE_MEMBERS,
    issues
  );
  const expectedMembers: ExpectedReleaseMember[] = [];
  rawMembers?.forEach((candidate, index) => {
    const memberPath = `${path}.expectedMembers[${index}]`;
    if (!isExactRecord(candidate, ["payloadDigest", "pluginId"], memberPath, issues)) return;
    const pluginId = collect(parsePluginId(candidate.pluginId, `${memberPath}.pluginId`), issues);
    const payload = collect(
      parsePayloadDigest(candidate.payloadDigest, `${memberPath}.payloadDigest`),
      issues
    );
    if (pluginId !== undefined && payload !== undefined)
      expectedMembers.push(Object.freeze({ pluginId, payloadDigest: payload }));
  });
  expectedMembers.sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId));
  reportDuplicateMembers(
    expectedMembers.map((member) => member.pluginId),
    `${path}.expectedMembers`,
    issues
  );
  if (ownershipIndex !== undefined) {
    const expectedIds = expectedMembers.map((member) => member.pluginId);
    const ownedIds = ownershipIndex.claims
      .filter((claim) => claim.kind === "plugin")
      .map((claim) => claim.ownerPluginId)
      .sort(compareCanonicalText);
    if (
      expectedIds.length !== ownedIds.length ||
      expectedIds.some((pluginId, index) => pluginId !== ownedIds[index])
    ) {
      issues.push(
        issue(
          "OWNERSHIP_INDEX_MISMATCH",
          `${path}.ownershipIndex`,
          "Completeness members and ownership members differ"
        )
      );
    }
  }
  if (digest === undefined || ownershipIndex === undefined) return undefined;
  return Object.freeze({
    releaseInputDigest: digest,
    expectedMembers: Object.freeze(expectedMembers),
    ownershipIndex,
  }) as CompletenessWitness;
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
    !isExactRecord(
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
      issues[0] ?? issue("EXPECTED_OBJECT", path, "Release-input body must be an object"),
    ]);
  }
  if (input.schemaVersion !== RELEASE_INPUT_SCHEMA_VERSION) {
    issues.push(
      issue(
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
  const contentAuthority = collect(
    parseContentAuthority(input.contentAuthority, `${path}.contentAuthority`),
    issues
  );
  const members = parseMembers(input.members, `${path}.members`, issues);
  const parsedOwnershipClaims = parseDeclaredOwnershipClaims(
    input.ownershipClaims,
    `${path}.ownershipClaims`,
    issues
  );
  const ownershipClaims = parsedOwnershipClaims?.every(isDeclaredOwnershipClaim)
    ? parsedOwnershipClaims
    : undefined;
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
      issue(
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
      issue(
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
      issue(
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
      !isExactRecord(
        candidate,
        ["curation", "kind", "payload", "pluginId", "skillInventory", "vendor"],
        memberPath,
        issues
      )
    )
      return;
    const kind = parseUnitKind(candidate.kind, `${memberPath}.kind`, issues);
    const pluginId = collect(parsePluginId(candidate.pluginId, `${memberPath}.pluginId`), issues);
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
      issue(
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
      issue(
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
    if (!isExactRecord(candidate, ["identity", "manifestPath"], entryPath, issues)) return;
    const identity = collect(
      parseOwnershipIdentity(candidate.identity, `${entryPath}.identity`),
      issues
    );
    const manifestPath = collect(
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
  ownershipClaims: readonly OwnershipClaim[],
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
          issue(
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
          issue(
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
          issue(
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
        issue(
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
        issue(
          "FORBIDDEN_UNIT_KIND",
          entryPath,
          "Top-level toolkit agent-pack content cannot become an agent-plugin release member",
          { actual: entry.path }
        )
      );
    }
    if (entry.path === "plugin.yaml") {
      issues.push(
        issue(
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
      issue("FORBIDDEN_UNIT_KIND", path, `${value} cannot become an agent-plugin release member`)
    );
    return undefined;
  }
  issues.push(issue("INVALID_STRING", path, "Unit kind must be agent-plugin"));
  return undefined;
}

function parseDeclaredPayload(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): DeclaredPayload | undefined {
  if (!isExactRecord(input, ["manifest", "payloadDigest", "protocolVersion"], path, issues))
    return undefined;
  if (input.protocolVersion !== PAYLOAD_PROTOCOL_VERSION) {
    issues.push(
      issue(
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
  const digest = collect(parsePayloadDigest(input.payloadDigest, `${path}.payloadDigest`), issues);
  const totalBytes = manifest?.reduce((total, entry) => total + entry.byteLength, 0) ?? 0;
  if (totalBytes > MAX_PAYLOAD_BYTES_PER_MEMBER) {
    issues.push(
      issue(
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

export function parseProvenanceBindings(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): readonly ProvenanceBinding[] | undefined {
  const values = parseBoundedArray(input, path, MAX_PROVENANCE_BINDINGS, issues);
  if (values === undefined) return undefined;
  const bindings: ProvenanceBinding[] = [];
  values.forEach((candidate, index) => {
    const bindingPath = `${path}[${index}]`;
    if (!isExactRecord(candidate, ["contentDigest", "id", "protocol"], bindingPath, issues)) return;
    const id = collect(parseOwnershipIdentity(candidate.id, `${bindingPath}.id`), issues);
    const protocol = parseCanonicalString(candidate.protocol, `${bindingPath}.protocol`, issues, {
      maxBytes: MAX_CANONICAL_ID_BYTES,
      pattern: /^[a-z0-9][a-z0-9._:@/-]*$/u,
    });
    const digest = collect(
      parseContentDigest(candidate.contentDigest, `${bindingPath}.contentDigest`),
      issues
    );
    if (id !== undefined && protocol !== undefined && digest !== undefined) {
      bindings.push(Object.freeze({ id, protocol, contentDigest: digest }));
    }
  });
  bindings.sort(compareBindings);
  for (let index = 1; index < bindings.length; index += 1) {
    if (bindings[index - 1]!.id === bindings[index]!.id) {
      issues.push(
        issue("DUPLICATE_VALUE", path, `Duplicate provenance binding: ${bindings[index]!.id}`)
      );
    }
  }
  return Object.freeze(bindings);
}

function freezeReleaseInput(
  body: ReleaseInputBody,
  digest: ReleaseInputDigest,
  ownershipIndex: DistributionOwnershipIndex
): AgentPluginReleaseInput {
  const expectedMembers = Object.freeze(
    body.members.map((member) =>
      Object.freeze({
        pluginId: member.pluginId,
        payloadDigest: member.payload.payloadDigest,
      })
    )
  );
  const witness = Object.freeze({
    releaseInputDigest: digest,
    expectedMembers,
    ownershipIndex,
  }) as CompletenessWitness;
  return Object.freeze({
    schemaVersion: RELEASE_INPUT_SCHEMA_VERSION,
    releaseInputDigest: digest,
    body,
    ownershipIndex,
    completenessWitness: witness,
  }) as AgentPluginReleaseInput;
}

function releaseInputEnvelopeValue(input: AgentPluginReleaseInput): CanonicalJsonValue {
  return {
    schemaVersion: input.schemaVersion,
    releaseInputDigest: input.releaseInputDigest,
    body: releaseInputBodyValue(input.body),
  };
}

function isCanonicalProvenanceProtocol(value: string): boolean {
  const issues: ReleaseIssue[] = [];
  return (
    parseCanonicalString(value, "provenance.protocol", issues, {
      maxBytes: MAX_CANONICAL_ID_BYTES,
      pattern: /^[a-z0-9][a-z0-9._:@/-]*$/u,
    }) !== undefined
  );
}

function releaseMemberValue(member: ReleaseMemberDeclaration): CanonicalJsonValue {
  return {
    kind: member.kind,
    pluginId: member.pluginId,
    skillInventory: member.skillInventory.map((entry) => ({
      identity: entry.identity,
      manifestPath: entry.manifestPath,
    })),
    payload: {
      protocolVersion: member.payload.protocolVersion,
      manifest: payloadManifestValue(member.payload.manifest),
      payloadDigest: member.payload.payloadDigest,
    },
    vendor: member.vendor.map(provenanceBindingValue),
    curation: member.curation.map(provenanceBindingValue),
  };
}

export function provenanceBindingValue(binding: ProvenanceBinding): CanonicalJsonValue {
  return {
    id: binding.id,
    protocol: binding.protocol,
    contentDigest: binding.contentDigest,
  };
}

function ownershipClaimValue(claim: OwnershipClaim): CanonicalJsonValue {
  return {
    kind: claim.kind,
    identity: claim.identity,
    ownerPluginId: claim.ownerPluginId,
  };
}

function isDeclaredOwnershipClaim(
  claim: OwnershipClaim
): claim is ReleaseInputBody["ownershipClaims"][number] {
  return claim.kind !== "plugin";
}

function compareBindings(left: ProvenanceBinding, right: ProvenanceBinding): number {
  return (
    compareCanonicalText(left.id, right.id) ||
    compareCanonicalText(left.protocol, right.protocol) ||
    compareCanonicalText(left.contentDigest, right.contentDigest)
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
        issue("DUPLICATE_PLUGIN_ID", path, `Duplicate plugin identity: ${memberIds[index]}`)
      );
    }
  }
}

export const AGENT_PLUGIN_BUILDER_PROTOCOL_VERSION: BuilderProtocolVersion =
  BUILDER_PROTOCOL_VERSION;
