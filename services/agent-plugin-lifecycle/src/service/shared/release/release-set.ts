import {
  type CanonicalJsonValue,
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
} from "./canonical";
import { issue, type ReleaseIssue, sortReleaseIssues } from "./issues";
import {
  type DistributionOwnershipIndex,
  ownershipClaimsFor,
  ownershipIndexValue,
  parseDistributionOwnershipIndex,
} from "./ownership";
import { collect, isExactRecord, parseBoundedArray } from "./parse";
import { payloadManifestValue } from "./payload";
import {
  AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION,
  type AgentPluginReleaseSetSchemaVersion,
  type ArtifactDigest,
  BUILDER_PROTOCOL_VERSION,
  type BuilderProtocolVersion,
  type ContentAuthority,
  compareCanonicalText,
  type GitCommitId,
  type GitTreeId,
  MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  type PluginId,
  parseArtifactDigest,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseDigest,
  parseReleaseInputDigest,
  parseReleaseSetDigest,
  parseRepositoryIdentity,
  type ReleaseDigest,
  type ReleaseInputDigest,
  type ReleaseSetDigest,
  type RepositoryIdentity,
  releaseSetDigest,
} from "./primitives";
import {
  type AgentPluginRelease,
  agentPluginReleaseInputValue,
  agentPluginReleaseValue,
  verifyAgentPluginRelease,
} from "./release";
import {
  type AgentPluginReleaseInput,
  type CompletenessWitness,
  completenessWitnessValue,
  parseCompletenessWitness,
  provenanceBindingValue,
  verifyAgentPluginReleaseInput,
} from "./release-input";
import { asNonEmpty, failure, type ReleaseResult, success } from "./result";

declare const agentPluginReleaseSetBrand: unique symbol;

export interface AgentPluginReleaseSetMember {
  readonly pluginId: PluginId;
  readonly releaseDigest: ReleaseDigest;
  readonly artifactDigest: ArtifactDigest;
}

export interface AgentPluginReleaseSetBody {
  readonly schemaVersion: AgentPluginReleaseSetSchemaVersion;
  readonly builderProtocolVersion: BuilderProtocolVersion;
  readonly contentAuthority: ContentAuthority;
  readonly sourceRepository: RepositoryIdentity;
  readonly sourceCommit: GitCommitId;
  readonly sourceTree: GitTreeId;
  readonly releaseInputDigest: ReleaseInputDigest;
  readonly completenessWitness: CompletenessWitness;
  readonly ownershipIndex: DistributionOwnershipIndex;
  readonly members: readonly AgentPluginReleaseSetMember[];
}

export type AgentPluginReleaseSet = Readonly<{
  schemaVersion: AgentPluginReleaseSetSchemaVersion;
  releaseSetDigest: ReleaseSetDigest;
  body: AgentPluginReleaseSetBody;
  [agentPluginReleaseSetBrand]: "AgentPluginReleaseSet";
}>;

export interface CreateAgentPluginReleaseSetInput {
  readonly releaseInput: AgentPluginReleaseInput;
  readonly releases: readonly AgentPluginRelease[];
}

