import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import { StackDrainInputSchema, StackDrainResultSchema } from "../model/dto/stack-operations.dto";

/** Declares the planned or applied Graphite stack-drain operation. */
export const drain = oc
  .meta(procedureMetadata({ idempotent: false, entity: "stack", audit: "full" }))
  .input(standard(StackDrainInputSchema))
  .output(standard(StackDrainResultSchema));
