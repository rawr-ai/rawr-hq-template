import {
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
  type CanonicalJsonValue,
} from "./canonical";
import { issue, sortReleaseIssues, type ReleaseIssue } from "./issues";
import { ownershipClaimsFor } from "./ownership";
import { collect, isExactRecord, parseBoundedArray } from "./parse";
import {
  parsePayloadManifest,
  payloadEntriesValue,
  payloadManifestValue,
  payloadValue,
  verifyAgentPluginPayload,
  type AgentPluginPayload,
  type PayloadEntry,
  type PayloadManifestEntry,
} from "./payload";
import {
  ARTIFACT_PROTOCOL_VERSION,
  AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
  BUILDER_PROTOCOL_VERSION,
  MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES,
  MAX_OWNERSHIP_CLAIMS,
  artifactDigest,
  compareCanonicalText,
  parseArtifactDigest,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseOwnershipIdentity,
  parsePayloadDigest,
  parsePluginId,
  parseReleaseDigest,
  parseReleaseInputDigest,
  parseRepositoryIdentity,
  releaseDigest,
  type AgentPluginReleaseSchemaVersion,
  type ArtifactDigest,
  type ArtifactProtocolVersion,
  type BuilderProtocolVersion,
  type ContentAuthority,
  type GitCommitId,
  type GitTreeId,
  type OwnershipIdentity,
  type PayloadDigest,
  type PluginId,
  type ReleaseDigest,
  type ReleaseInputDigest,
  type RepositoryIdentity,
} from "./primitives";
import {
  provenanceBindingValue,
  parseProvenanceBindings,
  releaseInputBodyValue,
  verifyAgentPluginReleaseInput,
  type AgentPluginReleaseInput,
  type ProvenanceBinding,
} from "./release-input";
import { asNonEmpty, failure, success, type ReleaseResult } from "./result";

declare const agentPluginReleaseBrand: unique symbol;

export interface ReleaseSourceIdentity {
  readonly sourceRepository: RepositoryIdentity;
  readonly sourceCommit: GitCommitId;
  readonly sourceTree: GitTreeId;
}

export interface AgentPluginReleaseBody extends ReleaseSourceIdentity {
  readonly schemaVersion: AgentPluginReleaseSchemaVersion;
  readonly builderProtocolVersion: BuilderProtocolVersion;
  readonly contentAuthority: ContentAuthority;
  readonly releaseInputDigest: ReleaseInputDigest;
  readonly pluginId: PluginId;
  readonly aliases: readonly OwnershipIdentity[];
  readonly payloadManifest: readonly PayloadManifestEntry[];
  readonly payloadDigest: PayloadDigest;
  readonly vendor: readonly ProvenanceBinding[];
  readonly curation: readonly ProvenanceBinding[];
}

export interface AgentPluginArtifactBody {
  readonly protocolVersion: ArtifactProtocolVersion;
  readonly releaseBody: AgentPluginReleaseBody;
  readonly releaseDigest: ReleaseDigest;
  readonly storageManifest: readonly PayloadManifestEntry[];
  readonly payloadEntries: readonly PayloadEntry[];
}

export type AgentPluginRelease = Readonly<{
  schemaVersion: AgentPluginReleaseSchemaVersion;
  releaseDigest: ReleaseDigest;
  artifactDigest: ArtifactDigest;
  artifactBody: AgentPluginArtifactBody;
  [agentPluginReleaseBrand]: "AgentPluginRelease";
}>;

export interface CreateAgentPluginReleaseInput {
  readonly releaseInput: AgentPluginReleaseInput;
  readonly pluginId: PluginId;
  readonly source: ReleaseSourceIdentity;
  readonly payload: AgentPluginPayload;
}

