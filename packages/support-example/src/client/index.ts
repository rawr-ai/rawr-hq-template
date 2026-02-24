import type { RouterClient } from "@orpc/server";
import type { SupportExampleServiceContext } from "../service/triage/context";
import { supportExampleTriageItemProcedures } from "../service/triage/lifecycle";

export const supportExampleClientProcedures = {
  triage: {
    items: supportExampleTriageItemProcedures,
  },
} as const;

export type SupportExampleClient = RouterClient<typeof supportExampleClientProcedures>;

export type SupportExampleClientContext = SupportExampleServiceContext;
