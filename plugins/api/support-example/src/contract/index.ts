import { oc } from "@orpc/contract";
import {
  completeWorkItemApiContract,
  getWorkItemApiContract,
  listWorkItemsApiContract,
  requestWorkItemApiContract,
  startWorkItemApiContract,
} from "./triage";

export const supportExampleApiContract = oc.router({
  supportExample: {
    triage: {
      items: {
        request: requestWorkItemApiContract,
        list: listWorkItemsApiContract,
        get: getWorkItemApiContract,
        start: startWorkItemApiContract,
        complete: completeWorkItemApiContract,
      },
    },
  },
});

export type SupportExampleApiContract = typeof supportExampleApiContract;