export function createAgentPluginRelease(
  input: unknown
): ReleaseResult<AgentPluginRelease, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (!isExactRecord(input, ["payload", "pluginId", "releaseInput", "source"], "release", issues)) {
    return failure([
      issues[0] ??
        issue("EXPECTED_OBJECT", "release", "Release construction input must be an object"),
    ]);
  }

  const verifiedInput = verifyEmbeddedReleaseInput(input.releaseInput, issues);
  const pluginId = collect(parsePluginId(input.pluginId, "release.pluginId"), issues);
  const source = parseReleaseSourceIdentity(input.source, "release.source", issues);
  const payload = verifyEmbeddedPayload(input.payload, issues);

  const member =
    verifiedInput !== undefined && pluginId !== undefined
      ? verifiedInput.body.members.find((candidate) => candidate.pluginId === pluginId)
      : undefined;
  if (verifiedInput !== undefined && pluginId !== undefined && member === undefined) {
    issues.push(
      issue(
        "MEMBER_NOT_DECLARED",
        "release.pluginId",
        "Plugin is not declared by the verified release input",
        {
          actual: pluginId,
        }
      )
    );
  }
  if (member !== undefined && payload !== undefined) {
    if (member.payload.payloadDigest !== payload.payloadDigest) {
      issues.push(
        issue(
          "PAYLOAD_DIGEST_MISMATCH",
          "release.payload.payloadDigest",
          "Payload differs from the member declaration",
          {
            expected: member.payload.payloadDigest,
            actual: payload.payloadDigest,
          }
        )
      );
    }
    if (!sameManifest(member.payload.manifest, payload.manifest)) {
      issues.push(
        issue(
          "PAYLOAD_MANIFEST_MISMATCH",
          "release.payload.manifest",
          "Payload manifest differs from the member declaration"
        )
      );
    }
  }

  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (
    verifiedInput === undefined ||
    pluginId === undefined ||
    source === undefined ||
    payload === undefined ||
    member === undefined
  ) {
    return failure([
      issue("EXPECTED_OBJECT", "release", "Release validation did not produce a complete value"),
    ]);
  }

  const aliases = Object.freeze(
    ownershipClaimsFor(verifiedInput.ownershipIndex, pluginId, "alias")
      .map((claim) => claim.identity)
      .sort(compareCanonicalText)
  );
  const body: AgentPluginReleaseBody = Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
    builderProtocolVersion: BUILDER_PROTOCOL_VERSION,
    contentAuthority: verifiedInput.body.contentAuthority,
    sourceRepository: source.sourceRepository,
    sourceCommit: source.sourceCommit,
    sourceTree: source.sourceTree,
    releaseInputDigest: verifiedInput.releaseInputDigest,
    pluginId,
    aliases,
    payloadManifest: payload.manifest,
    payloadDigest: payload.payloadDigest,
    vendor: member.vendor,
    curation: member.curation,
  });
  const release = freezeRelease(body, payload);
  const byteLength = canonicalSerializeAgentPluginRelease(release).byteLength;
  if (byteLength > MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES) {
    return failure([
      issue(
        "ENVELOPE_TOO_LARGE",
        "release",
        "Release envelope exceeds its derived protocol bound",
        {
          expected: MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES,
          actual: byteLength,
        }
      ),
    ]);
  }
  return success(release);
}

export function verifyAgentPluginRelease(
  input: unknown
): ReleaseResult<AgentPluginRelease, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (
    !isExactRecord(
      input,
      ["artifactBody", "artifactDigest", "releaseDigest", "schemaVersion"],
      "release",
      issues
    )
  ) {
    return failure([
      issues[0] ?? issue("EXPECTED_OBJECT", "release", "Release envelope must be an object"),
    ]);
  }
  if (input.schemaVersion !== AGENT_PLUGIN_RELEASE_SCHEMA_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        "release.schemaVersion",
        "Unsupported release envelope version",
        {
          expected: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
          actual:
            typeof input.schemaVersion === "number"
              ? input.schemaVersion
              : String(input.schemaVersion),
        }
      )
    );
  }
  const claimedReleaseDigest = collect(
    parseReleaseDigest(input.releaseDigest, "release.releaseDigest"),
    issues
  );
  const claimedArtifactDigest = collect(
    parseArtifactDigest(input.artifactDigest, "release.artifactDigest"),
    issues
  );
  const artifactBody = parseArtifactBody(input.artifactBody, "release.artifactBody", issues);

  if (artifactBody !== undefined && claimedReleaseDigest !== undefined) {
    const computed = releaseDigest(
      canonicalSerializeAgentPluginReleaseBody(artifactBody.releaseBody)
    );
    if (computed !== claimedReleaseDigest) {
      issues.push(
        issue(
          "RELEASE_DIGEST_MISMATCH",
          "release.releaseDigest",
          "Claimed release digest differs from the release body",
          {
            expected: computed,
            actual: claimedReleaseDigest,
          }
        )
      );
    }
    if (artifactBody.releaseDigest !== claimedReleaseDigest) {
      issues.push(
        issue(
          "RELEASE_DIGEST_MISMATCH",
          "release.artifactBody.releaseDigest",
          "Artifact body binds a different release digest",
          {
            expected: claimedReleaseDigest,
            actual: artifactBody.releaseDigest,
          }
        )
      );
    }
  }
  if (artifactBody !== undefined && claimedArtifactDigest !== undefined) {
    const computed = artifactDigest(canonicalSerializeAgentPluginArtifactBody(artifactBody));
    if (computed !== claimedArtifactDigest) {
      issues.push(
        issue(
          "ARTIFACT_DIGEST_MISMATCH",
          "release.artifactDigest",
          "Claimed artifact digest differs from the exact artifact body",
          {
            expected: computed,
            actual: claimedArtifactDigest,
          }
        )
      );
    }
  }

  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (
    claimedReleaseDigest === undefined ||
    claimedArtifactDigest === undefined ||
    artifactBody === undefined
  ) {
    return failure([
      issue("EXPECTED_OBJECT", "release", "Release validation did not produce a complete value"),
    ]);
  }
  const release = Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
    releaseDigest: claimedReleaseDigest,
    artifactDigest: claimedArtifactDigest,
    artifactBody,
  }) as AgentPluginRelease;
  const byteLength = canonicalSerializeAgentPluginRelease(release).byteLength;
  if (byteLength > MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES) {
    return failure([
      issue(
        "ENVELOPE_TOO_LARGE",
        "release",
        "Release envelope exceeds its derived protocol bound",
        {
          expected: MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES,
          actual: byteLength,
        }
      ),
    ]);
  }
  return success(release);
}