export function createAgentPluginReleaseSet(
  input: unknown
): ReleaseResult<AgentPluginReleaseSet, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (!isExactRecord(input, ["releaseInput", "releases"], "releaseSet", issues)) {
    return failure([
      issues[0] ??
        issue("EXPECTED_OBJECT", "releaseSet", "Release-set construction input must be an object"),
    ]);
  }
  const releaseInput = verifyEmbeddedReleaseInput(input.releaseInput, issues);
  const rawReleases = parseBoundedArray(
    input.releases,
    "releaseSet.releases",
    MAX_RELEASE_MEMBERS,
    issues
  );
  const releases: AgentPluginRelease[] = [];
  rawReleases?.forEach((candidate, index) => {
    const verified = verifyReleaseCandidate(candidate);
    if (verified.ok) releases.push(verified.value);
    else
      issues.push(
        ...verified.issues.map((entry) =>
          Object.freeze({
            ...entry,
            path: `releaseSet.releases[${index}].${entry.path}`,
          })
        )
      );
  });
  releases.sort((left, right) =>
    compareCanonicalText(
      left.artifactBody.releaseBody.pluginId,
      right.artifactBody.releaseBody.pluginId
    )
  );
  reportDuplicateReleaseMembers(releases, issues);
  if (releaseInput !== undefined) validateExpectedMembership(releaseInput, releases, issues);

  const first = releases[0];
  if (first === undefined) {
    issues.push(
      issue(
        "MISSING_EXPECTED_MEMBER",
        "releaseSet.releases",
        "A complete release set must contain its declared members",
        {
          expected: releaseInput?.body.members.length ?? 1,
          actual: 0,
        }
      )
    );
  }
  if (releaseInput !== undefined) {
    for (const release of releases) validateReleaseIdentity(releaseInput, first, release, issues);
  }

  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (releaseInput === undefined || first === undefined) {
    return failure([
      issue(
        "EXPECTED_OBJECT",
        "releaseSet",
        "Release-set validation did not produce a complete value"
      ),
    ]);
  }
  const firstBody = first.artifactBody.releaseBody;
  const body: AgentPluginReleaseSetBody = Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION,
    builderProtocolVersion: BUILDER_PROTOCOL_VERSION,
    contentAuthority: releaseInput.body.contentAuthority,
    sourceRepository: firstBody.sourceRepository,
    sourceCommit: firstBody.sourceCommit,
    sourceTree: firstBody.sourceTree,
    releaseInputDigest: releaseInput.releaseInputDigest,
    completenessWitness: releaseInput.completenessWitness,
    ownershipIndex: releaseInput.ownershipIndex,
    members: Object.freeze(
      releases.map((release) =>
        Object.freeze({
          pluginId: release.artifactBody.releaseBody.pluginId,
          releaseDigest: release.releaseDigest,
          artifactDigest: release.artifactDigest,
        })
      )
    ),
  });
  const releaseSet = freezeReleaseSet(body);
  const byteLength = canonicalSerializeAgentPluginReleaseSet(releaseSet).byteLength;
  if (byteLength > MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES) {
    return failure([
      issue("ENVELOPE_TOO_LARGE", "releaseSet", "Release-set envelope exceeds its protocol bound", {
        expected: MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES,
        actual: byteLength,
      }),
    ]);
  }
  return success(releaseSet);
}

export function verifyAgentPluginReleaseSet(
  input: unknown
): ReleaseResult<AgentPluginReleaseSet, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (!isExactRecord(input, ["body", "releaseSetDigest", "schemaVersion"], "releaseSet", issues)) {
    return failure([
      issues[0] ?? issue("EXPECTED_OBJECT", "releaseSet", "Release-set envelope must be an object"),
    ]);
  }
  if (input.schemaVersion !== AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        "releaseSet.schemaVersion",
        "Unsupported release-set envelope version",
        {
          expected: AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION,
          actual:
            typeof input.schemaVersion === "number"
              ? input.schemaVersion
              : String(input.schemaVersion),
        }
      )
    );
  }
  const claimedDigest = collect(
    parseReleaseSetDigest(input.releaseSetDigest, "releaseSet.releaseSetDigest"),
    issues
  );
  const body = parseReleaseSetBody(input.body, "releaseSet.body", issues);
  if (body !== undefined && claimedDigest !== undefined) {
    const computed = releaseSetDigest(canonicalSerializeAgentPluginReleaseSetBody(body));
    if (computed !== claimedDigest) {
      issues.push(
        issue(
          "RELEASE_SET_DIGEST_MISMATCH",
          "releaseSet.releaseSetDigest",
          "Claimed set digest differs from the complete set body",
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
  if (claimedDigest === undefined || body === undefined) {
    return failure([
      issue(
        "EXPECTED_OBJECT",
        "releaseSet",
        "Release-set validation did not produce a complete value"
      ),
    ]);
  }
  const releaseSet = Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION,
    releaseSetDigest: claimedDigest,
    body,
  }) as AgentPluginReleaseSet;
  const byteLength = canonicalSerializeAgentPluginReleaseSet(releaseSet).byteLength;
  if (byteLength > MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES) {
    return failure([
      issue("ENVELOPE_TOO_LARGE", "releaseSet", "Release-set envelope exceeds its protocol bound", {
        expected: MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES,
        actual: byteLength,
      }),
    ]);
  }
  return success(releaseSet);
}

export function verifyCompleteReleaseSet(
  releaseSetInput: unknown,
  releaseInputs: unknown
): ReleaseResult<AgentPluginReleaseSet, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const verifiedSet = verifyAgentPluginReleaseSet(releaseSetInput);
  if (!verifiedSet.ok) issues.push(...verifiedSet.issues);
  const rawReleases = parseBoundedArray(releaseInputs, "releases", MAX_RELEASE_MEMBERS, issues);
  const releases: AgentPluginRelease[] = [];
  rawReleases?.forEach((candidate, index) => {
    const verified = verifyReleaseCandidate(candidate);
    if (verified.ok) releases.push(verified.value);
    else
      issues.push(
        ...verified.issues.map((entry) =>
          Object.freeze({
            ...entry,
            path: `releases[${index}].${entry.path}`,
          })
        )
      );
  });
  reportDuplicateReleaseMembers(releases, issues);

  if (verifiedSet.ok) validateReleaseSetMembers(verifiedSet.value, releases, issues);
  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (!verifiedSet.ok) return verifiedSet;
  return success(verifiedSet.value);
}

