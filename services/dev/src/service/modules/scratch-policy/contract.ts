import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import { ScratchPolicyCheckSchema, ScratchPolicyInputSchema } from "../../common/entities";

export const contract = {
  check: ocBase
    .meta({ idempotent: true, entity: "scratchPolicy" })
    .input(schema(ScratchPolicyInputSchema))
    .output(schema(ScratchPolicyCheckSchema)),
};
