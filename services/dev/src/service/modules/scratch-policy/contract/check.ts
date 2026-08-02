import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import {
  ScratchPolicyCheckSchema,
  ScratchPolicyInputSchema,
} from "#dev-service/model/dto/scratch-policy.dto";

/** Declares scratch-policy observation as an idempotent Dev operation. */
export const check = oc
  .meta(procedureMetadata({ idempotent: true, entity: "scratchPolicy" }))
  .input(standard(ScratchPolicyInputSchema))
  .output(standard(ScratchPolicyCheckSchema));