export function decodeAgentPluginReleaseSet(
  bytes: unknown
): ReleaseResult<AgentPluginReleaseSet, ReleaseIssue> {
  const decoded = decodeCanonicalJson(
    bytes,
    "releaseSet",
    MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES
  );
  if (!decoded.ok) return decoded;
  const verified = verifyAgentPluginReleaseSet(decoded.value);
  if (!verified.ok) return verified;
  if (
    !(bytes instanceof Uint8Array) ||
    !equalBytes(bytes, canonicalSerializeAgentPluginReleaseSet(verified.value))
  ) {
    return failure([
      issue(
        "NON_CANONICAL_ENVELOPE",
        "releaseSet",
        "Release-set bytes are not the unique canonical representation"
      ),
    ]);
  }
  return verified;
}

export function canonicalSerializeAgentPluginReleaseSetBody(
  body: AgentPluginReleaseSetBody
): Uint8Array {
  return canonicalJsonLine(agentPluginReleaseSetBodyValue(body));
}

export function canonicalSerializeAgentPluginReleaseSet(
  releaseSet: AgentPluginReleaseSet
): Uint8Array {
  return canonicalJsonLine(agentPluginReleaseSetValue(releaseSet));
}

export function agentPluginReleaseSetBodyValue(
  body: AgentPluginReleaseSetBody
): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    builderProtocolVersion: body.builderProtocolVersion,
    contentAuthority: body.contentAuthority,
    sourceRepository: body.sourceRepository,
    sourceCommit: body.sourceCommit,
    sourceTree: body.sourceTree,
    releaseInputDigest: body.releaseInputDigest,
    completenessWitness: completenessWitnessValue(body.completenessWitness),
    ownershipIndex: ownershipIndexValue(body.ownershipIndex),
    members: body.members.map((member) => ({
      pluginId: member.pluginId,
      releaseDigest: member.releaseDigest,
      artifactDigest: member.artifactDigest,
    })),
  };
}

export function agentPluginReleaseSetValue(releaseSet: AgentPluginReleaseSet): CanonicalJsonValue {
  return {
    schemaVersion: releaseSet.schemaVersion,
    releaseSetDigest: releaseSet.releaseSetDigest,
    body: agentPluginReleaseSetBodyValue(releaseSet.body),
  };
}

