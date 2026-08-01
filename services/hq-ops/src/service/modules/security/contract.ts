import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { Type } from "typebox";
import {
  RiskToleranceSchema,
  SecurityGateEnableResultSchema,
  SecurityModeSchema,
  SecurityReportSchema,
  SecurityReportWithPathSchema,
} from "./entities";

const SecurityCheckInputSchema = standard(
  Type.Object(
    {
      mode: SecurityModeSchema,
    },
    { additionalProperties: false }
  )
);

const GateEnableInputSchema = standard(
  Type.Object(
    {
      pluginId: Type.String({
        description: "Plugin identifier whose enablement is being evaluated.",
        minLength: 1,
      }),
      riskTolerance: RiskToleranceSchema,
      mode: SecurityModeSchema,
    },
    { additionalProperties: false }
  )
);

const EmptyInputSchema = standard(Type.Object({}, { additionalProperties: false }));

export const contract = {
  securityCheck: oc
    .meta(procedureMetadata({ idempotent: true, entity: "security" }))
    .input(SecurityCheckInputSchema)
    .output(standard(SecurityReportWithPathSchema)),
  gateEnable: oc
    .meta(procedureMetadata({ idempotent: false, entity: "security" }))
    .input(GateEnableInputSchema)
    .output(standard(SecurityGateEnableResultSchema)),
  getSecurityReport: oc
    .meta(procedureMetadata({ idempotent: true, entity: "security" }))
    .input(EmptyInputSchema)
    .output(standard(Type.Union([SecurityReportSchema, Type.Null()]))),
};
