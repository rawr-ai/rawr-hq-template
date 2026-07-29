import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type AgentPluginReleaseBody,
  AgentPluginReleaseBodySchema,
  type AgentPluginReleaseEnvelope,
  AgentPluginReleaseEnvelopeSchema,
  type ReleaseSourceIdentity,
  ReleaseSourceIdentitySchema,
} from "../../src/service/model/dto/agent-plugin-release";
import { createAgentPluginPayload } from "../../src/service/model/policy/agent-plugin-payload";
import {
  createAgentPluginRelease,
  decodeAgentPluginRelease,
  verifyAgentPluginRelease,
} from "../../src/service/model/policy/agent-plugin-release";
import {
  canonicalSerializeAgentPluginRelease,
  canonicalSerializeAgentPluginReleaseBody,
} from "../../src/service/model/policy/agent-plugin-release-codec";
import { releaseDigest } from "../../src/service/model/policy/release-digest";
import { createAgentPluginReleaseInput } from "../../src/service/model/policy/release-input";
import {
  must,
  productFixture,
  releaseInputBody,
  SOURCE,
} from "../support/service/release-fixtures";

const encoder = new TextEncoder();

interface MutableReleaseWire {
  [key: string]: unknown;
  schemaVersion: number;
  releaseDigest: string;
  body: {
    [key: string]: unknown;
    sourceCommit: string;
    aliases: string[];
    payloadManifest: Array<{ [key: string]: unknown; mode: number }>;
  };
  payload: {
    [key: string]: unknown;
    entries: Array<{ [key: string]: unknown; bytesBase64: string }>;
  };
  localHandle?: string;
}

interface MutableReleaseInput {
  [key: string]: unknown;
  body: Record<string, unknown>;
}

interface MutablePayload {
  [key: string]: unknown;
  entries: Array<Record<string, unknown>>;
}

