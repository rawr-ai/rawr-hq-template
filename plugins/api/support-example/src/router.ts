import { os } from "./orpc";
import { completeWorkItem } from "./operations/complete-work-item";
import { getWorkItem } from "./operations/get-work-item";
import { listWorkItems } from "./operations/list-work-items";
import { requestWorkItem } from "./operations/request-work-item";
import { startWorkItem } from "./operations/start-work-item";

export const supportExampleApiRouter = os.router({
  supportExample: os.supportExample.router({
    triage: os.supportExample.triage.router({
      items: os.supportExample.triage.items.router({
        request: requestWorkItem,
        list: listWorkItems,
        get: getWorkItem,
        start: startWorkItem,
        complete: completeWorkItem,
      }),
    }),
  }),
});

export type SupportExampleApiRouter = typeof supportExampleApiRouter;
