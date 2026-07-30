import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import {
  ScratchPolicyCheckSchema,
  ScratchPolicyInputSchema,
} from "#dev-service/model/dto/scratch-policy.dto";

export const contract = {
  check: oc
    .meta(procedureMetadata({ idempotent: true, entity: "scratchPolicy" }))
    .input(standard(ScratchPolicyInputSchema))
    .output(standard(ScratchPolicyCheckSchema)),
};