describe("agent-plugin release", () => {
  it("derives its body and wire envelope from the closed TypeBox schemas", () => {
    expectTypeOf<ReleaseSourceIdentity>().toEqualTypeOf<
      Static<typeof ReleaseSourceIdentitySchema>
    >();
    expectTypeOf<AgentPluginReleaseBody>().toEqualTypeOf<
      Static<typeof AgentPluginReleaseBodySchema>
    >();
    expectTypeOf<AgentPluginReleaseEnvelope>().toEqualTypeOf<
      Static<typeof AgentPluginReleaseEnvelopeSchema>
    >();

    const release = productFixture().alphaRelease;
    const envelope = mutableReleaseWire(canonicalSerializeAgentPluginRelease(release));
    const firstEntry = envelope.payload.entries[0];
    if (firstEntry === undefined) throw new Error("Release fixture entry is missing");
    expect(Value.Check(AgentPluginReleaseEnvelopeSchema, envelope)).toBe(true);

    for (const candidate of [
      { ...envelope, localHandle: "/tmp/release" },
      { ...envelope, body: { ...envelope.body, localHandle: "/tmp/release" } },
      { ...envelope, payload: { ...envelope.payload, storageManifest: [] } },
      {
        ...envelope,
        payload: {
          ...envelope.payload,
          entries: [{ ...firstEntry, byteLength: 6 }],
        },
      },
    ]) {
      expect(Value.Check(AgentPluginReleaseEnvelopeSchema, candidate)).toBe(false);
    }
  });

  it("constructs one canonical in-memory release with exactly one body and payload", () => {
    const fixture = productFixture();
    const release = fixture.alphaRelease;

    expect(release.releaseDigest).toBe(
      releaseDigest(canonicalSerializeAgentPluginReleaseBody(release.body))
    );
    expect(release.body.aliases).toEqual(["a"]);
    expect(release.body.releaseInputDigest).toBe(fixture.releaseInput.releaseInputDigest);
    expect(release.body.payloadDigest).toBe(fixture.alphaPayload.payloadDigest);
    expect(release.payload.payloadDigest).toBe(fixture.alphaPayload.payloadDigest);
    expect(Object.keys(release).sort()).toEqual([
      "body",
      "payload",
      "releaseDigest",
      "schemaVersion",
    ]);

    const bytes = canonicalSerializeAgentPluginRelease(release);
    expect(bytes.at(-1)).toBe(0x0a);
    const decoded = decodeAgentPluginRelease(bytes);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value.releaseDigest).toBe(release.releaseDigest);
      expect(decoded.value.body).toEqual(release.body);
      expect(decoded.value.payload).toEqual(release.payload);
    }
  });

  it("changes release identity with source provenance while retaining selected input and payload", () => {
    const fixture = productFixture();
    const changed = must(
      createAgentPluginRelease({
        releaseInput: fixture.releaseInput,
        pluginId: "alpha",
        source: { ...SOURCE, sourceTree: "c".repeat(40) },
        payload: fixture.alphaPayload,
      })
    );

    expect(changed.body.releaseInputDigest).toBe(fixture.alphaRelease.body.releaseInputDigest);
    expect(changed.body.payloadDigest).toBe(fixture.alphaRelease.body.payloadDigest);
    expect(changed.releaseDigest).not.toBe(fixture.alphaRelease.releaseDigest);
  });

  it("changes release identity when one admitted payload byte changes", () => {
    const fixture = productFixture();
    const changedPayload = must(
      createAgentPluginPayload([
        {
          path: "skills/alpha/SKILL.md",
          mode: 0o644,
          bytes: encoder.encode("alpha changed\n"),
        },
        {
          path: "agents/alpha.md",
          mode: 0o644,
          bytes: encoder.encode("agent alpha\n"),
        },
      ])
    );
    const changedInput = must(
      createAgentPluginReleaseInput(releaseInputBody(changedPayload, fixture.betaPayload))
    );
    const changedRelease = must(
      createAgentPluginRelease({
        releaseInput: changedInput,
        pluginId: "alpha",
        source: SOURCE,
        payload: changedPayload,
      })
    );

    expect(changedPayload.payloadDigest).not.toBe(fixture.alphaPayload.payloadDigest);
    expect(changedInput.releaseInputDigest).toBe(fixture.releaseInput.releaseInputDigest);
    expect(changedRelease.releaseDigest).not.toBe(fixture.alphaRelease.releaseDigest);
  });

  it("rejects unknown fields before projecting embedded release inputs and payloads", () => {
    const fixture = productFixture();
    const base = {
      releaseInput: fixture.releaseInput,
      pluginId: "alpha",
      source: SOURCE,
      payload: fixture.alphaPayload,
    };
    const releaseInputOuter = structuredClone(fixture.releaseInput) as MutableReleaseInput;
    releaseInputOuter.unknown = true;
    const releaseInputBody = structuredClone(fixture.releaseInput) as MutableReleaseInput;
    releaseInputBody.body.unknown = true;
    const payloadOuter = mutablePayload(fixture.alphaPayload);
    payloadOuter.unknown = true;
    const payloadEntry = mutablePayload(fixture.alphaPayload);
    payloadEntry.entries[0].unknown = true;

    for (const candidate of [
      { ...base, unknown: true },
      { ...base, releaseInput: releaseInputOuter },
      { ...base, releaseInput: releaseInputBody },
      { ...base, payload: payloadOuter },
      { ...base, payload: payloadEntry },
    ]) {
      const result = createAgentPluginRelease(candidate);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues.map((issue) => issue.code)).toContain("UNKNOWN_FIELD");
    }
  });

  it("rejects body, release-digest, payload, and unknown-field tampering", () => {
    const fixture = productFixture();
    const mutations: Array<(value: MutableReleaseWire) => void> = [
      (value) => {
        value.body.sourceCommit = "c".repeat(40);
      },
      (value) => {
        value.body.aliases = ["changed"];
      },
      (value) => {
        value.releaseDigest = `rd1_${"0".repeat(64)}`;
      },
      (value) => {
        const entry = value.body.payloadManifest[0];
        if (entry !== undefined) entry.mode = 0o755;
      },
      (value) => {
        const entry = value.payload.entries[0];
        if (entry !== undefined) entry.bytesBase64 = "eA==";
      },
      (value) => {
        value.localHandle = "/tmp/release";
      },
    ];

    for (const mutate of mutations) {
      const candidate = mutableReleaseWire(
        canonicalSerializeAgentPluginRelease(fixture.alphaRelease)
      );
      mutate(candidate);
      expect(verifyAgentPluginRelease(candidate).ok).toBe(false);
    }
  });

  it("owns and freezes every nested release value admitted from a wire record", () => {
    const fixture = productFixture();
    const candidate = mutableReleaseWire(
      canonicalSerializeAgentPluginRelease(fixture.alphaRelease)
    );
    const verified = verifyAgentPluginRelease(candidate);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;

    candidate.body.aliases.push("rogue");
    candidate.payload.entries[0].bytesBase64 = "eA==";
    expect(verified.value.body.aliases).toEqual(["a"]);
    expect(verified.value.payload.entries[0]?.bytesBase64).not.toBe("eA==");

    for (const value of [
      verified.value,
      verified.value.body,
      verified.value.body.aliases,
      verified.value.body.payloadManifest,
      verified.value.body.vendor,
      verified.value.body.curation,
      verified.value.payload,
      verified.value.payload.manifest,
      verified.value.payload.entries,
      verified.value.payload.entries[0],
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
  });

  it("refuses noncanonical release bytes", () => {
    const canonical = canonicalSerializeAgentPluginRelease(productFixture().alphaRelease);
    const noncanonical = Uint8Array.from([...canonical, 0x0a]);
    const decoded = decodeAgentPluginRelease(noncanonical);

    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.issues.map((issue) => issue.code)).toContain("NON_CANONICAL_ENVELOPE");
    }
  });

  it("returns a closed failure instead of throwing for malformed public inputs", () => {
    for (const call of [
      () =>
        createAgentPluginRelease({
          releaseInput: {},
          pluginId: "alpha",
          source: {},
          payload: {},
        }),
      () =>
        verifyAgentPluginRelease({
          body: {},
          payload: {},
          releaseDigest: "",
          schemaVersion: 1,
        }),
      () => decodeAgentPluginRelease({}),
    ]) {
      expect(call).not.toThrow();
      expect(call().ok).toBe(false);
    }
  });
});

function mutableReleaseWire(bytes: Uint8Array): MutableReleaseWire {
  return JSON.parse(new TextDecoder().decode(bytes)) as MutableReleaseWire;
}

function mutablePayload(
  payload: ReturnType<typeof productFixture>["alphaPayload"]
): MutablePayload {
  return {
    ...payload,
    entries: payload.entries.map((entry) => ({ ...entry })),
  };
}
