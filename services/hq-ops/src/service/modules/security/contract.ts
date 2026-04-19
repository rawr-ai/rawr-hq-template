import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  RiskToleranceSchema,
  SecurityGateEnableResultSchema,
  SecurityModeSchema,
  SecurityReportSchema,
  SecurityReportWithPathSchema,
} from "./schemas";

const SecurityCheckInputSchema = schema(
  Type.Object(
    {
      mode: SecurityModeSchema,
    },
    { additionalProperties: false },
  ),
);

const GateEnableInputSchema = schema(
  Type.Object(
    {
      pluginId: Type.String({ minLength: 1 }),
      riskTolerance: RiskToleranceSchema,
      mode: SecurityModeSchema,
    },
    { additionalProperties: false },
  ),
);

const EmptyInputSchema = schema(Type.Object({}, { additionalProperties: false }));

export const contract = {
  securityCheck: ocBase
    .meta({ idempotent: true, entity: "security" })
    .input(SecurityCheckInputSchema)
    .output(schema(SecurityReportWithPathSchema)),
  gateEnable: ocBase
    .meta({ idempotent: false, entity: "security" })
    .input(GateEnableInputSchema)
    .output(schema(SecurityGateEnableResultSchema)),
  getSecurityReport: ocBase
    .meta({ idempotent: true, entity: "security" })
    .input(EmptyInputSchema)
    .output(schema(Type.Union([SecurityReportSchema, Type.Null()]))),
};
