import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type AgentPluginReleaseSet,
  type AgentPluginReleaseSetBody,
  AgentPluginReleaseSetBodySchema,
  type AgentPluginReleaseSetConstruction,
  AgentPluginReleaseSetConstructionSchema,
  type AgentPluginReleaseSetMember,
  AgentPluginReleaseSetMemberSchema,
  AgentPluginReleaseSetSchema,
} from "../../src/service/model/dto/agent-plugin-release-set";
import { MAX_RELEASE_MEMBERS } from "../../src/service/model/dto/release-input";
import { ReleaseIssueSchema } from "../../src/service/model/dto/release-issue";
import { createAgentPluginPayload } from "../../src/service/model/policy/agent-plugin-payload";
import { payloadValue } from "../../src/service/model/policy/agent-plugin-payload-codec";
import {
  createAgentPluginRelease,
  verifyAgentPluginRelease,
} from "../../src/service/model/policy/agent-plugin-release";
import {
  canonicalSerializeAgentPluginRelease,
  canonicalSerializeAgentPluginReleaseBody,
} from "../../src/service/model/policy/agent-plugin-release-codec";
import {
  createAgentPluginReleaseSet,
  decodeAgentPluginReleaseSet,
  verifyAgentPluginReleaseSet,
  verifyCompleteReleaseSet,
} from "../../src/service/model/policy/agent-plugin-release-set";
import {
  canonicalSerializeAgentPluginReleaseSet,
  canonicalSerializeAgentPluginReleaseSetBody,
} from "../../src/service/model/policy/agent-plugin-release-set-codec";
import { releaseDigest, releaseSetDigest } from "../../src/service/model/policy/release-digest";
import { createAgentPluginReleaseInput } from "../../src/service/model/policy/release-input";
import { canonicalSerializeAgentPluginReleaseInput } from "../../src/service/model/policy/release-input-codec";
import {
  member,
  must,
  productFixture,
  releaseInputBody,
  SOURCE,
  wire,
} from "../support/service/release-fixtures";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface MutableReleaseInput {
  [key: string]: unknown;
  body: Record<string, unknown>;
}

interface MutableInMemoryRelease {
  [key: string]: unknown;
  body: Record<string, unknown>;
  payload: {
    [key: string]: unknown;
    entries: Array<Record<string, unknown>>;
  };
}

