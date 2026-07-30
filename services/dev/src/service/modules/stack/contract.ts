import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import {
  StackDoctorInputSchema,
  StackDoctorResultSchema,
  StackDrainInputSchema,
  StackDrainResultSchema,
} from "./model/dto/stack-operations.dto";

export const contract = {
  doctor: oc
    .meta(procedureMetadata({ idempotent: true, entity: "stack" }))
    .input(standard(StackDoctorInputSchema))
    .output(standard(StackDoctorResultSchema)),
  drain: oc
    .meta(procedureMetadata({ idempotent: false, entity: "stack", audit: "full" }))
    .input(standard(StackDrainInputSchema))
    .output(standard(StackDrainResultSchema)),
};
