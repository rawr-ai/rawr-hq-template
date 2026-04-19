import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  PluginInstallAssessInputSchema,
  PluginInstallRepairInputSchema,
  PluginInstallRepairPlanSchema,
  PluginInstallStateReportSchema,
} from "./schemas";

export const contract = {
  assessInstallState: ocBase
    .meta({ idempotent: true, entity: "pluginInstall" })
    .input(schema(PluginInstallAssessInputSchema))
    .output(schema(PluginInstallStateReportSchema)),
  planInstallRepair: ocBase
    .meta({ idempotent: true, entity: "pluginInstall" })
    .input(schema(PluginInstallRepairInputSchema))
    .output(schema(PluginInstallRepairPlanSchema)),
};

export type PluginInstallModuleContract = typeof contract;
