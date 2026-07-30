import { Value } from "typebox/value";
import type { DistributionOwnershipIndex } from "../dto/distribution-ownership";
import type { ReleaseInputDigest } from "../dto/release-digest";
import type { PluginId } from "../dto/release-identity";
import {
  type AgentPluginReleaseInput,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  RELEASE_INPUT_SCHEMA_VERSION,
  type ReleaseInputBody,
  ReleaseInputBodySchema,
  type ReleaseInputEnvelope,
  ReleaseInputEnvelopeSchema,
  type ReleaseMemberDeclaration,
  ReleaseMemberDeclarationSchema,
} from "../dto/release-input";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { equalBytes } from "../helpers/byte-equality";
import { decodeCanonicalJson } from "./canonical-json";
import { compareCanonicalText } from "./canonical-text-ordering";
import {
  createDistributionOwnershipIndex,
  parseDeclaredOwnershipClaims,
} from "./distribution-ownership";
import { parseProvenanceBindings } from "./provenance-binding";
import { parseReleaseInputDigest, releaseInputDigest } from "./release-digest";
import { parseContentAuthority, parsePluginId } from "./release-identity";
import {
  canonicalSerializeAgentPluginReleaseInput,
  canonicalSerializeReleaseInputBody,
} from "./release-input-codec";
import { releaseIssue, sortReleaseIssues } from "./release-issue";
import { asNonEmpty, collectReleaseResult, failure, success } from "./release-result";
import { admitTypeBoxRecordForTraversal, parseBoundedArray } from "./release-value-admission";

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
  if (!admitTypeBoxRecordForTraversal(ReleaseInputEnvelopeSchema, input, "releaseInput", issues)) {
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
  {
    readonly body: ReleaseInputBody;
    readonly ownershipIndex: DistributionOwnershipIndex;
  },
  ReleaseIssue
> {
  const issues: ReleaseIssue[] = [];
  if (!admitTypeBoxRecordForTraversal(ReleaseInputBodySchema, input, path, issues)) {
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
  const members: ReleaseMemberDeclaration[] = [];
  let structurallyComplete = true;
  values.forEach((candidate, index) => {
    const memberPath = `${path}[${index}]`;
    if (
      !admitTypeBoxRecordForTraversal(ReleaseMemberDeclarationSchema, candidate, memberPath, issues)
    ) {
      structurallyComplete = false;
      return;
    }
    const kind = parseUnitKind(candidate.kind, `${memberPath}.kind`, issues);
    const pluginId = collectReleaseResult(
      parsePluginId(candidate.pluginId, `${memberPath}.pluginId`),
      issues
    );
    const vendor = parseProvenanceBindings(candidate.vendor, `${memberPath}.vendor`, issues);
    const curation = parseProvenanceBindings(candidate.curation, `${memberPath}.curation`, issues);
    if (vendor === undefined || curation === undefined) structurallyComplete = false;
    if (
      kind === "agent-plugin" &&
      pluginId !== undefined &&
      vendor !== undefined &&
      curation !== undefined
    ) {
      members.push(Object.freeze({ kind, pluginId, vendor, curation }));
    }
  });
  members.sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId));
  reportDuplicateMembers(
    members.map((member) => member.pluginId),
    path,
    issues
  );
  if (!structurallyComplete) return undefined;
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

function freezeReleaseInput(
  body: ReleaseInputBody,
  digest: ReleaseInputDigest,
  ownershipIndex: DistributionOwnershipIndex
): ReleaseResult<AgentPluginReleaseInput, ReleaseIssue> {
  return success(
    Object.freeze({
      schemaVersion: RELEASE_INPUT_SCHEMA_VERSION,
      releaseInputDigest: digest,
      body,
      ownershipIndex,
    }) as AgentPluginReleaseInput
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
