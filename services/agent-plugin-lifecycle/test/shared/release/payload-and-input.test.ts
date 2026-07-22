import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  canonicalSerializeAgentPluginPayload,
  canonicalSerializeAgentPluginReleaseInput,
  contentDigest,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
  decodeAgentPluginRelease,
  decodeAgentPluginReleaseInput,
  decodeAgentPluginReleaseSet,
  MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES,
  MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES,
  MAX_OWNERSHIP_CLAIMS,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  type PayloadManifestEntry,
  PayloadManifestEntrySchema,
  payloadEntryBytes,
  ReleaseInputBodySchema,
  ReleaseInputEnvelopeSchema,
  verifyAgentPluginPayload,
} from "../../../src/service/shared/release";
import { binding, member, must, productFixture, releaseInputBody, wire } from "./fixtures";

const encoder = new TextEncoder();

describe("canonical payload and release input", () => {
  it("owns payload bytes, sorts entries, and emits exactly one trailing LF", () => {
    const mutable = encoder.encode("owned\n");
    const first = must(
      createAgentPluginPayload([
        { path: "z.txt", mode: 0o644, bytes: mutable },
        { path: "a.sh", mode: 0o755, bytes: encoder.encode("a\n") },
      ])
    );
    const second = must(
      createAgentPluginPayload([
        { path: "a.sh", mode: 0o755, bytes: encoder.encode("a\n") },
        { path: "z.txt", mode: 0o644, bytes: encoder.encode("owned\n") },
      ])
    );
    mutable.fill(0);

    expect(first.payloadDigest).toBe(second.payloadDigest);
    expect(first.entries.map((entry) => entry.path)).toEqual(["a.sh", "z.txt"]);
    const owned = payloadEntryBytes(first.entries[1]!);
    owned.fill(0);
    expect(new TextDecoder().decode(payloadEntryBytes(first.entries[1]!))).toBe("owned\n");
    const bytes = canonicalSerializeAgentPluginPayload(first);
    expect(bytes.at(-1)).toBe(0x0a);
    expect(bytes.at(-2)).not.toBe(0x0a);
  });

  it("changes payload identity for path, mode, or exact bytes", () => {
    const base = must(
      createAgentPluginPayload([{ path: "a", mode: 0o644, bytes: encoder.encode("x") }])
    );
    const path = must(
      createAgentPluginPayload([{ path: "b", mode: 0o644, bytes: encoder.encode("x") }])
    );
    const mode = must(
      createAgentPluginPayload([{ path: "a", mode: 0o755, bytes: encoder.encode("x") }])
    );
    const bytes = must(
      createAgentPluginPayload([{ path: "a", mode: 0o644, bytes: encoder.encode("y") }])
    );
    expect(
      new Set([base.payloadDigest, path.payloadDigest, mode.payloadDigest, bytes.payloadDigest])
        .size
    ).toBe(4);
  });

  it("rejects unsafe paths, duplicate paths, unknown fields, and manifest tampering", () => {
    expect(
      createAgentPluginPayload([{ path: "../escape", mode: 0o644, bytes: new Uint8Array() }]).ok
    ).toBe(false);
    expect(
      createAgentPluginPayload([
        { path: "same", mode: 0o644, bytes: new Uint8Array() },
        { path: "same", mode: 0o644, bytes: new Uint8Array() },
      ]).ok
    ).toBe(false);

    const fixture = productFixture();
    const payloadWire = wire(canonicalSerializeAgentPluginPayload(fixture.alphaPayload));
    payloadWire.extra = true;
    expect(verifyAgentPluginPayload(payloadWire).ok).toBe(false);
    delete payloadWire.extra;
    payloadWire.entries[0].bytesBase64 = "eA==";
    const verified = verifyAgentPluginPayload(payloadWire);
    expect(verified.ok).toBe(false);
    if (!verified.ok)
      expect(verified.issues.map((entry) => entry.code)).toContain("PAYLOAD_DIGEST_MISMATCH");
  });

  it("canonicalizes unordered declarations and covers every admitted declaration class", () => {
    const fixture = productFixture();
    const baseBody = releaseInputBody(fixture.alphaPayload, fixture.betaPayload);
    const permuted = structuredClone(baseBody) as any;
    permuted.members.reverse();
    permuted.ownershipClaims.reverse();
    permuted.locks.reverse();
    permuted.qualityPolicies.reverse();
    for (const candidate of permuted.members) {
      candidate.vendor.reverse();
      candidate.curation.reverse();
      candidate.skillInventory.reverse();
      candidate.payload.manifest.reverse();
    }
    const canonical = must(createAgentPluginReleaseInput(baseBody));
    const equivalent = must(createAgentPluginReleaseInput(permuted));
    expect(equivalent.releaseInputDigest).toBe(canonical.releaseInputDigest);
    expect(canonicalSerializeAgentPluginReleaseInput(equivalent)).toEqual(
      canonicalSerializeAgentPluginReleaseInput(canonical)
    );

    const mutations: Array<readonly [string, (body: any) => void]> = [
      [
        "authority",
        (body) => {
          body.contentAuthority = "personal-rawr-hq-v2";
        },
      ],
      [
        "member identity",
        (body) => {
          body.members[0].pluginId = "alpha-v2";
          for (const claim of body.ownershipClaims) {
            if (claim.ownerPluginId === "alpha") claim.ownerPluginId = "alpha-v2";
          }
        },
      ],
      [
        "payload digest",
        (body) => {
          body.members[0].payload.payloadDigest = fixture.betaPayload.payloadDigest;
        },
      ],
      [
        "manifest path",
        (body) => {
          body.members[0].payload.manifest[0].path = "agents/alpha-v2.md";
        },
      ],
      [
        "manifest mode",
        (body) => {
          body.members[0].payload.manifest[0].mode = 0o755;
        },
      ],
      [
        "manifest byte length",
        (body) => {
          body.members[0].payload.manifest[0].byteLength += 1;
        },
      ],
      [
        "manifest content digest",
        (body) => {
          body.members[0].payload.manifest[0].contentDigest = contentDigest(
            encoder.encode("manifest changed")
          );
        },
      ],
      [
        "skill identity",
        (body) => {
          body.members[0].skillInventory[0].identity = "alpha-skill-v2";
          body.ownershipClaims.find(
            (claim: any) => claim.kind === "skill" && claim.ownerPluginId === "alpha"
          ).identity = "alpha-skill-v2";
        },
      ],
      [
        "skill manifest path",
        (body) => {
          const oldPath = body.members[0].skillInventory[0].manifestPath;
          body.members[0].skillInventory[0].manifestPath = "skills/alpha-v2/SKILL.md";
          body.members[0].payload.manifest.find((entry: any) => entry.path === oldPath).path =
            "skills/alpha-v2/SKILL.md";
        },
      ],
      [
        "vendor digest",
        (body) => {
          body.members[0].vendor[0].contentDigest = contentDigest(encoder.encode("vendor changed"));
        },
      ],
      [
        "vendor id",
        (body) => {
          body.members[0].vendor[0].id = "vendor-alpha-v2";
        },
      ],
      [
        "vendor protocol",
        (body) => {
          body.members[0].vendor[0].protocol = "vendor-v2";
        },
      ],
      [
        "curation",
        (body) => {
          body.members[0].curation[0].contentDigest = contentDigest(
            encoder.encode("curation changed")
          );
        },
      ],
      [
        "lock",
        (body) => {
          body.locks[0].contentDigest = contentDigest(encoder.encode("lock changed"));
        },
      ],
      [
        "quality",
        (body) => {
          body.qualityPolicies[0].contentDigest = contentDigest(encoder.encode("quality changed"));
        },
      ],
      [
        "ownership identity",
        (body) => {
          body.ownershipClaims[1].identity = "alpha-alt";
        },
      ],
      [
        "ownership owner",
        (body) => {
          body.ownershipClaims[3].ownerPluginId = "beta";
        },
      ],
      [
        "ownership kind",
        (body) => {
          body.ownershipClaims[2].kind = "destination";
        },
      ],
    ];
    for (const [name, mutate] of mutations) {
      const candidate = structuredClone(baseBody) as any;
      mutate(candidate);
      const changed = must(createAgentPluginReleaseInput(candidate));
      expect(changed.releaseInputDigest, name).not.toBe(canonical.releaseInputDigest);
    }
  });

  it("owns the complete release-input record shape with closed TypeBox schemas", () => {
    expectTypeOf<PayloadManifestEntry>().toEqualTypeOf<Static<typeof PayloadManifestEntrySchema>>();
    const fixture = productFixture();
    const body = releaseInputBody(fixture.alphaPayload, fixture.betaPayload);
    const envelope = wire(canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput));

    expect(Value.Check(ReleaseInputBodySchema, body)).toBe(true);
    expect(Value.Check(ReleaseInputEnvelopeSchema, envelope)).toBe(true);

    const invalidBodies: Array<readonly [string, Record<string, unknown>]> = [
      [
        "body field",
        withMutation(body, (candidate) => {
          candidate.unexpected = true;
        }),
      ],
      [
        "member field",
        withMutation(body, (candidate) => {
          candidate.members[0].unexpected = true;
        }),
      ],
      [
        "payload field",
        withMutation(body, (candidate) => {
          candidate.members[0].payload.unexpected = true;
        }),
      ],
      [
        "manifest field",
        withMutation(body, (candidate) => {
          candidate.members[0].payload.manifest[0].unexpected = true;
        }),
      ],
      [
        "inventory field",
        withMutation(body, (candidate) => {
          candidate.members[0].skillInventory[0].unexpected = true;
        }),
      ],
      [
        "claim field",
        withMutation(body, (candidate) => {
          candidate.ownershipClaims[0].unexpected = true;
        }),
      ],
      [
        "provenance field",
        withMutation(body, (candidate) => {
          candidate.locks[0].unexpected = true;
        }),
      ],
      [
        "member kind",
        withMutation(body, (candidate) => {
          candidate.members[0].kind = "toolkit";
        }),
      ],
      [
        "claim kind",
        withMutation(body, (candidate) => {
          candidate.ownershipClaims[0].kind = "plugin";
        }),
      ],
    ];
    for (const [name, candidate] of invalidBodies) {
      expect(Value.Check(ReleaseInputBodySchema, candidate), name).toBe(false);
    }

    expect(
      Value.Check(ReleaseInputEnvelopeSchema, {
        ...envelope,
        ownershipIndex: fixture.releaseInput.ownershipIndex,
      })
    ).toBe(false);
    expect(
      Value.Check(ReleaseInputEnvelopeSchema, {
        ...envelope,
        completenessWitness: fixture.releaseInput.completenessWitness,
      })
    ).toBe(false);
  });

  it("closes every skill manifest over one inventory row and one same-member ownership claim", () => {
    const fixture = productFixture();
    const cases: Array<readonly [string, (body: any) => void, string]> = [
      [
        "missing inventory",
        (body) => {
          body.members[0].skillInventory = [];
        },
        "SKILL_INVENTORY_MISMATCH",
      ],
      [
        "missing claim",
        (body) => {
          body.ownershipClaims = body.ownershipClaims.filter(
            (claim: any) => !(claim.kind === "skill" && claim.identity === "alpha-skill")
          );
        },
        "SKILL_OWNERSHIP_MISMATCH",
      ],
      [
        "extra inventory",
        (body) => {
          body.members[0].skillInventory.push({
            identity: "alpha-extra",
            manifestPath: "skills/alpha/SKILL.md",
          });
          body.ownershipClaims.push({
            kind: "skill",
            identity: "alpha-extra",
            ownerPluginId: "alpha",
          });
        },
        "SKILL_INVENTORY_MISMATCH",
      ],
      [
        "extra claim",
        (body) => {
          body.ownershipClaims.push({
            kind: "skill",
            identity: "alpha-extra",
            ownerPluginId: "alpha",
          });
        },
        "SKILL_OWNERSHIP_MISMATCH",
      ],
      [
        "wrong owner",
        (body) => {
          body.ownershipClaims.find(
            (claim: any) => claim.kind === "skill" && claim.identity === "alpha-skill"
          ).ownerPluginId = "beta";
        },
        "SKILL_OWNERSHIP_MISMATCH",
      ],
      [
        "wrong path",
        (body) => {
          body.members[0].skillInventory[0].manifestPath = "skills/missing/SKILL.md";
        },
        "SKILL_INVENTORY_MISMATCH",
      ],
    ];

    for (const [name, mutate, expectedCode] of cases) {
      const body = structuredClone(releaseInputBody(fixture.alphaPayload, fixture.betaPayload));
      mutate(body);
      const result = createAgentPluginReleaseInput(body);
      expect(result.ok, name).toBe(false);
      if (!result.ok)
        expect(
          result.issues.map((entry) => entry.code),
          name
        ).toContain(expectedCode);
    }
  });

  it("reports the full cross-member skill conflict with otherwise valid inventories independent of order", () => {
    const fixture = productFixture();
    const body = structuredClone(
      releaseInputBody(fixture.alphaPayload, fixture.betaPayload)
    ) as any;
    for (const memberDeclaration of body.members)
      memberDeclaration.skillInventory[0].identity = "shared-skill";
    for (const claim of body.ownershipClaims) {
      if (claim.kind === "skill") claim.identity = "shared-skill";
    }
    const reversed = structuredClone(body);
    reversed.members.reverse();
    reversed.ownershipClaims.reverse();
    for (const memberDeclaration of reversed.members) memberDeclaration.skillInventory.reverse();

    const left = createAgentPluginReleaseInput(body);
    const right = createAgentPluginReleaseInput(reversed);
    expect(left.ok).toBe(false);
    expect(right.ok).toBe(false);
    if (!left.ok && !right.ok) {
      expect(right.issues).toEqual(left.issues);
      expect(left.issues).toContainEqual(
        expect.objectContaining({
          code: "OWNERSHIP_CONFLICT",
          claimKind: "skill",
          claim: "shared-skill",
          claimants: ["alpha", "beta"],
        })
      );
      expect(left.issues.map((entry) => entry.code)).not.toContain("SKILL_OWNERSHIP_MISMATCH");
    }
  });

  it("accepts the maximum closed skill inventory independent of declaration order", () => {
    const skillCount = MAX_OWNERSHIP_CLAIMS - 1;
    const payload = must(
      createAgentPluginPayload(
        Array.from({ length: skillCount }, (_, index) => ({
          path: `skills/skill-${index}/SKILL.md`,
          mode: 0o644,
          bytes: new Uint8Array(),
        }))
      )
    );
    const declaration = member("alpha", payload) as any;
    const body = {
      schemaVersion: 1,
      contentAuthority: "personal-rawr-hq",
      members: [declaration],
      ownershipClaims: declaration.skillInventory.map((entry: any) => ({
        kind: "skill",
        identity: entry.identity,
        ownerPluginId: "alpha",
      })),
      locks: [],
      qualityPolicies: [],
    };
    const reversed = structuredClone(body);
    reversed.members[0]!.skillInventory.reverse();
    reversed.ownershipClaims.reverse();

    const canonical = must(createAgentPluginReleaseInput(body));
    const reordered = must(createAgentPluginReleaseInput(reversed));
    expect(canonical.body.members[0]?.skillInventory).toHaveLength(skillCount);
    expect(canonical.ownershipIndex.claims).toHaveLength(MAX_OWNERSHIP_CLAIMS);
    expect(reordered.releaseInputDigest).toBe(canonical.releaseInputDigest);
  }, 30_000);

  it("rejects every ownership conflict deterministically", () => {
    const fixture = productFixture();
    const conflicting = {
      schemaVersion: 1,
      contentAuthority: "personal-rawr-hq",
      members: [
        member("alpha", fixture.alphaPayload),
        member("beta", fixture.betaPayload),
        member("alpha", fixture.alphaPayload, "vendor-alpha-copy", "curation-alpha-copy"),
      ],
      ownershipClaims: [
        { kind: "skill", identity: "shared-skill", ownerPluginId: "alpha" },
        { kind: "skill", identity: "shared-skill", ownerPluginId: "beta" },
        { kind: "alias", identity: "shared", ownerPluginId: "alpha" },
        { kind: "alias", identity: "shared", ownerPluginId: "beta" },
        { kind: "alias", identity: "alpha", ownerPluginId: "beta" },
        { kind: "provider-identity", identity: "codex:shared", ownerPluginId: "alpha" },
        { kind: "provider-identity", identity: "codex:shared", ownerPluginId: "beta" },
        { kind: "destination", identity: "exports/shared", ownerPluginId: "alpha" },
        { kind: "destination", identity: "exports/shared", ownerPluginId: "beta" },
        { kind: "skill", identity: "orphan", ownerPluginId: "ghost" },
      ],
      locks: [],
      qualityPolicies: [],
    };
    const reversed = structuredClone(conflicting);
    reversed.members.reverse();
    reversed.ownershipClaims.reverse();
    const left = createAgentPluginReleaseInput(conflicting);
    const right = createAgentPluginReleaseInput(reversed);
    expect(left.ok).toBe(false);
    expect(right.ok).toBe(false);
    if (!left.ok && !right.ok) {
      expect(right.issues).toEqual(left.issues);
      const codes = new Set(left.issues.map((entry) => entry.code));
      for (const code of [
        "DUPLICATE_PLUGIN_ID",
        "DUPLICATE_OWNERSHIP_CLAIM",
        "OWNERSHIP_CONFLICT",
        "MISSING_OWNER",
      ] as const)
        expect(codes.has(code), code).toBe(true);
      expect(
        left.issues.filter((entry) => entry.code === "OWNERSHIP_CONFLICT").length
      ).toBeGreaterThanOrEqual(4);
      for (const claim of ["shared-skill", "shared", "codex:shared", "exports/shared"]) {
        const conflict = left.issues.find(
          (entry) => entry.code === "OWNERSHIP_CONFLICT" && entry.claim === claim
        );
        expect(conflict?.claimants, claim).toEqual(["alpha", "beta"]);
      }
      const missingOwner = left.issues.find(
        (entry) => entry.code === "MISSING_OWNER" && entry.claim === "orphan"
      );
      expect(missingOwner?.claimants).toEqual(["ghost"]);
    }
  });

  it("rejects toolkit and composition-derived release members", () => {
    const fixture = productFixture();
    for (const kind of ["toolkit", "agent-pack", "composition"] as const) {
      const body = releaseInputBody(fixture.alphaPayload, fixture.betaPayload) as any;
      body.members[0].kind = kind;
      const result = createAgentPluginReleaseInput(body);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.issues.map((entry) => entry.code)).toContain("FORBIDDEN_UNIT_KIND");
    }
  });

  it("rejects relabeled toolkit agent packs and the declared toolkit-composition marker by payload path", () => {
    const cases = [
      {
        name: "toolkit agent pack",
        path: "agent-pack/skills/x/SKILL.md",
        bytes: encoder.encode("# Relabeled toolkit skill\n"),
      },
      {
        name: "toolkit composition marker",
        path: "plugin.yaml",
        bytes: encoder.encode("version: 1\nimports:\n  toolkits: all\n"),
      },
    ] as const;

    for (const candidate of cases) {
      const payload = must(
        createAgentPluginPayload([
          {
            path: candidate.path,
            mode: 0o644,
            bytes: candidate.bytes,
          },
        ])
      );
      const result = createAgentPluginReleaseInput({
        schemaVersion: 1,
        contentAuthority: "personal-rawr-hq",
        members: [member("relabeled", payload)],
        ownershipClaims: [],
        locks: [],
        qualityPolicies: [],
      });

      expect(result.ok, candidate.name).toBe(false);
      if (!result.ok) {
        expect(result.issues, candidate.name).toContainEqual(
          expect.objectContaining({
            code: "FORBIDDEN_UNIT_KIND",
            actual: candidate.path,
          })
        );
      }
    }
  });

  it("keeps similarly named nested documentation outside the structural source guard", () => {
    const payload = must(
      createAgentPluginPayload([
        {
          path: "docs/agent-pack/example.md",
          mode: 0o644,
          bytes: encoder.encode("documentation\n"),
        },
        { path: "docs/plugin.yaml", mode: 0o644, bytes: encoder.encode("example: true\n") },
      ])
    );
    const result = createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority: "personal-rawr-hq",
      members: [member("documented", payload)],
      ownershipClaims: [],
      locks: [],
      qualityPolicies: [],
    });

    expect(result.ok).toBe(true);
  });

  it("publishes and enforces protocol-v1 caps", () => {
    expect(MAX_RELEASE_MEMBERS).toBe(1_024);
    expect(MAX_OWNERSHIP_CLAIMS).toBe(16_384);
    expect(MAX_PAYLOAD_ENTRIES_PER_MEMBER).toBe(16_384);
    expect(MAX_PAYLOAD_BYTES_PER_MEMBER).toBe(64 * 1024 * 1024);
    expect(MAX_RELEASE_SET_PAYLOAD_BYTES).toBe(64 * 1024 * 1024);
    expect(MAX_RELEASE_INPUT_ENVELOPE_BYTES).toBe(96 * 1024 * 1024);
    expect(MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES).toBe(288 * 1024 * 1024);
    expect(MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES).toBe(96 * 1024 * 1024);

    const tiny = must(
      createAgentPluginPayload([{ path: "x", mode: 0o644, bytes: new Uint8Array() }])
    );
    const tooManyMembers = {
      schemaVersion: 1,
      contentAuthority: "personal-rawr-hq",
      members: Array.from({ length: MAX_RELEASE_MEMBERS + 1 }, (_, index) =>
        member(`p${index}`, tiny)
      ),
      ownershipClaims: [],
      locks: [],
      qualityPolicies: [],
    };
    Object.defineProperty(tooManyMembers.members, MAX_RELEASE_MEMBERS, {
      configurable: true,
      get: () => {
        throw new Error("bounded parsing must reject before traversing members");
      },
    });
    const memberResult = createAgentPluginReleaseInput(tooManyMembers);
    expect(memberResult.ok).toBe(false);
    if (!memberResult.ok)
      expect(memberResult.issues.map((entry) => entry.code)).toContain("COUNT_LIMIT_EXCEEDED");
    expect(
      createAgentPluginReleaseInput({
        ...tooManyMembers,
        members: tooManyMembers.members.slice(0, MAX_RELEASE_MEMBERS),
      }).ok
    ).toBe(true);

    const tooManyClaims = {
      schemaVersion: 1,
      contentAuthority: "personal-rawr-hq",
      members: [member("alpha", tiny)],
      ownershipClaims: Array.from({ length: MAX_OWNERSHIP_CLAIMS }, (_, index) => ({
        kind: "alias",
        identity: `skill-${index}`,
        ownerPluginId: "alpha",
      })),
      locks: [],
      qualityPolicies: [],
    };
    const claimResult = createAgentPluginReleaseInput(tooManyClaims);
    expect(claimResult.ok).toBe(false);
    if (!claimResult.ok)
      expect(claimResult.issues.map((entry) => entry.code)).toContain("COUNT_LIMIT_EXCEEDED");
    expect(
      createAgentPluginReleaseInput({
        ...tooManyClaims,
        ownershipClaims: tooManyClaims.ownershipClaims.slice(0, MAX_OWNERSHIP_CLAIMS - 1),
      }).ok
    ).toBe(true);

    const entryInputs = Array.from({ length: MAX_PAYLOAD_ENTRIES_PER_MEMBER + 1 }, (_, index) => ({
      path: `files/${index}`,
      mode: 0o644,
      bytes: new Uint8Array(),
    }));
    const tooManyEntries = createAgentPluginPayload(entryInputs);
    expect(tooManyEntries.ok).toBe(false);
    if (!tooManyEntries.ok)
      expect(tooManyEntries.issues.map((entry) => entry.code)).toContain("COUNT_LIMIT_EXCEEDED");
    expect(createAgentPluginPayload(entryInputs.slice(0, MAX_PAYLOAD_ENTRIES_PER_MEMBER)).ok).toBe(
      true
    );

    const inventoryOverflow = {
      schemaVersion: 1,
      contentAuthority: "personal-rawr-hq",
      members: [
        {
          ...member("alpha", tiny),
          skillInventory: Array.from({ length: MAX_OWNERSHIP_CLAIMS / 2 + 1 }, (_, index) => ({
            identity: `alpha-${index}`,
            manifestPath: `skills/alpha-${index}/SKILL.md`,
          })),
        },
        {
          ...member("beta", tiny),
          skillInventory: Array.from({ length: MAX_OWNERSHIP_CLAIMS / 2 }, (_, index) => ({
            identity: `beta-${index}`,
            manifestPath: `skills/beta-${index}/SKILL.md`,
          })),
        },
      ],
      ownershipClaims: [],
      locks: [],
      qualityPolicies: [],
    };
    const inventoryResult = createAgentPluginReleaseInput(inventoryOverflow);
    expect(inventoryResult.ok).toBe(false);
    if (!inventoryResult.ok) {
      expect(inventoryResult.issues).toContainEqual(
        expect.objectContaining({
          code: "COUNT_LIMIT_EXCEEDED",
          path: "releaseInput.body.members.skillInventory",
          expected: MAX_OWNERSHIP_CLAIMS,
          actual: MAX_OWNERSHIP_CLAIMS + 1,
        })
      );
    }

    const tooManyBytes = createAgentPluginPayload([
      {
        path: "large",
        mode: 0o644,
        bytes: new Uint8Array(MAX_PAYLOAD_BYTES_PER_MEMBER + 1),
      },
    ]);
    expect(tooManyBytes.ok).toBe(false);
    if (!tooManyBytes.ok)
      expect(tooManyBytes.issues.map((entry) => entry.code)).toContain(
        "PAYLOAD_BYTES_LIMIT_EXCEEDED"
      );

    const aggregateBoundary = structuredClone(releaseInputBody(tiny, tiny)) as any;
    aggregateBoundary.members[0].payload.manifest = structuredClone(
      aggregateBoundary.members[0].payload.manifest
    );
    aggregateBoundary.members[1].payload.manifest = structuredClone(
      aggregateBoundary.members[1].payload.manifest
    );
    aggregateBoundary.members[0].payload.manifest[0].byteLength = MAX_RELEASE_SET_PAYLOAD_BYTES / 2;
    aggregateBoundary.members[1].payload.manifest[0].byteLength = MAX_RELEASE_SET_PAYLOAD_BYTES / 2;
    expect(createAgentPluginReleaseInput(aggregateBoundary).ok).toBe(true);
    const aggregateOverflow = structuredClone(aggregateBoundary);
    aggregateOverflow.members[1].payload.manifest[0].byteLength += 1;
    const aggregateResult = createAgentPluginReleaseInput(aggregateOverflow);
    expect(aggregateResult.ok).toBe(false);
    if (!aggregateResult.ok) {
      expect(aggregateResult.issues).toContainEqual(
        expect.objectContaining({
          code: "PAYLOAD_BYTES_LIMIT_EXCEEDED",
          path: "releaseInput.body.members",
          expected: MAX_RELEASE_SET_PAYLOAD_BYTES,
          actual: MAX_RELEASE_SET_PAYLOAD_BYTES + 1,
        })
      );
    }

    const oversizedInputOrSet = new Uint8Array(MAX_RELEASE_INPUT_ENVELOPE_BYTES + 1);
    const envelopeResult = decodeAgentPluginReleaseInput(oversizedInputOrSet);
    expect(envelopeResult.ok).toBe(false);
    if (!envelopeResult.ok) expect(envelopeResult.issues[0]?.code).toBe("ENVELOPE_TOO_LARGE");
    const setEnvelopeResult = decodeAgentPluginReleaseSet(oversizedInputOrSet);
    expect(setEnvelopeResult.ok).toBe(false);
    if (!setEnvelopeResult.ok) expect(setEnvelopeResult.issues[0]?.code).toBe("ENVELOPE_TOO_LARGE");

    const releaseEnvelopeResult = decodeAgentPluginRelease(
      new Uint8Array(MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES + 1)
    );
    expect(releaseEnvelopeResult.ok).toBe(false);
    if (!releaseEnvelopeResult.ok)
      expect(releaseEnvelopeResult.issues[0]?.code).toBe("ENVELOPE_TOO_LARGE");
  }, 30_000);

  it("rejects noncanonical, invalid UTF-8, and unknown release-input envelopes", () => {
    const fixture = productFixture();
    const canonical = canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput);
    const extraLf = new Uint8Array([...canonical, 0x0a]);
    const noncanonical = decodeAgentPluginReleaseInput(extraLf);
    expect(noncanonical.ok).toBe(false);
    if (!noncanonical.ok) expect(noncanonical.issues[0]?.code).toBe("NON_CANONICAL_ENVELOPE");

    const invalidUtf8 = decodeAgentPluginReleaseInput(Uint8Array.from([0xff, 0x0a]));
    expect(invalidUtf8.ok).toBe(false);
    if (!invalidUtf8.ok) expect(invalidUtf8.issues[0]?.code).toBe("INVALID_UTF8");

    for (const [field, value] of Object.entries({
      checkoutPath: "/tmp/content",
      sourceRepository: "git:github.com/example/personal-rawr-hq",
      sourceCommit: "a".repeat(40),
      sourceTree: "b".repeat(40),
      acceptance: { accepted: true },
      channel: "stable",
      ledger: { generation: 1 },
      receipt: "receipt-1",
    })) {
      const unknown = wire(canonical);
      unknown.body[field] = value;
      const result = createAgentPluginReleaseInput(unknown.body);
      expect(result.ok, field).toBe(false);
      if (!result.ok)
        expect(
          result.issues.map((entry) => entry.code),
          field
        ).toContain("UNKNOWN_FIELD");
    }

    const externalBefore = {
      checkoutPath: "/tmp/first",
      sourceCommit: "a".repeat(40),
      acceptance: "candidate",
      channel: "staging",
    };
    const externalAfter = {
      checkoutPath: "/removed",
      sourceCommit: "f".repeat(40),
      acceptance: "accepted",
      channel: "stable",
    };
    expect(externalAfter).not.toEqual(externalBefore);
    expect(must(createAgentPluginReleaseInput(fixture.releaseInput.body)).releaseInputDigest).toBe(
      fixture.releaseInput.releaseInputDigest
    );
  });
});

function withMutation(
  source: Record<string, unknown>,
  mutate: (candidate: any) => void
): Record<string, unknown> {
  const candidate = structuredClone(source);
  mutate(candidate);
  return candidate;
}
