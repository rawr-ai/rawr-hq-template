import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import { StackDrainInputSchema, StackDrainResultSchema } from "../model/dto";

/** Plans or requests one native current/downstack merge. */
export const drain = oc
  .meta(procedureMetadata({ idempotent: false, entity: "stack", audit: "full" }))
  .input(standard(StackDrainInputSchema))
  .output(standard(StackDrainResultSchema));
