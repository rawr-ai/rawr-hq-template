import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import {
  RiskToleranceSchema,
  SecurityGateEnableResultSchema,
  SecurityModeSchema,
} from "../model/dto/security.dto";

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

/** Evaluates whether the current security report admits plugin enablement. */
export const gateEnable = oc
  .meta(procedureMetadata({ idempotent: false, entity: "security" }))
  .input(GateEnableInputSchema)
  .output(standard(SecurityGateEnableResultSchema));
