import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import {
  type DeclaredOwnershipClaim,
  DeclaredOwnershipClaimSchema,
  DeclaredOwnershipClaimsSchema,
  type DistributionOwnershipIndex,
  DistributionOwnershipIndexRecordSchema,
  MAX_OWNERSHIP_CLAIMS,
  type OwnershipClaim,
  OwnershipClaimSchema,
} from "../../src/service/model/dto/distribution-ownership";
import type { OwnershipIdentity, PluginId } from "../../src/service/model/dto/release-identity";
import type { ReleaseIssue } from "../../src/service/model/dto/release-issue";
import {
  createDistributionOwnershipIndex,
  ownershipClaimsFor,
  ownershipIndexValue,
  parseDeclaredOwnershipClaims,
  parseDistributionOwnershipIndex,
} from "../../src/service/model/policy/distribution-ownership";
import {
  parseOwnershipIdentity,
  parsePluginId,
} from "../../src/service/model/policy/release-identity";
import { releaseIssue } from "../../src/service/model/policy/release-issue";

describe("distribution ownership", () => {
  it("uses closed TypeBox contracts for declared claims and derived indexes", () => {
    const declared = claim("skill", "alpha-skill", "alpha");
    const plugin = fullClaim("plugin", "alpha", "alpha");

    expect(Value.Check(DeclaredOwnershipClaimSchema, declared)).toBe(true);
    expect(Value.Check(OwnershipClaimSchema, declared)).toBe(true);
    expect(Value.Check(OwnershipClaimSchema, plugin)).toBe(true);
    expect(Value.Check(DeclaredOwnershipClaimSchema, plugin)).toBe(false);
    expect(Value.Check(DeclaredOwnershipClaimsSchema, [{ ...declared, unexpected: true }])).toBe(
      false
    );
    expect(
      Value.Check(DistributionOwnershipIndexRecordSchema, {
        schemaVersion: 1,
        claims: [plugin],
        unexpected: true,
      })
    ).toBe(false);
  });

  it("synthesizes immutable plugin claims and canonical read-only views", () => {
    const source = {
      kind: "alias" as const,
      identity: identity("zeta"),
      ownerPluginId: pluginId("alpha"),
    };
    const created = mustIndex(
      createDistributionOwnershipIndex(
        [pluginId("beta"), pluginId("alpha")],
        [claim("skill", "beta-skill", "beta"), source]
      )
    );

    expect(
      created.claims.map(({ kind, identity: value, ownerPluginId }) => [kind, value, ownerPluginId])
    ).toEqual([
      ["alias", "zeta", "alpha"],
      ["plugin", "alpha", "alpha"],
      ["plugin", "beta", "beta"],
      ["skill", "beta-skill", "beta"],
    ]);
    const selectedClaims = ownershipClaimsFor(created, pluginId("alpha"), "alias");
    expect(selectedClaims).toEqual([expect.objectContaining({ identity: "zeta" })]);
    expect(Object.isFrozen(selectedClaims)).toBe(true);
    expect(ownershipIndexValue(created)).toEqual({
      schemaVersion: 1,
      claims: created.claims.map(({ kind, identity: value, ownerPluginId }) => ({
        kind,
        identity: value,
        ownerPluginId,
      })),
    });

    source.identity = identity("changed");
    expect(created.claims[0]?.identity).toBe("zeta");
    expect(Object.isFrozen(created)).toBe(true);
    expect(Object.isFrozen(created.claims)).toBe(true);
    expect(created.claims.every(Object.isFrozen)).toBe(true);
  });

  it("parses only closed non-plugin declarations and canonicalizes their order", () => {
    const issues: ReleaseIssue[] = [];
    const parsed = parseDeclaredOwnershipClaims(
      [claim("skill", "zeta", "alpha"), claim("alias", "alpha-alias", "alpha")].reverse(),
      "ownershipClaims",
      issues
    );
    expect(issues).toEqual([]);
    expect(parsed?.map(({ kind, identity: value }) => [kind, value])).toEqual([
      ["alias", "alpha-alias"],
      ["skill", "zeta"],
    ]);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(parsed?.every(Object.isFrozen)).toBe(true);

    for (const candidate of [
      null,
      [{ ...claim("skill", "valid", "alpha"), unexpected: true }],
      [fullClaim("plugin", "alpha", "alpha")],
      [{ kind: "skill", identity: "../unsafe", ownerPluginId: "alpha" }],
      [{ kind: "skill", identity: "valid", ownerPluginId: "Upper" }],
    ]) {
      const invalidIssues: ReleaseIssue[] = [];
      expect(
        parseDeclaredOwnershipClaims(candidate, "ownershipClaims", invalidIssues),
        JSON.stringify(candidate)
      ).toBeUndefined();
      expect(invalidIssues.length).toBeGreaterThan(0);
    }
  });

  it("parses a closed index and reports semantic plugin mismatches", () => {
    const created = mustIndex(
      createDistributionOwnershipIndex(
        [pluginId("alpha")],
        [claim("skill", "alpha-skill", "alpha")]
      )
    );
    const issues: ReleaseIssue[] = [];
    const parsed = parseDistributionOwnershipIndex(
      ownershipIndexValue(created),
      "ownershipIndex",
      issues
    );
    expect(issues).toEqual([]);
    expect(parsed).toEqual(created);

    for (const candidate of [
      { schemaVersion: 2, claims: created.claims },
      { schemaVersion: 1, claims: created.claims, unexpected: true },
      { schemaVersion: 1 },
    ]) {
      const invalidIssues: ReleaseIssue[] = [];
      expect(
        parseDistributionOwnershipIndex(candidate, "ownershipIndex", invalidIssues)
      ).toBeUndefined();
      expect(invalidIssues.length).toBeGreaterThan(0);
    }

    const mismatchIssues: ReleaseIssue[] = [];
    const mismatch = parseDistributionOwnershipIndex(
      {
        schemaVersion: 1,
        claims: [fullClaim("plugin", "not-alpha", "alpha")],
      },
      "ownershipIndex",
      mismatchIssues
    );
    expect(mismatch).toBeUndefined();
    expect(mismatchIssues.map(({ code }) => code)).toContain("OWNERSHIP_INDEX_MISMATCH");
  });

  it("preserves pre-existing issues by identity while parsing a valid index", () => {
    const created = mustIndex(
      createDistributionOwnershipIndex(
        [pluginId("alpha")],
        [claim("skill", "alpha-skill", "alpha")]
      )
    );
    const seededIssue = releaseIssue("EXPECTED_OBJECT", "seeded.path", "Seeded release issue");
    const issues: ReleaseIssue[] = [seededIssue];

    const parsed = parseDistributionOwnershipIndex(
      ownershipIndexValue(created),
      "ownershipIndex",
      issues
    );

    expect(parsed).toEqual(created);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toBe(seededIssue);
  });

  it("classifies every ownership conflict independently of input order", () => {
    const memberIds = [pluginId("alpha"), pluginId("beta")];
    const claims = [
      claim("alias", "duplicate", "alpha"),
      claim("alias", "duplicate", "alpha"),
      claim("skill", "shared", "alpha"),
      claim("skill", "shared", "beta"),
      claim("alias", "alpha", "beta"),
      claim("destination", "orphan", "ghost"),
    ];
    const left = createDistributionOwnershipIndex(memberIds, claims);
    const right = createDistributionOwnershipIndex([...memberIds].reverse(), [...claims].reverse());

    expect(left.ok).toBe(false);
    expect(right.ok).toBe(false);
    if (left.ok || right.ok) throw new Error("Expected ownership conflicts");
    expect(right.issues).toEqual(left.issues);
    expect(left.issues).toEqual([
      {
        code: "DUPLICATE_OWNERSHIP_CLAIM",
        path: "ownership.claims.alias.duplicate",
        message: "Ownership claim is duplicated",
        claimKind: "alias",
        claim: "duplicate",
        claimants: ["alpha"],
      },
      {
        code: "MISSING_OWNER",
        path: "ownership.claims.destination.orphan",
        message: "Claim owner is not a declared release member",
        claimKind: "destination",
        claim: "orphan",
        claimants: ["ghost"],
      },
      {
        code: "OWNERSHIP_CONFLICT",
        path: "ownership.claims.skill.shared",
        message: "Ownership claim has multiple owners",
        claimKind: "skill",
        claim: "shared",
        claimants: ["alpha", "beta"],
      },
      {
        code: "OWNERSHIP_CONFLICT",
        path: "ownership.routing.alpha",
        message: "Plugin identity and alias namespace is ambiguous",
        claimKind: "plugin-routing",
        claim: "alpha",
        claimants: ["alpha", "beta"],
      },
    ]);
  });

  it("keeps unrelated claim namespaces independent", () => {
    const result = createDistributionOwnershipIndex(
      [pluginId("alpha")],
      [
        claim("skill", "shared", "alpha"),
        claim("destination", "shared", "alpha"),
        claim("provider-identity", "shared", "alpha"),
      ]
    );
    expect(result.ok).toBe(true);
  });

  it("refuses plugin and alias routing collisions independent of declaration order", () => {
    const memberIds = [pluginId("alpha"), pluginId("beta")];
    const declaredClaims = [claim("alias", "alpha", "beta")];
    const left = createDistributionOwnershipIndex(memberIds, declaredClaims);
    const right = createDistributionOwnershipIndex(
      [...memberIds].reverse(),
      [...declaredClaims].reverse()
    );

    expect(left.ok).toBe(false);
    expect(right.ok).toBe(false);
    if (left.ok || right.ok) throw new Error("Expected plugin routing conflict");
    expect(right.issues).toEqual(left.issues);
    expect(left.issues).toEqual([
      expect.objectContaining({
        code: "OWNERSHIP_CONFLICT",
        claimKind: "plugin-routing",
        claim: "alpha",
        claimants: ["alpha", "beta"],
      }),
    ]);
  });

  it("refuses a plugin and alias routing collision owned by the same plugin", () => {
    expect(
      createDistributionOwnershipIndex([pluginId("alpha")], [claim("alias", "alpha", "alpha")])
    ).toEqual({
      ok: false,
      issues: [
        {
          code: "OWNERSHIP_CONFLICT",
          path: "ownership.routing.alpha",
          message: "Plugin identity and alias namespace is ambiguous",
          claimKind: "plugin-routing",
          claim: "alpha",
          claimants: ["alpha"],
        },
      ],
    });
  });

  it("admits the exact total bound and refuses one over without traversing it", () => {
    const declared = Array.from({ length: MAX_OWNERSHIP_CLAIMS }, (_, index) =>
      claim("alias", `alias-${index}`, "alpha")
    );
    const exact = createDistributionOwnershipIndex(
      [pluginId("alpha")],
      declared.slice(0, MAX_OWNERSHIP_CLAIMS - 1)
    );
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(exact.value.claims).toHaveLength(MAX_OWNERSHIP_CLAIMS);

    const over = createDistributionOwnershipIndex([pluginId("alpha")], declared);
    expect(over).toEqual({
      ok: false,
      issues: [
        {
          code: "COUNT_LIMIT_EXCEEDED",
          path: "ownership.claims",
          message: "Ownership claims exceed the protocol limit",
          expected: MAX_OWNERSHIP_CLAIMS,
          actual: MAX_OWNERSHIP_CLAIMS + 1,
        },
      ],
    });

    Object.defineProperty(declared, MAX_OWNERSHIP_CLAIMS, {
      configurable: true,
      get: () => {
        throw new Error("ownership parsing traversed beyond the protocol bound");
      },
    });
    const issues: ReleaseIssue[] = [];
    const parsed = parseDeclaredOwnershipClaims(declared, "ownershipClaims", issues);
    expect(parsed).toHaveLength(MAX_OWNERSHIP_CLAIMS);
    expect(issues).toEqual([
      {
        code: "COUNT_LIMIT_EXCEEDED",
        path: "ownershipClaims",
        message: `Array exceeds protocol limit ${MAX_OWNERSHIP_CLAIMS}`,
        expected: MAX_OWNERSHIP_CLAIMS,
        actual: MAX_OWNERSHIP_CLAIMS + 1,
      },
    ]);

    const indexClaims: OwnershipClaim[] = Array.from(
      { length: MAX_OWNERSHIP_CLAIMS },
      (_, index) =>
        index === 0
          ? fullClaim("plugin", "alpha", "alpha")
          : fullClaim("alias", `index-alias-${index}`, "alpha")
    );
    Object.defineProperty(indexClaims, MAX_OWNERSHIP_CLAIMS, {
      configurable: true,
      get: () => {
        throw new Error("ownership-index parsing traversed beyond the protocol bound");
      },
    });
    const indexIssues: ReleaseIssue[] = [];
    const parsedIndex = parseDistributionOwnershipIndex(
      { schemaVersion: 1, claims: indexClaims },
      "ownershipIndex",
      indexIssues
    );
    expect(parsedIndex).toBeUndefined();
    expect(indexIssues).toEqual([
      {
        code: "COUNT_LIMIT_EXCEEDED",
        path: "ownershipIndex.claims",
        message: `Array exceeds protocol limit ${MAX_OWNERSHIP_CLAIMS}`,
        expected: MAX_OWNERSHIP_CLAIMS,
        actual: MAX_OWNERSHIP_CLAIMS + 1,
      },
    ]);
  });
});

