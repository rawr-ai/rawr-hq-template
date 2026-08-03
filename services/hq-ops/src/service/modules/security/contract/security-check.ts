import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { SecurityModeSchema, SecurityReportWithPathSchema } from "../model/dto/security.dto";

const SecurityCheckInputSchema = standard(
  Type.Object(
    {
      mode: SecurityModeSchema,
    },
    { additionalProperties: false }
  )
);

/** Checks the selected repository security surface and persists its report. */
export const securityCheck = oc
  .meta(procedureMetadata({ idempotent: true, entity: "security" }))
  .input(SecurityCheckInputSchema)
  .output(standard(SecurityReportWithPathSchema));
