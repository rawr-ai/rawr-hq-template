import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  CanonicalStatusInputSchema,
  CanonicalStatusResultSchema,
  CanonicalSyncInputSchema,
  CompleteNativeHomesResultSchema,
  CompleteTestInputSchema,
  EmptyInputSchema,
  ManagedRetireInputSchema,
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
    .output(schema(ProviderOperationResultSchema)),
  canonicalStatus: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(CanonicalStatusInputSchema))
    .output(schema(CanonicalStatusResultSchema)),
  managedRetire: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(ManagedRetireInputSchema))
    .output(schema(ProviderOperationResultSchema)),
  completeNativeHomes: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "basic" })
    .input(schema(EmptyInputSchema))
    .output(schema(CompleteNativeHomesResultSchema)),
};