function claim(
  kind: DeclaredOwnershipClaim["kind"],
  claimIdentity: string,
  ownerPluginId: string
): DeclaredOwnershipClaim {
  return {
    kind,
    identity: identity(claimIdentity),
    ownerPluginId: pluginId(ownerPluginId),
  };
}

function fullClaim(
  kind: OwnershipClaim["kind"],
  claimIdentity: string,
  ownerPluginId: string
): OwnershipClaim {
  return {
    kind,
    identity: identity(claimIdentity),
    ownerPluginId: pluginId(ownerPluginId),
  };
}

function identity(value: string): OwnershipIdentity {
  const parsed = parseOwnershipIdentity(value);
  if (!parsed.ok) throw new Error(`Invalid ownership fixture: ${value}`);
  return parsed.value;
}

function pluginId(value: string): PluginId {
  const parsed = parsePluginId(value);
  if (!parsed.ok) throw new Error(`Invalid plugin fixture: ${value}`);
  return parsed.value;
}

function mustIndex(
  result:
    | Readonly<{ ok: true; value: DistributionOwnershipIndex }>
    | Readonly<{ ok: false; issues: readonly ReleaseIssue[] }>
): DistributionOwnershipIndex {
  if (!result.ok) throw new Error(result.issues.map(({ code }) => code).join(","));
  return result.value;
}
