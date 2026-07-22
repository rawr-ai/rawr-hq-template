import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  StackDoctorInputSchema,
  StackDoctorResultSchema,
  StackDrainInputSchema,
  StackDrainResultSchema,
} from "../../common/entities";

export const contract = {
  doctor: ocBase
    .meta({ idempotent: true, entity: "stack" })
    .input(schema(StackDoctorInputSchema))
    .output(schema(StackDoctorResultSchema)),
  drain: ocBase
    .meta({ idempotent: false, entity: "stack", audit: "full" })
    .input(schema(StackDrainInputSchema))
    .output(schema(StackDrainResultSchema)),
};
