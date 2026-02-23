import { completeWorkItemProcedure } from "./complete-work-item";
import { getWorkItemProcedure } from "./get-work-item";
import { listWorkItemsProcedure } from "./list-work-items";
import { requestWorkItemProcedure } from "./request-work-item";
import { startWorkItemProcedure } from "./start-work-item";

export const procedures = {
  requestWorkItem: requestWorkItemProcedure,
  listWorkItems: listWorkItemsProcedure,
  getWorkItem: getWorkItemProcedure,
  startWorkItem: startWorkItemProcedure,
  completeWorkItem: completeWorkItemProcedure,
} as const;
