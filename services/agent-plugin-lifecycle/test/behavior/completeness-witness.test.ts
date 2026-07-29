import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";

import {
  type CompletenessWitness,
  CompletenessWitnessRecordSchema,
  type ExpectedReleaseMember,
  ExpectedReleaseMemberSchema,
  MAX_RELEASE_MEMBERS,
} from "../../src/service/model/dto/release-input";
import type { ReleaseIssue } from "../../src/service/model/dto/release-issue";
import {
  completenessWitnessValue,
  createCompletenessWitness,
  parseCompletenessWitness,
} from "../../src/service/model/policy/completeness-witness";
import { createDistributionOwnershipIndex } from "../../src/service/model/policy/distribution-ownership";
import { payloadDigest, releaseInputDigest } from "../../src/service/model/policy/release-digest";
import { parsePluginId } from "../../src/service/model/policy/release-identity";
import { releaseIssue } from "../../src/service/model/policy/release-issue";

const encoder = new TextEncoder();

describe("completeness witness policy", () => {
  it("uses closed TypeBox structure for expected members and persisted witnesses", () => {
    const witness = createWitness(["alpha"]);

    expect(Value.Check(ExpectedReleaseMemberSchema, witness.expectedMembers[0])).toBe(true);
    expect(Value.Check(CompletenessWitnessRecordSchema, witness)).toBe(true);
    expect(
      Value.Check(CompletenessWitnessRecordSchema, {
        ...witnessRecord(witness),
        unexpected: true,
      })
    ).toBe(false);
    expect(
      Value.Check(CompletenessWitnessRecordSchema, {
        ...witnessRecord(witness),
        expectedMembers: [{ ...witness.expectedMembers[0], unexpected: true }],
      })
    ).toBe(false);
  });

  it("constructs, orders, freezes, and projects one witness defensively", () => {
    const members = [expectedMember("zeta"), expectedMember("alpha")];
    const witness = mustWitness(
      createCompletenessWitness({
        releaseInputDigest: releaseInputDigest(encoder.encode("release-input")),
        expectedMembers: members,
        ownershipIndex: ownershipIndex(["alpha", "zeta"]),
      })
    );

    expect(witness.expectedMembers.map(({ pluginId }) => pluginId)).toEqual(["alpha", "zeta"]);
    expect(Object.isFrozen(witness)).toBe(true);
    expect(Object.isFrozen(witness.expectedMembers)).toBe(true);
    expect(witness.expectedMembers.every(Object.isFrozen)).toBe(true);
    expect(completenessWitnessValue(witness)).toEqual({
      releaseInputDigest: witness.releaseInputDigest,
      expectedMembers: [
        {
          pluginId: "alpha",
          payloadDigest: payloadDigest(encoder.encode("alpha")),
        },
        {
          pluginId: "zeta",
          payloadDigest: payloadDigest(encoder.encode("zeta")),
        },
      ],
      ownershipIndex: {
        schemaVersion: 1,
        claims: [
          { kind: "plugin", identity: "alpha", ownerPluginId: "alpha" },
          { kind: "plugin", identity: "zeta", ownerPluginId: "zeta" },
        ],
      },
    });

    members[0] = expectedMember("changed");
    expect(witness.expectedMembers.map(({ pluginId }) => pluginId)).toEqual(["alpha", "zeta"]);
  });

  it("refuses to brand boundedness, duplicate, or ownership-invalid typed facts", () => {
    const digest = releaseInputDigest(encoder.encode("release-input"));
    const alphaOwnership = ownershipIndex(["alpha"]);
    const duplicate = createCompletenessWitness({
      releaseInputDigest: digest,
      expectedMembers: [expectedMember("alpha"), expectedMember("alpha")],
      ownershipIndex: alphaOwnership,
    });
    const mismatch = createCompletenessWitness({
      releaseInputDigest: digest,
      expectedMembers: [expectedMember("beta")],
      ownershipIndex: alphaOwnership,
    });
    const overflowIds = Array.from(
      { length: MAX_RELEASE_MEMBERS + 1 },
      (_, index) => `plugin-${index.toString().padStart(4, "0")}`
    );
    const overflow = createCompletenessWitness({
      releaseInputDigest: digest,
      expectedMembers: overflowIds.map(expectedMember),
      ownershipIndex: ownershipIndex(overflowIds),
    });

    expect(duplicate.ok).toBe(false);
    expect(mismatch.ok).toBe(false);
    expect(overflow.ok).toBe(false);
    if (duplicate.ok || mismatch.ok || overflow.ok) {
      throw new Error("Expected invalid witness construction to fail");
    }
    expect(duplicate.issues.map(({ code }) => code)).toContain("DUPLICATE_PLUGIN_ID");
    expect(mismatch.issues.map(({ code }) => code)).toEqual(["OWNERSHIP_INDEX_MISMATCH"]);
    expect(overflow.issues.map(({ code }) => code)).toContain("COUNT_LIMIT_EXCEEDED");
  });

  it("refuses duplicate identities independently of declaration order", () => {
    const witness = createWitness(["alpha"]);
    const duplicate = [
      expectedMemberValue("alpha", "second"),
      expectedMemberValue("alpha", "first"),
    ];
    const leftIssues: ReleaseIssue[] = [];
    const rightIssues: ReleaseIssue[] = [];

    const left = parseCompletenessWitness(
      { ...witnessRecord(witness), expectedMembers: duplicate },
      "witness",
      leftIssues
    );
    const right = parseCompletenessWitness(
      { ...witnessRecord(witness), expectedMembers: [...duplicate].reverse() },
      "witness",
      rightIssues
    );

    expect(left?.expectedMembers.map(({ pluginId }) => pluginId)).toEqual(["alpha", "alpha"]);
    expect(right?.expectedMembers.map(({ pluginId }) => pluginId)).toEqual(["alpha", "alpha"]);
    expect(rightIssues).toEqual(leftIssues);
    expect(leftIssues.map(({ code }) => code)).toContain("DUPLICATE_PLUGIN_ID");
    expect(leftIssues).toContainEqual(
      releaseIssue(
        "DUPLICATE_PLUGIN_ID",
        "witness.expectedMembers",
        "Duplicate plugin identity: alpha"
      )
    );
  });

  it("admits the exact member bound and refuses overflow without reading its tail", () => {
    const pluginIds = Array.from(
      { length: MAX_RELEASE_MEMBERS },
      (_, index) => `plugin-${index.toString().padStart(4, "0")}`
    );
    const witness = createWitness(pluginIds);
    const atLimitIssues: ReleaseIssue[] = [];
    const atLimit = parseCompletenessWitness(
      completenessWitnessValue(witness),
      "witness",
      atLimitIssues
    );

    expect(atLimitIssues).toEqual([]);
    expect(atLimit?.expectedMembers).toHaveLength(MAX_RELEASE_MEMBERS);

    const overflow = [...witness.expectedMembers];
    Object.defineProperty(overflow, MAX_RELEASE_MEMBERS, {
      configurable: true,
      get: () => {
        throw new Error("bounded admission must not read overflow");
      },
    });
    const overflowIssues: ReleaseIssue[] = [];
    const bounded = parseCompletenessWitness(
      { ...witnessRecord(witness), expectedMembers: overflow },
      "witness",
      overflowIssues
    );

    expect(bounded?.expectedMembers).toHaveLength(MAX_RELEASE_MEMBERS);
    expect(overflowIssues).toEqual([
      releaseIssue(
        "COUNT_LIMIT_EXCEEDED",
        "witness.expectedMembers",
        `Array exceeds protocol limit ${MAX_RELEASE_MEMBERS}`,
        {
          expected: MAX_RELEASE_MEMBERS,
          actual: MAX_RELEASE_MEMBERS + 1,
        }
      ),
    ]);
  });

  it("preserves diagnostics while refusing ownership mismatch and malformed structure", () => {
    const witness = createWitness(["alpha"]);
    const seed = releaseIssue("INVALID_STRING", "seed", "Seed diagnostic");
    const ownershipIssues = [seed];
    const parsed = parseCompletenessWitness(
      {
        ...witnessRecord(witness),
        expectedMembers: [expectedMemberValue("beta")],
      },
      "witness",
      ownershipIssues
    );

    expect(parsed?.expectedMembers.map(({ pluginId }) => pluginId)).toEqual(["beta"]);
    expect(ownershipIssues[0]).toBe(seed);
    expect(ownershipIssues.slice(1)).toEqual([
      releaseIssue(
        "OWNERSHIP_INDEX_MISMATCH",
        "witness.ownershipIndex",
        "Completeness members and ownership members differ"
      ),
    ]);

    const malformedIssues: ReleaseIssue[] = [];
    const malformed = parseCompletenessWitness(
      {
        ...witnessRecord(witness),
        expectedMembers: [{ pluginId: "alpha", payloadDigest: "not-a-digest" }],
        unexpected: true,
      },
      "witness",
      malformedIssues
    );
    expect(malformed?.expectedMembers).toEqual([]);
    expect(malformedIssues.map(({ code }) => code)).toEqual([
      "UNKNOWN_FIELD",
      "INVALID_DIGEST",
      "OWNERSHIP_INDEX_MISMATCH",
    ]);
  });
});