export function decodeAgentPluginRelease(
  bytes: unknown
): ReleaseResult<AgentPluginRelease, ReleaseIssue> {
  const decoded = decodeCanonicalJson(bytes, "release", MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES);
  if (!decoded.ok) return decoded;
  const verified = verifyAgentPluginRelease(decoded.value);
  if (!verified.ok) return verified;
  if (
    !(bytes instanceof Uint8Array) ||
    !equalBytes(bytes, canonicalSerializeAgentPluginRelease(verified.value))
  ) {
    return failure([
      issue(
        "NON_CANONICAL_ENVELOPE",
        "release",
        "Release bytes are not the unique canonical representation"
      ),
    ]);
  }
  return verified;
}

export function canonicalSerializeAgentPluginReleaseBody(body: AgentPluginReleaseBody): Uint8Array {
  return canonicalJsonLine(agentPluginReleaseBodyValue(body));
}

export function canonicalSerializeAgentPluginArtifactBody(
  body: AgentPluginArtifactBody
): Uint8Array {
  return canonicalJsonLine(agentPluginArtifactBodyValue(body));
}

export function canonicalSerializeAgentPluginRelease(release: AgentPluginRelease): Uint8Array {
  return canonicalJsonLine(agentPluginReleaseValue(release));
}

export function agentPluginReleaseBodyValue(body: AgentPluginReleaseBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    builderProtocolVersion: body.builderProtocolVersion,
    contentAuthority: body.contentAuthority,
    sourceRepository: body.sourceRepository,
    sourceCommit: body.sourceCommit,
    sourceTree: body.sourceTree,
    releaseInputDigest: body.releaseInputDigest,
    pluginId: body.pluginId,
    aliases: body.aliases,
    payloadManifest: payloadManifestValue(body.payloadManifest),
    payloadDigest: body.payloadDigest,
    vendor: body.vendor.map(provenanceBindingValue),
    curation: body.curation.map(provenanceBindingValue),
  };
}

export function agentPluginArtifactBodyValue(body: AgentPluginArtifactBody): CanonicalJsonValue {
  return {
    protocolVersion: body.protocolVersion,
    releaseBody: agentPluginReleaseBodyValue(body.releaseBody),
    releaseDigest: body.releaseDigest,
    storageManifest: payloadManifestValue(body.storageManifest),
    payloadEntries: payloadEntriesValue(body.payloadEntries),
  };
}

export function agentPluginReleaseValue(release: AgentPluginRelease): CanonicalJsonValue {
  return {
    schemaVersion: release.schemaVersion,
    releaseDigest: release.releaseDigest,
    artifactDigest: release.artifactDigest,
    artifactBody: agentPluginArtifactBodyValue(release.artifactBody),
  };
}

