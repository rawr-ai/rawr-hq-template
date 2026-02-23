import type { RouterClient } from "@orpc/server";
export type { SupportTriageClientContext } from "./context";
export {
  supportTriageClientErrorMap,
  throwSupportTriageDomainErrorAsClientError,
} from "./errors";
export {
  requestWorkItemProcedure,
  listWorkItemsProcedure,
  getWorkItemProcedure,
  startWorkItemProcedure,
  completeWorkItemProcedure,
} from "./procedures";
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