function createWitness(pluginIds: readonly string[]) {
  return mustWitness(
    createCompletenessWitness({
      releaseInputDigest: releaseInputDigest(encoder.encode("release-input")),
      expectedMembers: pluginIds.map((pluginId) => expectedMember(pluginId)),
      ownershipIndex: ownershipIndex(pluginIds),
    })
  );
}

function mustWitness(result: ReturnType<typeof createCompletenessWitness>): CompletenessWitness {
  if (!result.ok) throw new Error("Expected a valid completeness witness");
  return result.value;
}

function witnessRecord(witness: CompletenessWitness): Readonly<Record<string, unknown>> {
  const value = completenessWitnessValue(witness);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a completeness-witness record");
  }
  return value as Readonly<Record<string, unknown>>;
}

function expectedMember(pluginId: string): ExpectedReleaseMember {
  const parsed = parsePluginId(pluginId);
  if (!parsed.ok) throw new Error(`Invalid test plugin ID: ${pluginId}`);
  return Object.freeze({
    pluginId: parsed.value,
    payloadDigest: payloadDigest(encoder.encode(pluginId)),
  });
}

function expectedMemberValue(pluginId: string, payload = pluginId) {
  return {
    pluginId,
    payloadDigest: payloadDigest(encoder.encode(payload)),
  };
}

function ownershipIndex(pluginIds: readonly string[]) {
  const parsed = pluginIds.map((pluginId) => {
    const result = parsePluginId(pluginId);
    if (!result.ok) throw new Error(`Invalid test plugin ID: ${pluginId}`);
    return result.value;
  });
  const result = createDistributionOwnershipIndex(parsed, []);
  if (!result.ok) throw new Error("Expected a valid ownership index");
  return result.value;
}
