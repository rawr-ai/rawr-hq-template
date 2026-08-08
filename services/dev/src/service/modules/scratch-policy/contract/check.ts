import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import {
  ScratchPolicyCheckSchema,
  ScratchPolicyInputSchema,
} from "../../../model/dto/scratch-policy.dto";

/** Declares scratch-policy observation as an idempotent Dev operation. */
export const check = oc
  .meta(procedureMetadata({ idempotent: true, entity: "scratchPolicy" }))
  .input(standard(ScratchPolicyInputSchema))
  .output(standard(ScratchPolicyCheckSchema));
