import { Value } from "typebox/value";
import { type AgentPluginPayload, AgentPluginPayloadSchema } from "../dto/agent-plugin-payload";
import {
  AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
  type AgentPluginRelease,
  type AgentPluginReleaseBody,
  AgentPluginReleaseBodySchema,
  AgentPluginReleaseConstructionSchema,
  AgentPluginReleaseEnvelopeSchema,
  AgentPluginReleaseSchema,
  BUILDER_PROTOCOL_VERSION,
  MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES,
  type ReleaseSourceIdentity,
  ReleaseSourceIdentitySchema,
} from "../dto/agent-plugin-release";
import { MAX_OWNERSHIP_CLAIMS } from "../dto/distribution-ownership";
import type { PayloadDigest } from "../dto/release-digest";
import type { OwnershipIdentity } from "../dto/release-identity";
import { type AgentPluginReleaseInput, AgentPluginReleaseInputSchema } from "../dto/release-input";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { equalBytes } from "../helpers/byte-equality";
import { verifyAgentPluginPayload } from "./agent-plugin-payload";
import { payloadValue } from "./agent-plugin-payload-codec";
import {
  agentPluginReleaseValue,
  canonicalSerializeAgentPluginRelease,
  canonicalSerializeAgentPluginReleaseBody,
} from "./agent-plugin-release-codec";
import { decodeCanonicalJson } from "./canonical-json";
import { compareCanonicalText } from "./canonical-text-ordering";
import { ownershipClaimsFor, validateAgentPluginPayloadOwnership } from "./distribution-ownership";
import { parsePayloadManifest, samePayloadManifest } from "./payload-manifest";
import { parseProvenanceBindings } from "./provenance-binding";
import {
  parsePayloadDigest,
  parseReleaseDigest,
  parseReleaseInputDigest,
  releaseDigest,
} from "./release-digest";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseOwnershipIdentity,
  parsePluginId,
  parseRepositoryIdentity,
} from "./release-identity";
import { verifyAgentPluginReleaseInput } from "./release-input";
import { releaseInputValue } from "./release-input-codec";
import { releaseIssue, sortReleaseIssues } from "./release-issue";
import { asNonEmpty, collectReleaseResult, failure, success } from "./release-result";
import { admitTypeBoxRecordForTraversal, parseBoundedArray } from "./release-value-admission";

/**
 * Constructs one verified in-memory release from a reviewed input and payload.
 *
 * Release policy owns admission and identity. It does not publish bytes,
 * allocate a store handle, or retain a source checkout.
 */
export function createAgentPluginRelease(
  input: unknown
): ReleaseResult<AgentPluginRelease, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (
    !admitTypeBoxRecordForTraversal(AgentPluginReleaseConstructionSchema, input, "release", issues)
  ) {
    return failure([
      issues[0] ??
        releaseIssue("EXPECTED_OBJECT", "release", "Release construction input must be an object"),
    ]);
  }

  const verifiedInput = verifyEmbeddedReleaseInput(input.releaseInput, issues);
  const pluginId = collectReleaseResult(parsePluginId(input.pluginId, "release.pluginId"), issues);
  const source = parseReleaseSourceIdentity(input.source, "release.source", issues);
  const payload = verifyEmbeddedPayload(input.payload, issues);
  const member =
    verifiedInput !== undefined && pluginId !== undefined
      ? verifiedInput.body.members.find((candidate) => candidate.pluginId === pluginId)
      : undefined;

  if (verifiedInput !== undefined && pluginId !== undefined && member === undefined) {
    issues.push(
      releaseIssue(
        "MEMBER_NOT_DECLARED",
        "release.pluginId",
        "Plugin is not declared by the verified release input",
        { actual: pluginId }
      )
    );
  }
  if (
    verifiedInput !== undefined &&
    pluginId !== undefined &&
    member !== undefined &&
    payload !== undefined
  ) {
    issues.push(
      ...validateAgentPluginPayloadOwnership(
        verifiedInput.ownershipIndex,
        pluginId,
        payload.manifest
      )
    );
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
      releaseIssue(
        "EXPECTED_OBJECT",
        "release",
        "Release validation did not produce a complete value"
      ),
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
  if (!Value.Check(AgentPluginReleaseBodySchema, body)) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        "release.body",
        "Release construction did not produce a TypeBox-valid body"
      ),
    ]);
  }
  return finishRelease(freezeRelease(body, payload));
}

/**
 * Re-admits an in-memory release envelope and verifies its body and payload.
 *
 * The returned brand means the source identity, payload binding, canonical
 * release digest, and wire structure were checked together.
 */