function parseReleaseSetBody(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): AgentPluginReleaseSetBody | undefined {
  if (
    !isExactRecord(
      input,
      [
        "builderProtocolVersion",
        "completenessWitness",
        "contentAuthority",
        "members",
        "ownershipIndex",
        "releaseInputDigest",
        "schemaVersion",
        "sourceCommit",
        "sourceRepository",
        "sourceTree",
      ],
      path,
      issues
    )
  )
    return undefined;
  if (input.schemaVersion !== AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        `${path}.schemaVersion`,
        "Unsupported release-set schema version",
        {
          expected: AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION,
          actual:
            typeof input.schemaVersion === "number"
              ? input.schemaVersion
              : String(input.schemaVersion),
        }
      )
    );
  }
  if (input.builderProtocolVersion !== BUILDER_PROTOCOL_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        `${path}.builderProtocolVersion`,
        "Unsupported builder protocol version",
        {
          expected: BUILDER_PROTOCOL_VERSION,
          actual:
            typeof input.builderProtocolVersion === "number"
              ? input.builderProtocolVersion
              : String(input.builderProtocolVersion),
        }
      )
    );
  }
  const authority = collect(
    parseContentAuthority(input.contentAuthority, `${path}.contentAuthority`),
    issues
  );
  const repository = collect(
    parseRepositoryIdentity(input.sourceRepository, `${path}.sourceRepository`),
    issues
  );
  const commit = collect(parseGitCommitId(input.sourceCommit, `${path}.sourceCommit`), issues);
  const tree = collect(parseGitTreeId(input.sourceTree, `${path}.sourceTree`), issues);
  const inputDigest = collect(
    parseReleaseInputDigest(input.releaseInputDigest, `${path}.releaseInputDigest`),
    issues
  );
  const witness = parseCompletenessWitness(
    input.completenessWitness,
    `${path}.completenessWitness`,
    issues
  );
  const ownershipIndex = parseDistributionOwnershipIndex(
    input.ownershipIndex,
    `${path}.ownershipIndex`,
    issues
  );
  const members = parseSetMembers(input.members, `${path}.members`, issues);

  if (
    witness !== undefined &&
    inputDigest !== undefined &&
    witness.releaseInputDigest !== inputDigest
  ) {
    issues.push(
      issue(
        "RELEASE_INPUT_IDENTITY_MISMATCH",
        `${path}.completenessWitness.releaseInputDigest`,
        "Completeness witness belongs to another release input",
        {
          expected: inputDigest,
          actual: witness.releaseInputDigest,
        }
      )
    );
  }
  if (
    witness !== undefined &&
    ownershipIndex !== undefined &&
    !sameCanonicalValue(
      ownershipIndexValue(witness.ownershipIndex),
      ownershipIndexValue(ownershipIndex)
    )
  ) {
    issues.push(
      issue(
        "OWNERSHIP_INDEX_MISMATCH",
        `${path}.ownershipIndex`,
        "Set ownership index differs from its completeness witness"
      )
    );
  }
  if (witness !== undefined && members !== undefined)
    validateWitnessMemberIds(witness, members, path, issues);
  if (
    input.schemaVersion !== AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION ||
    input.builderProtocolVersion !== BUILDER_PROTOCOL_VERSION ||
    authority === undefined ||
    repository === undefined ||
    commit === undefined ||
    tree === undefined ||
    inputDigest === undefined ||
    witness === undefined ||
    ownershipIndex === undefined ||
    members === undefined
  )
    return undefined;
  return Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION,
    builderProtocolVersion: BUILDER_PROTOCOL_VERSION,
    contentAuthority: authority,
    sourceRepository: repository,
    sourceCommit: commit,
    sourceTree: tree,
    releaseInputDigest: inputDigest,
    completenessWitness: witness,
    ownershipIndex,
    members,
  });
}

function parseSetMembers(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): readonly AgentPluginReleaseSetMember[] | undefined {
  const values = parseBoundedArray(input, path, MAX_RELEASE_MEMBERS, issues);
  if (values === undefined) return undefined;
  const members: AgentPluginReleaseSetMember[] = [];
  values.forEach((candidate, index) => {
    const memberPath = `${path}[${index}]`;
    if (
      !isExactRecord(candidate, ["artifactDigest", "pluginId", "releaseDigest"], memberPath, issues)
    )
      return;
    const pluginId = collect(parsePluginId(candidate.pluginId, `${memberPath}.pluginId`), issues);
    const rd = collect(
      parseReleaseDigest(candidate.releaseDigest, `${memberPath}.releaseDigest`),
      issues
    );
    const ad = collect(
      parseArtifactDigest(candidate.artifactDigest, `${memberPath}.artifactDigest`),
      issues
    );
    if (pluginId !== undefined && rd !== undefined && ad !== undefined) {
      members.push(Object.freeze({ pluginId, releaseDigest: rd, artifactDigest: ad }));
    }
  });
  members.sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId));
  for (let index = 1; index < members.length; index += 1) {
    if (members[index - 1]!.pluginId === members[index]!.pluginId) {
      issues.push(
        issue("DUPLICATE_PLUGIN_ID", path, `Duplicate set member: ${members[index]!.pluginId}`)
      );
    }
  }
  if (members.length === 0) {
    issues.push(issue("MISSING_EXPECTED_MEMBER", path, "A complete release set cannot be empty"));
  }
  return Object.freeze(members);
}

