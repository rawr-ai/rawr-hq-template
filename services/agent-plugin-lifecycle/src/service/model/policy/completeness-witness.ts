import { Value } from "typebox/value";
import type { CanonicalJsonValue } from "../dto/canonical-json";
import type { DistributionOwnershipIndex } from "../dto/distribution-ownership";
import type { ReleaseInputDigest } from "../dto/release-digest";
import {
  type CompletenessWitness,
  CompletenessWitnessRecordSchema,
  type ExpectedReleaseMember,
  MAX_RELEASE_MEMBERS,
} from "../dto/release-input";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { compareCanonicalText } from "./canonical-text-ordering";
import { ownershipIndexValue, parseDistributionOwnershipIndex } from "./distribution-ownership";
import { parsePayloadDigest, parseReleaseInputDigest } from "./release-digest";
import { parsePluginId } from "./release-identity";
import { releaseIssue, sortReleaseIssues } from "./release-issue";
import { asNonEmpty, collectReleaseResult, failure, success } from "./release-result";
import { admitClosedRecordForTraversal, parseBoundedArray } from "./release-value-admission";

/** Constructs the completeness witness derived from one admitted release input. */
export function createCompletenessWitness(
  input: Readonly<{
    releaseInputDigest: ReleaseInputDigest;
    expectedMembers: readonly ExpectedReleaseMember[];
    ownershipIndex: DistributionOwnershipIndex;
  }>
): ReleaseResult<CompletenessWitness, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const witness = parseCompletenessWitness(input, "completenessWitness", issues);
  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (witness === undefined) {
    return failure([
      releaseIssue(
        "EXPECTED_OBJECT",
        "completenessWitness",
        "Completeness-witness construction did not produce a complete value"
      ),
    ]);
  }
  return success(
    freezeCompletenessWitness(
      witness.releaseInputDigest,
      witness.expectedMembers,
      input.ownershipIndex
    )
  );
}

/** Admits one closed witness while preserving granular release diagnostics. */
export function parseCompletenessWitness(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): CompletenessWitness | undefined {
  if (
    !admitClosedRecordForTraversal(
      input,
      ["expectedMembers", "ownershipIndex", "releaseInputDigest"],
      path,
      issues
    )
  )
    return undefined;
  const digest = collectReleaseResult(
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
    if (
      !admitClosedRecordForTraversal(candidate, ["payloadDigest", "pluginId"], memberPath, issues)
    )
      return;
    const pluginId = collectReleaseResult(
      parsePluginId(candidate.pluginId, `${memberPath}.pluginId`),
      issues
    );
    const payloadDigest = collectReleaseResult(
      parsePayloadDigest(candidate.payloadDigest, `${memberPath}.payloadDigest`),
      issues
    );
    if (pluginId !== undefined && payloadDigest !== undefined) {
      expectedMembers.push(Object.freeze({ pluginId, payloadDigest }));
    }
  });
  expectedMembers.sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId));
  reportDuplicateExpectedMembers(expectedMembers, `${path}.expectedMembers`, issues);
  if (ownershipIndex !== undefined) {
    reportOwnershipMismatch(expectedMembers, ownershipIndex, `${path}.ownershipIndex`, issues);
  }
  if (digest === undefined || ownershipIndex === undefined) return undefined;
  const witness = freezeCompletenessWitness(digest, expectedMembers, ownershipIndex);
  if (!Value.Check(CompletenessWitnessRecordSchema, witness)) {
    issues.push(
      releaseIssue(
        "EXPECTED_OBJECT",
        path,
        "Completeness witness must match the closed TypeBox schema"
      )
    );
    return undefined;
  }
  return witness;
}

/** Projects an admitted witness into the canonical release-set digest preimage. */
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

function freezeExpectedMembers(
  members: readonly ExpectedReleaseMember[]
): readonly ExpectedReleaseMember[] {
  return Object.freeze(
    members
      .map((member) =>
        Object.freeze({
          pluginId: member.pluginId,
          payloadDigest: member.payloadDigest,
        })
      )
      .sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId))
  );
}

function freezeCompletenessWitness(
  releaseInputDigest: ReleaseInputDigest,
  expectedMembers: readonly ExpectedReleaseMember[],
  ownershipIndex: DistributionOwnershipIndex
): CompletenessWitness {
  return Object.freeze({
    releaseInputDigest,
    expectedMembers: freezeExpectedMembers(expectedMembers),
    ownershipIndex,
  }) as unknown as CompletenessWitness;
}

function reportDuplicateExpectedMembers(
  members: readonly ExpectedReleaseMember[],
  path: string,
  issues: ReleaseIssue[]
): void {
  for (let index = 1; index < members.length; index += 1) {
    if (members[index - 1]!.pluginId === members[index]!.pluginId) {
      issues.push(
        releaseIssue(
          "DUPLICATE_PLUGIN_ID",
          path,
          `Duplicate plugin identity: ${members[index]!.pluginId}`
        )
      );
    }
  }
}

function reportOwnershipMismatch(
  expectedMembers: readonly ExpectedReleaseMember[],
  ownershipIndex: DistributionOwnershipIndex,
  path: string,
  issues: ReleaseIssue[]
): void {
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
      releaseIssue(
        "OWNERSHIP_INDEX_MISMATCH",
        path,
        "Completeness members and ownership members differ"
      )
    );
  }
}
