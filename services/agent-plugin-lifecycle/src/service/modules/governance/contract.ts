import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  AttestPromotionInputSchema,
  AttestPromotionResultSchema,
  ResolveCurrentMainResultSchema,
  ResolveCurrentMainInputSchema,
  ValidateAcceptanceInputSchema,
  ValidateAcceptanceResultSchema,
} from "./schemas";

export const contract = {
  validateAcceptance: ocBase
    .meta({ idempotent: true, entity: "governance", audit: "full" })
    .input(schema(ValidateAcceptanceInputSchema))
    .output(schema(ValidateAcceptanceResultSchema)),
  attestPromotion: ocBase
    .meta({ idempotent: true, entity: "governance", audit: "full" })
    .input(schema(AttestPromotionInputSchema))
    .output(schema(AttestPromotionResultSchema)),
  resolveCurrentMain: ocBase
    .meta({ idempotent: true, entity: "governance", audit: "full" })
    .input(schema(ResolveCurrentMainInputSchema))
    .output(schema(ResolveCurrentMainResultSchema)),
};
