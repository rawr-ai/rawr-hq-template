import { schema } from "@rawr/hq-sdk";
import { describe, expect, it } from "vitest";
import { Value } from "typebox/value";

import {
  AttestPromotionResultSchema,
  ResolveCurrentMainResultSchema,
  ValidateAcceptanceResultSchema,
} from "../../../src/service/modules/governance/schemas";
import { governedObservation, promotionFixture } from "./fixtures";

describe("governance procedure result schema boundary", () => {
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
