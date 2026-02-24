import type { RouterClient } from "@orpc/server";
import { supportExampleContractErrorMap } from "../contract";
import { supportExampleTriageItemProcedures } from "../service/lifecycle";

export const supportExampleClientProcedures = {
  triage: {
    items: supportExampleTriageItemProcedures,
  },
} as const;

// Keep the existing exported name to avoid churn in plugin contracts.
export const supportExampleClientErrorMap = supportExampleContractErrorMap;

export type SupportExampleClient = RouterClient<typeof supportExampleClientProcedures>;

export type { SupportExampleClientContext } from "./context";
