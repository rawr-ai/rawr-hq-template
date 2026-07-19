import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  CanonicalStatusInputSchema,
  CanonicalStatusResultSchema,
  CanonicalSyncInputSchema,
  CanonicalSyncResultSchema,
  CompleteNativeHomesResultSchema,
  CompleteTestInputSchema,
  EmptyInputSchema,
  ProviderOperationResultSchema,
  TargetedTestInputSchema,
} from "./schemas";

export const contract = {
  targetedTest: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(TargetedTestInputSchema))
    .output(schema(ProviderOperationResultSchema)),
  completeTest: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(CompleteTestInputSchema))
    .output(schema(ProviderOperationResultSchema)),
  canonicalSync: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(CanonicalSyncInputSchema))
    .output(schema(CanonicalSyncResultSchema)),
  canonicalStatus: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(CanonicalStatusInputSchema))
    .output(schema(CanonicalStatusResultSchema)),
  completeNativeHomes: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "basic" })
    .input(schema(EmptyInputSchema))
    .output(schema(CompleteNativeHomesResultSchema)),
};
