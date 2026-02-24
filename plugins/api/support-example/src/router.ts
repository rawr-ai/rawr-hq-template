import { os } from "./orpc";
import { completeWorkItem } from "./operations/triage/items/complete";
import { getWorkItem } from "./operations/triage/items/get";
import { listWorkItems } from "./operations/triage/items/list";
import { requestWorkItem } from "./operations/triage/items/request";
import { startWorkItem } from "./operations/triage/items/start";

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
