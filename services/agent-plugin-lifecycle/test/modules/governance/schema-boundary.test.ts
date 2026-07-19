import { schema } from "@rawr/hq-sdk";
import { describe, expect, it } from "vitest";
import { Value } from "typebox/value";

import {
  AttestPromotionResultSchema,
  CurrentMainRecordInputSchema,
  CurrentMainRecordResultSchema,
  ResolveCurrentMainResultSchema,
  ValidateAcceptanceResultSchema,
} from "../../../src/service/modules/governance/schemas";
import {
  encodeCurrentMainBodyV2,
  type CurrentMainBodyV2,
} from "../../../src/service/modules/governance/model";
import { governedObservation, promotionFixture } from "./fixtures";

describe("governance procedure result schema boundary", () => {
  it("closes both current-main codec actions at the TypeBox input boundary", () => {
    const body = currentMainBodyFixture();
    const encoded = encodeCurrentMainBodyV2(body);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) throw new Error(encoded.failure.message);

    expect(Value.Check(CurrentMainRecordInputSchema, {
      kind: "encode-body",
      body,
    })).toBe(true);
    expect(Value.Check(CurrentMainRecordInputSchema, {
      kind: "validate-envelope",
      bytes: encoded.value.bytes,
    })).toBe(true);

    for (const invalid of [
      { kind: "encode-body", body, bytes: encoded.value.bytes },
      { kind: "encode-body", body, ambientAuthority: true },
      { kind: "encode-body", body: { ...body, approver: "person" } },
      { kind: "encode-body", body: { ...body, schemaVersion: 1 } },
      { kind: "validate-envelope", bytes: encoded.value.bytes, body },
    ]) {
      expect(Value.Check(CurrentMainRecordInputSchema, invalid)).toBe(false);
    }
  });

  it("closes current-main codec success and failure results field by field", () => {
    const encoded = encodeCurrentMainBodyV2(currentMainBodyFixture());
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) throw new Error(encoded.failure.message);

    expect(Value.Check(CurrentMainRecordResultSchema, encoded)).toBe(true);
    expect(Value.Check(CurrentMainRecordResultSchema, {
      ok: false,
      failure: {
        code: "InvalidSchema",
        path: "currentMain.body",
        message: "Current-main body does not match its closed schema",
      },
    })).toBe(true);
    expect(Value.Check(CurrentMainRecordResultSchema, {
      ...encoded,
      value: { ...encoded.value, receipt: "state" },
    })).toBe(false);
    expect(Value.Check(CurrentMainRecordResultSchema, {
      ok: false,
      failure: {
        code: "InvalidSchema",
        path: "currentMain.body",
        message: "invalid",
        authority: "ambient",
      },
    })).toBe(false);
  });

  it("closes accepted, rejected, attestation, and current-main observations field by field", () => {
    const fixture = promotionFixture();
    const acceptance = governedObservation(fixture);

    expect(Value.Check(ValidateAcceptanceResultSchema, {
      kind: "GovernedAccepted",
      observation: acceptance,
    })).toBe(true);
    expect(Value.Check(ValidateAcceptanceResultSchema, {
      kind: "RejectedAcceptance",
      evidence: fixture.acceptance,
    })).toBe(true);
    expect(Value.Check(AttestPromotionResultSchema, {
      kind: "PromotionAttested",
      attestation: fixture.promotion,
    })).toBe(true);
    expect(Value.Check(ResolveCurrentMainResultSchema, {
      kind: "CURRENT_ELIGIBLE",
      observation: {
        record: fixture.currentMain,
        policy: fixture.policy,
        acceptance,
        promotion: fixture.promotion,
      },
    })).toBe(true);
  });

  it("rejects unknown variants, extra nested authority, and malformed attestations at the output validator", async () => {
    const fixture = promotionFixture();
    const acceptance = governedObservation(fixture);
    const invalid = [
      {
        schema: ValidateAcceptanceResultSchema,
        value: { kind: "Accepted", observation: acceptance },
      },
      {
        schema: ValidateAcceptanceResultSchema,
        value: {
          kind: "GovernedAccepted",
          observation: {
            ...acceptance,
            approval: { ...acceptance.approval, ambientAuthority: true },
          },
        },
      },
      {
        schema: AttestPromotionResultSchema,
        value: {
          kind: "PromotionAttested",
          attestation: {
            ...fixture.promotion,
            body: {
              ...fixture.promotion.body,
              landedInput: {
                ...fixture.promotion.body.landedInput,
                object: {
                  repositoryIdentity: fixture.landedInputObject.repositoryIdentity,
                  ref: fixture.landedInputObject.ref,
                  commit: fixture.landedInputObject.commit,
                  tree: fixture.landedInputObject.tree,
                  path: fixture.landedInputObject.path,
                },
              },
            },
          },
        },
      },
      {
        schema: ResolveCurrentMainResultSchema,
        value: {
          kind: "CURRENT_ELIGIBLE",
          observation: {
            record: fixture.currentMain,
            policy: fixture.policy,
            acceptance,
            promotion: { ...fixture.promotion, extra: true },
          },
        },
      },
    ];

    for (const candidate of invalid) {
      expect(Value.Check(candidate.schema, candidate.value)).toBe(false);
      const validated = await schema(candidate.schema)["~standard"].validate(candidate.value);
      expect("issues" in validated).toBe(true);
    }
  });
});

function currentMainBodyFixture(): CurrentMainBodyV2 {
  return {
    schemaVersion: 2,
    channel: "current-main",
    contentAuthority: "rawr-hq",
    sourceRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    sourceCommit: "a".repeat(40),
    sourceTree: "b".repeat(40),
    releaseInputDigest: `ri1_${"c".repeat(64)}`,
    releaseSetDigest: `rs1_${"d".repeat(64)}`,
    evaluationProfile: "provider-smoke@v1",
    projections: [
      {
        provider: "claude",
        projectionDigest: `ap1_${"e".repeat(64)}`,
        rendererProtocol: "claude-projection@v1",
        adapterProtocol: "claude-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"f".repeat(64)}`,
      },
      {
        provider: "codex",
        projectionDigest: `ap1_${"1".repeat(64)}`,
        rendererProtocol: "codex-projection@v1",
        adapterProtocol: "codex-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"2".repeat(64)}`,
      },
    ],
  };
}
