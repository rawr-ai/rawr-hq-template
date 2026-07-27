import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";

import { ReleaseIssueSchema } from "../../../src/service/model/dto/release-issue";
import {
  createAgentPluginRelease,
  verifyAgentPluginRelease,
} from "../../../src/service/model/policy/agent-plugin-release";
import {
  canonicalSerializeAgentPluginRelease,
  canonicalSerializeAgentPluginReleaseBody,
} from "../../../src/service/model/policy/agent-plugin-release-codec";
import { createAgentPluginReleaseInput } from "../../../src/service/model/policy/release-input";
import {
  parsePayloadDigest,
  parseReleaseDigest,
  parseReleaseInputDigest,
  parseReleaseSetDigest,
  releaseDigest,
  releaseSetDigest,
} from "../../../src/service/shared/release/primitives";
import {
  canonicalSerializeAgentPluginReleaseSet,
  canonicalSerializeAgentPluginReleaseSetBody,
  createAgentPluginReleaseSet,
  decodeAgentPluginReleaseSet,
  verifyAgentPluginReleaseSet,
  verifyCompleteReleaseSet,
} from "../../../src/service/shared/release/release-set";
import { member, must, productFixture, releaseInputBody, SOURCE, wire } from "./fixtures";

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

  it("keeps the remaining release identity digest domains distinct", () => {
    const fixture = productFixture();
    const domains = [
      [fixture.releaseInput.releaseInputDigest, parseReleaseInputDigest],
      [fixture.alphaPayload.payloadDigest, parsePayloadDigest],
      [fixture.alphaRelease.releaseDigest, parseReleaseDigest],
      [fixture.releaseSet.releaseSetDigest, parseReleaseSetDigest],
    ] as const;

    domains.forEach(([digest, parse], parserIndex) => {
      domains.forEach(([candidate], candidateIndex) => {
        expect(parse(candidate).ok, `${parserIndex}:${candidateIndex}`).toBe(
          parserIndex === candidateIndex
        );
      });
      expect(parse(digest).ok).toBe(true);
    });
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

  it("rejects targeted, extra, and mixed-source construction", () => {
    const fixture = productFixture();
    const targeted = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease],
    });
    expect(targeted.ok).toBe(false);
    if (!targeted.ok)
      expect(targeted.issues.map((entry) => entry.code)).toContain("MISSING_EXPECTED_MEMBER");

    const gammaInputBody = releaseInputBody(fixture.alphaPayload, fixture.betaPayload) as any;
    gammaInputBody.members.push(member("gamma", fixture.alphaPayload));
    gammaInputBody.ownershipClaims.push({
      kind: "skill",
      identity: "gamma-skill",
      ownerPluginId: "gamma",
    });
    const gammaInput = must(createAgentPluginReleaseInput(gammaInputBody));
    const gamma = must(
      createAgentPluginRelease({
        releaseInput: gammaInput,
        pluginId: "gamma",
        source: SOURCE,
        payload: fixture.alphaPayload,
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
    for (const ownershipIndex of [
      forged.body.ownershipIndex,
      forged.body.completenessWitness.ownershipIndex,
    ]) {
      const claim = ownershipIndex.claims.find(
        (candidate: any) => candidate.kind === "plugin" && candidate.ownerPluginId === "alpha"
      );
      claim.identity = "not-alpha";
    }
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

  it("round-trips one canonical set envelope and rejects noncanonical member ordering", () => {
    const fixture = productFixture();
    const bytes = canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet);
    const decoded = decodeAgentPluginReleaseSet(bytes);
    expect(decoded.ok).toBe(true);
    if (decoded.ok)
      expect(decoded.value.releaseSetDigest).toBe(fixture.releaseSet.releaseSetDigest);

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
