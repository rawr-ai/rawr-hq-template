import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";

import {
  ReleaseInputBodySchema,
  ReleaseInputEnvelopeSchema,
  ReleaseMemberDeclarationSchema,
} from "../../src/service/model/dto/release-input";
import { createAgentPluginPayload } from "../../src/service/model/policy/agent-plugin-payload";
import { createAgentPluginRelease } from "../../src/service/model/policy/agent-plugin-release";
import {
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
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
  SOURCE,
  wire,
} from "../support/service/release-fixtures";

const encoder = new TextEncoder();

describe("canonical payload and declarative release input", () => {
  it("canonicalizes closed declarations independently of input order", () => {
    const fixture = productFixture();
    const orderedBody = releaseInputBody(fixture.alphaPayload, fixture.betaPayload);
    const reversedBody = structuredClone(orderedBody) as any;
    reversedBody.members.reverse();
    reversedBody.ownershipClaims.reverse();
    reversedBody.locks.reverse();
    reversedBody.qualityPolicies.reverse();
    for (const declaration of reversedBody.members) {
      declaration.vendor.reverse();
      declaration.curation.reverse();
    }

    const ordered = must(createAgentPluginReleaseInput(orderedBody));
    const reversed = must(createAgentPluginReleaseInput(reversedBody));

    expect(reversed.releaseInputDigest).toBe(ordered.releaseInputDigest);
    expect(canonicalSerializeReleaseInputBody(reversed.body)).toEqual(
      canonicalSerializeReleaseInputBody(ordered.body)
    );
    expect(canonicalSerializeAgentPluginReleaseInput(reversed)).toEqual(
      canonicalSerializeAgentPluginReleaseInput(ordered)
    );
  });

  it("keeps payload paths and bytes out of release-input identity", () => {
    const firstPayload = must(
      createAgentPluginPayload([
        {
          path: "skills/alpha/SKILL.md",
          mode: 0o644,
          bytes: encoder.encode("skill one\n"),
        },
        {
          path: "references/one.md",
          mode: 0o644,
          bytes: encoder.encode("reference one\n"),
        },
      ])
    );
    const changedPayload = must(
      createAgentPluginPayload([
        {
          path: "skills/alpha/SKILL.md",
          mode: 0o644,
          bytes: encoder.encode("skill two\n"),
        },
        {
          path: "references/two.md",
          mode: 0o755,
          bytes: encoder.encode("reference two\n"),
        },
      ])
    );
    const input = must(
      createAgentPluginReleaseInput({
        schemaVersion: 1,
        contentAuthority: "personal-rawr-hq",
        members: [member("alpha", firstPayload)],
        ownershipClaims: [{ kind: "skill", identity: "alpha", ownerPluginId: "alpha" }],
        locks: [],
        qualityPolicies: [],
      })
    );
    const firstRelease = must(
      createAgentPluginRelease({
        releaseInput: input,
        pluginId: "alpha",
        source: SOURCE,
        payload: firstPayload,
      })
    );
    const changedRelease = must(
      createAgentPluginRelease({
        releaseInput: input,
        pluginId: "alpha",
        source: SOURCE,
        payload: changedPayload,
      })
    );
    const wireText = new TextDecoder().decode(canonicalSerializeAgentPluginReleaseInput(input));

    expect(firstPayload.payloadDigest).not.toBe(changedPayload.payloadDigest);
    expect(firstRelease.releaseDigest).not.toBe(changedRelease.releaseDigest);
    expect(firstRelease.body.releaseInputDigest).toBe(changedRelease.body.releaseInputDigest);
    expect(wireText).not.toContain("payloadDigest");
    expect(wireText).not.toContain("manifest");
    expect(wireText).not.toContain("references/");
    expect(wireText).not.toContain("completenessWitness");
  });

  it("keeps every declarative policy class identity-bearing", () => {
    const fixture = productFixture();
    const baselineBody = releaseInputBody(fixture.alphaPayload, fixture.betaPayload);
    const baseline = must(createAgentPluginReleaseInput(baselineBody));
    const mutations = [
      (body: any) => {
        body.contentAuthority = "personal-rawr-hq-v2";
      },
      (body: any) => {
        body.members[0].vendor[0].protocol = "vendor-v2";
      },
      (body: any) => {
        body.members[0].curation[0].protocol = "curation-v2";
      },
      (body: any) => {
        body.ownershipClaims.push({
          kind: "alias",
          identity: "alpha-two",
          ownerPluginId: "alpha",
        });
      },
      (body: any) => {
        body.locks[0].protocol = "vendor-lock-v2";
      },
      (body: any) => {
        body.qualityPolicies[0].protocol = "quality-v2";
      },
    ];

    for (const mutate of mutations) {
      const candidate = structuredClone(baselineBody);
      mutate(candidate);
      const changed = must(createAgentPluginReleaseInput(candidate));
      expect(changed.releaseInputDigest).not.toBe(baseline.releaseInputDigest);
    }
  });

  it("rejects unpublished per-file v1 fields as unknown", () => {
    const fixture = productFixture();
    const body = releaseInputBody(fixture.alphaPayload, fixture.betaPayload) as any;
    const oldInventory = structuredClone(body);
    oldInventory.members[0].skillInventory = [
      { identity: "alpha", manifestPath: "skills/alpha/SKILL.md" },
    ];
    const oldPayload = structuredClone(body);
    oldPayload.members[0].payload = {
      protocolVersion: fixture.alphaPayload.protocolVersion,
      manifest: fixture.alphaPayload.manifest,
      payloadDigest: fixture.alphaPayload.payloadDigest,
    };

    for (const candidate of [oldInventory, oldPayload]) {
      const result = createAgentPluginReleaseInput(candidate);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues.map(({ code }) => code)).toContain("UNKNOWN_FIELD");
    }
    expect(Value.Check(ReleaseMemberDeclarationSchema, oldInventory.members[0])).toBe(false);
    expect(Value.Check(ReleaseMemberDeclarationSchema, oldPayload.members[0])).toBe(false);
  });

  it("closes discovered skill manifests over explicit ownership claims", () => {
    const skillPayload = must(
      createAgentPluginPayload([
        {
          path: "skills/alpha/SKILL.md",
          mode: 0o644,
          bytes: encoder.encode("alpha\n"),
        },
        {
          path: "notes/extra.md",
          mode: 0o644,
          bytes: encoder.encode("included\n"),
        },
      ])
    );
    const withoutSkill = must(
      createAgentPluginPayload([
        {
          path: "notes/extra.md",
          mode: 0o644,
          bytes: encoder.encode("included\n"),
        },
      ])
    );
    const missingClaimInput = must(
      createAgentPluginReleaseInput({
        schemaVersion: 1,
        contentAuthority: "personal-rawr-hq",
        members: [member("alpha", skillPayload)],
        ownershipClaims: [],
        locks: [],
        qualityPolicies: [],
      })
    );
    const staleClaimInput = must(
      createAgentPluginReleaseInput({
        schemaVersion: 1,
        contentAuthority: "personal-rawr-hq",
        members: [member("alpha", skillPayload)],
        ownershipClaims: [{ kind: "skill", identity: "alpha", ownerPluginId: "alpha" }],
        locks: [],
        qualityPolicies: [],
      })
    );

    const missing = createAgentPluginRelease({
      releaseInput: missingClaimInput,
      pluginId: "alpha",
      source: SOURCE,
      payload: skillPayload,
    });
    const stale = createAgentPluginRelease({
      releaseInput: staleClaimInput,
      pluginId: "alpha",
      source: SOURCE,
      payload: withoutSkill,
    });
    const valid = createAgentPluginRelease({
      releaseInput: staleClaimInput,
      pluginId: "alpha",
      source: SOURCE,
      payload: skillPayload,
    });

    expect(missing.ok).toBe(false);
    expect(stale.ok).toBe(false);
    expect(valid.ok).toBe(true);
    if (!missing.ok) {
      expect(missing.issues.map(({ code }) => code)).toContain("SKILL_OWNERSHIP_MISMATCH");
    }
    if (!stale.ok) {
      expect(stale.issues.map(({ code }) => code)).toContain("SKILL_OWNERSHIP_MISMATCH");
    }
  });

  it("rejects duplicate skill claims before payload construction", () => {
    const fixture = productFixture();
    const body = releaseInputBody(fixture.alphaPayload, fixture.betaPayload) as any;
    body.ownershipClaims.push({
      kind: "skill",
      identity: "alpha",
      ownerPluginId: "alpha",
    });

    const result = createAgentPluginReleaseInput(body);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain("DUPLICATE_OWNERSHIP_CLAIM");
    }
  });

  it("applies structural source guards to the byte-derived payload", () => {
    const input = must(
      createAgentPluginReleaseInput({
        schemaVersion: 1,
        contentAuthority: "personal-rawr-hq",
        members: [member("alpha", productFixture().alphaPayload)],
        ownershipClaims: [],
        locks: [],
        qualityPolicies: [],
      })
    );

    for (const path of ["agent-pack/readme.md", "plugin.yaml"]) {
      const payload = must(
        createAgentPluginPayload([{ path, mode: 0o644, bytes: encoder.encode("forbidden\n") }])
      );
      const result = createAgentPluginRelease({
        releaseInput: input,
        pluginId: "alpha",
        source: SOURCE,
        payload,
      });
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.issues.map(({ code }) => code)).toContain("FORBIDDEN_UNIT_KIND");
    }
  });

  it("owns one closed schema-version-one wire shape", () => {
    const fixture = productFixture();
    const envelope = wire(canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput));

    expect(Value.Check(ReleaseInputBodySchema, envelope.body)).toBe(true);
    expect(Value.Check(ReleaseInputEnvelopeSchema, envelope)).toBe(true);
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.body.schemaVersion).toBe(1);
    expect(envelope.body.members[0]).toEqual({
      kind: "agent-plugin",
      pluginId: "alpha",
      vendor: fixture.releaseInput.body.members[0]?.vendor,
      curation: fixture.releaseInput.body.members[0]?.curation,
    });
    expect(releaseInputValue(fixture.releaseInput)).toEqual(envelope);

    const unknown = structuredClone(envelope);
    unknown.body.members[0].payload = {};
    const bytes = encoder.encode(`${JSON.stringify(unknown)}\n`);
    const decoded = decodeAgentPluginReleaseInput(bytes);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.issues.map(({ code }) => code)).toContain("UNKNOWN_FIELD");
  });
});