export function verifyAgentPluginRelease(
  input: unknown
): ReleaseResult<AgentPluginRelease, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (!admitTypeBoxRecordForTraversal(AgentPluginReleaseEnvelopeSchema, input, "release", issues)) {
    return failure([
      issues[0] ?? releaseIssue("EXPECTED_OBJECT", "release", "Release envelope must be an object"),
    ]);
  }
  if (input.schemaVersion !== AGENT_PLUGIN_RELEASE_SCHEMA_VERSION) {
    issues.push(
      releaseIssue(
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
  const claimedReleaseDigest = collectReleaseResult(
    parseReleaseDigest(input.releaseDigest, "release.releaseDigest"),
    issues
  );
  const body = parseReleaseBody(input.body, "release.body", issues);
  const payload = verifyReleasePayload(input.payload, issues);

  if (body !== undefined && payload !== undefined) {
    validatePayloadBinding(
      body.payloadDigest,
      body.payloadManifest,
      payload,
      "release.payload",
      issues,
      "Release payload differs from its canonical body"
    );
  }
  if (body !== undefined && claimedReleaseDigest !== undefined) {
    const computed = releaseDigest(canonicalSerializeAgentPluginReleaseBody(body));
    if (computed !== claimedReleaseDigest) {
      issues.push(
        releaseIssue(
          "RELEASE_DIGEST_MISMATCH",
          "release.releaseDigest",
          "Claimed release digest differs from the release body",
          { expected: computed, actual: claimedReleaseDigest }
        )
      );
    }
  }

  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (claimedReleaseDigest === undefined || body === undefined || payload === undefined) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        "release",
        "Release validation did not produce a complete value"
      ),
    ]);
  }
  return finishRelease(
    Object.freeze({
      schemaVersion: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
      releaseDigest: claimedReleaseDigest,
      body,
      payload,
    }) as AgentPluginRelease
  );
}

/**
 * Decodes the unique canonical wire form of one in-memory release envelope.
 *
 * Canonical byte equality is checked only after semantic admission so alternate
 * JSON representations cannot acquire the same release identity.
 */
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
      releaseIssue(
        "NON_CANONICAL_ENVELOPE",
        "release",
        "Release bytes are not the unique canonical representation"
      ),
    ]);
  }
  return verified;
}

