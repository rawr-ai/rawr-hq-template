import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { StackDrainInputSchema, StackDrainResultSchema } from "../model/dto/stack-operations.dto";

/** Declares the planned or applied Graphite stack-drain operation. */
export const drain = oc
  .meta(procedureMetadata({ idempotent: false, entity: "stack", audit: "full" }))
  .input(standard(StackDrainInputSchema))
  .output(standard(StackDrainResultSchema));
