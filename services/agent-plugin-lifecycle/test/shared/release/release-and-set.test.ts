import { describe, expect, it } from "vitest";

import {
  canonicalSerializeAgentPluginArtifactBody,
  canonicalSerializeAgentPluginRelease,
  canonicalSerializeAgentPluginReleaseBody,
  canonicalSerializeAgentPluginReleaseSet,
  canonicalSerializeAgentPluginReleaseSetBody,
  canonicalSerializeArtifactRef,
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createAgentPluginReleaseSet,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  decodeAgentPluginRelease,
  decodeAgentPluginReleaseSet,
  decodeArtifactRef,
  decodeAgentPluginReleaseInput,
  parseArtifactRef,
  parseArtifactDigest,
  parsePayloadDigest,
  parseReleaseDigest,
  parseReleaseInputDigest,
  parseReleaseSetDigest,
  verifyAgentPluginPayload,
  verifyAgentPluginRelease,
  verifyAgentPluginReleaseInput,
  verifyAgentPluginReleaseSet,
  verifyCompleteReleaseSetGraph,
} from "../../../src/service/shared/release";
import {
  artifactDigest,
  releaseDigest,
  releaseSetDigest,
} from "../../../src/service/shared/release/primitives";
import { member, must, productFixture, releaseInputBody, SOURCE, wire } from "./fixtures";