function verifyEmbeddedReleaseInput(
  input: unknown,
  issues: ReleaseIssue[]
): AgentPluginReleaseInput | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    issues.push(
      issue("EXPECTED_OBJECT", "releaseSet.releaseInput", "Release input must be a verified value")
    );
    return undefined;
  }
  let candidate: unknown;
  try {
    candidate = agentPluginReleaseInputValue(input as AgentPluginReleaseInput);
  } catch {
    candidate = input;
  }
  const verified = verifyAgentPluginReleaseInput(candidate);
  if (!verified.ok) {
    issues.push(...verified.issues);
    return undefined;
  }
  return verified.value;
}

function verifyReleaseCandidate(input: unknown): ReleaseResult<AgentPluginRelease, ReleaseIssue> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return verifyAgentPluginRelease(input);
  }
  try {
    return verifyAgentPluginRelease(agentPluginReleaseValue(input as AgentPluginRelease));
  } catch {
    return verifyAgentPluginRelease(input);
  }
}

function validateExpectedMembership(
  input: AgentPluginReleaseInput,
  releases: readonly AgentPluginRelease[],
  issues: ReleaseIssue[]
): void {
  const expected = new Map(
    input.completenessWitness.expectedMembers.map((member) => [
      member.pluginId,
      member.payloadDigest,
    ])
  );
  const actual = new Map(
    releases.map((release) => [release.artifactBody.releaseBody.pluginId, release])
  );
  for (const [pluginId, payloadDigest] of [...expected].sort(([left], [right]) =>
    compareCanonicalText(left, right)
  )) {
    const release = actual.get(pluginId);
    if (release === undefined) {
      issues.push(
        issue(
          "MISSING_EXPECTED_MEMBER",
          `releaseSet.members.${pluginId}`,
          "Expected member is absent",
          { actual: pluginId }
        )
      );
    } else if (release.artifactBody.releaseBody.payloadDigest !== payloadDigest) {
      issues.push(
        issue(
          "PAYLOAD_DIGEST_MISMATCH",
          `releaseSet.members.${pluginId}.payloadDigest`,
          "Member payload differs from the completeness witness",
          {
            expected: payloadDigest,
            actual: release.artifactBody.releaseBody.payloadDigest,
          }
        )
      );
    }
  }
  for (const pluginId of [...actual.keys()].sort(compareCanonicalText)) {
    if (!expected.has(pluginId)) {
      issues.push(
        issue(
          "EXTRA_MEMBER",
          `releaseSet.members.${pluginId}`,
          "Release is not declared by the completeness witness",
          { actual: pluginId }
        )
      );
    }
  }
}