function parseReleaseBody(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): AgentPluginReleaseBody | undefined {
  if (!admitTypeBoxRecordForTraversal(AgentPluginReleaseBodySchema, input, path, issues))
    return undefined;
  if (input.schemaVersion !== AGENT_PLUGIN_RELEASE_SCHEMA_VERSION) {
    issues.push(
      releaseIssue(
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
      releaseIssue(
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
  const contentAuthority = collectReleaseResult(
    parseContentAuthority(input.contentAuthority, `${path}.contentAuthority`),
    issues
  );
  const source = parseReleaseSourceFields(input, path, issues);
  const releaseInputDigest = collectReleaseResult(
    parseReleaseInputDigest(input.releaseInputDigest, `${path}.releaseInputDigest`),
    issues
  );
  const pluginId = collectReleaseResult(parsePluginId(input.pluginId, `${path}.pluginId`), issues);
  const aliases = parseAliases(input.aliases, `${path}.aliases`, issues);
  const payloadManifest = parsePayloadManifest(
    input.payloadManifest,
    `${path}.payloadManifest`,
    issues
  );
  const payloadDigest = collectReleaseResult(
    parsePayloadDigest(input.payloadDigest, `${path}.payloadDigest`),
    issues
  );
  const vendor = parseProvenanceBindings(input.vendor, `${path}.vendor`, issues);
  const curation = parseProvenanceBindings(input.curation, `${path}.curation`, issues);
  if (
    input.schemaVersion !== AGENT_PLUGIN_RELEASE_SCHEMA_VERSION ||
    input.builderProtocolVersion !== BUILDER_PROTOCOL_VERSION ||
    contentAuthority === undefined ||
    source === undefined ||
    releaseInputDigest === undefined ||
    pluginId === undefined ||
    aliases === undefined ||
    payloadManifest === undefined ||
    payloadDigest === undefined ||
    vendor === undefined ||
    curation === undefined
  )
    return undefined;

  const body: AgentPluginReleaseBody = Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
    builderProtocolVersion: BUILDER_PROTOCOL_VERSION,
    contentAuthority,
    ...source,
    releaseInputDigest,
    pluginId,
    aliases,
    payloadManifest,
    payloadDigest,
    vendor,
    curation,
  });
  if (Value.Check(AgentPluginReleaseBodySchema, body)) return body;
  issues.push(
    releaseIssue(
      "EXPECTED_OBJECT",
      path,
      "Release body does not match its closed TypeBox structure"
    )
  );
  return undefined;
}

function parseReleaseSourceIdentity(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): ReleaseSourceIdentity | undefined {
  if (!admitTypeBoxRecordForTraversal(ReleaseSourceIdentitySchema, input, path, issues))
    return undefined;
  return parseReleaseSourceFields(input, path, issues);
}

function parseReleaseSourceFields(
  input: Record<string, unknown>,
  path: string,
  issues: ReleaseIssue[]
): ReleaseSourceIdentity | undefined {
  const sourceRepository = collectReleaseResult(
    parseRepositoryIdentity(input.sourceRepository, `${path}.sourceRepository`),
    issues
  );
  const sourceCommit = collectReleaseResult(
    parseGitCommitId(input.sourceCommit, `${path}.sourceCommit`),
    issues
  );
  const sourceTree = collectReleaseResult(
    parseGitTreeId(input.sourceTree, `${path}.sourceTree`),
    issues
  );
  if (sourceRepository === undefined || sourceCommit === undefined || sourceTree === undefined) {
    return undefined;
  }
  const source = Object.freeze({ sourceRepository, sourceCommit, sourceTree });
  if (Value.Check(ReleaseSourceIdentitySchema, source)) return source;
  issues.push(
    releaseIssue(
      "EXPECTED_OBJECT",
      path,
      "Release source identity does not match its closed TypeBox structure"
    )
  );
  return undefined;
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
    const alias = collectReleaseResult(
      parseOwnershipIdentity(candidate, `${path}[${index}]`),
      issues
    );
    if (alias !== undefined) aliases.push(alias);
  });
  aliases.sort(compareCanonicalText);
  for (let index = 1; index < aliases.length; index += 1) {
    if (aliases[index - 1] === aliases[index]) {
      issues.push(
        releaseIssue("DUPLICATE_VALUE", path, `Duplicate release alias: ${aliases[index]}`)
      );
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
      releaseIssue(
        "EXPECTED_OBJECT",
        "release.releaseInput",
        "Release input must be a verified value"
      )
    );
    return undefined;
  }
  const candidate = Value.Check(AgentPluginReleaseInputSchema, input)
    ? releaseInputValue(input as AgentPluginReleaseInput)
    : input;
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
    issues.push(
      releaseIssue("EXPECTED_OBJECT", "release.payload", "Payload must be a verified value")
    );
    return undefined;
  }
  const candidate = Value.Check(AgentPluginPayloadSchema, input)
    ? payloadValue(input as AgentPluginPayload)
    : input;
  return verifyReleasePayload(candidate, issues);
}

function verifyReleasePayload(
  input: unknown,
  issues: ReleaseIssue[]
): AgentPluginPayload | undefined {
  const verified = verifyAgentPluginPayload(input, "release.payload");
  if (!verified.ok) {
    issues.push(...verified.issues);
    return undefined;
  }
  return verified.value;
}

function validatePayloadBinding(
  expectedDigest: PayloadDigest,
  expectedManifest: AgentPluginReleaseBody["payloadManifest"],
  payload: AgentPluginPayload,
  path: string,
  issues: ReleaseIssue[],
  detail: string
): void {
  if (expectedDigest !== payload.payloadDigest) {
    issues.push(
      releaseIssue("PAYLOAD_DIGEST_MISMATCH", `${path}.payloadDigest`, detail, {
        expected: expectedDigest,
        actual: payload.payloadDigest,
      })
    );
  }
  if (!samePayloadManifest(expectedManifest, payload.manifest)) {
    issues.push(releaseIssue("PAYLOAD_MANIFEST_MISMATCH", `${path}.manifest`, detail));
  }
}

function freezeRelease(
  body: AgentPluginReleaseBody,
  payload: AgentPluginPayload
): AgentPluginRelease {
  return Object.freeze({
    schemaVersion: AGENT_PLUGIN_RELEASE_SCHEMA_VERSION,
    releaseDigest: releaseDigest(canonicalSerializeAgentPluginReleaseBody(body)),
    body,
    payload,
  }) as AgentPluginRelease;
}

function finishRelease(
  release: AgentPluginRelease
): ReleaseResult<AgentPluginRelease, ReleaseIssue> {
  if (!Value.Check(AgentPluginReleaseSchema, release)) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        "release",
        "Release validation did not produce a TypeBox-valid in-memory value"
      ),
    ]);
  }
  if (!Value.Check(AgentPluginReleaseEnvelopeSchema, agentPluginReleaseValue(release))) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        "release",
        "Release validation did not produce a TypeBox-valid envelope"
      ),
    ]);
  }
  const byteLength = canonicalSerializeAgentPluginRelease(release).byteLength;
  if (byteLength > MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES) {
    return failure([
      releaseIssue(
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