function parseArtifactBody(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): AgentPluginArtifactBody | undefined {
  if (
    !isExactRecord(
      input,
      ["payloadEntries", "protocolVersion", "releaseBody", "releaseDigest", "storageManifest"],
      path,
      issues
    )
  )
    return undefined;
  if (input.protocolVersion !== ARTIFACT_PROTOCOL_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        `${path}.protocolVersion`,
        "Unsupported artifact protocol version",
        {
          expected: ARTIFACT_PROTOCOL_VERSION,
          actual:
            typeof input.protocolVersion === "number"
              ? input.protocolVersion
              : String(input.protocolVersion),
        }
      )
    );
  }
  const body = parseReleaseBody(input.releaseBody, `${path}.releaseBody`, issues);
  const boundDigest = collect(
    parseReleaseDigest(input.releaseDigest, `${path}.releaseDigest`),
    issues
  );
  const storageManifest = parsePayloadManifest(
    input.storageManifest,
    `${path}.storageManifest`,
    issues
  );
  let payload: AgentPluginPayload | undefined;
  if (body !== undefined) {
    const verified = verifyAgentPluginPayload(
      {
        protocolVersion: 1,
        manifest: input.storageManifest,
        entries: input.payloadEntries,
        payloadDigest: body.payloadDigest,
      },
      `${path}.payload`
    );
    if (verified.ok) payload = verified.value;
    else issues.push(...verified.issues);
  }
  if (
    body !== undefined &&
    storageManifest !== undefined &&
    !sameManifest(body.payloadManifest, storageManifest)
  ) {
    issues.push(
      issue(
        "PAYLOAD_MANIFEST_MISMATCH",
        `${path}.storageManifest`,
        "Storage manifest differs from the release payload manifest"
      )
    );
  }
  if (
    input.protocolVersion !== ARTIFACT_PROTOCOL_VERSION ||
    body === undefined ||
    boundDigest === undefined ||
    storageManifest === undefined ||
    payload === undefined
  ) {
    return undefined;
  }
  return Object.freeze({
    protocolVersion: ARTIFACT_PROTOCOL_VERSION,
    releaseBody: body,
    releaseDigest: boundDigest,
    storageManifest,
    payloadEntries: payload.entries,
  });
}

function parseReleaseBody(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): AgentPluginReleaseBody | undefined {
  if (
    !isExactRecord(
      input,
      [
        "aliases",
        "builderProtocolVersion",
        "contentAuthority",
        "curation",
        "payloadDigest",
        "payloadManifest",
        "pluginId",
        "releaseInputDigest",
        "schemaVersion",
        "sourceCommit",
        "sourceRepository",
        "sourceTree",
        "vendor",
      ],
      path,
      issues
    )
  )
    return undefined;
  if (input.schemaVersion !== AGENT_PLUGIN_RELEASE_SCHEMA_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        `${path}.schemaVersion`,
        "Unsupported release-body schema version",
        {
          expected: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
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
  const contentAuthority = collect(
    parseContentAuthority(input.contentAuthority, `${path}.contentAuthority`),
    issues
  );
  const source = parseReleaseSourceFields(input, path, issues);
  const inputDigest = collect(
    parseReleaseInputDigest(input.releaseInputDigest, `${path}.releaseInputDigest`),
    issues
  );
  const pluginId = collect(parsePluginId(input.pluginId, `${path}.pluginId`), issues);
  const aliases = parseAliases(input.aliases, `${path}.aliases`, issues);
  const manifest = parsePayloadManifest(input.payloadManifest, `${path}.payloadManifest`, issues);
  const digest = collect(parsePayloadDigest(input.payloadDigest, `${path}.payloadDigest`), issues);
  const vendor = parseProvenanceBindings(input.vendor, `${path}.vendor`, issues);
  const curation = parseProvenanceBindings(input.curation, `${path}.curation`, issues);
  if (
    input.schemaVersion !== AGENT_PLUGIN_RELEASE_SCHEMA_VERSION ||
    input.builderProtocolVersion !== BUILDER_PROTOCOL_VERSION ||
    contentAuthority === undefined ||
    source === undefined ||
    inputDigest === undefined ||
    pluginId === undefined ||
    aliases === undefined ||
    manifest === undefined ||
    digest === undefined ||
    vendor === undefined ||
    curation === undefined
  )
    return undefined;
  return Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
    builderProtocolVersion: BUILDER_PROTOCOL_VERSION,
    contentAuthority,
    ...source,
    releaseInputDigest: inputDigest,
    pluginId,
    aliases,
    payloadManifest: manifest,
    payloadDigest: digest,
    vendor,
    curation,
  });
}

