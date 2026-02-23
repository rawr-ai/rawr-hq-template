import { os } from "./orpc";
import { completeWorkItem } from "./operations/complete-work-item";
import { getWorkItem } from "./operations/get-work-item";
import { listWorkItems } from "./operations/list-work-items";
import { requestWorkItem } from "./operations/request-work-item";
import { startWorkItem } from "./operations/start-work-item";

export const supportTriageApiRouter = os.router({
  supportTriage: os.supportTriage.router({
    requestWorkItem,
    listWorkItems,
    getWorkItem,
    startWorkItem,
    completeWorkItem,
  }),
});

export type SupportTriageApiRouter = typeof supportTriageApiRouter;
