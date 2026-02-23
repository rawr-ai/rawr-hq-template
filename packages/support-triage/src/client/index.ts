import type { RouterClient } from "@orpc/server";
export { supportTriageClientErrorMap } from "./errors";
import {
  requestWorkItemProcedure,
  listWorkItemsProcedure,
  getWorkItemProcedure,
  startWorkItemProcedure,
  completeWorkItemProcedure,
} from "./procedures";

export const supportTriageClientProcedures = {
  requestWorkItem: requestWorkItemProcedure,
  listWorkItems: listWorkItemsProcedure,
  getWorkItem: getWorkItemProcedure,
  startWorkItem: startWorkItemProcedure,
  completeWorkItem: completeWorkItemProcedure,
} as const;

export type SupportTriageClient = RouterClient<typeof supportTriageClientProcedures>;