describe("release and complete-set digest graph", () => {
  it("constructs and verifies exact non-circular release and artifact bodies", () => {
    const fixture = productFixture();
    const release = fixture.alphaRelease;
    expect(release.releaseDigest).toMatch(/^rd1_[0-9a-f]{64}$/u);
    expect(release.artifactDigest).toMatch(/^ad1_[0-9a-f]{64}$/u);
    expect(release.artifactBody.releaseDigest).toBe(release.releaseDigest);
    expect(release.artifactBody.releaseBody.aliases).toEqual(["a"]);
    expect(release.artifactBody.releaseBody.releaseInputDigest).toBe(fixture.releaseInput.releaseInputDigest);
    expect(release.artifactBody.releaseBody.payloadDigest).toBe(fixture.alphaPayload.payloadDigest);

    const bytes = canonicalSerializeAgentPluginRelease(release);
    expect(bytes.at(-1)).toBe(0x0a);
    const decoded = decodeAgentPluginRelease(bytes);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value.releaseDigest).toBe(release.releaseDigest);
      expect(decoded.value.artifactDigest).toBe(release.artifactDigest);
    }
  });

  it("changes release and artifact identities with source provenance while preserving input and payload identity", () => {
    const fixture = productFixture();
    const changed = must(createAgentPluginRelease({
      releaseInput: fixture.releaseInput,
      pluginId: "alpha",
      source: { ...SOURCE, sourceTree: "c".repeat(40) },
      payload: fixture.alphaPayload,
    }));
    expect(changed.artifactBody.releaseBody.releaseInputDigest).toBe(
      fixture.alphaRelease.artifactBody.releaseBody.releaseInputDigest,
    );
    expect(changed.artifactBody.releaseBody.payloadDigest).toBe(
      fixture.alphaRelease.artifactBody.releaseBody.payloadDigest,
    );
    expect(changed.releaseDigest).not.toBe(fixture.alphaRelease.releaseDigest);
    expect(changed.artifactDigest).not.toBe(fixture.alphaRelease.artifactDigest);
  });

  it("rejects body, digest, manifest, byte, and unknown-field tampering", () => {
    const fixture = productFixture();
    const mutations: Array<(value: any) => void> = [
      (value) => { value.artifactBody.releaseBody.sourceCommit = "c".repeat(40); },
      (value) => { value.artifactBody.releaseBody.aliases = ["changed"]; },
      (value) => { value.artifactBody.releaseDigest = `rd1_${"0".repeat(64)}`; },
      (value) => { value.artifactBody.storageManifest[0].mode = 0o755; },
      (value) => { value.artifactBody.payloadEntries[0].bytesBase64 = "eA=="; },
      (value) => { value.unknown = true; },
    ];
    for (const mutate of mutations) {
      const candidate = wire(canonicalSerializeAgentPluginRelease(fixture.alphaRelease));
      mutate(candidate);
      expect(verifyAgentPluginRelease(candidate).ok).toBe(false);
    }
  });

  it("exposes only the closed artifact-ref union and rejects digest substitution", () => {
    const fixture = productFixture();
    const releaseRef = createReleaseArtifactRef(
      fixture.alphaRelease.releaseDigest,
      fixture.alphaRelease.artifactDigest,
    );
    const setRef = createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest);
    expect(decodeArtifactRef(canonicalSerializeArtifactRef(releaseRef))).toEqual({ ok: true, value: releaseRef });
    expect(decodeArtifactRef(canonicalSerializeArtifactRef(setRef))).toEqual({ ok: true, value: setRef });
    expect(parseArtifactRef({
      kind: "release",
      releaseDigest: fixture.alphaRelease.artifactDigest,
      artifactDigest: fixture.alphaRelease.releaseDigest,
    }).ok).toBe(false);
    expect(parseArtifactRef({ kind: "complete-set", releaseSetDigest: fixture.alphaRelease.releaseDigest }).ok).toBe(false);
    expect(parseArtifactRef({ kind: "generic", digest: fixture.alphaRelease.artifactDigest }).ok).toBe(false);

    const domains = [
      [fixture.releaseInput.releaseInputDigest, parseReleaseInputDigest],
      [fixture.alphaPayload.payloadDigest, parsePayloadDigest],
      [fixture.alphaRelease.releaseDigest, parseReleaseDigest],
      [fixture.alphaRelease.artifactDigest, parseArtifactDigest],
      [fixture.releaseSet.releaseSetDigest, parseReleaseSetDigest],
    ] as const;
    domains.forEach(([digest, parse], parserIndex) => {
      domains.forEach(([candidate], candidateIndex) => {
        expect(parse(candidate).ok, `${parserIndex}:${candidateIndex}`).toBe(parserIndex === candidateIndex);
      });
      expect(parse(digest).ok).toBe(true);
    });
  });

  it("canonicalizes full membership but rejects targeted, extra, and mixed-source construction", () => {
    const fixture = productFixture();
    const reordered = must(createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease, fixture.betaRelease],
    }));
    expect(reordered.releaseSetDigest).toBe(fixture.releaseSet.releaseSetDigest);
    expect(reordered.body.members.map((entry) => entry.pluginId)).toEqual(["alpha", "beta"]);

    const targeted = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease],
    });
    expect(targeted.ok).toBe(false);
    if (!targeted.ok) expect(targeted.issues.map((entry) => entry.code)).toContain("MISSING_EXPECTED_MEMBER");

    const gammaInputBody = releaseInputBody(fixture.alphaPayload, fixture.betaPayload) as any;
    gammaInputBody.members.push(member("gamma", fixture.alphaPayload));
    gammaInputBody.ownershipClaims.push({ kind: "skill", identity: "gamma-skill", ownerPluginId: "gamma" });
    const gammaInput = must(createAgentPluginReleaseInput(gammaInputBody));
    const gamma = must(createAgentPluginRelease({
      releaseInput: gammaInput,
      pluginId: "gamma",
      source: SOURCE,
      payload: fixture.alphaPayload,
    }));
    const extra = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease, fixture.betaRelease, gamma],
    });
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.issues.map((entry) => entry.code)).toContain("EXTRA_MEMBER");

    const otherSource = must(createAgentPluginRelease({
      releaseInput: fixture.releaseInput,
      pluginId: "beta",
      source: { ...SOURCE, sourceTree: "d".repeat(40) },
      payload: fixture.betaPayload,
    }));
    const mixed = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease, otherSource],
    });
    expect(mixed.ok).toBe(false);
    if (!mixed.ok) expect(mixed.issues.map((entry) => entry.code)).toContain("SOURCE_IDENTITY_MISMATCH");
  });

  it("rejects a self-consistent release whose derived fields disagree with its release input", () => {
    const fixture = productFixture();
    const forged = wire(canonicalSerializeAgentPluginRelease(fixture.alphaRelease));
    forged.artifactBody.releaseBody.aliases = ["rogue"];
    const rd = releaseDigest(canonicalSerializeAgentPluginReleaseBody(forged.artifactBody.releaseBody));
    forged.releaseDigest = rd;
    forged.artifactBody.releaseDigest = rd;
    forged.artifactDigest = artifactDigest(canonicalSerializeAgentPluginArtifactBody(forged.artifactBody));
    expect(verifyAgentPluginRelease(forged).ok).toBe(true);

    const result = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [forged, fixture.betaRelease],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((entry) => entry.code)).toContain("RELEASE_INPUT_IDENTITY_MISMATCH");
  });

  it("verifies the exact ordered complete graph without partial fallback", () => {
    const fixture = productFixture();
    const ordered = [fixture.alphaRelease, fixture.betaRelease];
    expect(verifyCompleteReleaseSetGraph(fixture.releaseSet, ordered).ok).toBe(true);

    const missing = verifyCompleteReleaseSetGraph(fixture.releaseSet, [fixture.alphaRelease]);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.issues.map((entry) => entry.code)).toContain("MISSING_EXPECTED_MEMBER");

    const reordered = verifyCompleteReleaseSetGraph(fixture.releaseSet, [...ordered].reverse());
    expect(reordered.ok).toBe(false);
    if (!reordered.ok) expect(reordered.issues.map((entry) => entry.code)).toContain("RELEASE_SET_DIGEST_MISMATCH");

    const tampered = wire(canonicalSerializeAgentPluginRelease(fixture.betaRelease));
    tampered.artifactBody.payloadEntries[0].bytesBase64 = "eA==";
    expect(verifyCompleteReleaseSetGraph(fixture.releaseSet, [fixture.alphaRelease, tampered]).ok).toBe(false);
  });

  it("rejects a self-consistent set whose plugin ownership identity differs from its member", () => {
    const fixture = productFixture();
    const forged = wire(canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet));
    for (const ownershipIndex of [
      forged.body.ownershipIndex,
      forged.body.completenessWitness.ownershipIndex,
    ]) {
      const claim = ownershipIndex.claims.find(
        (candidate: any) => candidate.kind === "plugin" && candidate.ownerPluginId === "alpha",
      );
      claim.identity = "not-alpha";
    }
    forged.releaseSetDigest = releaseSetDigest(canonicalSerializeAgentPluginReleaseSetBody(forged.body));

    const verified = verifyAgentPluginReleaseSet(forged);
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.issues.map((entry) => entry.code)).toContain("OWNERSHIP_INDEX_MISMATCH");
    const graph = verifyCompleteReleaseSetGraph(forged, [fixture.alphaRelease, fixture.betaRelease]);
    expect(graph.ok).toBe(false);
    if (!graph.ok) expect(graph.issues.map((entry) => entry.code)).toContain("OWNERSHIP_INDEX_MISMATCH");
  });

  it("round-trips one canonical set envelope and rejects noncanonical member ordering", () => {
    const fixture = productFixture();
    const bytes = canonicalSerializeAgentPluginReleaseSet(fixture.releaseSet);
    const decoded = decodeAgentPluginReleaseSet(bytes);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.releaseSetDigest).toBe(fixture.releaseSet.releaseSetDigest);

    const reordered = wire(bytes);
    reordered.body.members.reverse();
    const noncanonicalBytes = new TextEncoder().encode(`${JSON.stringify(reordered)}\n`);
    expect(decodeAgentPluginReleaseSet(noncanonicalBytes).ok).toBe(false);
  });

  it("returns closed failures rather than throwing for malformed public inputs", () => {
    const calls = [
      () => createAgentPluginPayload({}),
      () => verifyAgentPluginPayload({}),
      () => createAgentPluginReleaseInput({}),
      () => verifyAgentPluginReleaseInput({}),
      () => decodeAgentPluginReleaseInput({}),
      () => createAgentPluginRelease({ releaseInput: {}, pluginId: "alpha", source: {}, payload: {} }),
      () => verifyAgentPluginRelease({ artifactBody: {}, artifactDigest: "", releaseDigest: "", schemaVersion: 1 }),
      () => decodeAgentPluginRelease({}),
      () => createAgentPluginReleaseSet({ releaseInput: {}, releases: [] }),
      () => verifyAgentPluginReleaseSet({ body: {}, releaseSetDigest: "", schemaVersion: 1 }),
      () => decodeAgentPluginReleaseSet({}),
      () => verifyCompleteReleaseSetGraph({}, {}),
      () => parseArtifactRef({}),
      () => decodeArtifactRef({}),
    ];
    for (const call of calls) {
      expect(call).not.toThrow();
      expect(call().ok).toBe(false);
    }
  });
});
