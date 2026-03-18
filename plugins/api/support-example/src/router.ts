import { completeWorkItem } from "./operations/triage/items/complete";
import { getWorkItem } from "./operations/triage/items/get";
import { listWorkItems } from "./operations/triage/items/list";
import { requestWorkItem } from "./operations/triage/items/request";
import { startWorkItem } from "./operations/triage/items/start";

export const supportExampleApiRouter = {
  supportExample: {
    triage: {
      items: {
        request: requestWorkItem,
        list: listWorkItems,
        get: getWorkItem,
        start: startWorkItem,
        complete: completeWorkItem,
      },
    },
  },
} as const;

export type SupportExampleApiRouter = typeof supportExampleApiRouter;
