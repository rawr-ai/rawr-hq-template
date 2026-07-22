import { schema } from "@rawr/hq-sdk";
import { ScratchPolicyCheckSchema, ScratchPolicyInputSchema } from "../../common/entities";
import { ocBase } from "../../base";

export const contract = {
  check: ocBase
    .meta({ idempotent: true, entity: "scratchPolicy" })
    .input(schema(ScratchPolicyInputSchema))
    .output(schema(ScratchPolicyCheckSchema)),
};