describe("complete release-set integrity", () => {
  it("derives the set contract from closed TypeBox member, body, and envelope schemas", () => {
    const fixture = productFixture();
    const wireConstruction = {
      releaseInput: wire(canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput)),
      releases: [
        wire(canonicalSerializeAgentPluginRelease(fixture.alphaRelease)),
        wire(canonicalSerializeAgentPluginRelease(fixture.betaRelease)),
      ],
    };
    type Equal<TLeft, TRight> =
      (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
        ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
          ? true
          : false
        : false;
    type MemberParity = Equal<
      AgentPluginReleaseSetMember,
      Static<typeof AgentPluginReleaseSetMemberSchema>
    >;
    type ConstructionParity = Equal<
      AgentPluginReleaseSetConstruction,
      Static<typeof AgentPluginReleaseSetConstructionSchema>
    >;
    type BodyParity = Equal<
      AgentPluginReleaseSetBody,
      Static<typeof AgentPluginReleaseSetBodySchema>
    >;
    type EnvelopeCompatibility =
      AgentPluginReleaseSet extends Static<typeof AgentPluginReleaseSetSchema> ? true : false;

    expectTypeOf<MemberParity>().toEqualTypeOf<true>();
    expectTypeOf<ConstructionParity>().toEqualTypeOf<true>();
    expectTypeOf<BodyParity>().toEqualTypeOf<true>();
    expectTypeOf<EnvelopeCompatibility>().toEqualTypeOf<true>();

    expect(
      Value.Check(AgentPluginReleaseSetConstructionSchema, {
        releaseInput: fixture.releaseInput,
        releases: [fixture.alphaRelease, fixture.betaRelease],
      })
    ).toBe(true);
    expect(Value.Check(AgentPluginReleaseSetConstructionSchema, wireConstruction)).toBe(true);
    expect(createAgentPluginReleaseSet(wireConstruction).ok).toBe(true);
    const envelope = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet));
    const member = envelope.body.members[0];
    if (member === undefined) throw new Error("Release-set fixture member is missing");

    expect(Value.Check(AgentPluginReleaseSetSchema, envelope)).toBe(true);
    expect(Value.Check(AgentPluginReleaseSetBodySchema, envelope.body)).toBe(true);
    expect(Value.Check(AgentPluginReleaseSetMemberSchema, member)).toBe(true);
    expect(Value.Check(AgentPluginReleaseSetSchema, { ...envelope, unknown: true })).toBe(false);
    expect(Value.Check(AgentPluginReleaseSetBodySchema, { ...envelope.body, unknown: true })).toBe(
      false
    );
    expect(Value.Check(AgentPluginReleaseSetMemberSchema, { ...member, unknown: true })).toBe(
      false
    );
  });

  it("fixes exact digest-free body identity and derives the set digest only from those bytes", () => {
    const fixture = productFixture();
    const expectedBody = {
      schemaVersion: 1,
      builderProtocolVersion: 1,
      contentAuthority: fixture.releaseInput.body.contentAuthority,
      sourceRepository: SOURCE.sourceRepository,
      sourceCommit: SOURCE.sourceCommit,
      sourceTree: SOURCE.sourceTree,
      releaseInputDigest: fixture.releaseInput.releaseInputDigest,
      ownershipIndex: fixture.releaseInput.ownershipIndex,
      members: [
        { pluginId: "alpha", releaseDigest: fixture.alphaRelease.releaseDigest },
        { pluginId: "beta", releaseDigest: fixture.betaRelease.releaseDigest },
      ],
    };
    const expectedBodyBytes = encoder.encode(`${JSON.stringify(expectedBody)}\n`);
    const bodyBytes = canonicalSerializeAgentPluginReleaseSetBody(fixture.releaseSet.body);

    expect(bodyBytes).toEqual(expectedBodyBytes);
    expect(JSON.parse(decoder.decode(bodyBytes))).not.toHaveProperty("releaseSetDigest");
    expect(fixture.releaseSet.releaseSetDigest).toBe(releaseSetDigest(expectedBodyBytes));
  });

  it("produces identical body bytes, envelope bytes, and digest from permuted construction", () => {
    const fixture = productFixture();
    const ordered = must(
      createAgentPluginReleaseSet({
        releaseInput: fixture.releaseInput,
        releases: [fixture.alphaRelease, fixture.betaRelease],
      })
    );
    const permuted = must(
      createAgentPluginReleaseSet({
        releaseInput: fixture.releaseInput,
        releases: [fixture.betaRelease, fixture.alphaRelease],
      })
    );

    expect(canonicalSerializeAgentPluginReleaseSetBody(permuted.body)).toEqual(
      canonicalSerializeAgentPluginReleaseSetBody(ordered.body)
    );
    expect(canonicalSerializeAgentPluginReleaseSet(permuted)).toEqual(
      canonicalSerializeAgentPluginReleaseSet(ordered)
    );
    expect(permuted.releaseSetDigest).toBe(ordered.releaseSetDigest);
  });

  it("keeps nested release diagnostics inside their public schema", () => {
    const longKey = "x".repeat(5_000);
    const candidates = [
      createAgentPluginReleaseSet({
        releaseInput: {},
        releases: [{ [longKey]: true }],
      }),
      verifyCompleteReleaseSet({}, [{ [longKey]: true }]),
    ];

    for (const candidate of candidates) {
      expect(candidate.ok).toBe(false);
      if (!candidate.ok) {
        expect(candidate.issues.every((issue) => Value.Check(ReleaseIssueSchema, issue))).toBe(
          true
        );
      }
    }
  });

  it("canonicalizes complete membership as plugin and release identities only", () => {
    const fixture = productFixture();
    const reordered = must(
      createAgentPluginReleaseSet({
        releaseInput: fixture.releaseInput,
        releases: [fixture.alphaRelease, fixture.betaRelease],
      })
    );

    expect(reordered.releaseSetDigest).toBe(fixture.releaseSet.releaseSetDigest);
    expect(reordered.body.members).toEqual([
      { pluginId: "alpha", releaseDigest: fixture.alphaRelease.releaseDigest },
      { pluginId: "beta", releaseDigest: fixture.betaRelease.releaseDigest },
    ]);
  });

  it("binds changed payload identity through the exact member release digest", () => {
    const fixture = productFixture();
    const changedPayload = must(
      createAgentPluginPayload([
        {
          path: "skills/alpha/SKILL.md",
          mode: 0o644,
          bytes: encoder.encode("changed alpha\n"),
        },
        {
          path: "agents/alpha.md",
          mode: 0o644,
          bytes: encoder.encode("agent alpha\n"),
        },
      ])
    );
    const changedRelease = must(
      createAgentPluginRelease({
        releaseInput: fixture.releaseInput,
        pluginId: "alpha",
        source: SOURCE,
        payload: changedPayload,
      })
    );
    const changedSet = must(
      createAgentPluginReleaseSet({
        releaseInput: fixture.releaseInput,
        releases: [changedRelease, fixture.betaRelease],
      })
    );

    expect(changedSet.body.releaseInputDigest).toBe(fixture.releaseInput.releaseInputDigest);
    expect(changedSet.body.members).toContainEqual({
      pluginId: "alpha",
      releaseDigest: changedRelease.releaseDigest,
    });
    expect(changedRelease.body.payloadManifest).toEqual(changedPayload.manifest);
    expect(changedRelease.body.payloadDigest).toBe(changedPayload.payloadDigest);
    expect(changedSet.releaseSetDigest).not.toBe(fixture.releaseSet.releaseSetDigest);
  });

  it("rejects targeted, extra, and mixed-source construction", () => {
    const fixture = productFixture();
    const targeted = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease],
    });
    expect(targeted.ok).toBe(false);
    if (!targeted.ok)
      expect(targeted.issues.map((entry) => entry.code)).toContain("MISSING_EXPECTED_MEMBER");

    const gammaPayload = must(
      createAgentPluginPayload([
        {
          path: "skills/gamma/SKILL.md",
          mode: 0o644,
          bytes: encoder.encode("gamma\n"),
        },
      ])
    );
    const gammaInputBody = releaseInputBody(fixture.alphaPayload, fixture.betaPayload) as any;
    gammaInputBody.members.push(member("gamma", gammaPayload));
    gammaInputBody.ownershipClaims.push({
      kind: "skill",
      identity: "gamma",
      ownerPluginId: "gamma",
    });
    const gammaInput = must(createAgentPluginReleaseInput(gammaInputBody));
    const gamma = must(
      createAgentPluginRelease({
        releaseInput: gammaInput,
        pluginId: "gamma",
        source: SOURCE,
        payload: gammaPayload,
      })
    );
    const extra = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease, fixture.betaRelease, gamma],
    });
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.issues.map((entry) => entry.code)).toContain("EXTRA_MEMBER");

    const otherSource = must(
      createAgentPluginRelease({
        releaseInput: fixture.releaseInput,
        pluginId: "beta",
        source: { ...SOURCE, sourceTree: "d".repeat(40) },
        payload: fixture.betaPayload,
      })
    );
    const mixed = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease, otherSource],
    });
    expect(mixed.ok).toBe(false);
    if (!mixed.ok)
      expect(mixed.issues.map((entry) => entry.code)).toContain("SOURCE_IDENTITY_MISMATCH");
  });

  it("rejects a self-consistent release whose body disagrees with its release input", () => {
    const fixture = productFixture();
    const forged = wire(canonicalSerializeAgentPluginRelease(fixture.alphaRelease));
    forged.body.aliases = ["rogue"];
    forged.releaseDigest = releaseDigest(canonicalSerializeAgentPluginReleaseBody(forged.body));
    expect(verifyAgentPluginRelease(forged).ok).toBe(true);

    const result = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [forged, fixture.betaRelease],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues.map((entry) => entry.code)).toContain("RELEASE_INPUT_IDENTITY_MISMATCH");
  });

  it("rejects unknown fields before projecting in-memory release-set inputs", () => {
    const fixture = productFixture();
    const releaseInputOuter = structuredClone(fixture.releaseInput) as MutableReleaseInput;
    releaseInputOuter.unknown = true;
    const releaseInputBody = structuredClone(fixture.releaseInput) as MutableReleaseInput;
    releaseInputBody.body.unknown = true;

    for (const releaseInput of [releaseInputOuter, releaseInputBody]) {
      const result = createAgentPluginReleaseSet({
        releaseInput,
        releases: [fixture.alphaRelease, fixture.betaRelease],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues.map((issue) => issue.code)).toContain("UNKNOWN_FIELD");
    }

    const taintedReleases = [
      withUnknownReleaseField(fixture.alphaRelease, "outer"),
      withUnknownReleaseField(fixture.alphaRelease, "body"),
      withUnknownReleaseField(fixture.alphaRelease, "payload"),
      withUnknownReleaseField(fixture.alphaRelease, "payload-entry"),
    ];
    for (const candidate of taintedReleases) {
      const created = createAgentPluginReleaseSet({
        releaseInput: fixture.releaseInput,
        releases: [candidate, fixture.betaRelease],
      });
      expect(created.ok).toBe(false);
      if (!created.ok) expect(created.issues.map((issue) => issue.code)).toContain("UNKNOWN_FIELD");

      const verified = verifyCompleteReleaseSet(fixture.releaseSet, [
        candidate,
        fixture.betaRelease,
      ]);
      expect(verified.ok).toBe(false);
      if (!verified.ok)
        expect(verified.issues.map((issue) => issue.code)).toContain("UNKNOWN_FIELD");
    }
  });

  it("reports one schema-owned diagnostic for missing or extra aggregate membership", () => {
    const fixture = productFixture();
    const bytes = canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet);
    const boundaries = [
      {
        make: () => ({
          releaseInput: fixture.releaseInput,
          releases: [fixture.alphaRelease, fixture.betaRelease],
        }),
        remove: (candidate: any) => {
          delete candidate.releaseInput;
        },
        run: createAgentPluginReleaseSet,
        path: "releaseSet",
        fields: "releaseInput, releases",
      },
      {
        make: () => wire(bytes),
        remove: (candidate: any) => {
          delete candidate.body;
        },
        run: verifyAgentPluginReleaseSet,
        path: "releaseSet",
        fields: "body, releaseSetDigest, schemaVersion",
      },
      {
        make: () => wire(bytes),
        remove: (candidate: any) => {
          delete candidate.body.members;
        },
        add: (candidate: any) => {
          candidate.body.extra = true;
        },
        run: verifyAgentPluginReleaseSet,
        path: "releaseSet.body",
        fields:
          "builderProtocolVersion, contentAuthority, members, ownershipIndex, releaseInputDigest, schemaVersion, sourceCommit, sourceRepository, sourceTree",
      },
      {
        make: () => wire(bytes),
        remove: (candidate: any) => {
          delete candidate.body.members[0].releaseDigest;
        },
        add: (candidate: any) => {
          candidate.body.members[0].extra = true;
        },
        run: verifyAgentPluginReleaseSet,
        path: "releaseSet.body.members[0]",
        fields: "pluginId, releaseDigest",
      },
    ];

    for (const boundary of boundaries) {
      for (const mutation of ["missing", "extra"] as const) {
        const candidate = boundary.make();
        if (mutation === "missing") boundary.remove(candidate);
        else if (boundary.add !== undefined) boundary.add(candidate);
        else (candidate as any).extra = true;

        expect(boundary.run(candidate)).toEqual({
          ok: false,
          issues: [
            {
              code: "UNKNOWN_FIELD",
              path: boundary.path,
              message: `Expected exactly: ${boundary.fields}`,
            },
          ],
        });
      }
    }
  });

  it("preserves exact non-object and primitive-field diagnostics at every aggregate", () => {
    const bytes = canonicalSerializeAgentPluginReleaseSet(productFixture().releaseSet);
    const bodyPrimitive = wire(bytes);
    bodyPrimitive.body = 1;
    const memberPrimitive = wire(bytes);
    memberPrimitive.body.members[0] = 1;
    const boundaries = [
      { result: createAgentPluginReleaseSet(null), path: "releaseSet" },
      { result: verifyAgentPluginReleaseSet([]), path: "releaseSet" },
      { result: verifyAgentPluginReleaseSet(bodyPrimitive), path: "releaseSet.body" },
      {
        result: verifyAgentPluginReleaseSet(memberPrimitive),
        path: "releaseSet.body.members[0]",
      },
    ];
    for (const { result, path } of boundaries) {
      expect(result).toEqual({
        ok: false,
        issues: [
          {
            code: "EXPECTED_OBJECT",
            path,
            message: "Value must be an object",
          },
        ],
      });
    }

    const primitiveFields = wire(bytes);
    primitiveFields.body.members[0] = {
      pluginId: "Alpha",
      releaseDigest: "not-a-release-digest",
    };
    const result = verifyAgentPluginReleaseSet(primitiveFields);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.filter(({ path }) => path.startsWith("releaseSet.body.members[0]."))
      ).toEqual([
        {
          code: "INVALID_PLUGIN_ID",
          path: "releaseSet.body.members[0].pluginId",
          message: "Invalid plugin identity",
        },
        {
          code: "INVALID_DIGEST",
          path: "releaseSet.body.members[0].releaseDigest",
          message: "Digest has the wrong domain or encoding",
        },
      ]);
    }
  });

  it("refuses a malformed root without traversing its child values", () => {
    const candidate = {
      extra: true,
      get releaseInput(): never {
        throw new Error("releaseInput must not be read");
      },
      get releases(): never {
        throw new Error("releases must not be read");
      },
    };

    expect(() => createAgentPluginReleaseSet(candidate)).not.toThrow();
    expect(createAgentPluginReleaseSet(candidate)).toEqual({
      ok: false,
      issues: [
        {
          code: "UNKNOWN_FIELD",
          path: "releaseSet",
          message: "Expected exactly: releaseInput, releases",
        },
      ],
    });
  });

  it("does not derive ownership or digest failures from a structurally refused member", () => {
    const candidate = wire(canonicalSerializeAgentPluginReleaseSet(productFixture().releaseSet));
    candidate.body.members[0] = {
      pluginId: "alpha",
      extra: true,
    };

    expect(verifyAgentPluginReleaseSet(candidate)).toEqual({
      ok: false,
      issues: [
        {
          code: "UNKNOWN_FIELD",
          path: "releaseSet.body.members[0]",
          message: "Expected exactly: pluginId, releaseDigest",
        },
      ],
    });
  });

  it("bounds release traversal without reading an excluded tail member", () => {
    const fixture = productFixture();
    let exactVisits = 0;
    const exactReleases = new Array(MAX_RELEASE_MEMBERS);
    Object.defineProperty(exactReleases, MAX_RELEASE_MEMBERS - 1, {
      enumerable: true,
      get() {
        exactVisits += 1;
        return fixture.alphaRelease;
      },
    });
    const exact = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: exactReleases,
    });
    expect(exactVisits).toBe(1);
    expect(exact.ok).toBe(false);
    if (!exact.ok) {
      expect(exact.issues.map(({ code }) => code)).not.toContain("COUNT_LIMIT_EXCEEDED");
    }

    const releases = new Array(MAX_RELEASE_MEMBERS + 1);
    let admittedVisits = 0;
    Object.defineProperty(releases, MAX_RELEASE_MEMBERS - 1, {
      enumerable: true,
      get() {
        admittedVisits += 1;
        return fixture.alphaRelease;
      },
    });
    Object.defineProperty(releases, MAX_RELEASE_MEMBERS, {
      enumerable: true,
      get(): never {
        throw new Error("excluded release must not be read");
      },
    });

    const call = () =>
      createAgentPluginReleaseSet({
        releaseInput: fixture.releaseInput,
        releases,
      });
    let result: ReturnType<typeof call> | undefined;
    expect(() => {
      result = call();
    }).not.toThrow();
    expect(admittedVisits).toBe(1);
    if (result === undefined) throw new Error("Expected bounded construction result");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        code: "COUNT_LIMIT_EXCEEDED",
        path: "releaseSet.releases",
        message: `Array exceeds protocol limit ${MAX_RELEASE_MEMBERS}`,
        expected: MAX_RELEASE_MEMBERS,
        actual: MAX_RELEASE_MEMBERS + 1,
      });
    }
  });

  it("bounds set-member traversal at the exact ceiling and before an excluded tail", () => {
    const fixture = productFixture();
    const admittedMember = fixture.releaseSet.body.members[0];
    if (admittedMember === undefined) throw new Error("Expected an admitted set member");
    let exactVisits = 0;
    const exactMembers = new Array(MAX_RELEASE_MEMBERS);
    Object.defineProperty(exactMembers, MAX_RELEASE_MEMBERS - 1, {
      enumerable: true,
      get() {
        exactVisits += 1;
        return admittedMember;
      },
    });
    const exactCandidate = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet));
    exactCandidate.body.members = exactMembers;
    const exact = verifyAgentPluginReleaseSet(exactCandidate);
    expect(exactVisits).toBe(1);
    expect(exact.ok).toBe(false);
    if (!exact.ok) {
      expect(exact.issues.map(({ code }) => code)).not.toContain("COUNT_LIMIT_EXCEEDED");
    }

    const overMembers = new Array(MAX_RELEASE_MEMBERS + 1);
    let admittedVisits = 0;
    Object.defineProperty(overMembers, MAX_RELEASE_MEMBERS - 1, {
      enumerable: true,
      get() {
        admittedVisits += 1;
        return admittedMember;
      },
    });
    Object.defineProperty(overMembers, MAX_RELEASE_MEMBERS, {
      enumerable: true,
      get(): never {
        throw new Error("excluded set member must not be read");
      },
    });
    const overCandidate = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet));
    overCandidate.body.members = overMembers;
    const call = () => verifyAgentPluginReleaseSet(overCandidate);
    let over: ReturnType<typeof call> | undefined;
    expect(() => {
      over = call();
    }).not.toThrow();
    expect(admittedVisits).toBe(1);
    if (over === undefined) throw new Error("Expected bounded verification result");
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.issues).toContainEqual({
        code: "COUNT_LIMIT_EXCEEDED",
        path: "releaseSet.body.members",
        message: `Array exceeds protocol limit ${MAX_RELEASE_MEMBERS}`,
        expected: MAX_RELEASE_MEMBERS,
        actual: MAX_RELEASE_MEMBERS + 1,
      });
    }
  });

  it("rejects a changed body paired with its old set digest", () => {
    const candidate = wire(canonicalSerializeAgentPluginReleaseSet(productFixture().releaseSet));
    candidate.body.sourceCommit = "c".repeat(40);

    const result = verifyAgentPluginReleaseSet(candidate);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.code)).toContain("RELEASE_SET_DIGEST_MISMATCH");
    }
  });

  it("retains complete set diagnostics for empty and wholly malformed member collections", () => {
    const fixture = productFixture();
    const emptyBody = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet)).body;
    emptyBody.members = [];
    const expectedDigest = releaseSetDigest(canonicalSerializeAgentPluginReleaseSetBody(emptyBody));
    const malformedMembers = [
      {
        pluginId: "Alpha",
        releaseDigest: fixture.alphaRelease.releaseDigest,
      },
      {
        pluginId: "beta",
        releaseDigest: "not-a-release-digest",
      },
    ];
    const preservedPaths = new Set([
      "releaseSet.body.members",
      "releaseSet.body.members.alpha",
      "releaseSet.body.members.beta",
      "releaseSet.releaseSetDigest",
    ]);

    const diagnostics = [[], malformedMembers, [...malformedMembers].reverse()].map((members) => {
      const candidate = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet));
      candidate.body.members = members;
      const result = verifyAgentPluginReleaseSet(candidate);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected invalid release-set members");
      return result.issues.filter((issue) => preservedPaths.has(issue.path));
    });
    const expected = [
      {
        code: "MISSING_EXPECTED_MEMBER",
        path: "releaseSet.body.members",
        message: "A complete release set cannot be empty",
      },
      {
        code: "MISSING_EXPECTED_MEMBER",
        path: "releaseSet.body.members.alpha",
        message: "Set omits an ownership-index member",
        actual: "alpha",
      },
      {
        code: "MISSING_EXPECTED_MEMBER",
        path: "releaseSet.body.members.beta",
        message: "Set omits an ownership-index member",
        actual: "beta",
      },
      {
        code: "RELEASE_SET_DIGEST_MISMATCH",
        path: "releaseSet.releaseSetDigest",
        message: "Claimed set digest differs from the complete set body",
        expected: expectedDigest,
        actual: fixture.releaseSet.releaseSetDigest,
      },
    ];

    expect(diagnostics).toEqual([expected, expected, expected]);
  });

  it("verifies exact ordered membership and payload binding without partial fallback", () => {
    const fixture = productFixture();
    const ordered = [fixture.alphaRelease, fixture.betaRelease];
    expect(verifyCompleteReleaseSet(fixture.releaseSet, ordered).ok).toBe(true);

    const missing = verifyCompleteReleaseSet(fixture.releaseSet, [fixture.alphaRelease]);
    expect(missing.ok).toBe(false);
    if (!missing.ok)
      expect(missing.issues.map((entry) => entry.code)).toContain("MISSING_EXPECTED_MEMBER");

    const reordered = verifyCompleteReleaseSet(fixture.releaseSet, [...ordered].reverse());
    expect(reordered.ok).toBe(false);
    if (!reordered.ok)
      expect(reordered.issues.map((entry) => entry.code)).toContain("RELEASE_SET_DIGEST_MISMATCH");

    const tampered = wire(canonicalSerializeAgentPluginRelease(fixture.betaRelease));
    tampered.payload.entries[0].bytesBase64 = "eA==";
    expect(verifyCompleteReleaseSet(fixture.releaseSet, [fixture.alphaRelease, tampered]).ok).toBe(
      false
    );
  });

  it("binds each set member to the exact release digest", () => {
    const fixture = productFixture();
    const forged = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet));
    forged.body.members[0].releaseDigest = `rd1_${"0".repeat(64)}`;
    forged.releaseSetDigest = releaseSetDigest(
      canonicalSerializeAgentPluginReleaseSetBody(forged.body)
    );

    expect(verifyAgentPluginReleaseSet(forged).ok).toBe(true);
    expect(verifyCompleteReleaseSet(forged, [fixture.alphaRelease, fixture.betaRelease]).ok).toBe(
      false
    );
  });

  it("rejects a self-consistent set whose plugin ownership identity differs from its member", () => {
    const fixture = productFixture();
    const forged = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet));
    const claim = forged.body.ownershipIndex.claims.find(
      (candidate: any) => candidate.kind === "plugin" && candidate.ownerPluginId === "alpha"
    );
    claim.identity = "alpha-wrong";
    forged.releaseSetDigest = releaseSetDigest(
      canonicalSerializeAgentPluginReleaseSetBody(forged.body)
    );

    const verified = verifyAgentPluginReleaseSet(forged);
    expect(verified.ok).toBe(false);
    if (!verified.ok)
      expect(verified.issues.map((entry) => entry.code)).toContain("OWNERSHIP_INDEX_MISMATCH");
    const verification = verifyCompleteReleaseSet(forged, [
      fixture.alphaRelease,
      fixture.betaRelease,
    ]);
    expect(verification.ok).toBe(false);
    if (!verification.ok)
      expect(verification.issues.map((entry) => entry.code)).toContain("OWNERSHIP_INDEX_MISMATCH");
  });

  it("checks a self-consistent set ownership index against the exact supplied releases", () => {
    const fixture = productFixture();
    const forged = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet));
    const claim = forged.body.ownershipIndex.claims.find(
      (candidate: any) => candidate.kind === "skill" && candidate.ownerPluginId === "alpha"
    );
    claim.identity = "alpha-stale";
    forged.releaseSetDigest = releaseSetDigest(
      canonicalSerializeAgentPluginReleaseSetBody(forged.body)
    );

    expect(verifyAgentPluginReleaseSet(forged).ok).toBe(true);
    const result = verifyCompleteReleaseSet(forged, [fixture.alphaRelease, fixture.betaRelease]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((entry) => entry.code)).toContain("SKILL_OWNERSHIP_MISMATCH");
    }
  });

  it("checks exact release skill manifests against set ownership during complete verification", () => {
    const fixture = productFixture();
    const changedPayload = must(
      createAgentPluginPayload([
        {
          path: "skills/rogue-alpha/SKILL.md",
          mode: 0o644,
          bytes: encoder.encode("rogue alpha\n"),
        },
        {
          path: "agents/alpha.md",
          mode: 0o644,
          bytes: encoder.encode("agent alpha\n"),
        },
      ])
    );
    const forged = structuredClone(fixture.alphaRelease) as any;
    forged.payload = payloadValue(changedPayload);
    forged.body.payloadManifest = changedPayload.manifest;
    forged.body.payloadDigest = changedPayload.payloadDigest;
    forged.releaseDigest = releaseDigest(canonicalSerializeAgentPluginReleaseBody(forged.body));
    expect(verifyAgentPluginRelease(forged).ok).toBe(true);

    const result = verifyCompleteReleaseSet(fixture.releaseSet, [forged, fixture.betaRelease]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((entry) => entry.code)).toContain("SKILL_OWNERSHIP_MISMATCH");
    }
  });

  it("defensively copies and deeply freezes every set-owned value", () => {
    const candidate = wire(canonicalSerializeAgentPluginReleaseSet(productFixture().releaseSet));
    const verified = verifyAgentPluginReleaseSet(candidate);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    const canonical = canonicalSerializeAgentPluginReleaseSet(verified.value);

    candidate.body.members[0].pluginId = "changed-member";
    candidate.body.members.reverse();
    candidate.body.ownershipIndex.claims[0].identity = "changed-set-claim";

    expect(canonicalSerializeAgentPluginReleaseSet(verified.value)).toEqual(canonical);
    expect(verified.value.body.members.map(({ pluginId }) => pluginId)).toEqual(["alpha", "beta"]);
    for (const value of [
      verified.value,
      verified.value.body,
      verified.value.body.members,
      verified.value.body.members[0],
      verified.value.body.ownershipIndex,
      verified.value.body.ownershipIndex.claims,
      verified.value.body.ownershipIndex.claims[0],
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
  });

  it("orders complete construction diagnostics independently of invalid release order", () => {
    const fixture = productFixture();
    const changedAlpha = wire(canonicalSerializeAgentPluginRelease(fixture.alphaRelease));
    changedAlpha.body.aliases = ["rogue"];
    changedAlpha.releaseDigest = releaseDigest(
      canonicalSerializeAgentPluginReleaseBody(changedAlpha.body)
    );
    const changedBeta = wire(canonicalSerializeAgentPluginRelease(fixture.betaRelease));
    changedBeta.body.sourceTree = "c".repeat(40);
    changedBeta.releaseDigest = releaseDigest(
      canonicalSerializeAgentPluginReleaseBody(changedBeta.body)
    );
    expect(verifyAgentPluginRelease(changedAlpha).ok).toBe(true);
    expect(verifyAgentPluginRelease(changedBeta).ok).toBe(true);

    const ordered = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [changedAlpha, changedBeta],
    });
    const permuted = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [changedBeta, changedAlpha],
    });

    expect(ordered.ok).toBe(false);
    expect(permuted.ok).toBe(false);
    if (ordered.ok || permuted.ok) throw new Error("Expected invalid complete-set construction");
    expect(permuted.issues).toEqual(ordered.issues);
  });

  it("round-trips one canonical set envelope and rejects noncanonical member ordering", () => {
    const fixture = productFixture();
    const bytes = canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet);
    expect(bytes.at(-1)).toBe(0x0a);
    expect(bytes.at(-2)).not.toBe(0x0a);
    const decoded = decodeAgentPluginReleaseSet(bytes);
    expect(decoded.ok).toBe(true);
    if (decoded.ok)
      expect(decoded.value.releaseSetDigest).toBe(fixture.releaseSet.releaseSetDigest);

    const trailingLf = Uint8Array.from([...bytes, 0x0a]);
    expect(decodeAgentPluginReleaseSet(trailingLf).ok).toBe(false);

    const reordered = wire(bytes);
    reordered.body.members.reverse();
    const noncanonicalBytes = new TextEncoder().encode(`${JSON.stringify(reordered)}\n`);
    expect(decodeAgentPluginReleaseSet(noncanonicalBytes).ok).toBe(false);
  });

  it("returns closed failures rather than throwing for malformed set inputs", () => {
    const calls = [
      () => createAgentPluginReleaseSet({ releaseInput: {}, releases: [] }),
      () => verifyAgentPluginReleaseSet({ body: {}, releaseSetDigest: "", schemaVersion: 1 }),
      () => decodeAgentPluginReleaseSet({}),
      () => verifyCompleteReleaseSet({}, {}),
    ];

    for (const call of calls) {
      expect(call).not.toThrow();
      expect(call().ok).toBe(false);
    }
  });
});

function withUnknownReleaseField(
  release: ReturnType<typeof productFixture>["alphaRelease"],
  level: "outer" | "body" | "payload" | "payload-entry"
): MutableInMemoryRelease {
  const candidate: MutableInMemoryRelease = {
    ...release,
    body: { ...release.body },
    payload: {
      ...release.payload,
      entries: release.payload.entries.map((entry) => ({ ...entry })),
    },
  };
  if (level === "outer") candidate.unknown = true;
  if (level === "body") candidate.body.unknown = true;
  if (level === "payload") candidate.payload.unknown = true;
  if (level === "payload-entry") candidate.payload.entries[0].unknown = true;
  return candidate;
}