function validateReleaseIdentity(
  input: AgentPluginReleaseInput,
  first: AgentPluginRelease | undefined,
  release: AgentPluginRelease,
  issues: ReleaseIssue[]
): void {
  const body = release.artifactBody.releaseBody;
  const firstBody = first?.artifactBody.releaseBody;
  if (body.contentAuthority !== input.body.contentAuthority) {
    issues.push(
      issue(
        "SOURCE_IDENTITY_MISMATCH",
        `releaseSet.members.${body.pluginId}.contentAuthority`,
        "Release has another content authority",
        {
          expected: input.body.contentAuthority,
          actual: body.contentAuthority,
        }
      )
    );
  }
  if (body.releaseInputDigest !== input.releaseInputDigest) {
    issues.push(
      issue(
        "RELEASE_INPUT_IDENTITY_MISMATCH",
        `releaseSet.members.${body.pluginId}.releaseInputDigest`,
        "Release belongs to another release input",
        {
          expected: input.releaseInputDigest,
          actual: body.releaseInputDigest,
        }
      )
    );
  }
  const declaration = input.body.members.find((member) => member.pluginId === body.pluginId);
  if (declaration === undefined) {
    issues.push(
      issue(
        "MEMBER_NOT_DECLARED",
        `releaseSet.members.${body.pluginId}`,
        "Release is not declared by the verified release input",
        {
          actual: body.pluginId,
        }
      )
    );
  } else {
    const expectedAliases = ownershipClaimsFor(input.ownershipIndex, body.pluginId, "alias")
      .map((claim) => claim.identity)
      .sort(compareCanonicalText);
    if (
      expectedAliases.length !== body.aliases.length ||
      expectedAliases.some((alias, index) => alias !== body.aliases[index])
    ) {
      issues.push(
        issue(
          "RELEASE_INPUT_IDENTITY_MISMATCH",
          `releaseSet.members.${body.pluginId}.aliases`,
          "Release aliases differ from the verified release input"
        )
      );
    }
    if (
      !sameCanonicalValue(
        payloadManifestValue(declaration.payload.manifest),
        payloadManifestValue(body.payloadManifest)
      )
    ) {
      issues.push(
        issue(
          "PAYLOAD_MANIFEST_MISMATCH",
          `releaseSet.members.${body.pluginId}.payloadManifest`,
          "Release manifest differs from the verified release input"
        )
      );
    }
    for (const field of ["vendor", "curation"] as const) {
      if (
        !sameCanonicalValue(
          declaration[field].map(provenanceBindingValue),
          body[field].map(provenanceBindingValue)
        )
      ) {
        issues.push(
          issue(
            "RELEASE_INPUT_IDENTITY_MISMATCH",
            `releaseSet.members.${body.pluginId}.${field}`,
            `Release ${field} bindings differ from the verified release input`
          )
        );
      }
    }
  }
  if (firstBody !== undefined) {
    const fields = ["sourceRepository", "sourceCommit", "sourceTree"] as const;
    for (const field of fields) {
      if (body[field] !== firstBody[field]) {
        issues.push(
          issue(
            "SOURCE_IDENTITY_MISMATCH",
            `releaseSet.members.${body.pluginId}.${field}`,
            "Release belongs to another source snapshot",
            {
              expected: firstBody[field],
              actual: body[field],
            }
          )
        );
      }
    }
  }
}

function validateWitnessMemberIds(
  witness: CompletenessWitness,
  members: readonly AgentPluginReleaseSetMember[],
  path: string,
  issues: ReleaseIssue[]
): void {
  const expected = new Set(witness.expectedMembers.map((member) => member.pluginId));
  const actual = new Set(members.map((member) => member.pluginId));
  for (const pluginId of [...expected].sort(compareCanonicalText)) {
    if (!actual.has(pluginId)) {
      issues.push(
        issue(
          "MISSING_EXPECTED_MEMBER",
          `${path}.members.${pluginId}`,
          "Set omits a completeness-witness member",
          { actual: pluginId }
        )
      );
    }
  }
  for (const pluginId of [...actual].sort(compareCanonicalText)) {
    if (!expected.has(pluginId)) {
      issues.push(
        issue(
          "EXTRA_MEMBER",
          `${path}.members.${pluginId}`,
          "Set contains a member absent from its completeness witness",
          { actual: pluginId }
        )
      );
    }
  }
}

