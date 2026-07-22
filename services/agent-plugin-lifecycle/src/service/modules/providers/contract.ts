import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  CanonicalStatusInputSchema,
  CanonicalStatusResultSchema,
  CanonicalSyncInputSchema,
  CanonicalSyncResultSchema,
  CompleteTestInputSchema,
  CompleteTestResultSchema,
  TargetedTestInputSchema,
  TargetedTestResultSchema,
} from "./schemas";

export const contract = {
  targetedTest: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(TargetedTestInputSchema))
    .output(schema(TargetedTestResultSchema)),
  completeTest: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(CompleteTestInputSchema))
    .output(schema(CompleteTestResultSchema)),
  canonicalSync: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(CanonicalSyncInputSchema))
    .output(schema(CanonicalSyncResultSchema)),
  canonicalStatus: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(CanonicalStatusInputSchema))
    .output(schema(CanonicalStatusResultSchema)),
};