function parseReleaseSourceIdentity(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): ReleaseSourceIdentity | undefined {
  if (!isExactRecord(input, ["sourceCommit", "sourceRepository", "sourceTree"], path, issues))
    return undefined;
  return parseReleaseSourceFields(input, path, issues);
}

function parseReleaseSourceFields(
  input: Record<string, unknown>,
  path: string,
  issues: ReleaseIssue[]
): ReleaseSourceIdentity | undefined {
  const repository = collect(
    parseRepositoryIdentity(input.sourceRepository, `${path}.sourceRepository`),
    issues
  );
  const commit = collect(parseGitCommitId(input.sourceCommit, `${path}.sourceCommit`), issues);
  const tree = collect(parseGitTreeId(input.sourceTree, `${path}.sourceTree`), issues);
  if (repository === undefined || commit === undefined || tree === undefined) return undefined;
  return Object.freeze({ sourceRepository: repository, sourceCommit: commit, sourceTree: tree });
}

function parseAliases(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): readonly OwnershipIdentity[] | undefined {
  const values = parseBoundedArray(input, path, MAX_OWNERSHIP_CLAIMS, issues);
  if (values === undefined) return undefined;
  const aliases: OwnershipIdentity[] = [];
  values.forEach((candidate, index) => {
    const alias = collect(parseOwnershipIdentity(candidate, `${path}[${index}]`), issues);
    if (alias !== undefined) aliases.push(alias);
  });
  aliases.sort(compareCanonicalText);
  for (let index = 1; index < aliases.length; index += 1) {
    if (aliases[index - 1] === aliases[index]) {
      issues.push(issue("DUPLICATE_VALUE", path, `Duplicate release alias: ${aliases[index]}`));
    }
  }
  return Object.freeze(aliases);
}

function verifyEmbeddedReleaseInput(
  input: unknown,
  issues: ReleaseIssue[]
): AgentPluginReleaseInput | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    issues.push(
      issue("EXPECTED_OBJECT", "release.releaseInput", "Release input must be a verified value")
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

function verifyEmbeddedPayload(
  input: unknown,
  issues: ReleaseIssue[]
): AgentPluginPayload | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    issues.push(issue("EXPECTED_OBJECT", "release.payload", "Payload must be a verified value"));
    return undefined;
  }
  let candidate: unknown;
  try {
    candidate = payloadValue(input as AgentPluginPayload);
  } catch {
    candidate = input;
  }
  const verified = verifyAgentPluginPayload(candidate, "release.payload");
  if (!verified.ok) {
    issues.push(...verified.issues);
    return undefined;
  }
  return verified.value;
}

function freezeRelease(
  body: AgentPluginReleaseBody,
  payload: AgentPluginPayload
): AgentPluginRelease {
  const rd = releaseDigest(canonicalSerializeAgentPluginReleaseBody(body));
  const artifactBody: AgentPluginArtifactBody = Object.freeze({
    protocolVersion: ARTIFACT_PROTOCOL_VERSION,
    releaseBody: body,
    releaseDigest: rd,
    storageManifest: payload.manifest,
    payloadEntries: payload.entries,
  });
  const ad = artifactDigest(canonicalSerializeAgentPluginArtifactBody(artifactBody));
  return Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
    releaseDigest: rd,
    artifactDigest: ad,
    artifactBody,
  }) as AgentPluginRelease;
}

function sameManifest(
  left: readonly PayloadManifestEntry[],
  right: readonly PayloadManifestEntry[]
): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      entry.path === other.path &&
      entry.mode === other.mode &&
      entry.byteLength === other.byteLength &&
      entry.contentDigest === other.contentDigest
    );
  });
}

// Keep the input projection explicit so branded construction never depends on private symbol fields.
export function agentPluginReleaseInputValue(input: AgentPluginReleaseInput): CanonicalJsonValue {
  return {
    schemaVersion: input.schemaVersion,
    releaseInputDigest: input.releaseInputDigest,
    body: releaseInputBodyValue(input.body),
  };
}
