import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { StackDoctorInputSchema, StackDoctorResultSchema } from "../model/dto/stack-operations.dto";

/** Declares the read-only Graphite stack health operation. */
export const doctor = oc
  .meta(procedureMetadata({ idempotent: true, entity: "stack" }))
  .input(standard(StackDoctorInputSchema))
  .output(standard(StackDoctorResultSchema));
