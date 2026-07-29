import { describe, expect, it } from "vitest";

import {
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  type ReleaseInputBody,
} from "../../src/service/model/dto/release-input";
import { createAgentPluginPayload } from "../../src/service/model/policy/agent-plugin-payload";
import { releaseInputDigest } from "../../src/service/model/policy/release-digest";
import {
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
  verifyAgentPluginReleaseInput,
} from "../../src/service/model/policy/release-input";
import {
  canonicalSerializeAgentPluginReleaseInput,
  canonicalSerializeReleaseInputBody,
  releaseInputValue,
} from "../../src/service/model/policy/release-input-codec";
import {
  member,
  must,
  productFixture,
  releaseInputBody,
} from "../support/service/release-fixtures";

const encoder = new TextEncoder();

describe("release-input policy", () => {
  it("fixes canonical body and envelope bytes while preserving identity across declaration order", () => {
    const { body } = tinyReleaseInputBody();
    const releaseInput = must(createAgentPluginReleaseInput(body));
    const expectedBodyLine =
      '{"schemaVersion":1,"contentAuthority":"personal-rawr-hq","members":[' +
      '{"kind":"agent-plugin","pluginId":"alpha","vendor":[],"curation":[]}' +
      '],"ownershipClaims":[],"locks":[],"qualityPolicies":[]}\n';
    const expectedBodyBytes = encoder.encode(expectedBodyLine);
    const expectedEnvelopeLine =
      `{"schemaVersion":1,"releaseInputDigest":"${releaseInput.releaseInputDigest}",` +
      `"body":${expectedBodyLine.slice(0, -1)}}\n`;

    expect(canonicalSerializeReleaseInputBody(releaseInput.body)).toEqual(expectedBodyBytes);
    expect(releaseInput.releaseInputDigest).toBe(releaseInputDigest(expectedBodyBytes));
    expect(canonicalSerializeAgentPluginReleaseInput(releaseInput)).toEqual(
      encoder.encode(expectedEnvelopeLine)
    );
    expect(releaseInputValue(releaseInput)).toEqual(JSON.parse(expectedEnvelopeLine));

    const fixture = productFixture();
    const orderedBody = releaseInputBody(fixture.alphaPayload, fixture.betaPayload);
    const permutedBody = structuredClone(orderedBody) as any;
    permutedBody.members.reverse();
    permutedBody.ownershipClaims.reverse();
    permutedBody.locks.reverse();
    permutedBody.qualityPolicies.reverse();
    for (const declaration of permutedBody.members) {
      declaration.vendor.reverse();
      declaration.curation.reverse();
    }
    const ordered = must(createAgentPluginReleaseInput(orderedBody));
    const permuted = must(createAgentPluginReleaseInput(permutedBody));

    expect(permuted.releaseInputDigest).toBe(ordered.releaseInputDigest);
    expect(canonicalSerializeReleaseInputBody(permuted.body)).toEqual(
      canonicalSerializeReleaseInputBody(ordered.body)
    );
    expect(canonicalSerializeAgentPluginReleaseInput(permuted)).toEqual(
      canonicalSerializeAgentPluginReleaseInput(ordered)
    );
  });

  it("admits typed bodies and unknown envelopes through their direct policy boundaries", () => {
    const created = must(createAgentPluginReleaseInput(tinyReleaseInputBody().body));
    const typedBody: ReleaseInputBody = created.body;
    const reconstructed = must(createAgentPluginReleaseInput(typedBody));
    const unknownEnvelope: unknown = structuredClone(releaseInputValue(created));
    const verified = verifyAgentPluginReleaseInput(unknownEnvelope);

    expect(reconstructed.releaseInputDigest).toBe(created.releaseInputDigest);
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("Expected the unknown envelope to be admitted");
    expect(verified.value.releaseInputDigest).toBe(created.releaseInputDigest);

    const identityTamper = structuredClone(releaseInputValue(created)) as any;
    identityTamper.body.contentAuthority = "personal-rawr-hq-v2";
    const tampered = verifyAgentPluginReleaseInput(identityTamper);
    expect(tampered.ok).toBe(false);
    if (!tampered.ok) {
      expect(tampered.issues.map(({ code }) => code)).toContain("RELEASE_INPUT_DIGEST_MISMATCH");
    }

    const unknownField = structuredClone(releaseInputValue(created)) as any;
    unknownField.body.sourceCommit = "a".repeat(40);
    const closed = verifyAgentPluginReleaseInput(unknownField);
    expect(closed.ok).toBe(false);
    if (!closed.ok) expect(closed.issues.map(({ code }) => code)).toContain("UNKNOWN_FIELD");

    expect(createAgentPluginReleaseInput(42 as unknown)).toEqual({
      ok: false,
      issues: [
        {
          code: "EXPECTED_OBJECT",
          path: "releaseInput.body",
          message: "Value must be an object",
        },
      ],
    });
  });

  it("decodes only the unique canonical UTF-8 envelope", () => {
    const created = must(createAgentPluginReleaseInput(tinyReleaseInputBody().body));
    const canonical = canonicalSerializeAgentPluginReleaseInput(created);
    const decoded = decodeAgentPluginReleaseInput(canonical);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error("Expected canonical release-input bytes to decode");
    expect(decoded.value.releaseInputDigest).toBe(created.releaseInputDigest);
    expect(canonicalSerializeAgentPluginReleaseInput(decoded.value)).toEqual(canonical);

    expect(decodeAgentPluginReleaseInput(new Uint8Array([0x20, ...canonical]))).toEqual({
      ok: false,
      issues: [
        {
          code: "NON_CANONICAL_ENVELOPE",
          path: "releaseInput",
          message: "Release-input bytes are not the unique canonical representation",
        },
      ],
    });
    expect(decodeAgentPluginReleaseInput(Uint8Array.of(0xc3, 0x28))).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_UTF8",
          path: "releaseInput",
          message: "Canonical envelope is not valid UTF-8",
        },
      ],
    });
  });

  it("bounds envelope bytes and body traversal without reading excluded members", () => {
    expect(
      decodeAgentPluginReleaseInput(new Uint8Array(MAX_RELEASE_INPUT_ENVELOPE_BYTES + 1))
    ).toEqual({
      ok: false,
      issues: [
        {
          code: "ENVELOPE_TOO_LARGE",
          path: "releaseInput",
          message: "Canonical envelope exceeds its protocol bound",
          expected: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
          actual: MAX_RELEASE_INPUT_ENVELOPE_BYTES + 1,
        },
      ],
    });

    const { payload } = tinyReleaseInputBody();
    const template = member("template", payload) as any;
    template.vendor = [];
    template.curation = [];
    const members = Array.from({ length: MAX_RELEASE_MEMBERS + 1 }, (_, index) => ({
      ...template,
      pluginId: `plugin-${index.toString().padStart(4, "0")}`,
    }));
    let excludedRead = false;
    Object.defineProperty(members, MAX_RELEASE_MEMBERS, {
      configurable: true,
      get() {
        excludedRead = true;
        throw new Error("bounded release-input admission read its excluded member");
      },
    });

    const result = createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority: "personal-rawr-hq",
      members,
      ownershipClaims: [],
      locks: [],
      qualityPolicies: [],
    });

    expect(excludedRead).toBe(false);
    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: "COUNT_LIMIT_EXCEEDED",
          path: "releaseInput.body.members",
          message: `Array exceeds protocol limit ${MAX_RELEASE_MEMBERS}`,
          expected: MAX_RELEASE_MEMBERS,
          actual: MAX_RELEASE_MEMBERS + 1,
        },
      ],
    });
  });

  it("defensively copies and freezes every release-input-owned declaration", () => {
    const fixture = productFixture();
    const source = structuredClone(
      releaseInputBody(fixture.alphaPayload, fixture.betaPayload)
    ) as any;
    const created = must(createAgentPluginReleaseInput(source));
    const canonical = canonicalSerializeAgentPluginReleaseInput(created);

    expect(Object.isFrozen(created)).toBe(true);
    expect(Object.isFrozen(created.body)).toBe(true);
    expect(Object.isFrozen(created.body.members)).toBe(true);
    expect(Object.isFrozen(created.body.ownershipClaims)).toBe(true);
    expect(Object.isFrozen(created.body.locks)).toBe(true);
    expect(Object.isFrozen(created.body.qualityPolicies)).toBe(true);
    for (const declaration of created.body.members) {
      expect(Object.isFrozen(declaration)).toBe(true);
      expect(Object.isFrozen(declaration.vendor)).toBe(true);
      expect(declaration.vendor.every(Object.isFrozen)).toBe(true);
      expect(Object.isFrozen(declaration.curation)).toBe(true);
      expect(declaration.curation.every(Object.isFrozen)).toBe(true);
    }
    expect(created.body.ownershipClaims.every(Object.isFrozen)).toBe(true);
    expect(created.body.locks.every(Object.isFrozen)).toBe(true);
    expect(created.body.qualityPolicies.every(Object.isFrozen)).toBe(true);

    source.contentAuthority = "changed-authority";
    source.members[0].pluginId = "changed-plugin";
    source.members[0].vendor[0].id = "changed-vendor";
    source.ownershipClaims[0].identity = "changed-claim";
    source.locks[0].id = "changed-lock";
    source.qualityPolicies[0].id = "changed-policy";
    source.members.reverse();
    source.ownershipClaims.reverse();

    const projected = structuredClone(releaseInputValue(created)) as any;
    projected.body.members[0].pluginId = "changed-projection";

    expect(canonicalSerializeAgentPluginReleaseInput(created)).toEqual(canonical);
    expect(created.body.members.map(({ pluginId }) => pluginId)).toEqual(["alpha", "beta"]);
  });

  it("orders complete diagnostics independently of declaration order", () => {
    const fixture = productFixture();
    const conflicting = structuredClone(
      releaseInputBody(fixture.alphaPayload, fixture.betaPayload)
    ) as any;
    conflicting.unexpected = true;
    conflicting.ownershipClaims.push(
      { kind: "alias", identity: "duplicate", ownerPluginId: "alpha" },
      { kind: "alias", identity: "duplicate", ownerPluginId: "alpha" },
      { kind: "alias", identity: "shared", ownerPluginId: "alpha" },
      { kind: "alias", identity: "shared", ownerPluginId: "beta" },
      { kind: "destination", identity: "orphan", ownerPluginId: "ghost" }
    );
    const reversed = structuredClone(conflicting) as any;
    reversed.members.reverse();
    reversed.ownershipClaims.reverse();

    const left = createAgentPluginReleaseInput(conflicting);
    const right = createAgentPluginReleaseInput(reversed);

    expect(left.ok).toBe(false);
    expect(right.ok).toBe(false);
    if (left.ok || right.ok) throw new Error("Expected release-input diagnostics");
    expect(right.issues).toEqual(left.issues);
    expect(left.issues.map(({ code }) => code)).toEqual([
      "DUPLICATE_OWNERSHIP_CLAIM",
      "OWNERSHIP_CONFLICT",
      "MISSING_OWNER",
      "OWNERSHIP_CONFLICT",
      "UNKNOWN_FIELD",
    ]);
  });
});

function tinyReleaseInputBody() {
  const payload = must(
    createAgentPluginPayload([
      {
        path: "docs/readme.txt",
        mode: 0o644,
        bytes: encoder.encode("ok\n"),
      },
    ])
  );
  const declaration = member("alpha", payload) as any;
  declaration.vendor = [];
  declaration.curation = [];
  return {
    payload,
    body: {
      schemaVersion: 1,
      contentAuthority: "personal-rawr-hq",
      members: [declaration],
      ownershipClaims: [],
      locks: [],
      qualityPolicies: [],
    },
  };
}