function validateReleaseSetMembers(
  releaseSet: AgentPluginReleaseSet,
  releases: readonly AgentPluginRelease[],
  issues: ReleaseIssue[]
): void {
  const body = releaseSet.body;
  for (let index = 0; index < Math.max(body.members.length, releases.length); index += 1) {
    const expectedMember = body.members[index];
    const actualRelease = releases[index];
    const actualPluginId = actualRelease?.artifactBody.releaseBody.pluginId;
    if (expectedMember?.pluginId !== actualPluginId) {
      issues.push(
        issue(
          "RELEASE_SET_DIGEST_MISMATCH",
          `releases[${index}]`,
          "Release order differs from the canonical set order",
          {
            expected: expectedMember?.pluginId ?? "<none>",
            actual: actualPluginId ?? "<none>",
          }
        )
      );
    }
  }
  const expected = new Map(body.members.map((member) => [member.pluginId, member]));
  const actual = new Map(
    releases.map((release) => [release.artifactBody.releaseBody.pluginId, release])
  );
  for (const [pluginId, member] of body.members.map((entry) => [entry.pluginId, entry] as const)) {
    const release = actual.get(pluginId);
    if (release === undefined) {
      issues.push(
        issue("MISSING_EXPECTED_MEMBER", `releases.${pluginId}`, "Set member artifact is absent", {
          actual: pluginId,
        })
      );
      continue;
    }
    if (release.releaseDigest !== member.releaseDigest) {
      issues.push(
        issue(
          "RELEASE_DIGEST_MISMATCH",
          `releases.${pluginId}.releaseDigest`,
          "Member release digest differs from the set",
          {
            expected: member.releaseDigest,
            actual: release.releaseDigest,
          }
        )
      );
    }
    if (release.artifactDigest !== member.artifactDigest) {
      issues.push(
        issue(
          "ARTIFACT_DIGEST_MISMATCH",
          `releases.${pluginId}.artifactDigest`,
          "Member artifact digest differs from the set",
          {
            expected: member.artifactDigest,
            actual: release.artifactDigest,
          }
        )
      );
    }
    const releaseBody = release.artifactBody.releaseBody;
    const sourceFields = [
      "contentAuthority",
      "sourceRepository",
      "sourceCommit",
      "sourceTree",
      "releaseInputDigest",
    ] as const;
    for (const field of sourceFields) {
      if (releaseBody[field] !== body[field]) {
        issues.push(
          issue(
            field === "releaseInputDigest"
              ? "RELEASE_INPUT_IDENTITY_MISMATCH"
              : "SOURCE_IDENTITY_MISMATCH",
            `releases.${pluginId}.${field}`,
            "Member identity differs from the complete set",
            { expected: body[field], actual: releaseBody[field] }
          )
        );
      }
    }
    const expectedAliases = ownershipClaimsFor(body.ownershipIndex, pluginId, "alias")
      .map((claim) => claim.identity)
      .sort(compareCanonicalText);
    if (
      expectedAliases.length !== releaseBody.aliases.length ||
      expectedAliases.some((alias, index) => alias !== releaseBody.aliases[index])
    ) {
      issues.push(
        issue(
          "OWNERSHIP_INDEX_MISMATCH",
          `releases.${pluginId}.aliases`,
          "Member aliases differ from the complete ownership index"
        )
      );
    }
    const witness = body.completenessWitness.expectedMembers.find(
      (entry) => entry.pluginId === pluginId
    );
    if (witness !== undefined && witness.payloadDigest !== releaseBody.payloadDigest) {
      issues.push(
        issue(
          "PAYLOAD_DIGEST_MISMATCH",
          `releases.${pluginId}.payloadDigest`,
          "Member payload differs from the completeness witness",
          {
            expected: witness.payloadDigest,
            actual: releaseBody.payloadDigest,
          }
        )
      );
    }
  }
  for (const pluginId of [...actual.keys()].sort(compareCanonicalText)) {
    if (!expected.has(pluginId)) {
      issues.push(
        issue("EXTRA_MEMBER", `releases.${pluginId}`, "Release list contains an extra member", {
          actual: pluginId,
        })
      );
    }
  }
}

function reportDuplicateReleaseMembers(
  releases: readonly AgentPluginRelease[],
  issues: ReleaseIssue[]
): void {
  const counts = new Map<PluginId, number>();
  for (const release of releases) {
    const pluginId = release.artifactBody.releaseBody.pluginId;
    counts.set(pluginId, (counts.get(pluginId) ?? 0) + 1);
  }
  for (const [pluginId, count] of [...counts].sort(([left], [right]) =>
    compareCanonicalText(left, right)
  )) {
    if (count > 1) {
      issues.push(
        issue("DUPLICATE_PLUGIN_ID", "releaseSet.releases", `Duplicate release member: ${pluginId}`)
      );
    }
  }
}

function freezeReleaseSet(body: AgentPluginReleaseSetBody): AgentPluginReleaseSet {
  const digest = releaseSetDigest(canonicalSerializeAgentPluginReleaseSetBody(body));
  return Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION,
    releaseSetDigest: digest,
    body,
  }) as AgentPluginReleaseSet;
}

function sameCanonicalValue(left: CanonicalJsonValue, right: CanonicalJsonValue): boolean {
  return equalBytes(canonicalJsonLine(left), canonicalJsonLine(right));
}

// This projection is intentionally public only through the package root's release-set serializer.
export function agentPluginReleaseProjection(release: AgentPluginRelease): CanonicalJsonValue {
  return agentPluginReleaseValue(release);
}
